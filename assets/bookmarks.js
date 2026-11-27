/* Reformacijska čitaonica — oznake na odlomcima (Moje oznake).
   Gost: localStorage. Prijavljen: Supabase (tablica bookmarks),
   a ako tablica još ne postoji, ostaje samo lokalno spremanje. */
(function () {
  const sr = (document.documentElement.lang || "").indexOf("sr") === 0;
  const t = {
    marks: sr ? "Моје ознаке" : "Moje oznake",
    add: sr ? "Додај ознаку" : "Dodaj oznaku",
    remove: sr ? "Уклони ознаку" : "Ukloni oznaku",
    del: sr ? "Уклони" : "Ukloni",
    empty: ""
  };

  const LS_MARKS = "citaonica-bookmarks";
  const LAST_UID = "citaonica-last-uid";
  let marks = load(LS_MARKS, []);
  try { localStorage.removeItem("citaonica-progress"); } catch (e) {}
  let cloudOff = false;
  let assigned = false;

  function load(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "");
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function isHome() {
    return !!(document.querySelector("main.catalog-home, body.catalog"));
  }
  function bookTitle() {
    const m = document.querySelector('meta[name="book-title"]');
    if (m && m.content) return m.content;
    const ttl = document.querySelector("a.book-home .ttl");
    return (ttl && ttl.textContent.trim()) || document.title || "";
  }
  function lang() {
    return (document.documentElement.lang || "hr").split("-")[0];
  }
  /* Stabilan ključ knjige: naslov + jezik (hr/sr/en inačice u istom direktoriju ostaju odvojene). */
  function bookKeyFromMeta() {
    return lang() + "|" + bookTitle();
  }
  function pathFromRoot() {
    const parts = location.pathname.split("/").filter(Boolean);
    const i = parts.indexOf("knjige");
    if (i >= 0) return parts.slice(i).join("/");
    return parts[parts.length - 1] || "index.html";
  }
  function hrefTo(rel) {
    const brand = document.querySelector("a.brand");
    const home = brand ? brand.getAttribute("href") : "index.html";
    const base = home.replace(/[^/]*$/, "");
    return base + rel;
  }
  function firstWords(el, n) {
    const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    const words = text.split(" ").filter(Boolean);
    return words.slice(0, n).join(" ") + (words.length > n ? "…" : "");
  }
  function chapterOf(el) {
    let n = el;
    while (n && n !== document.body) {
      let p = n.previousElementSibling;
      while (p) {
        if (/^H[1-4]$/.test(p.tagName)) {
          const ttl = p.querySelector(".ttl");
          return ((ttl || p).textContent || "").replace(/\s+/g, " ").trim();
        }
        p = p.previousElementSibling;
      }
      n = n.parentElement;
      if (n && n.matches && n.matches("main")) break;
    }
    const sub = document.querySelector("header.titlepage .subtitle");
    return sub ? sub.textContent.trim() : "";
  }
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }
  function normText(el) {
    return (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 200);
  }

  function targetParas() {
    const root = document.querySelector("main.wrap");
    if (!root || isHome()) return [];
    return Array.prototype.filter.call(root.querySelectorAll("p, blockquote, .enote"), function (el) {
      if (el.closest(".titlepage, .tpage, .licence, .footer-nav, .toc, .tts-bar, .auth-modal, .attr, .canon, .bm-shelf, .home-bookmarks, .home-continue")) return false;
      if (el.classList.contains("footer-nav") || el.classList.contains("attr") || el.classList.contains("running")) return false;
      if (!el.textContent.trim()) return false;
      return true;
    });
  }

  function assignIds() {
    if (assigned) return;
    assigned = true;
    const seen = {};
    targetParas().forEach(function (el, i) {
      el.classList.add("bm-p");
      let id = el.id;
      if (!id) {
        id = "bm-" + hashStr(normText(el) + "#" + i);
        if (document.getElementById(id) || seen[id]) id = id + "-" + i;
        el.id = id;
      }
      seen[id] = true;
      el.setAttribute("data-bm-id", id);
    });
  }

  function flagSvg() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", "M3 1.2v13.6M3.2 2.1h9.2l-2.4 3.15 2.4 3.15H3.2");
    p.setAttribute("fill", "currentColor");
    p.setAttribute("fill-opacity", "0.18");
    p.setAttribute("stroke", "currentColor");
    p.setAttribute("stroke-width", "1.35");
    p.setAttribute("stroke-linejoin", "round");
    p.setAttribute("stroke-linecap", "round");
    svg.appendChild(p);
    return svg;
  }

  function currentBookKey() { return bookKeyFromMeta(); }

  function isMarked(paraId, key, url) {
    const k = key || currentBookKey();
    const u = (url || pathFromRoot()).split("#")[0];
    return marks.some(function (m) { return m.bookKey === k && m.paraId === paraId && m.url.split("#")[0] === u; });
  }

  function markRecord(el) {
    const paraId = el.id || el.getAttribute("data-bm-id");
    return {
      id: "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      bookKey: currentBookKey(),
      bookTitle: bookTitle(),
      chapterTitle: chapterOf(el),
      url: pathFromRoot(),
      paraId: paraId,
      label: firstWords(el, 8),
      at: Date.now()
    };
  }

  function toggleMark(el) {
    const rec = markRecord(el);
    const idx = marks.findIndex(function (m) {
      return m.bookKey === rec.bookKey && m.paraId === rec.paraId && m.url.split("#")[0] === rec.url;
    });
    if (idx >= 0) {
      const gone = marks.splice(idx, 1)[0];
      persistMarks();
      cloudDelete(gone);
    } else {
      marks.push(rec);
      persistMarks();
      cloudUpsertMark(rec);
    }
    syncFlag(el);
    renderShelf();
  }

  function removeMark(rec) {
    marks = marks.filter(function (m) { return m.id !== rec.id; });
    persistMarks();
    cloudDelete(rec);
    const el = document.getElementById(rec.paraId);
    if (el) syncFlag(el);
    renderShelf();
    renderHome();
  }

  function persistMarks() { save(LS_MARKS, marks); }

  function syncFlag(el) {
    const btn = el.querySelector(":scope > .bm-flag");
    if (!btn) return;
    const on = isMarked(el.id || el.getAttribute("data-bm-id"));
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? t.remove : t.add);
  }

  function placeFlags() {
    targetParas().forEach(function (el) {
      if (el.querySelector(":scope > .bm-flag")) { syncFlag(el); return; }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bm-flag";
      btn.setAttribute("aria-label", t.add);
      btn.setAttribute("aria-pressed", "false");
      btn.appendChild(flagSvg());
      btn.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        toggleMark(el);
      });
      el.insertBefore(btn, el.firstChild);
      syncFlag(el);
    });
  }

  function flash(el) {
    if (!el) return;
    el.classList.remove("bm-flash");
    void el.offsetWidth;
    el.classList.add("bm-flash");
    setTimeout(function () { el.classList.remove("bm-flash"); }, 1600);
  }

  function jumpTo(paraId, doFlash) {
    const el = document.getElementById(paraId) || document.querySelector('[data-bm-id="' + CSS.escape(paraId) + '"]');
    if (!el) return false;
    el.scrollIntoView({ block: "start", behavior: "smooth" });
    if (doFlash !== false) flash(el);
    return true;
  }

  function goTo(rec) {
    const here = pathFromRoot();
    const dest = rec.url.split("#")[0];
    if (here === dest) {
      jumpTo(rec.paraId, true);
      return;
    }
    location.href = hrefTo(dest) + "#" + encodeURIComponent(rec.paraId);
  }

  function renderShelf() {
    if (isHome()) return;
    const side = document.querySelector(".shelfbar");
    if (!side) return;
    let box = document.getElementById("bm-shelf");
    if (!box) {
      box = document.createElement("div");
      box.id = "bm-shelf";
      box.className = "bm-shelf";
      box.setAttribute("hidden", "");
      const acc = document.getElementById("account-slot") || side.querySelector(".account-slot");
      if (acc) side.insertBefore(box, acc);
      else side.appendChild(box);
    }
    const mine = marks.filter(function (m) { return m.bookKey === currentBookKey(); })
      .slice().sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
    box.innerHTML = "";
    if (!mine.length) { box.hidden = true; return; }
    box.hidden = false;
    const kicker = document.createElement("p");
    kicker.className = "markup-kicker";
    kicker.textContent = t.marks;
    box.appendChild(kicker);
    const ul = document.createElement("ul");
    ul.className = "bm-list";
    mine.forEach(function (rec) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = hrefTo(rec.url) + "#" + encodeURIComponent(rec.paraId);
      a.className = "bm-link";
      const chap = rec.chapterTitle ? rec.chapterTitle + " · " : "";
      a.textContent = chap + rec.label;
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        goTo(rec);
      });
      const del = document.createElement("button");
      del.type = "button";
      del.className = "bm-del";
      del.setAttribute("aria-label", t.remove);
      del.textContent = "×";
      del.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        removeMark(rec);
      });
      li.appendChild(a);
      li.appendChild(del);
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  function renderHome() {
    ["home-continue", "home-bookmarks"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
    document.querySelectorAll(".home-continue, .home-bookmarks").forEach(function (el) {
      el.remove();
    });
  }

  /* —— Supabase —— */
  function client() {
    try { return window.CitaonicaAuth && window.CitaonicaAuth.client && window.CitaonicaAuth.client(); }
    catch (e) { return null; }
  }
  function userId() {
    const u = window.CitaonicaAuth && window.CitaonicaAuth.getUser && window.CitaonicaAuth.getUser();
    return u && u.id;
  }
  function missingTable(err) {
    if (!err) return false;
    const m = String(err.message || "") + " " + String(err.code || "") + " " + String(err.details || "");
    return /does not exist|42P01|PGRST205|schema cache|Could not find the table/i.test(m);
  }
  function noteCloud(err) {
    if (missingTable(err)) { cloudOff = true; return true; }
    return false;
  }

  async function cloudUpsertMark(rec) {
    const c = client(), uid = userId();
    if (cloudOff || !c || !uid) return;
    const row = {
      id: rec.id,
      user_id: uid,
      book_key: rec.bookKey,
      book_title: rec.bookTitle,
      chapter_title: rec.chapterTitle || "",
      url: rec.url,
      para_id: rec.paraId,
      label: rec.label || "",
      updated_at: new Date(rec.at || Date.now()).toISOString()
    };
    try {
      const res = await c.from("bookmarks").upsert(row, { onConflict: "id" });
      if (res.error) { if (!noteCloud(res.error)) console.warn("bookmarks upsert", res.error); }
    } catch (e) { if (!noteCloud(e)) console.warn("bookmarks upsert", e); }
  }
  async function cloudDelete(rec) {
    const c = client(), uid = userId();
    if (cloudOff || !c || !uid || !rec) return;
    try {
      let q = c.from("bookmarks").delete().eq("user_id", uid);
      if (rec.id) q = q.eq("id", rec.id);
      else q = q.eq("book_key", rec.bookKey).eq("para_id", rec.paraId);
      const res = await q;
      if (res.error && !noteCloud(res.error)) console.warn("bookmarks delete", res.error);
    } catch (e) { if (!noteCloud(e)) console.warn("bookmarks delete", e); }
  }
  function markKey(m) { return (m.bookKey || "") + "\t" + (m.url || "").split("#")[0] + "\t" + (m.paraId || ""); }

  async function pullAndMerge() {
    const c = client(), uid = userId();
    if (cloudOff || !c || !uid) return;
    try {
      const res = await c.from("bookmarks").select("*");
      if (res.error) { noteCloud(res.error); return; }
      const by = {};
      marks.forEach(function (m) { by[markKey(m)] = m; });
      (res.data || []).forEach(function (row) {
        const it = {
          id: row.id,
          bookKey: row.book_key,
          bookTitle: row.book_title,
          chapterTitle: row.chapter_title || "",
          url: row.url,
          paraId: row.para_id,
          label: row.label || "",
          at: row.updated_at ? Date.parse(row.updated_at) : Date.now()
        };
        const k = markKey(it);
        const local = by[k];
        if (!local || it.at >= (local.at || 0)) by[k] = it;
      });
      marks = Object.keys(by).map(function (k) { return by[k]; });
      persistMarks();
      const localOnly = marks.filter(function (m) {
        return !(res.data || []).some(function (row) { return row.id === m.id || (row.book_key === m.bookKey && row.para_id === m.paraId && (row.url || "").split("#")[0] === (m.url || "").split("#")[0]); });
      });
      for (let i = 0; i < localOnly.length; i++) await cloudUpsertMark(localOnly[i]);
    } catch (e) { if (!noteCloud(e)) console.warn("bookmarks pull", e); }

    renderShelf();
    renderHome();
    targetParas().forEach(syncFlag);
  }

  function clearLocal() {
    try { localStorage.removeItem(LS_MARKS); } catch (e) {}
    marks = [];
    targetParas().forEach(syncFlag);
    renderShelf();
    renderHome();
  }

  window.CitaonicaBookmarks = {
    clearLocal: clearLocal,
    syncAuth: function (u) {
      const id = (u && u.id) || userId();
      let last = null;
      try { last = localStorage.getItem(LAST_UID); } catch (e) {}
      if (id && last && last !== id) clearLocal();
      if (id) {
        try { localStorage.setItem(LAST_UID, id); } catch (e) {}
        pullAndMerge();
      } else {
        renderShelf();
        renderHome();
      }
    }
  };

  function boot() {
    if (!isHome()) {
      assignIds();
      placeFlags();
      renderShelf();
      const hash = location.hash.replace(/^#/, "");
      if (hash) {
        setTimeout(function () { jumpTo(decodeURIComponent(hash), true); }, 80);
      }
    } else {
      renderHome();
    }
    if (window.CitaonicaAuth && window.CitaonicaAuth.onChange) {
      window.CitaonicaAuth.onChange(function (u) {
        window.CitaonicaBookmarks.syncAuth(u);
      });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
