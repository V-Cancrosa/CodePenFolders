# inbox

Tu trafiają nowe eksporty z CodePen (Export → Export .zip), każdy w folderze swojej kategorii:

```
inbox/effects/moj-pen.zip
inbox/effects/moj-pen.json   # opcjonalnie: {"tags": ["obs"], "note": "krótki opis"}
```

Po pushu GitHub Actions rozpakowuje je do `<kategoria>/<nazwa>/`, dopisuje do galerii i usuwa stąd.
Paczki, których nie dało się przetworzyć, lądują w `_bledy/` razem z plikiem `.txt` z powodem.

Najprościej wysyłać je przez stronę **Dodaj ZIP** w galerii.
