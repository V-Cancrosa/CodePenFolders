/*
 * How Chrome re-checks :has() — interactive drawings.
 *
 * Each drawing simulates Chromium's rules on one small page:
 *   1. A change only starts a walk if it's mentioned in some :has() condition.
 *   2. The walk goes up the ancestors and re-checks every :has() anchor on the
 *      way, whichever rule made it an anchor (style_engine.cc, L1591).
 *   3. Pseudo-class changes skip anchors whose :has() has no pseudo-class (L1585).
 *   4. "Styles itself" restyles the anchor (L1595). "Styles inside" restyles
 *      everything under the anchor on one list shared by every such rule (L1605).
 */
(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => motion.matches;

  /* ---------------------------------------------------------------------- *
   * The page every drawing uses. Rects are [x, y, width, height] in the
   * drawing's 1100 × 600 space. Parents come before their children.
   * ---------------------------------------------------------------------- */
  const NODES = [];

  function addNode(id, parent, tag, cls, rect, label) {
    NODES.push({
      id,
      parent,
      tag,
      cls,
      rect,
      label: label || tag + cls.map((c) => '.' + c).join(''),
      container: false,
    });
  }

  addNode('main', null, 'main', [], [230, 40, 850, 540]);
  addNode('nav', 'main', 'nav', [], [255, 88, 230, 467]);
  for (let i = 0; i < 5; i++) addNode('link' + i, 'nav', 'a', ['nav-link'], [275, 124 + i * 60, 190, 38]);
  addNode('menu', 'nav', 'button', [], [275, 482, 190, 38]);
  addNode('grid', 'main', 'section', ['grid'], [510, 88, 290, 467]);
  [[528, 124], [660, 124], [528, 334], [660, 334]].forEach(([x, y], i) => {
    addNode('card' + i, 'grid', 'div', ['card'], [x, y, 122, 196], '.card');
    addNode('img' + i, 'card' + i, 'img', [], [x + 14, y + 34, 94, 92]);
    addNode('buy' + i, 'card' + i, 'button', [], [x + 16, y + 144, 90, 34]);
  });
  addNode('tab', 'main', 'div', ['tab'], [825, 88, 230, 467], '.tab');
  addNode('header', 'tab', 'div', ['tab-header'], [843, 124, 194, 70], '.tab-header');
  addNode('tabbtn', 'header', 'button', [], [861, 147, 84, 32]);
  for (let i = 0; i < 6; i++) {
    addNode('item' + i, 'tab', 'div', ['category-item'], [843, 214 + i * 54, 194, 38], '.category-item');
  }

  const byId = new Map(NODES.map((n) => [n.id, n]));
  NODES.forEach((n) => {
    if (n.parent) byId.get(n.parent).container = true;
  });
  const TOTAL = NODES.length;

  const isInside = (id, ancestorId) => {
    for (let n = byId.get(id); n && n.parent; n = byId.get(n.parent)) {
      if (n.parent === ancestorId) return true;
    }
    return false;
  };
  const descendantsOf = (id) => NODES.filter((n) => isInside(n.id, id));
  const ancestorsOf = (id) => {
    const chain = [];
    for (let n = byId.get(id); n.parent; n = byId.get(n.parent)) chain.push(n.parent);
    chain.push('body');
    return chain;
  };
  const matches = (n, target) =>
    target === '*' || (target[0] === '.' ? n.cls.includes(target.slice(1)) : n.tag === target);
  const pseudoIn = (condition) => (condition.match(/:[a-z][a-z-]*/) || [null])[0];
  const selectorFor = (id) => (id === 'body' ? 'body' : byId.get(id).label);

  /* ---------------------------------------------------------------------- *
   * Scenarios
   * ---------------------------------------------------------------------- */
  const CLASS_ON_ITEM = {
    node: 'item2',
    kind: 'class',
    token: '.active',
    html: '<code>.active</code> is added to a <code>.category-item</code>.',
  };
  const HOVER_ON_ITEM = {
    node: 'item2',
    kind: 'pseudo',
    token: ':hover',
    html: 'The pointer moves onto a <code>.category-item</code>, so it starts matching <code>:hover</code>.',
  };
  const CLASS_ON_LINK = {
    node: 'link1',
    kind: 'class',
    token: '.active',
    html: '<code>.active</code> is added to an <code>a.nav-link</code>, over in <code>nav</code>.',
  };

  // Lesson 1 and 4 come out the same in every browser; 2 and 3 are where Chrome does more.
  const SCENARIOS = {
    '1A': {
      code: '1A',
      name: 'Small anchor · itself',
      change: CLASS_ON_ITEM,
      rules: [{ anchor: 'tab', condition: '.category-item.active' }],
      notice: 'The rule styles its anchor, so the re-check restyles one element: <code>.tab</code> itself.',
      engines: 'Firefox and Safari do exactly the same: <code>.tab</code> restyles itself, one element.',
    },
    '1B': {
      code: '1B',
      name: 'Small anchor · inside',
      change: CLASS_ON_ITEM,
      rules: [{ anchor: 'tab', condition: '.category-item.active', target: 'button' }],
      notice: 'The rule styles things inside <code>.tab</code>, so only targets inside <code>.tab</code> restyle: its one <code>button</code>. A small anchor keeps the sweep small.',
      engines: 'Firefox and Safari do exactly the same: just the <code>button</code> inside <code>.tab</code>.',
    },
    '1C': {
      code: '1C',
      name: 'Big anchor · itself',
      change: CLASS_ON_ITEM,
      rules: [{ anchor: 'main', condition: '.category-item.active' }],
      notice: '<code>main</code> holds the whole page, but its rule styles its anchor, so the re-check restyles one element: <code>main</code> itself.',
      engines: 'Firefox and Safari do exactly the same: one element, <code>main</code>.',
    },
    '1D': {
      code: '1D',
      name: 'Big anchor · inside',
      change: CLASS_ON_ITEM,
      rules: [{ anchor: 'main', condition: '.category-item.active', target: 'button' }],
      notice: 'The rule styles things inside <code>main</code>, so every <code>button</code> in the page restyles, including ones nowhere near the change. This is the shape that sweeps the page.',
      engines: 'Firefox and Safari do exactly the same: every <code>button</code> inside <code>main</code>.',
    },
    '2A': {
      code: '2A',
      name: 'Unrelated anchor',
      change: CLASS_ON_ITEM,
      rules: [
        { anchor: 'tab', condition: '.category-item.active' },
        { anchor: 'main', condition: '.promo', target: '.nav-link' },
      ],
      notice: '<code>main</code>’s rule is about <code>.promo</code>, which this change doesn’t touch. Chrome re-checks it anyway, and its rule styles inside, so every <code>.nav-link</code> restyles.',
      engines: 'Firefox and Safari don’t re-check <code>main</code>: its rule is about <code>.promo</code>. Only <code>.tab</code> restyles, one element.',
    },
    '2B': {
      code: '2B',
      name: 'Shared list',
      change: CLASS_ON_ITEM,
      rules: [
        { anchor: 'tab', condition: '.category-item.active', target: 'button' },
        { anchor: 'main', condition: '.promo', target: '.nav-link' },
      ],
      notice: '<code>main</code>’s rule only targets <code>.nav-link</code>, yet its re-check restyles every <code>button</code> too: <code>.tab</code>’s rule put <code>button</code> on the shared list.',
      engines: 'No shared list in Firefox or Safari: <code>.tab</code>’s re-check restyles its own button, and <code>main</code> isn’t re-checked at all.',
    },
    '2C': {
      code: '2C',
      name: 'One rule ends in *',
      change: CLASS_ON_ITEM,
      rules: [
        { anchor: 'tab', condition: '.category-item.active', target: '*' },
        { anchor: 'main', condition: '.promo', target: '.nav-link' },
      ],
      notice: 'One <code>*</code> puts “everything” on the shared list, so <code>main</code>’s re-check restyles every element inside it. With <code>body</code> as the anchor, that’s the whole page.',
      engines: 'In Firefox and Safari the <code>*</code> only applies to <code>.tab</code>’s own rule: <code>.tab</code>’s subtree restyles and <code>main</code> isn’t touched.',
    },
    '3A': {
      code: '3A',
      name: ':hover · plain :has() on main',
      change: HOVER_ON_ITEM,
      rules: [
        { anchor: 'tab', condition: '.category-item:hover' },
        { anchor: 'main', condition: '.promo', target: '.nav-link' },
      ],
      notice: 'In pseudo-class mode, <code>main:has(.promo)</code> is skipped because its <code>:has()</code> has no pseudo-class. A class change would have re-checked it and swept every <code>.nav-link</code>.',
      engines: 'Same result in Firefox and Safari: <code>main</code> isn’t re-checked, because its rule doesn’t mention <code>:hover</code>.',
    },
    '3B': {
      code: '3B',
      name: ':hover · :focus-visible on main',
      change: HOVER_ON_ITEM,
      rules: [
        { anchor: 'tab', condition: '.category-item:hover' },
        { anchor: 'main', condition: ':focus-visible', target: '.nav-link' },
      ],
      notice: '<code>main</code>’s <code>:has()</code> now contains <code>:focus-visible</code>. It isn’t <code>:hover</code>, but any pseudo-class is enough to get an anchor re-checked.',
      engines: 'Firefox and Safari don’t re-check <code>main</code>: its <code>:has()</code> mentions <code>:focus-visible</code>, not <code>:hover</code>.',
    },
    '4A': {
      code: '4A',
      name: 'The change is in nav',
      change: CLASS_ON_LINK,
      rules: [{ anchor: 'tab', condition: '.category-item.active' }],
      notice: 'The walk goes <code>nav</code> → <code>main</code> → <code>body</code>. <code>.tab</code> isn’t above the change, so its rule is never checked, even though it’s the one that mentions <code>.active</code>.',
      engines: 'Firefox and Safari do exactly the same: nothing above the change anchors that rule, so nothing restyles.',
    },
  };

  const ENGINES = { chrome: 'Chrome', other: 'Firefox · Safari' };
  let engine = 'chrome';
  const explorers = [];

  /* ---------------------------------------------------------------------- *
   * Simulation: turn a scenario into steps.
   * ---------------------------------------------------------------------- */
  const code = (s) => '<code>' + String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</code>';
  const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');
  const ruleText = (r) => selectorFor(r.anchor) + ':has(' + r.condition + ')' + (r.target ? ' ' + r.target : '');

  // Chrome (Blink) and Firefox/Safari (Gecko, WebKit) differ in which anchors a change
  // re-checks and in what a re-check restyles. Both were measured: see sheet 09.
  function simulate(s, eng) {
    const chrome = eng === 'chrome';
    const steps = [];
    const token = s.change.token;
    const pseudo = s.change.kind === 'pseudo';
    const shared = [...new Set(s.rules.filter((r) => r.target).map((r) => r.target))];
    const mentions = s.rules.filter((r) => r.condition.includes(token));
    const chain = ancestorsOf(s.change.node);
    const where = mentions.map((r) => code(ruleText(r))).join(' and ');
    const mentionAnchors = [...new Set(mentions.map((r) => code(selectorFor(r.anchor))))].join(' and ');

    steps.push({ type: 'change', spine: 0, html: s.change.html });

    let lookup;
    if (!chrome) {
      lookup = `Which rules mention ${code(token)}? ${where}. Firefox and Safari track each rule on its own, so only ${mentionAnchors} can be re-checked, and only for ${mentions.length === 1 ? 'that rule' : 'those rules'}.`;
    } else if (pseudo) {
      lookup = `Is ${code(token)} used inside any ${code(':has()')} on the page? Yes, in ${where}. So Chrome walks up in pseudo-class mode: it re-checks any anchor whose own ${code(':has()')} contains a pseudo-class.`;
    } else {
      lookup = `Is ${code(token)} mentioned inside any ${code(':has()')} on the page? Yes, in ${where}. Chrome checks the class name, not the whole condition, then walks up from the changed element.`;
    }
    steps.push({ type: 'lookup', spine: 0, mentions: mentions.map((r) => s.rules.indexOf(r)), html: lookup });

    const restyled = new Set();

    chain.forEach((id, i) => {
      const spine = i + 1;
      const name = code(selectorFor(id));
      const rule = s.rules.find((r) => r.anchor === id);

      if (!rule) {
        steps.push({
          type: 'visit',
          spine,
          node: id,
          html:
            id === 'body'
              ? `${name} isn’t an anchor, and it’s the top of the page, so the walk ends.`
              : `${name} isn’t a ${code(':has()')} anchor. Nothing to do here; keep walking.`,
        });
        return;
      }

      const ruleIndex = s.rules.indexOf(rule);
      const related = rule.condition.includes(token);

      // Firefox and Safari only re-check anchors of rules that mention the change.
      if (!chrome && !related) {
        steps.push({
          type: 'skip',
          reason: 'rule',
          spine,
          node: id,
          rule: ruleIndex,
          html: `${name} is an anchor, but its rule is about ${code(rule.condition)}, which this change doesn’t touch, so it isn’t re-checked.`,
        });
        return;
      }

      // Chrome's pseudo-class filter: any pseudo-class in the anchor's :has() will do.
      if (chrome && pseudo && !pseudoIn(rule.condition)) {
        steps.push({
          type: 'skip',
          reason: 'pseudo',
          spine,
          node: id,
          rule: ruleIndex,
          html: `${name} is an anchor, but ${code(':has(' + rule.condition + ')')} has no pseudo-class, so the walk skips it.`,
        });
        return;
      }

      // Chrome restyles the shared list; Firefox and Safari only this rule's targets.
      const targets = chrome ? shared : rule.target ? [rule.target] : [];
      const set = rule.target
        ? descendantsOf(id)
            .filter((n) => targets.some((t) => matches(n, t)))
            .map((n) => n.id)
        : [id];
      set.forEach((x) => restyled.add(x));
      const count = `<b>${plural(set.length, 'element')}</b>`;

      let why = `${name} is an anchor, so it’s re-checked.`;
      if (!chrome) {
        why = `${name} anchors a rule that mentions ${code(token)}, so it’s re-checked.`;
      } else if (pseudo && !related) {
        why = `${name}’s ${code(':has()')} contains ${code(pseudoIn(rule.condition))}. It isn’t ${code(token)}, but any pseudo-class is enough: re-check.`;
      } else if (!related) {
        why = `${name} is an anchor too, so it’s re-checked, even though its rule is about ${code(rule.condition)}. Chrome doesn’t track which rule made an element an anchor.`;
      }

      let what = 'Its rule styles the anchor itself: restyle <b>1 element</b>.';
      if (rule.target && chrome && shared.includes('*')) {
        what = `Its rule styles things inside it, so Chrome restyles everything under ${name} that’s on the shared list. The list includes ${code('*')}, so that’s every element: ${count}.`;
      } else if (rule.target && chrome) {
        what = `Its rule styles things inside it, so Chrome restyles everything under ${name} that’s on the shared list (${shared.map((t) => code(t)).join(', ')}): ${count}.`;
      } else if (rule.target === '*') {
        what = `Its target is ${code('*')}, so everything under ${name} restyles: ${count}.`;
      } else if (rule.target) {
        what = `Its rule styles things inside it, so its own targets under ${name} restyle (${code(rule.target)}): ${count}.`;
      }

      steps.push({ type: 'recheck', spine, node: id, rule: ruleIndex, self: !rule.target, set, html: why + ' ' + what });
    });

    const offPath = s.rules.map((r) => r.anchor).filter((a) => !chain.includes(a));
    let done = `<b>${restyled.size} of ${TOTAL}</b> elements restyled for one change.`;
    if (offPath.length) done += ` ${offPath.map((a) => code(selectorFor(a))).join(', ')} was never visited.`;
    done += chrome
      ? ' Chrome never checked whether any match actually changed.'
      : ' Firefox and Safari don’t check whether the match actually changed either.';
    steps.push({ type: 'done', spine: chain.length, offPath, html: done });

    return { steps, chain, shared };
  }

  /* ---------------------------------------------------------------------- *
   * DOM helpers
   * ---------------------------------------------------------------------- */
  function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    kids.forEach((kid) => kid != null && el.append(kid));
    return el;
  }

  function s(tag, attrs = {}, text) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
    if (text != null) el.textContent = text;
    return el;
  }

  /* ---------------------------------------------------------------------- *
   * Drawing
   * ---------------------------------------------------------------------- */
  const SPINE_Y = [470, 350, 230, 110];
  const SPINE_X = 16;
  const SPINE_W = 190;
  const SPINE_CX = SPINE_X + SPINE_W / 2;

  function buildDrawing(ex) {
    const svg = s('svg', { class: 'drawing', viewBox: '0 0 1100 600', 'aria-hidden': 'true', focusable: 'false' });

    svg.append(s('text', { class: 'dw-title', x: 1080, y: 22, 'text-anchor': 'end' }, 'Plan · the page'));

    // Plan
    const plan = s('g', { class: 'plan' });
    ex.nodeEls = new Map();
    for (const n of NODES) {
      const [x, y, w, hh] = n.rect;
      const isCard = n.cls.includes('card');
      const classes = ['node', 'node--' + n.tag];
      if (n.container) classes.push('node--container');
      const g = s('g', { class: classes.join(' '), 'data-id': n.id });
      const rx = n.tag === 'button' ? 7 : 2;
      g.append(s('rect', { class: 'node__box', x, y, width: w, height: hh, rx }));
      g.append(s('rect', { class: 'node__hatch', x, y, width: w, height: hh, rx }));
      if (n.tag === 'img') {
        g.append(s('path', { class: 'node__x', d: `M${x} ${y}L${x + w} ${y + hh}M${x + w} ${y}L${x} ${y + hh}` }));
      }
      // Under the label tab, so the tab stays readable while the ring runs.
      g.append(s('rect', { class: 'node__focus', x: x - 6, y: y - 6, width: w + 12, height: hh + 12, rx: 4 }));

      const label = s('text', { class: 'node__label' });
      if (n.container && !isCard) {
        const width = n.label.length * 7.9 + 18;
        g.append(s('rect', { class: 'node__tab', x: x + 12, y: y - 11, width, height: 22, rx: 2 }));
        label.setAttribute('class', 'node__label node__label--tab');
        label.setAttribute('x', x + 21);
        label.setAttribute('y', y + 4.5);
      } else if (isCard) {
        label.setAttribute('x', x + 10);
        label.setAttribute('y', y + 22);
      } else if (n.tag === 'button' || n.tag === 'img') {
        label.setAttribute('x', x + w / 2);
        label.setAttribute('y', y + hh / 2 + 5);
        label.setAttribute('text-anchor', 'middle');
        if (n.tag === 'img') label.setAttribute('class', 'node__label node__label--img');
      } else {
        label.setAttribute('x', x + 12);
        label.setAttribute('y', y + hh / 2 + 5);
      }
      label.append(document.createTextNode(n.label));
      const token = s('tspan', { class: 'node__token' });
      label.append(token);
      g.append(label);

      plan.append(g);
      ex.nodeEls.set(n.id, { g, token });
    }
    svg.append(plan);

    // Pointer for :hover scenarios, resting on the changed item.
    ex.cursor = s('path', {
      class: 'cursor',
      d: 'M0 0V21l5.2-4.9 3.6 8.4 3.6-1.5-3.6-8.3H16z',
      transform: 'translate(1027 341)',
    });
    svg.append(ex.cursor);

    // The walk (ancestor chain)
    const spine = s('g', { class: 'spine' });
    spine.append(s('text', { class: 'dw-title', x: SPINE_X, y: 90 }, 'The walk ↑'));
    ex.spineLines = [];
    for (let i = 0; i < 3; i++) {
      const line = s('path', {
        class: 'spine__line',
        d: `M${SPINE_CX} ${SPINE_Y[i]}V${SPINE_Y[i + 1] + 60}`,
        'marker-end': 'url(#arrow)',
      });
      ex.spineLines.push(line);
      spine.append(line);
    }
    ex.spineNodes = SPINE_Y.map((y) => {
      const g = s('g', { class: 'spine__node' });
      g.append(s('rect', { class: 'spine__box', x: SPINE_X, y, width: SPINE_W, height: 56, rx: 4 }));
      const label = s('text', { class: 'spine__label', x: SPINE_X + 12, y: y + 24 });
      const status = s('text', { class: 'spine__status', x: SPINE_X + 12, y: y + 44 });
      const badge = s('g', { class: 'spine__badge' });
      badge.append(
        s('circle', { cx: SPINE_X + SPINE_W - 16, cy: y + 18, r: 9 }),
        s('text', { x: SPINE_X + SPINE_W - 16, y: y + 22, 'text-anchor': 'middle' }, 'A')
      );
      g.append(label, status, badge);
      spine.append(g);
      return { g, label, status, badge, isAnchor: false };
    });
    spine.append(s('text', { class: 'dw-title', x: SPINE_X, y: 556 }, 'Ⓐ = anchor'));
    ex.walker = s('circle', { class: 'walker', r: 7, cx: 0, cy: 0 });
    spine.append(ex.walker);
    svg.append(spine);

    ex.scan = s('rect', { class: 'scan', x: 0, y: 0, width: 3, height: 10 });
    svg.append(ex.scan);

    return svg;
  }

  /* ---------------------------------------------------------------------- *
   * Explorer
   * ---------------------------------------------------------------------- */
  let uid = 0;

  function createExplorer(root) {
    const ids = root.dataset.scenarios.split(',');
    const id = 'ex' + ++uid;
    const ex = { root, ids, k: 0, playing: false, timer: 0, visible: false, started: false };
    root.textContent = '';

    // Tabs
    const tablist = h('div', { class: 'ex-tabs', role: 'tablist', 'aria-label': (root.dataset.name || 'Drawing') + ' scenarios' });
    ex.tabEls = ids.map((sid) => {
      const sc = SCENARIOS[sid];
      const b = h(
        'button',
        { type: 'button', class: 'ex-tab', role: 'tab', 'aria-selected': 'false', 'aria-controls': id + '-panel', tabindex: '-1', 'data-id': sid },
        h('span', { class: 'ex-tab__code', text: sc.code }),
        h('span', { class: 'ex-tab__name', text: sc.name })
      );
      b.addEventListener('click', () => select(ex, sid, true));
      tablist.append(b);
      return b;
    });
    tablist.addEventListener('keydown', (e) => {
      const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (!keys.includes(e.key)) return;
      e.preventDefault();
      const i = ex.tabEls.findIndex((b) => b.getAttribute('aria-selected') === 'true');
      const last = ex.tabEls.length - 1;
      const j = { ArrowLeft: i > 0 ? i - 1 : last, ArrowRight: i < last ? i + 1 : 0, Home: 0, End: last }[e.key];
      ex.tabEls[j].focus();
      select(ex, ex.tabEls[j].dataset.id, true);
    });

    // Browser switch, shared by every drawing on the page.
    const engineGroup = h('div', { class: 'ex-engine', role: 'group', 'aria-label': 'Browser' }, h('span', { class: 'ex-engine__label', text: 'Browser' }));
    ex.engineBtns = Object.entries(ENGINES).map(([key, label]) => {
      const b = h('button', { type: 'button', class: 'ex-engine__btn', 'aria-pressed': String(key === engine), 'data-engine': key }, label);
      b.addEventListener('click', () => setEngine(key, ex));
      engineGroup.append(b);
      return b;
    });

    // Figure
    const panel = h('div', { class: 'ex-panel', id: id + '-panel', role: 'tabpanel' });
    const figure = h('figure', { class: 'ex-figure' });
    const scroll = h('div', { class: 'ex-scroll' });
    ex.svg = buildDrawing(ex);
    scroll.append(ex.svg);
    ex.scroll = scroll;
    figure.append(
      scroll,
      h('figcaption', {
        class: 'ex-legend',
        html:
          '<span><i class="sw sw--change"></i>The change</span>' +
          '<span><i class="sw sw--recheck"></i>Being re-checked</span>' +
          '<span><i class="sw sw--restyled"></i>Restyled</span>' +
          '<span><i class="sw sw--self"></i>Anchor restyled itself</span>' +
          '<span><i class="sw sw--skip"></i>Skipped</span>' +
          '<span class="ex-hint">Swipe the drawing to pan →</span>',
      })
    );

    // Controls
    ex.backBtn = h('button', { type: 'button', class: 'ex-btn' }, '◂ Back');
    ex.playBtn = h('button', { type: 'button', class: 'ex-btn ex-btn--play' }, '▶ Play');
    ex.nextBtn = h('button', { type: 'button', class: 'ex-btn' }, 'Step ▸');
    ex.backBtn.addEventListener('click', () => {
      pause(ex);
      setStep(ex, ex.k - 1, false);
      announce(ex);
    });
    ex.nextBtn.addEventListener('click', () => {
      pause(ex);
      setStep(ex, ex.k + 1, true);
      announce(ex);
    });
    ex.playBtn.addEventListener('click', () => (ex.playing ? pause(ex) : play(ex)));

    ex.count = {
      rechecked: h('b', { text: '0' }),
      skipped: h('b', { text: '0' }),
      restyled: h('b', { text: '0' }),
    };
    const counters = h(
      'div',
      { class: 'ex-counters' },
      h('span', { class: 'c-recheck' }, 'Re-checked', ex.count.rechecked),
      h('span', { class: 'c-skip' }, 'Skipped', ex.count.skipped),
      h('span', { class: 'c-restyle' }, 'Restyled', ex.count.restyled, h('small', { text: ' / ' + TOTAL }))
    );
    const controls = h('div', { class: 'ex-controls' }, ex.backBtn, ex.playBtn, ex.nextBtn, counters);

    // Steps + side panels
    ex.stepsList = h('ol', { class: 'ex-steps', 'aria-label': 'Steps' });
    ex.rulesList = h('ul', { class: 'rules' });
    ex.chips = h('div', { class: 'chips' });
    ex.sharedTitle = h('h4', { text: 'Shared list' });
    ex.notice = h('p');
    ex.engineNote = h('p', { class: 'engine-note' });
    const side = h(
      'div',
      { class: 'ex-side' },
      h('div', { class: 'panel' }, h('h4', { text: 'Rules on the page' }), ex.rulesList, h('div', { class: 'shared' }, ex.sharedTitle, ex.chips)),
      h('div', { class: 'panel panel--notice' }, h('h4', { text: 'What to notice' }), ex.notice, ex.engineNote)
    );
    const grid = h('div', { class: 'ex-grid' }, ex.stepsList, side);

    ex.live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
    panel.append(figure, controls, grid, ex.live);
    root.append(h('div', { class: 'ex-bar' }, tablist, engineGroup), panel);

    explorers.push(ex);
    select(ex, ids[0], false);

    // Play once when the drawing first comes into view; pause when it leaves.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            ex.visible = entry.isIntersecting;
            if (ex.visible && !ex.started && !reduced()) {
              ex.started = true;
              play(ex);
            } else if (!ex.visible && ex.playing) {
              pause(ex);
            }
          }
        },
        { threshold: 0.45 }
      ).observe(figure);
    }
  }

  function ruleRow(rule, i, token) {
    const cond = rule.condition.includes(token)
      ? rule.condition.replace(token, `<mark class="tok-hit">${token}</mark>`)
      : rule.condition;
    const sel =
      `<span class="tok-anchor">${selectorFor(rule.anchor)}</span><span class="tok-punc">:has(</span>` +
      `<span class="tok-cond">${cond}</span><span class="tok-punc">)</span>` +
      (rule.target ? ` <span class="tok-target">${rule.target}</span>` : '');
    return h(
      'li',
      { class: 'rule', 'data-index': i },
      h('code', { class: 'rule__sel', html: sel }),
      h('span', { class: 'rule__tag', text: rule.target ? 'Styles inside its anchor' : 'Styles its anchor itself' })
    );
  }

  function select(ex, sid, userInitiated) {
    pause(ex);
    ex.sid = sid;
    ex.scenario = SCENARIOS[sid];
    ex.sim = simulate(ex.scenario, engine);
    const chrome = engine === 'chrome';
    const { scenario, sim } = ex;

    ex.tabEls.forEach((b) => {
      const on = b.dataset.id === sid;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });

    const chainIds = [scenario.change.node, ...sim.chain];
    ex.spineNodes.forEach((sn, i) => {
      const nid = chainIds[i];
      sn.label.textContent = selectorFor(nid) + (i === 0 ? scenario.change.token : '');
      sn.isAnchor = scenario.rules.some((r) => r.anchor === nid);
      sn.badge.style.display = sn.isAnchor ? '' : 'none';
    });
    ex.nodeEls.forEach(({ token }, nid) => {
      token.textContent = nid === scenario.change.node ? scenario.change.token : '';
    });
    ex.cursor.classList.toggle('is-on', scenario.change.kind === 'pseudo');

    ex.rulesList.replaceChildren(...scenario.rules.map((r, i) => ruleRow(r, i, scenario.change.token)));
    ex.rulesList.querySelectorAll('.rule').forEach((li, i) => {
      li.addEventListener('pointerenter', () => hoverRule(ex, scenario.rules[i]));
      li.addEventListener('pointerleave', () => hoverRule(ex, null));
    });
    hoverRule(ex, null);
    ex.sharedTitle.textContent = chrome ? 'Shared list' : 'Targets, kept per rule';
    const inside = scenario.rules.map((r, i) => [r, i]).filter(([r]) => r.target);
    const label = (t) => (t === '*' ? '* · everything' : t);
    ex.chips.replaceChildren(
      ...(!inside.length
        ? [h('span', { class: 'chip chip--empty', text: 'Empty: no rule styles inside its anchor' })]
        : chrome
          ? sim.shared.map((t) => h('span', { class: 'chip', text: label(t) }))
          : inside.map(([r, i]) => h('span', { class: 'chip', 'data-rule': i, text: `${selectorFor(r.anchor)} → ${label(r.target)}` })))
    );
    ex.notice.innerHTML = chrome ? scenario.notice : scenario.engines;
    ex.engineNote.innerHTML =
      `<span class="engine-note__tag">${chrome ? 'Firefox · Safari' : 'Chrome'}</span>` + (chrome ? scenario.engines : scenario.notice);

    ex.stepsList.replaceChildren(
      ...sim.steps.map((st, i) => {
        const btn = h('button', { type: 'button', class: 'ex-step__btn', html: st.html });
        btn.addEventListener('click', () => {
          pause(ex);
          setStep(ex, i, i > ex.k);
          announce(ex);
        });
        return h('li', { class: 'ex-step' }, btn);
      })
    );

    setStep(ex, 0, false);
    if (userInitiated && !reduced()) play(ex);
  }

  // Hovering a rule outlines its anchor, and what that one rule styles, on the plan.
  function hoverRule(ex, rule) {
    const targets = new Set(
      rule?.target ? descendantsOf(rule.anchor).filter((n) => matches(n, rule.target)).map((n) => n.id) : []
    );
    ex.nodeEls.forEach(({ g }, nid) => {
      g.classList.toggle('is-hover-anchor', !!rule && nid === rule.anchor);
      g.classList.toggle('is-hover-target', targets.has(nid));
    });
  }

  // Counters tick to their new value instead of jumping.
  function countTo(el, value, animate) {
    cancelAnimationFrame(el.countRaf);
    const from = Number(el.textContent) || 0;
    if (!animate || from === value || reduced()) {
      el.textContent = value;
      return;
    }
    const start = performance.now();
    const frame = (now) => {
      const t = Math.min(1, (now - start) / 450);
      el.textContent = Math.round(from + (value - from) * (1 - (1 - t) ** 3));
      if (t < 1) el.countRaf = requestAnimationFrame(frame);
    };
    el.countRaf = requestAnimationFrame(frame);
  }

  function setEngine(next, source) {
    if (next === engine) return;
    engine = next;
    for (const ex of explorers) {
      ex.engineBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.engine === engine)));
      select(ex, ex.sid, ex === source);
    }
  }

  function setStep(ex, k, animate) {
    const { steps } = ex.sim;
    const last = steps.length - 1;
    ex.k = Math.max(0, Math.min(k, last));
    const step = steps[ex.k];
    const anim = animate && !reduced();

    // Fold every step up to k into one state.
    const restyledAt = new Map();
    const self = new Set();
    const rechecked = new Set();
    const skipped = new Set();
    const skipReason = new Map();
    const visited = new Set([0]);
    for (let i = 0; i <= ex.k; i++) {
      const st = steps[i];
      visited.add(Math.min(st.spine, SPINE_Y.length - 1));
      if (st.type === 'recheck') {
        rechecked.add(st.node);
        if (st.self) self.add(st.node);
        else st.set.forEach((nid) => restyledAt.has(nid) || restyledAt.set(nid, i));
      } else if (st.type === 'skip') {
        skipped.add(st.node);
        skipReason.set(st.node, st.reason);
      }
    }
    const restyledCount = new Set([...restyledAt.keys(), ...self]).size;

    // Plan
    const sweep = step.type === 'recheck' && !step.self ? byId.get(step.node).rect : null;
    const offPath = new Set();
    if (step.type === 'done') {
      step.offPath.forEach((a) => {
        offPath.add(a);
        descendantsOf(a).forEach((n) => offPath.add(n.id));
      });
    }
    ex.nodeEls.forEach(({ g }, nid) => {
      const n = byId.get(nid);
      const fresh = anim && sweep && restyledAt.get(nid) === ex.k;
      const delay = fresh ? Math.round(Math.max(0, (n.rect[0] - sweep[0]) / sweep[2]) * 650) : 0;
      g.style.setProperty('--delay', delay + 'ms');
      g.classList.toggle('is-changed', nid === ex.scenario.change.node);
      g.classList.toggle('is-current', ['recheck', 'skip', 'visit'].includes(step.type) && step.node === nid);
      g.classList.toggle('is-rechecked', rechecked.has(nid));
      g.classList.toggle('is-skipped', skipped.has(nid));
      g.classList.toggle('is-restyled', restyledAt.has(nid));
      g.classList.toggle('is-restyled-self', self.has(nid));
      g.classList.toggle('is-offpath', offPath.has(nid));
    });

    // The walk
    const chainIds = [ex.scenario.change.node, ...ex.sim.chain];
    ex.spineNodes.forEach((sn, i) => {
      const nid = chainIds[i];
      const isVisited = visited.has(i);
      let status = '';
      let state = '';
      if (i === 0) {
        status = ex.k >= 1 ? 'changed · mentioned ✓' : 'changed';
        state = 'change';
      } else if (isVisited) {
        if (rechecked.has(nid)) [status, state] = ['re-checked', 'recheck'];
        else if (skipped.has(nid)) [status, state] = [skipReason.get(nid) === 'rule' ? 'not re-checked' : 'skipped', 'skip'];
        else [status, state] = ['not an anchor', 'pass'];
      } else if (sn.isAnchor) {
        status = 'anchor';
      }
      sn.status.textContent = status;
      sn.g.dataset.state = state;
      sn.g.classList.toggle('is-visited', isVisited);
      sn.g.classList.toggle('is-current', step.type !== 'done' && step.spine === i);
    });
    const wi = Math.min(step.spine, SPINE_Y.length - 1);
    ex.spineLines.forEach((line, i) => {
      const walked = visited.has(i + 1);
      line.classList.toggle('is-walked', walked);
      line.classList.toggle('is-flowing', walked && step.type !== 'done' && wi === i + 1);
      line.setAttribute('marker-end', walked ? 'url(#arrow-cyan)' : 'url(#arrow)');
    });
    ex.walker.style.transform = `translate(${SPINE_X}px, ${SPINE_Y[wi] + 28}px)`;

    // Scan line across the anchor being swept.
    if (anim && sweep) {
      const [x, y, w, hh] = sweep;
      ex.scan.classList.remove('is-running');
      ex.scan.setAttribute('x', x);
      ex.scan.setAttribute('y', y);
      ex.scan.setAttribute('height', hh);
      ex.scan.style.setProperty('--w', w + 'px');
      void ex.scan.getBoundingClientRect();
      ex.scan.classList.add('is-running');
    } else if (!anim) {
      ex.scan.classList.remove('is-running');
    }

    // Panels
    ex.rulesList.querySelectorAll('.rule').forEach((li, i) => {
      li.classList.toggle('is-mentioned', step.type === 'lookup' && step.mentions.includes(i));
      li.classList.toggle('is-active', step.type === 'recheck' && step.rule === i);
      li.classList.toggle('is-skipped', step.type === 'skip' && step.rule === i);
    });
    const perRule = engine !== 'chrome';
    ex.chips.querySelectorAll('.chip').forEach((c) =>
      c.classList.toggle('is-active', !!sweep && (!perRule || Number(c.dataset.rule) === step.rule))
    );
    ex.stepsList.querySelectorAll('.ex-step').forEach((li, i) => {
      li.classList.toggle('is-done', i < ex.k);
      li.classList.toggle('is-current', i === ex.k);
      const btn = li.firstElementChild;
      if (i === ex.k) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
    });

    countTo(ex.count.rechecked, rechecked.size, anim);
    countTo(ex.count.skipped, skipped.size, anim);
    countTo(ex.count.restyled, restyledCount, anim);

    ex.backBtn.disabled = ex.k === 0;
    ex.nextBtn.disabled = ex.k === last;
    if (!ex.playing) ex.playBtn.textContent = ex.k === last ? '↻ Replay' : '▶ Play';

    follow(ex, step, anim);
  }

  // On narrow screens the drawing pans; keep the element the step is about in view.
  function follow(ex, step, smooth) {
    const { scroll, svg } = ex;
    if (scroll.scrollWidth <= scroll.clientWidth + 2) return;
    const focus = ['recheck', 'skip', 'visit'].includes(step.type) && step.node !== 'body' ? step.node : ex.scenario.change.node;
    const [x, , w] = byId.get(focus).rect;
    const scale = svg.getBoundingClientRect().width / 1100;
    scroll.scrollTo({ left: (x + w / 2) * scale - scroll.clientWidth / 2, behavior: smooth ? 'smooth' : 'auto' });
  }

  const DWELL = { change: 1500, lookup: 2800, visit: 1600, skip: 2600, recheck: 3200, done: 0 };

  function play(ex) {
    const last = ex.sim.steps.length - 1;
    if (ex.k >= last) setStep(ex, 0, false);
    ex.playing = true;
    ex.playBtn.textContent = '❚❚ Pause';
    tick(ex);
  }

  function tick(ex) {
    clearTimeout(ex.timer);
    const last = ex.sim.steps.length - 1;
    ex.timer = setTimeout(() => {
      if (ex.k >= last) return pause(ex);
      setStep(ex, ex.k + 1, true);
      if (ex.k >= last) pause(ex);
      else tick(ex);
    }, DWELL[ex.sim.steps[ex.k].type] || 1600);
  }

  function pause(ex) {
    ex.playing = false;
    clearTimeout(ex.timer);
    if (ex.sim) ex.playBtn.textContent = ex.k === ex.sim.steps.length - 1 ? '↻ Replay' : '▶ Play';
  }

  function announce(ex) {
    const tmp = document.createElement('div');
    tmp.innerHTML = ex.sim.steps[ex.k].html;
    ex.live.textContent = `Step ${ex.k + 1} of ${ex.sim.steps.length}. ${tmp.textContent}`;
  }

  /* ---------------------------------------------------------------------- *
   * Flowchart traces: each tab lights up one change's path through the chart.
   * ---------------------------------------------------------------------- */

  // Which nodes each edge joins, so hovering a node can light its connections.
  const FLOW_EDGES = {
    'e-start-d1': ['start', 'd1'],
    'e-d1-no': ['d1', 'nothing'],
    'e-d1-yes': ['d1', 'd2'],
    'e-d2-no': ['d2', 'end'],
    'e-d2-yes': ['d2', 'step'],
    'e-step-d3': ['step', 'd3'],
    'e-d3-no': ['d3', 'd2'],
    'e-d3-yes': ['d3', 'd4'],
    'e-d4-anchor': ['d4', 'mark-anchor'],
    'e-d4-inside': ['d4', 'mark-inside'],
    'e-loop-anchor': ['mark-anchor', 'd2'],
    'e-loop-inside': ['mark-inside', 'd2'],
    'e-loop-join': ['mark-anchor mark-inside', 'd2'],
    'e-loop-bus': ['d3 mark-anchor mark-inside', 'd2'],
  };
  const FLOW_NOTES = { d3: ['chrome-d3'], 'chrome-d3': ['d3'] };

  function initTraces() {
    const box = document.querySelector('[data-trace]');
    const flow = document.querySelector('.flow');
    if (!box || !flow) return;
    const tabs = [...box.querySelectorAll('[data-trace-tab]')];
    const panels = [...box.querySelectorAll('[data-trace-panel]')];
    const parts = [...flow.querySelectorAll('[data-f]')];
    const playBtn = box.querySelector('.trace__play');
    let panel = null;
    let timer = 0;

    const stepsOf = () => [...(panel?.querySelectorAll('li[data-step]') || [])];
    const focusNode = (id) => parts.forEach((g) => g.classList.toggle('is-focus', !!id && g.dataset.f === id));

    // In a trace, hovering a node picks out its steps. On the whole chart, it
    // lights the node and everything it connects to.
    const hoverNode = (id) => {
      focusNode(id);
      stepsOf().forEach((li) => li.classList.toggle('is-linked', !!id && li.dataset.step === id));
      const exploring = !!id && !flow.classList.contains('is-tracing');
      flow.classList.toggle('is-exploring', exploring);
      const near = new Set(exploring ? [id, ...(FLOW_NOTES[id] || [])] : []);
      if (exploring) {
        for (const [edge, [from, to]] of Object.entries(FLOW_EDGES)) {
          const froms = from.split(' ');
          if (to === id) [edge, ...froms].forEach((n) => near.add(n));
          else if (froms.includes(id)) [edge, to].forEach((n) => near.add(n));
        }
      }
      parts.forEach((g) => g.classList.toggle('is-near', near.has(g.dataset.f)));
    };

    const stop = () => {
      clearTimeout(timer);
      timer = 0;
      playBtn.textContent = '▶ Play';
      stepsOf().forEach((li) => li.classList.remove('is-current'));
      focusNode(null);
    };

    // Play walks through the open trace one step at a time.
    const play = () => {
      const steps = stepsOf();
      if (!steps.length) return;
      hoverNode(null);
      playBtn.textContent = '■ Stop';
      let i = 0;
      const next = () => {
        steps.forEach((li, j) => li.classList.toggle('is-current', j === i));
        focusNode(steps[i].dataset.step);
        i += 1;
        timer = i < steps.length ? setTimeout(next, 1500) : setTimeout(stop, 2200);
      };
      next();
    };

    const show = (id) => {
      stop();
      tabs.forEach((t) => {
        const on = t.dataset.traceTab === id;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach((p) => (p.hidden = p.dataset.tracePanel !== id));
      panel = panels.find((p) => p.dataset.tracePanel === id);
      const path = new Set((panel?.dataset.path || '').split(/\s+/).filter(Boolean));
      flow.classList.toggle('is-tracing', path.size > 0);
      parts.forEach((g) => g.classList.toggle('is-on', path.has(g.dataset.f)));
      playBtn.hidden = !stepsOf().length;
      hoverNode(null);
    };

    tabs.forEach((t) => t.addEventListener('click', () => show(t.dataset.traceTab)));
    box.querySelector('[role="tablist"]').addEventListener('keydown', (e) => {
      const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (!keys.includes(e.key)) return;
      e.preventDefault();
      const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      const last = tabs.length - 1;
      const j = { ArrowLeft: i > 0 ? i - 1 : last, ArrowRight: i < last ? i + 1 : 0, Home: 0, End: last }[e.key];
      tabs[j].focus();
      show(tabs[j].dataset.traceTab);
    });
    playBtn.addEventListener('click', () => (timer ? stop() : play()));

    // Point at a step to pick out its part of the chart, or at a node to pick out its steps.
    box.addEventListener('pointerover', (e) => {
      if (!timer && e.target.closest('ol')) focusNode(e.target.closest('[data-step]')?.dataset.step);
    });
    box.addEventListener('pointerleave', () => timer || focusNode(null));
    flow.addEventListener('pointerover', (e) => {
      if (timer) return;
      const id = e.target.closest('[data-f]')?.dataset.f;
      hoverNode(id && !(id in FLOW_EDGES) ? id : null);
    });
    flow.addEventListener('pointerleave', () => timer || hoverNode(null));

    show((tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0]).dataset.traceTab);
  }

  /* ---------------------------------------------------------------------- *
   * Hero: a CAD-style crosshair with coordinates follows the pointer.
   * ---------------------------------------------------------------------- */
  function initHero() {
    const svg = document.querySelector('.hero-svg');
    if (!svg || !matchMedia('(hover: hover)').matches) return;
    const [, , W, H] = svg.getAttribute('viewBox').split(' ').map(Number);
    const lineX = s('line', { class: 'hx-cross', x1: 0, x2: W });
    const lineY = s('line', { class: 'hx-cross', y1: 0, y2: H });
    const readout = s('text', { class: 'hx-readout' });
    svg.append(lineX, lineY, readout);
    const pad = (v) => String(Math.round(v)).padStart(3, '0');
    let last = null;
    let raf = 0;
    const draw = () => {
      raf = 0;
      const ctm = svg.getScreenCTM();
      if (!last || !ctm) return;
      const p = new DOMPoint(last.clientX, last.clientY).matrixTransform(ctm.inverse());
      const x = Math.max(0, Math.min(W, p.x));
      const y = Math.max(0, Math.min(H, p.y));
      lineX.setAttribute('y1', y);
      lineX.setAttribute('y2', y);
      lineY.setAttribute('x1', x);
      lineY.setAttribute('x2', x);
      readout.setAttribute('x', x > W - 130 ? x - 122 : x + 10);
      readout.setAttribute('y', y < 22 ? y + 18 : y - 9);
      readout.textContent = `X ${pad(x)} · Y ${pad(y)}`;
    };
    svg.addEventListener('pointermove', (e) => {
      last = e;
      raf ||= requestAnimationFrame(draw);
    });
    svg.addEventListener('pointerenter', () => svg.classList.add('is-pointing'));
    svg.addEventListener('pointerleave', () => svg.classList.remove('is-pointing'));
  }

  /* ---------------------------------------------------------------------- *
   * Measured: the bars grow in, row by row, when the table comes into view.
   * ---------------------------------------------------------------------- */
  function initBars() {
    const table = document.querySelector('.matrix');
    if (!table || !('IntersectionObserver' in window)) return;
    table.querySelectorAll('tbody tr').forEach((tr, i) => tr.style.setProperty('--r', i));
    table.classList.add('will-reveal');
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      table.classList.add('is-visible');
      io.disconnect();
    }, { threshold: 0.25 });
    io.observe(table);
  }

  document.querySelectorAll('.explorer[data-scenarios]').forEach(createExplorer);
  initTraces();
  initHero();
  initBars();
})();
