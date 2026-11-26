(function () {
  const sr = (document.documentElement.lang || "").indexOf("sr") === 0;
  const bookTitle = (document.querySelector('meta[name="book-title"]') || {}).content
    || document.title
    || location.pathname;
  const pageName = (location.pathname.split("/").pop() || "index.html");
  const bookId = bookTitle + "::" + pageName;
  const KEY = "citaonica-notes:" + bookId;
  const OLD_KEY = "citaonica-notes:" + bookTitle;
  const COLORS = [
    { id: "rose", hex: "#f8c5d6" },
    { id: "orange", hex: "#ffd9a3" },
    { id: "gold", hex: "#fff3b0" },
    { id: "green", hex: "#c6ebc8" },
    { id: "blue", hex: "#b7e0fb" },
    { id: "violet", hex: "#d4c4ee" }
  ];
  const t = {
    hint: sr ? "Одабери боју, затим означи текст." : "Odaberi boju, zatim označi tekst.",
    hintTouch: sr ? "Одабери боју за означавање текста." : "Odaberi boju za označavanje teksta.",
    note: sr ? "Биљешка" : "Bilješka",
    remove: sr ? "Уклони" : "Ukloni",
    list: sr ? "Означено" : "Označeno",
    markBtn: sr ? "Означи" : "Označi",
    empty: sr ? "Нема ознака на овој књизи." : "Nema oznaka na ovoj knjizi.",
    prompt: sr ? "Биљешка уз овај одломак:" : "Bilješka uz ovaj odlomak:",
    clear: sr ? "Уклони ознаку" : "Ukloni oznaku",
    copy: sr ? "Копирај" : "Kopiraj",
    addNote: sr ? "Биљешка" : "Bilješka",
    highlight: sr ? "Означи" : "Označi",
    edTitle: sr ? "Биљешка" : "Bilješka",
    edPlaceholder: sr ? "Напиши биљешку уз овај одломак…" : "Napiši bilješku uz ovaj odlomak…",
    edSave: sr ? "Спреми" : "Spremi",
    edCancel: sr ? "Одустани" : "Odustani",
    edDelete: sr ? "Обриши биљешку" : "Obriši bilješku",
    edHint: sr ? "Ctrl+Enter спрема · Esc одустаје" : "Ctrl+Enter sprema · Esc odustaje"
  };

  /* Uređivač bilješke (umjesto window.prompt). done(text) dobiva isto što je prompt vraćao:
     null = odustao, "" = prazna bilješka (ostaje samo oznaka), inače tekst bilješke. */
  function noteEditor(quote, current, done) {
    const prev = document.getElementById("note-modal");
    if (prev) prev.remove();
    const back = document.activeElement;
    const initial = current || "";
    const ov = document.createElement("div");
    ov.id = "note-modal";
    ov.className = "auth-modal note-modal";
    const card = document.createElement("div");
    card.className = "auth-modal-card note-modal-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-labelledby", "note-modal-title");
    const x = document.createElement("button");
    x.type = "button";
    x.className = "auth-modal-x";
    x.setAttribute("aria-label", t.edCancel);
    x.textContent = "×";
    const h = document.createElement("h2");
    h.id = "note-modal-title";
    h.textContent = t.edTitle;
    const q = document.createElement("blockquote");
    q.className = "note-modal-quote";
    q.textContent = quote || "";
    const ta = document.createElement("textarea");
    ta.className = "note-modal-text";
    ta.rows = 3;
    ta.value = initial;
    ta.placeholder = t.edPlaceholder;
    ta.setAttribute("aria-label", t.prompt);
    const row = document.createElement("div");
    row.className = "note-modal-actions";
    function btn(label, cls, fn) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = cls;
      b.textContent = label;
      b.addEventListener("click", fn);
      return b;
    }
    const hint = document.createElement("p");
    hint.className = "note-modal-hint";
    hint.textContent = t.edHint;
    let closed = false;
    function close(result) {
      if (closed) return;
      closed = true;
      ov.remove();
      document.body.classList.remove("note-modal-open");
      document.removeEventListener("keydown", onKey, true);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", fit);
        window.visualViewport.removeEventListener("scroll", fit);
      }
      try { if (back && back.focus) back.focus({ preventScroll: true }); } catch (e) {}
      done(result);
    }
    const save = function () { close(ta.value); };
    const cancel = function () { close(null); };
    if (initial) row.appendChild(btn(t.edDelete, "note-modal-del", function () { close(""); }));
    row.appendChild(btn(t.edCancel, "note-modal-cancel", cancel));
    row.appendChild(btn(t.edSave, "note-modal-save", save));
    x.addEventListener("click", cancel);
    card.appendChild(x);
    card.appendChild(h);
    if (quote) card.appendChild(q);
    card.appendChild(ta);
    card.appendChild(row);
    if (!isTouch()) card.appendChild(hint);
    ov.appendChild(card);
    // klik na pozadinu odustaje samo ako ništa nije promijenjeno
    ov.addEventListener("click", function (ev) {
      if (ev.target !== ov) return;
      if (ta.value === initial) cancel();
      else ta.focus({ preventScroll: true });
    });
    function grow() {
      ta.style.height = "auto";
      ta.style.height = Math.max(ta.scrollHeight + 2, 0) + "px";
    }
    ta.addEventListener("input", grow);
    function onKey(ev) {
      if (!card.contains(document.activeElement) && ev.key !== "Escape") {
        if (ev.key === "Tab") { ev.preventDefault(); ta.focus(); }
        return;
      }
      if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); cancel(); return; }
      if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); save(); return; }
      if (ev.key === "Tab") {
        const f = Array.prototype.slice.call(card.querySelectorAll("button, textarea"));
        const i = f.indexOf(document.activeElement);
        if (ev.shiftKey && (i <= 0)) { ev.preventDefault(); f[f.length - 1].focus(); }
        else if (!ev.shiftKey && i === f.length - 1) { ev.preventDefault(); f[0].focus(); }
      }
    }
    document.addEventListener("keydown", onKey, true);
    // mobitel: prozor prati vidljivi dio ekrana iznad tipkovnice
    function fit() {
      const vv = window.visualViewport;
      if (!vv) return;
      ov.style.top = vv.offsetTop + "px";
      ov.style.height = vv.height + "px";
    }
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", fit);
      window.visualViewport.addEventListener("scroll", fit);
    }
    document.body.appendChild(ov);
    document.body.classList.add("note-modal-open");
    fit();
    grow();
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }

  let pendingQuote = "";
  let sheetMode = "actions";

  let items = [];
  try { items = JSON.parse(localStorage.getItem(KEY) || "[]") || []; } catch (e) { items = []; }
  if (!items.length) {
    try { items = JSON.parse(localStorage.getItem(OLD_KEY) || "[]") || []; } catch (e) { items = []; }
  }

  let active = "";
  let modeOn = false;

  function sb() {
    try {
      return window.CitaonicaAuth && window.CitaonicaAuth.client && window.CitaonicaAuth.client();
    } catch (e) { return null; }
  }
  function userId() {
    const u = window.CitaonicaAuth && window.CitaonicaAuth.getUser && window.CitaonicaAuth.getUser();
    return u && u.id;
  }
  function persist() {
    localStorage.setItem(KEY, JSON.stringify(items));
    pushCloud();
  }
  async function pushCloud() {
    const client = sb();
    const uid = userId();
    if (!client || !uid) return;
    const rows = items.map(function (it) {
      return {
        id: it.id,
        user_id: uid,
        book_id: bookId,
        quote: it.quote || "",
        note: it.text || "",
        color: it.color || "gold",
        kind: it.kind || "mark",
        updated_at: new Date(it.at || Date.now()).toISOString()
      };
    });
    try {
      await client.from("highlights").delete().eq("user_id", uid).eq("book_id", bookId);
      if (rows.length) await client.from("highlights").insert(rows);
    } catch (e) {
      console.warn("highlights push", e);
    }
  }
  async function pullCloud() {
    const client = sb();
    const uid = userId();
    if (!client || !uid) return;
    try {
      const res = await client.from("highlights").select("*").eq("book_id", bookId);
      if (res.error) {
        console.warn("highlights pull", res.error);
        return;
      }
      const byId = {};
      items.forEach(function (it) { byId[it.id] = it; });
      (res.data || []).forEach(function (row) {
        const it = {
          id: row.id,
          kind: row.kind || "mark",
          quote: row.quote,
          text: row.note || "",
          color: row.color || "gold",
          at: row.updated_at ? Date.parse(row.updated_at) : Date.now()
        };
        const local = byId[it.id];
        if (!local || it.at >= (local.at || 0)) byId[it.id] = it;
      });
      items = Object.keys(byId).map(function (k) { return byId[k]; });
      localStorage.setItem(KEY, JSON.stringify(items));
      paint();
      renderList();
    } catch (e) {
      console.warn("highlights pull", e);
    }
  }
  function uid() { return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function colorHex(id) {
    const c = COLORS.find(function (x) { return x.id === id; });
    return c ? c.hex : "#fff3b0";
  }

  function tray() {
    let el = document.getElementById("hl-tray");
    if (el) return el;
    el = document.createElement("div");
    el.id = "hl-tray";
    el.className = "hl-tray is-closed";
    el.hidden = true;
    document.body.appendChild(el);
    enableTrayDrag(el);
    return el;
  }

  function syncDockHeight() {
    const bar = document.getElementById("tts-bar");
    const open = document.body.classList.contains("tts-open") && bar && !bar.hidden;
    const h = open ? Math.ceil(bar.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty("--tts-bar-h", h ? h + "px" : "0px");
  }

  function closeShelf() {
    document.body.classList.remove("shelf-open");
    if (window.CitaonicaShelf && window.CitaonicaShelf.close) window.CitaonicaShelf.close();
  }

  function wordCount(s) {
    return String(s || "").trim().split(/\s+/).filter(Boolean).length;
  }

  function placeTrayMobile() {
    const el = tray();
    if (!el || el.hidden || el.dataset.dragged === "1") return;
    const nav = document.querySelector(".topnav");
    const navBottom = nav ? Math.ceil(nav.getBoundingClientRect().bottom) + 8 : 56;
    const gap = 12;
    const trayH = el.offsetHeight || 96;
    const viewH = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    let top = navBottom;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.rangeCount) {
      const rects = sel.getRangeAt(0).getClientRects();
      if (rects && rects.length) {
        const last = rects[rects.length - 1];
        const first = rects[0];
        const below = Math.ceil(last.bottom) + gap;
        if (below + trayH <= viewH - 8) {
          top = below;
        } else {
          const above = Math.floor(first.top) - gap - trayH;
          top = above >= navBottom ? above : Math.max(navBottom, viewH - trayH - 8);
        }
      }
    }
    el.style.top = top + "px";
    el.style.bottom = "auto";
    el.style.left = "50%";
    el.style.right = "auto";
    el.style.transform = "translateX(-50%)";
  }

  function enableTrayDrag(el) {
    if (el.dataset.dragReady === "1") return;
    el.dataset.dragReady = "1";
    let dragging = false;
    let sx = 0, sy = 0, ox = 0, oy = 0;
    el.addEventListener("pointerdown", function (ev) {
      if (ev.target.closest("button")) return;
      dragging = true;
      el.dataset.dragged = "1";
      const r = el.getBoundingClientRect();
      sx = ev.clientX;
      sy = ev.clientY;
      ox = r.left;
      oy = r.top;
      try { el.setPointerCapture(ev.pointerId); } catch (e) {}
    });
    el.addEventListener("pointermove", function (ev) {
      if (!dragging) return;
      ev.preventDefault();
      el.style.left = (ox + ev.clientX - sx) + "px";
      el.style.top = (oy + ev.clientY - sy) + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
      el.style.transform = "none";
    });
    function stop() { dragging = false; }
    el.addEventListener("pointerup", stop);
    el.addEventListener("pointercancel", stop);
  }

  function setTrayOpen(on) {
    modeOn = on;
    const el = tray();
    el.hidden = !on;
    el.classList.toggle("is-closed", !on);
    if (!on) active = "";
    else if (!active) active = "gold";
    renderTray();
    document.body.classList.toggle("hl-dock-open", on);
    if (on && isTouch()) placeTrayMobile();
    syncDockHeight();
  }

  function renderTray() {
    const el = tray();
    el.innerHTML = "";
    const top = document.createElement("div");
    top.className = "hl-tray-top";
    const hint = document.createElement("span");
    hint.className = "hl-hint";
    hint.textContent = isTouch() ? t.hintTouch : t.hint;
    top.appendChild(hint);
    const x = document.createElement("button");
    x.type = "button";
    x.className = "hl-x";
    x.setAttribute("aria-label", "Zatvori");
    x.textContent = "×";
    x.addEventListener("mousedown", function (ev) { ev.preventDefault(); ev.stopPropagation(); });
    x.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      setTrayOpen(false);
    });
    top.appendChild(x);
    el.appendChild(top);
    const dots = document.createElement("div");
    dots.className = "hl-tray-dots";
    COLORS.forEach(function (c) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "hl-dot" + (active === c.id ? " is-on" : "");
      b.style.background = c.hex;
      b.title = c.id;
      b.addEventListener("mousedown", function (ev) { ev.preventDefault(); ev.stopPropagation(); });
      b.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        active = c.id;
        renderTray();
        if (currentQuote() || pendingQuote) applyCurrentSelection();
      });
      dots.appendChild(b);
    });
    const eraser = document.createElement("button");
    eraser.type = "button";
    eraser.className = "hl-dot hl-erase" + (active === "erase" ? " is-on" : "");
    eraser.title = t.clear;
    eraser.addEventListener("mousedown", function (ev) { ev.preventDefault(); ev.stopPropagation(); });
    eraser.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      active = "erase";
      renderTray();
      if (currentQuote() || pendingQuote) applyCurrentSelection();
    });
    dots.appendChild(eraser);
    el.appendChild(dots);
    const foot = document.createElement("div");
    foot.className = "hl-tray-foot";
    const listBtn = document.createElement("button");
    listBtn.type = "button";
    listBtn.className = "hl-list-btn";
    listBtn.textContent = t.list;
    listBtn.addEventListener("mousedown", function (ev) { ev.preventDefault(); ev.stopPropagation(); });
    listBtn.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (isTouch()) closeShelf();
      document.body.classList.add("notes-open");
      renderList();
    });
    foot.appendChild(listBtn);
    el.appendChild(foot);
  }

  // Trostruki klik ili povlačenje do kraja odlomka u pregledniku često
  // završi raspon na offsetu 0 sljedećeg bloka (ili na praznom rubu).
  // Sužavamo granice na stvarne tekstualne čvorove i odbacujemo
  // rubove koji su samo razmak, da citat i bojenje ostanu unutar odabira.
  function selectedPieces(range) {
    const pieces = [];
    if (!range || range.collapsed) return pieces;
    const ancestor = range.commonAncestorContainer;
    const root = ancestor.nodeType === 3 ? ancestor.parentNode : ancestor;
    if (!root) return pieces;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue) return NodeFilter.FILTER_REJECT;
        if (n.parentElement && n.parentElement.closest("script, style, .tts-bar, .shelfbar, .topnav, .hl-tray, .notes-panel")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = walker.nextNode())) {
      const len = n.nodeValue.length;
      try {
        if (range.comparePoint(n, 0) === 1) continue;
        if (range.comparePoint(n, len) === -1) continue;
      } catch (e) { continue; }
      let from = 0;
      let to = len;
      if (range.startContainer === n) from = range.startOffset;
      if (range.endContainer === n) to = range.endOffset;
      if (from < 0) from = 0;
      if (to > len) to = len;
      if (from >= to) continue;
      pieces.push({ node: n, from: from, to: to });
    }
    while (pieces.length) {
      const p = pieces[0];
      const t = p.node.nodeValue;
      while (p.from < p.to && /\s/.test(t.charAt(p.from))) p.from++;
      if (p.from >= p.to) { pieces.shift(); continue; }
      break;
    }
    while (pieces.length) {
      const p = pieces[pieces.length - 1];
      const t = p.node.nodeValue;
      while (p.to > p.from && /\s/.test(t.charAt(p.to - 1))) p.to--;
      if (p.from >= p.to) { pieces.pop(); continue; }
      break;
    }
    return pieces;
  }

  function quoteFromRange(range) {
    const pieces = selectedPieces(range);
    if (!pieces.length) return "";
    const r = document.createRange();
    r.setStart(pieces[0].node, pieces[0].from);
    r.setEnd(pieces[pieces.length - 1].node, pieces[pieces.length - 1].to);
    return normQuote(r.toString());
  }

  function currentQuote() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return "";
    return quoteFromRange(sel.getRangeAt(0));
  }

  function applyColor(colorId, quote) {
    const found = items.find(function (it) { return it.quote === quote; });
    if (found) found.color = colorId;
    else {
      items.push({
        id: uid(),
        kind: "mark",
        quote: quote.slice(0, 8000),
        text: "",
        color: colorId,
        at: Date.now()
      });
    }
    persist();
    paint();
    renderList();
  }

  function eraseQuote(quote) {
    items = items.filter(function (it) {
      return quote.indexOf(it.quote) === -1 && it.quote.indexOf(quote) === -1;
    });
    persist();
    paint();
    renderList();
  }

  function removeItem(id) {
    items = items.filter(function (it) { return it.id !== id; });
    persist();
    paint();
    renderList();
  }

  function paint() {
    document.querySelectorAll("mark.user-hl").forEach(function (m) {
      const parent = m.parentNode;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
      parent.normalize();
    });
    const root = document.querySelector("main") || document.body;
    items.forEach(function (it) {
      if (!it.quote || it.quote.length < 2) return;
      highlightQuote(root, it);
    });
  }

  function bookTextNodes(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue) return NodeFilter.FILTER_REJECT;
        if (n.parentElement && n.parentElement.closest("script, style, .tts-bar, .shelfbar, .topnav, .hl-tray, .notes-panel, mark.user-hl")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    return nodes;
  }

  function closestBlock(node) {
    let e = node.nodeType === 1 ? node : node.parentElement;
    while (e) {
      if (e.tagName && /^(P|DIV|H[1-6]|LI|TR|DT|DD|BLOCKQUOTE|SECTION|ARTICLE|HEADER|FOOTER|PRE|FIGCAPTION|MAIN)$/.test(e.tagName)) return e;
      e = e.parentElement;
    }
    return null;
  }

  function gapNeedsSpace(prev, next) {
    if (closestBlock(prev) !== closestBlock(next)) return true;
    const r = document.createRange();
    try {
      r.setStart(prev, prev.nodeValue.length);
      r.setEnd(next, 0);
    } catch (e) { return false; }
    const ancestor = r.commonAncestorContainer;
    if (!ancestor) return false;
    const w = document.createTreeWalker(ancestor, NodeFilter.SHOW_ELEMENT);
    let el;
    while ((el = w.nextNode())) {
      if (!r.intersectsNode(el)) continue;
      if (el.tagName === "BR" || el.tagName === "WBR") return true;
    }
    return false;
  }

  function normQuote(q) {
    return String(q || "").replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim();
  }

  // Složi tekst knjige s preslikom na čvorove, preko inline elemenata (i/em/span)
  // i ujednačenih razmaka (prijelomi retka, <br>, odlomci).
  function textIndex(nodes) {
    let norm = "";
    const map = [];
    let lastSpace = true;
    let prev = null;
    for (let n = 0; n < nodes.length; n++) {
      const node = nodes[n];
      if (prev && gapNeedsSpace(prev, node) && !lastSpace) {
        norm += " ";
        map.push({ node: node, offset: 0, gap: true });
        lastSpace = true;
      }
      const t = node.nodeValue;
      for (let i = 0; i < t.length; i++) {
        const ch = t.charAt(i);
        if (/[\u00AD\u200B\u200C\u200D\uFEFF]/.test(ch)) continue;
        if (/\s/.test(ch)) {
          if (lastSpace) continue;
          norm += " ";
          map.push({ node: node, offset: i });
          lastSpace = true;
        } else {
          norm += ch;
          map.push({ node: node, offset: i });
          lastSpace = false;
        }
      }
      prev = node;
    }
    return { norm: norm, map: map };
  }

  function wrapPortion(node, from, to, it) {
    if (!node || from >= to) return;
    const range = document.createRange();
    range.setStart(node, from);
    range.setEnd(node, to);
    const mark = document.createElement("mark");
    mark.className = "user-hl";
    mark.dataset.color = it.color || "gold";
    mark.dataset.id = it.id;
    mark.style.background = colorHex(it.color);
    mark.title = it.text || "";
    try { range.surroundContents(mark); } catch (e) {}
  }

  function highlightQuote(root, it) {
    const q = normQuote(it.quote);
    if (q.length < 2) return;
    const nodes = bookTextNodes(root);
    const idx = textIndex(nodes);
    const at = idx.norm.indexOf(q);
    if (at === -1) return;
    const end = at + q.length;
    const pieces = [];
    for (let i = at; i < end && i < idx.map.length; i++) {
      const m = idx.map[i];
      if (!m || m.gap) continue;
      const last = pieces[pieces.length - 1];
      if (last && last.node === m.node && m.offset === last.to) last.to = m.offset + 1;
      else pieces.push({ node: m.node, from: m.offset, to: m.offset + 1 });
    }
    for (let p = pieces.length - 1; p >= 0; p--) {
      wrapPortion(pieces[p].node, pieces[p].from, pieces[p].to, it);
    }
  }

  function renderList() {
    let panel = document.getElementById("notes-panel");
    if (!panel) {
      panel = document.createElement("aside");
      panel.id = "notes-panel";
      panel.className = "notes-panel";
      document.body.appendChild(panel);
    }
    panel.innerHTML = "";
    const head = document.createElement("div");
    head.className = "notes-panel-head";
    const h = document.createElement("p");
    h.className = "notes-panel-title";
    h.textContent = t.list;
    const close = document.createElement("button");
    close.type = "button";
    close.className = "notes-panel-x";
    close.setAttribute("aria-label", "Zatvori");
    close.textContent = "×";
    close.addEventListener("click", function () {
      document.body.classList.remove("notes-open");
    });
    head.appendChild(h);
    head.appendChild(close);
    panel.appendChild(head);
    if (!items.length) {
      const p = document.createElement("p");
      p.className = "notes-empty";
      p.textContent = t.empty;
      panel.appendChild(p);
      return;
    }
    items.slice().reverse().forEach(function (it) {
      const card = document.createElement("div");
      card.className = "note-card";
      const sw = document.createElement("span");
      sw.className = "note-swatch";
      sw.style.background = colorHex(it.color);
      const q = document.createElement("p");
      q.className = "note-quote";
      q.textContent = it.quote;
      q.addEventListener("click", function () {
        const m = document.querySelector('mark.user-hl[data-id="' + it.id + '"]');
        if (m) m.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      card.appendChild(sw);
      card.appendChild(q);
      if (it.text) {
        const body = document.createElement("p");
        body.className = "note-body";
        body.textContent = it.text;
        card.appendChild(body);
      }
      const row = document.createElement("div");
      row.className = "note-actions";
      const nb = document.createElement("button");
      nb.type = "button";
      nb.textContent = t.note;
      nb.addEventListener("click", function () {
        noteEditor(it.quote, it.text || "", function (text) {
          if (text === null) return;
          it.text = text;
          it.kind = text ? "note" : "mark";
          persist();
          paint();
          renderList();
        });
      });
      const rm = document.createElement("button");
      rm.type = "button";
      rm.textContent = t.remove;
      rm.addEventListener("click", function () { removeItem(it.id); });
      row.appendChild(nb);
      row.appendChild(rm);
      card.appendChild(row);
      panel.appendChild(card);
    });
  }

  function isTouch() {
    return window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  }

  function inChrome(el) {
    return !!(el && el.closest && el.closest(".hl-tray, .notes-panel, .tts-bar, .shelfbar, .topnav, .auth-slot, .account-slot, .auth-modal"));
  }

  function applyCurrentSelection() {
    if (!loggedIn() || !modeOn || !active) return false;
    // Na računalu uvijek uzimamo konačni odabir u trenutku mouseup, ne privremeni mid-drag.
    const quote = usingTouch() ? (currentQuote() || pendingQuote) : currentQuote();
    if (!quote) return false;
    if (!usingTouch() && wordCount(quote) < 2) return false;
    if (active === "erase") eraseQuote(quote);
    else applyColor(active, quote);
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
    pendingQuote = "";
    hideSheet();
    return true;
  }

  function sheet() {
    let el = document.getElementById("hl-sheet");
    if (el) return el;
    el = document.createElement("div");
    el.id = "hl-sheet";
    el.className = "hl-sheet";
    el.hidden = true;
    document.body.appendChild(el);
    return el;
  }

  function hideSheet() {
    const el = document.getElementById("hl-sheet");
    if (el) {
      el.hidden = true;
      el.classList.add("is-closed");
    }
    document.body.classList.remove("hl-sheet-open");
    sheetMode = "actions";
  }

  function needLogin() {
    if (loggedIn()) return false;
    if (window.CitaonicaAuth && window.CitaonicaAuth.openSignIn) window.CitaonicaAuth.openSignIn();
    return true;
  }

  function showSheet(quote) {
    if (!quote || quote.length < 2) return;
    pendingQuote = quote;
    sheetMode = "actions";
    closeShelf();
    renderSheet();
    const el = sheet();
    el.hidden = false;
    el.classList.remove("is-closed");
    document.body.classList.add("hl-sheet-open");
  }

  function renderSheet() {
    const el = sheet();
    el.innerHTML = "";
    const x = document.createElement("button");
    x.type = "button";
    x.className = "hl-sheet-x";
    x.textContent = "×";
    x.addEventListener("click", function (ev) {
      ev.preventDefault();
      hideSheet();
    });
    el.appendChild(x);
    if (sheetMode === "colors") {
      const row = document.createElement("div");
      row.className = "hl-sheet-colors";
      COLORS.forEach(function (c) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "hl-sheet-swatch";
        b.style.background = c.hex;
        b.addEventListener("click", function (ev) {
          ev.preventDefault();
          if (needLogin()) return;
          applyColor(c.id, pendingQuote);
          const sel = window.getSelection();
          if (sel) sel.removeAllRanges();
          pendingQuote = "";
          hideSheet();
        });
        row.appendChild(b);
      });
      el.appendChild(row);
      return;
    }
    const row = document.createElement("div");
    row.className = "hl-sheet-actions";
    function action(label, fn) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "hl-sheet-btn";
      b.textContent = label;
      b.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        fn();
      });
      row.appendChild(b);
    }
    action(t.copy, function () {
      const q = pendingQuote || currentQuote();
      if (q && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(q).catch(function () {});
      }
      hideSheet();
    });
    action(t.addNote, function () {
      if (needLogin()) return;
      const q = pendingQuote || currentQuote();
      if (!q) return;
      noteEditor(q, "", function (text) {
        if (text === null) return;
        applyColor("gold", q);
        const last = items[items.length - 1];
        if (last && last.quote === q.slice(0, 500)) {
          last.text = text || "";
          last.kind = text ? "note" : "mark";
          persist();
          paint();
          renderList();
        }
        hideSheet();
      });
    });
    action(t.highlight, function () {
      if (needLogin()) return;
      sheetMode = "colors";
      renderSheet();
    });
    el.appendChild(row);
  }

  function selectionInBook() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return false;
    const n = sel.anchorNode || sel.focusNode;
    const el = n && (n.nodeType === 1 ? n : n.parentElement);
    return !!(el && el.closest && el.closest("main") && !inChrome(el));
  }

  function considerSelection() {
    if (inChrome(document.activeElement)) return;
    if (!selectionInBook()) return;
    const q = currentQuote();
    if (!q) return;
    pendingQuote = q;
    if (usingTouch() && loggedIn()) setTrayOpen(true);
    hideSheet();
  }

  // Mobilni odabir ostaje potpuno nativan. Izbornik (samo na dodir) se otvara
  // kad je odabir ~350 ms stabilan. Na računalu se oznaka primjenjuje tek na
  // mouseup, prema konačnom odabiru, nikad usred povlačenja.
  let selDebounce = null;
  let lastPointerType = "";
  let pointerHeld = false;

  function usingTouch() {
    return lastPointerType === "touch" || (!lastPointerType && isTouch());
  }

  document.addEventListener("pointerdown", function (ev) {
    if (!ev.isPrimary) return;
    lastPointerType = ev.pointerType || "";
    pointerHeld = true;
  }, true);

  document.addEventListener("pointerup", function (ev) {
    if (!ev.isPrimary) return;
    pointerHeld = false;
  }, true);

  document.addEventListener("pointercancel", function (ev) {
    if (!ev.isPrimary) return;
    pointerHeld = false;
  }, true);

  function scheduleTray() {
    if (!usingTouch()) return;
    if (pointerHeld) return;
    if (selDebounce) clearTimeout(selDebounce);
    selDebounce = setTimeout(function () {
      selDebounce = null;
      if (pointerHeld) return;
      considerSelection();
      if (modeOn) placeTrayMobile();
    }, 350);
  }

  document.addEventListener("contextmenu", function (ev) {
    if (!usingTouch()) return;
    if (ev.target && ev.target.closest && ev.target.closest("main")) ev.preventDefault();
  });

  document.addEventListener("mouseup", function (ev) {
    if (inChrome(ev.target)) return;
    if (usingTouch()) {
      scheduleTray();
      return;
    }
    applyCurrentSelection();
  });

  document.addEventListener("selectionchange", function () {
    if (!usingTouch()) return;
    if (pointerHeld) return;
    const q = currentQuote();
    if (q) pendingQuote = q;
    scheduleTray();
  });

  function repositionOpenTray() {
    if (isTouch() && modeOn) placeTrayMobile();
  }
  window.addEventListener("scroll", repositionOpenTray, { passive: true });
  window.addEventListener("resize", repositionOpenTray);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("scroll", repositionOpenTray);
    window.visualViewport.addEventListener("resize", repositionOpenTray);
  }

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") setTrayOpen(false);
  });

  document.addEventListener("click", function (ev) {
    const mark = ev.target.closest && ev.target.closest("mark.user-hl");
    if (!mark) return;
    if (!loggedIn()) {
      if (window.CitaonicaAuth && window.CitaonicaAuth.openSignIn) window.CitaonicaAuth.openSignIn();
      return;
    }
    if (modeOn && active === "erase") {
      const it = items.find(function (x) { return x.id === mark.dataset.id; });
      if (it) removeItem(it.id);
      return;
    }
    const it = items.find(function (x) { return x.id === mark.dataset.id; });
    if (!it) return;
    noteEditor(it.quote, it.text || "", function (text) {
      if (text === null) return;
      it.text = text;
      it.kind = text ? "note" : "mark";
      persist();
      paint();
      renderList();
    });
  });

  function loggedIn() {
    return !!(window.CitaonicaAuth && window.CitaonicaAuth.getUser && window.CitaonicaAuth.getUser());
  }

  function addToggle() {
    document.querySelectorAll("#notes-toggle").forEach(function (n) {
      if (n.closest && n.closest(".topnav")) n.remove();
    });
    const tools = document.getElementById("markup-tools");
    if (!tools) return;
    tools.innerHTML = "";
    const markBtn = document.createElement("button");
    markBtn.type = "button";
    markBtn.id = "notes-toggle";
    markBtn.className = "markup-link";
    markBtn.textContent = t.markBtn;
    markBtn.addEventListener("click", function () {
      if (!loggedIn()) {
        if (window.CitaonicaAuth && window.CitaonicaAuth.openSignIn) window.CitaonicaAuth.openSignIn();
        return;
      }
      if (isTouch()) closeShelf();
      if (isTouch()) {
        setTrayOpen(false);
        return;
      }
      setTrayOpen(!modeOn);
    });
    const listBtn = document.createElement("button");
    listBtn.type = "button";
    listBtn.className = "markup-link";
    listBtn.textContent = t.list;
    listBtn.addEventListener("click", function () {
      if (!loggedIn()) {
        if (window.CitaonicaAuth && window.CitaonicaAuth.openSignIn) window.CitaonicaAuth.openSignIn();
        return;
      }
      if (isTouch()) closeShelf();
      document.body.classList.add("notes-open");
      renderList();
    });
    tools.appendChild(markBtn);
    tools.appendChild(listBtn);
  }

  const LAST_UID = "citaonica-last-uid";
  // Briše sve lokalne oznake i bilješke (sve knjige) i uklanja ih s prikaza.
  function clearLocal() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf("citaonica-notes:") === 0) keys.push(k);
      }
      keys.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
    items = [];
    paint();
    renderList();
  }

  window.CitaonicaNotes = {
    clearLocal: clearLocal,
    syncAuth: function (u) {
      addToggle();
      if (!loggedIn()) {
        setTrayOpen(false);
        document.body.classList.remove("notes-open");
      } else {
        // Promjena korisnika na istom uređaju: tuđe lokalne bilješke ne smiju ući u novi račun.
        // (Gostove oznake prije prve prijave, kad zadnjeg korisnika nema, smiju se spojiti s tim računom.)
        const id = (u && u.id) || userId();
        let last = null;
        try { last = localStorage.getItem(LAST_UID); } catch (e) {}
        if (id && last && last !== id) clearLocal();
        if (id) { try { localStorage.setItem(LAST_UID, id); } catch (e) {} }
        pullCloud();
      }
    }
  };

  function boot() {
    renderTray();
    setTrayOpen(false);
    addToggle();
    if (window.CitaonicaAuth && window.CitaonicaAuth.onChange) {
      window.CitaonicaAuth.onChange(function () { addToggle(); });
    }
    paint();
    renderList();
    syncDockHeight();
    window.addEventListener("resize", syncDockHeight);
    const bar = document.getElementById("tts-bar");
    if (bar && typeof MutationObserver !== "undefined") {
      new MutationObserver(syncDockHeight).observe(bar, { attributes: true, attributeFilter: ["hidden", "class"] });
    }
    document.body.addEventListener("click", function () {
      setTimeout(syncDockHeight, 50);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
