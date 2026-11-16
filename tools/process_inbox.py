"""Rozpakowuje eksporty z CodePen z folderu inbox/ do galerii.

Układ wejścia:
    inbox/<kategoria>/<cokolwiek>.zip    - eksport pena (Export -> Export .zip)
    inbox/<kategoria>/<cokolwiek>.json   - opcjonalnie: {"tags": [...], "note": "...", "name": "..."}

Dla każdego ZIP-a skrypt:
  * sprawdza, czy to eksport CodePen (jeden folder główny z dist/index.html),
  * rozpakowuje go do <kategoria>/<nazwa-pena>/ (bezpiecznie, bez wychodzenia poza folder),
  * usuwa z dist/index.html zbędny prefixfree.js,
  * dopisuje lub aktualizuje wpis w items.json (autor i link z README pena),
  * usuwa ZIP i plik .json z inbox/.
Na koniec przebudowuje tabele w README.md.

Uruchomienie: python tools/process_inbox.py  (z głównego folderu repo)
"""

import json
import re
import shutil
import sys
import zipfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parent.parent
INBOX = ROOT / "inbox"
ITEMS = ROOT / "items.json"
README = ROOT / "README.md"

SLUG = re.compile(r"^[a-z0-9][a-z0-9-]{0,99}$")
MAX_UNCOMPRESSED = 50 * 1024 * 1024  # 50 MB na jeden pen wystarczy z zapasem
PREFIXFREE = re.compile(r"^.*prefixfree[^\"']*\.js.*\n?", re.MULTILINE)
SCRIPT_SRC = re.compile(r"<script[^>]+src=[\"'](https?://[^\"']+)[\"']", re.IGNORECASE)
PEN_URL = re.compile(r"https://codepen\.io/([^/\s)\]]+)/pen/([A-Za-z0-9]+)")

README_START = "<!-- items:start -->"
README_END = "<!-- items:end -->"


def log(msg: str) -> None:
    print(msg, flush=True)


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9-]+", "-", text.lower()).strip("-")
    return re.sub(r"-{2,}", "-", s)[:100]


def safe_members(zf: zipfile.ZipFile) -> tuple[str, list[zipfile.ZipInfo]]:
    """Zwraca nazwę folderu głównego i listę plików; rzuca ValueError przy czymś podejrzanym."""
    infos = [i for i in zf.infolist() if not i.is_dir()]
    if not infos:
        raise ValueError("pusty ZIP")
    tops = set()
    total = 0
    for info in infos:
        p = PurePosixPath(info.filename.replace("\\", "/"))
        if p.is_absolute() or ".." in p.parts or len(p.parts) < 2:
            raise ValueError(f"niedozwolona ścieżka w ZIP: {info.filename}")
        if (info.external_attr >> 16) & 0o170000 == 0o120000:
            raise ValueError(f"dowiązanie symboliczne w ZIP: {info.filename}")
        tops.add(p.parts[0])
        total += info.file_size
    if len(tops) != 1:
        raise ValueError("ZIP musi mieć dokładnie jeden folder główny (tak wygląda eksport z CodePen)")
    if total > MAX_UNCOMPRESSED:
        raise ValueError("ZIP po rozpakowaniu jest większy niż 50 MB")
    top = tops.pop()
    names = {PurePosixPath(i.filename.replace("\\", "/")) for i in infos}
    if PurePosixPath(top, "dist", "index.html") not in names:
        raise ValueError("brak dist/index.html - to nie wygląda na eksport z CodePen")
    return top, infos


def extract(zf: zipfile.ZipFile, top: str, infos: list[zipfile.ZipInfo], dest: Path) -> None:
    tmp = dest.with_name(dest.name + ".tmp")
    if tmp.exists():
        shutil.rmtree(tmp)
    for info in infos:
        rel = PurePosixPath(info.filename.replace("\\", "/")).relative_to(top)
        target = tmp.joinpath(*rel.parts)
        target.parent.mkdir(parents=True, exist_ok=True)
        with zf.open(info) as src, open(target, "wb") as out:
            shutil.copyfileobj(src, out)
    if dest.exists():
        shutil.rmtree(dest)
    tmp.rename(dest)


def read_meta(pen_dir: Path) -> dict:
    meta = {}
    readme = pen_dir / "README.md"
    text = readme.read_text(encoding="utf-8", errors="replace") if readme.exists() else ""
    for line in text.splitlines():
        if line.startswith("# "):
            meta["name"] = line[2:].strip()
            break
    m = PEN_URL.search(text)
    if m:
        meta["author"] = m.group(1)
        meta["pen"] = f"https://codepen.io/{m.group(1)}/pen/{m.group(2)}"
    return meta


def clean_dist(pen_dir: Path) -> list[str]:
    """Usuwa prefixfree.js i zwraca listę zewnętrznych skryptów, które zostały."""
    index = pen_dir / "dist" / "index.html"
    html = index.read_text(encoding="utf-8", errors="replace")
    cleaned = PREFIXFREE.sub("", html)
    if cleaned != html:
        index.write_text(cleaned, encoding="utf-8", newline="\n")
        log("  - usunięto prefixfree.js")
    return [src for src in SCRIPT_SRC.findall(cleaned) if "codepenassets.com" not in src]


