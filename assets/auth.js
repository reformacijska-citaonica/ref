(function () {
  const cfg = window.CITAONICA || {};
  const publicKey = cfg.supabaseAnonKey || cfg.supabasePublishableKey || "";
  const ready = !!(cfg.supabaseUrl && publicKey && window.supabase);
  const sr = (document.documentElement.lang || "").indexOf("sr") === 0;
  const t = {
    login: sr ? "Пријава" : "Prijava",
    logout: sr ? "Одјава" : "Odjava",
    guest: sr ? "Гост" : "Gost",
    section: sr ? "Означавање" : "Označavanje",
    modalTitle: sr ? "Пријава за означавање" : "Prijava za označavanje",
    modalBody: sr
      ? "Пријави се да бис означио текст и писао биљешке. Ознаке се вежу за твој рачун."
      : "Prijavi se da bi označio tekst i pisao bilješke. Oznake se vežu uz tvoj račun.",
    google: sr ? "Prijava preko Googlea" : "Prijava preko Googlea",
    consent: sr
      ? "Пријавом пристајеш да се твоје ознаке и биљешке чувају уз твој рачун. Будући да могу откривати твоја вјерска увјерења, видљиве су само теби и не дијелимо их ни с ким."
      : "Prijavom pristaješ da se tvoje oznake i bilješke spremaju uz tvoj račun. Budući da mogu otkrivati tvoja vjerska uvjerenja, vidljive su samo tebi i ne dijelimo ih ni s kim.",
    privacy: sr ? "Политика приватности" : "Politika privatnosti",
    exportData: sr ? "Преузми моје податке" : "Preuzmi moje podatke",
    deleteAcc: sr ? "Обриши налог" : "Obriši račun",
    delTitle: sr ? "Обрисати налог?" : "Obrisati račun?",
    delBody: sr
      ? "Трајно ће се обрисати твој налог и све твоје ознаке и биљешке, на свим уређајима. Ово се не може поништити. Ако желиш копију, прво преузми своје податке."
      : "Trajno će se obrisati tvoj račun i sve tvoje oznake i bilješke, na svim uređajima. Ovo se ne može poništiti. Ako želiš kopiju, prvo preuzmi svoje podatke.",
    delConfirm: sr ? "Обриши трајно" : "Obriši trajno",
    cancel: sr ? "Одустани" : "Odustani",
    working: sr ? "Бришем…" : "Brišem…",
    delFail: sr
      ? "Брисање није успјело. Покушај поново или пиши на reformacijska.citaonica@gmail.com."
      : "Brisanje nije uspjelo. Pokušaj ponovno ili piši na reformacijska.citaonica@gmail.com.",
    exportFail: sr ? "Преузимање није успјело. Покушај поново." : "Preuzimanje nije uspjelo. Pokušaj ponovno.",
    needCfg: sr
      ? "Google prijava još nije podešena (Supabase)."
      : "Google prijava još nije podešena (Supabase)."
  };

  let client = null;
  let user = null;
  const listeners = [];

  function displayName(u) {
    if (!u) return t.guest;
    const m = u.user_metadata || {};
    const raw = (m.given_name || m.full_name || m.name || "").trim();
    if (raw) return raw.split(/\s+/)[0];
    if (u.email) return u.email.split("@")[0];
    return t.guest;
  }

  function emit() {
    listeners.forEach(function (fn) {
      try { fn(user); } catch (e) {}
    });
    render();
  }

  function slot() {
    document.querySelectorAll(".topnav .auth-slot, .topnav #auth-slot, .topnav #account-slot").forEach(function (n) {
      n.remove();
    });
    let el = document.getElementById("account-slot");
    const side = document.querySelector(".shelfbar");
    if (side) {
      if (!el || !side.contains(el)) {
        el = document.createElement("div");
        el.id = "account-slot";
        el.className = "account-slot";
        side.appendChild(el);
      }
      return el;
    }
    return el;
  }

  function ensureModal() {
    let ov = document.getElementById("auth-modal");
    if (ov) return ov;
    ov = document.createElement("div");
    ov.id = "auth-modal";
    ov.className = "auth-modal";
    ov.hidden = true;
    ov.innerHTML =
      '<div class="auth-modal-card" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">' +
        '<button type="button" class="auth-modal-x" id="auth-modal-x" aria-label="Zatvori">×</button>' +
        '<h2 id="auth-modal-title"></h2>' +
        '<p class="auth-modal-body"></p>' +
        '<button type="button" class="auth-google" id="auth-google"></button>' +
        '<p class="auth-error" id="auth-error" hidden></p>' +
        '<p class="auth-consent" id="auth-consent"></p>' +
      '</div>';
    document.body.appendChild(ov);
    ov.querySelector("#auth-modal-title").textContent = t.modalTitle;
    ov.querySelector(".auth-modal-body").textContent = t.modalBody;
    ov.querySelector("#auth-google").textContent = t.google;
    // Obavijest uz prijavu (čl. 9 GDPR): klik na prijavu je potvrdna radnja.
    // Kuka za poveznicu: kad stranica s politikom privatnosti postoji, dodaj u config.js
    //   privacyUrl (hrvatski) i privacyUrlSr (srpske stranice; ako ga nema, koristi se privacyUrl)
    const consent = ov.querySelector("#auth-consent");
    consent.textContent = t.consent;
    const privacyHref = (sr && cfg.privacyUrlSr) || cfg.privacyUrl;
    if (privacyHref) {
      consent.appendChild(document.createTextNode(" "));
      const a = document.createElement("a");
      a.href = privacyHref;
      a.textContent = t.privacy;
      consent.appendChild(a);
    }
    ov.addEventListener("click", function (ev) {
      if (ev.target === ov) hideModal();
    });
    ov.querySelector("#auth-modal-x").addEventListener("click", hideModal);
    ov.querySelector("#auth-google").addEventListener("click", signIn);
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") hideModal();
    });
    return ov;
  }

  function showModal() {
    ensureModal().hidden = false;
    document.body.classList.add("auth-modal-open");
  }

  function hideModal() {
    const ov = document.getElementById("auth-modal");
    if (ov) ov.hidden = true;
    document.body.classList.remove("auth-modal-open");
  }

  function render() {
    const el = slot();
    if (!el) return;
    el.innerHTML = "";
    const block = document.createElement("div");
    block.className = "markup-block";
    const kicker = document.createElement("p");
    kicker.className = "markup-kicker";
    kicker.textContent = t.section;
    block.appendChild(kicker);

    if (user) {
      const tools = document.createElement("div");
      tools.id = "markup-tools";
      tools.className = "markup-tools";
      block.appendChild(tools);
      const name = document.createElement("p");
      name.className = "auth-name";
      name.textContent = displayName(user);
      name.title = user.email || "";
      const out = document.createElement("button");
      out.type = "button";
      out.className = "markup-link";
      out.textContent = t.logout;
      out.addEventListener("click", signOut);
      block.appendChild(name);
      block.appendChild(out);
      // Samoposluživanje (GDPR čl. 15, 17, 20): izvoz podataka i brisanje računa.
      const acc = document.createElement("div");
      acc.className = "account-actions";
      const exp = document.createElement("button");
      exp.type = "button";
      exp.className = "markup-link account-export";
      exp.textContent = t.exportData;
      exp.addEventListener("click", exportData);
      const del = document.createElement("button");
      del.type = "button";
      del.className = "markup-link account-delete";
      del.textContent = t.deleteAcc;
      del.addEventListener("click", confirmDelete);
      acc.appendChild(exp);
      acc.appendChild(del);
      block.appendChild(acc);
    } else {
      const inn = document.createElement("button");
      inn.type = "button";
      inn.className = "markup-link";
      inn.textContent = t.login;
      inn.addEventListener("click", showModal);
      block.appendChild(inn);
    }
    el.appendChild(block);
    hideModal();
    if (window.CitaonicaNotes && window.CitaonicaNotes.syncAuth) {
      window.CitaonicaNotes.syncAuth(user);
    }
  }

  async function signIn() {
    if (!ready || !client) {
      const err = document.getElementById("auth-error");
      if (err) { err.textContent = t.needCfg; err.hidden = false; }
      return;
    }
    await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href.split("#")[0] }
    });
  }

  // Odjava: lokalne oznake i bilješke brišu se s uređaja (i s prikaza), da ih sljedeći korisnik ne vidi.
  function clearLocalNotes() {
    if (window.CitaonicaNotes && window.CitaonicaNotes.clearLocal) { window.CitaonicaNotes.clearLocal(); return; }
    // Stranice bez notes.js (naslovnica, politika privatnosti): ključeve brišemo izravno.
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf("citaonica-notes:") === 0) keys.push(k);
      }
      keys.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
  }

  async function signOut() {
    try {
      if (client) await client.auth.signOut();
    } finally {
      clearLocalNotes();
      user = null;
      emit();
    }
  }

  // Izvoz: profil (e-adresa, datum stvaranja) i svi retci iz tablice highlights (RLS vraća samo vlastite).
  async function exportData() {
    if (!client || !user) return;
    try {
      const rows = [];
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const res = await client.from("highlights").select("*").order("book_id").range(from, from + PAGE - 1);
        if (res.error) throw res.error;
        rows.push.apply(rows, res.data || []);
        if (!res.data || res.data.length < PAGE) break;
      }
      const data = {
        site: "Reformacijska čitaonica",
        exported_at: new Date().toISOString(),
        profile: { email: user.email || null, created_at: user.created_at || null },
        highlights: rows
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "citaonica-moji-podaci-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    } catch (e) {
      alert(t.exportFail);
    }
  }

  // Potvrda brisanja: isti izgled kao uređivač bilješke (note-modal).
  function confirmDelete() {
    const prev = document.getElementById("account-del-modal");
    if (prev) prev.remove();
    const ov = document.createElement("div");
    ov.id = "account-del-modal";
    ov.className = "auth-modal note-modal account-del-modal";
    ov.innerHTML =
      '<div class="auth-modal-card note-modal-card" role="dialog" aria-modal="true" aria-labelledby="account-del-title">' +
        '<button type="button" class="auth-modal-x" aria-label=""></button>' +
        '<h2 id="account-del-title"></h2>' +
        '<p class="account-del-body"></p>' +
        '<p class="auth-error" hidden></p>' +
        '<div class="note-modal-actions">' +
          '<button type="button" class="note-modal-cancel"></button>' +
          '<button type="button" class="note-modal-save account-del-go"></button>' +
        '</div>' +
      '</div>';
    const x = ov.querySelector(".auth-modal-x");
    x.textContent = "×";
    x.setAttribute("aria-label", t.cancel);
    ov.querySelector("h2").textContent = t.delTitle;
    ov.querySelector(".account-del-body").textContent = t.delBody;
    const cancelBtn = ov.querySelector(".note-modal-cancel");
    cancelBtn.textContent = t.cancel;
    const go = ov.querySelector(".account-del-go");
    go.textContent = t.delConfirm;
    const err = ov.querySelector(".auth-error");
    let busy = false;
    function close() {
      if (busy) return;
      ov.remove();
      document.body.classList.remove("note-modal-open");
      document.removeEventListener("keydown", onKey, true);
    }
    function onKey(ev) { if (ev.key === "Escape") { ev.stopPropagation(); close(); } }
    x.addEventListener("click", close);
    cancelBtn.addEventListener("click", close);
    ov.addEventListener("click", function (ev) { if (ev.target === ov) close(); });
    document.addEventListener("keydown", onKey, true);
    go.addEventListener("click", async function () {
      if (busy || !client) return;
      busy = true;
      go.disabled = cancelBtn.disabled = true;
      go.textContent = t.working;
      err.hidden = true;
      let res;
      try { res = await client.rpc("delete_my_account"); } catch (e) { res = { error: e }; }
      if (res && res.error) {
        busy = false;
        go.disabled = cancelBtn.disabled = false;
        go.textContent = t.delConfirm;
        err.textContent = t.delFail;
        err.hidden = false;
        return;
      }
      busy = false;
      close();
      // Korisnik više ne postoji: lokalna odjava (bez poziva poslužitelju) i brisanje lokalnih bilježaka.
      try { await client.auth.signOut({ scope: "local" }); } catch (e) {}
      clearLocalNotes();
      try { localStorage.removeItem("citaonica-last-uid"); } catch (e) {}
      user = null;
      emit();
    });
    document.body.appendChild(ov);
    document.body.classList.add("note-modal-open");
    cancelBtn.focus();
  }

  window.CitaonicaAuth = {
    ready: ready,
    getUser: function () { return user; },
    onChange: function (fn) { listeners.push(fn); if (user !== undefined) fn(user); },
    client: function () { return client; },
    openSignIn: showModal
  };

  async function start() {
    ensureModal();
    render();
    if (!ready) return;
    client = window.supabase.createClient(cfg.supabaseUrl, publicKey);
    window.CitaonicaAuth.client = function () { return client; };
    const { data } = await client.auth.getSession();
    user = data && data.session ? data.session.user : null;
    emit();
    client.auth.onAuthStateChange(function (evt, session) {
      if (evt === "SIGNED_OUT") clearLocalNotes();   // i odjava iz druge kartice / istek sesije
      user = session ? session.user : null;
      emit();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