def describe_scripts(srcs: list[str]) -> str:
    names = []
    for src in srcs:
        path = src.split("?")[0].rstrip("/")
        parts = path.split("/")
        version = next((p for p in parts if re.fullmatch(r"\d+(\.\d+)+", p)), "")
        fname = parts[-1].removesuffix(".min.js").removesuffix(".js")
        names.append(f"{fname} {version}".strip())
    return "Ładuje z CDN: " + ", ".join(dict.fromkeys(names)) + "."


def load_sidecar(zip_path: Path) -> dict:
    side = zip_path.with_suffix(".json")
    if not side.exists():
        return {}
    try:
        data = json.loads(side.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        log(f"  ! pomijam {side.name}: {e}")
        return {}
    out = {}
    if isinstance(data.get("tags"), list):
        out["tags"] = [t for t in (slugify(str(t)) for t in data["tags"]) if t][:10]
    for key in ("note", "name"):
        if isinstance(data.get(key), str) and data[key].strip():
            out[key] = data[key].strip()[:300]
    return out


def process_zip(zip_path: Path, cat: str, db: dict) -> str:
    with zipfile.ZipFile(zip_path) as zf:
        top, infos = safe_members(zf)
        dir_name = slugify(top)
        if not SLUG.match(dir_name):
            raise ValueError(f"nie da się zrobić nazwy folderu z '{top}'")
        dest = ROOT / cat / dir_name
        dest.parent.mkdir(exist_ok=True)
        extract(zf, top, infos, dest)

    meta = read_meta(dest)
    external = clean_dist(dest)
    side = load_sidecar(zip_path)

    items = db["items"]
    existing = next((i for i in items if i["cat"] == cat and i["dir"] == dir_name), None)
    entry = existing or {"cat": cat, "dir": dir_name, "tags": []}
    entry["name"] = side.get("name") or (existing or {}).get("name") or meta.get("name") or dir_name
    entry["author"] = meta.get("author") or entry.get("author") or "?"
    if meta.get("pen"):
        entry["pen"] = meta["pen"]
    if "tags" in side:
        entry["tags"] = side["tags"]
    if "note" in side:
        entry["note"] = side["note"]
    if external and not (existing and existing.get("warn")):
        entry["warn"] = describe_scripts(external)
    if not existing:
        items.append(entry)

    if cat not in db["categories"]:
        db["categories"][cat] = cat.replace("-", " ").capitalize()
    return f"{cat}/{dir_name}" + (" (zaktualizowano)" if existing else " (nowy)")


def md_escape(text: str) -> str:
    return text.replace("|", "\\|").replace("\n", " ")


def rebuild_readme(db: dict) -> None:
    text = README.read_text(encoding="utf-8")
    if README_START not in text or README_END not in text:
        log("README.md nie ma znaczników items:start/items:end - pomijam przebudowę tabel")
        return
    parts = []
    for cat, label in db["categories"].items():
        rows = [i for i in db["items"] if i["cat"] == cat]
        if not rows:
            continue
        parts.append(f"## {label}\n\n| Projekt | Autor | Oryginał | Uwagi |\n|---|---|---|---|")
        for i in rows:
            notes = " ".join(x for x in (i.get("note", ""), ("⚠ " + i["warn"]) if i.get("warn") else "") if x)
            pen = f"[pen]({i['pen']})" if i.get("pen") else ""
            parts.append(
                f"| [{md_escape(i['name'])}]({cat}/{i['dir']}) | {md_escape(i.get('author', ''))} | {pen} | {md_escape(notes)} |"
            )
        parts.append("")
    block = README_START + "\n\n" + "\n".join(parts).rstrip() + "\n\n" + README_END
    start = text.index(README_START)
    end = text.index(README_END) + len(README_END)
    README.write_text(text[:start] + block + text[end:], encoding="utf-8", newline="\n")


def quarantine(zip_path: Path, reason: str) -> None:
    """Przenosi wadliwy ZIP do inbox/_bledy/, żeby nie blokował kolejnych uruchomień."""
    bad = INBOX / "_bledy"
    bad.mkdir(parents=True, exist_ok=True)
    target = bad / zip_path.name
    zip_path.replace(target)
    target.with_suffix(".txt").write_text(reason + "\n", encoding="utf-8")
    zip_path.with_suffix(".json").unlink(missing_ok=True)


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    db =json.loads(ITEMS.read_text(encoding="utf-8"))
    zips = sorted(z for z in INBOX.glob("*/*.zip") if not z.parent.name.startswith("_")) if INBOX.exists() else []
    done, failed = [], []
    for zip_path in zips:
        cat = slugify(zip_path.parent.name)
        log(f"* {zip_path.relative_to(ROOT).as_posix()}")
        if not SLUG.match(cat) or cat in {"inbox", "tools", "dist", "src"} or cat.startswith("."):
            failed.append(f"{zip_path.name}: niedozwolona kategoria '{zip_path.parent.name}'")
            quarantine(zip_path, failed[-1])
            continue
        try:
            done.append(process_zip(zip_path, cat, db))
        except (ValueError, zipfile.BadZipFile, OSError) as e:
            failed.append(f"{zip_path.name}: {e}")
            log(f"  ! {e}")
            quarantine(zip_path, failed[-1])
            continue
        zip_path.unlink()
        zip_path.with_suffix(".json").unlink(missing_ok=True)

    if done:
        ITEMS.write_text(json.dumps(db, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    rebuild_readme(db)

    log("")
    log("Dodano/zaktualizowano: " + (", ".join(done) if done else "nic"))
    if failed:
        log("Błędy:\n  " + "\n  ".join(failed))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
