import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { findLyrics } from "./lyrics-search.js";
import { buildSongbookDocx } from "./word-export.js";
import { site } from "./site.js";

const ICON = {
  note: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 17.5a3.5 3.5 0 1 1-2-3.16V4.5l11-2v12a3.5 3.5 0 1 1-2-3.16V7.1l-7 1.27z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z"/></svg>',
  auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>',
  starLine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>',
  alignR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M9 10h11M6 14h14M11 18h9"/></svg>',
  alignC: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M7 10h10M5 14h14M8 18h8"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor"/></svg>',
  google: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#fff" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" opacity=".85"/><path fill="#fff" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z" opacity=".7"/><path fill="#fff" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6z" opacity=".9"/></svg>',
};

// ---------- Firebase ----------
const fb = initializeApp(firebaseConfig);
const auth = getAuth(fb);
const firestore = initializeFirestore(fb, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
const songsCol = collection(firestore, "songs");
const listsCol = collection(firestore, "lists");
const membersCol = collection(firestore, "members"); // devices that entered the choir code (view-only) // song lists: { name, songIds: [ordered song ids], createdAt, updatedAt }

// ---------- Preferences (this device only) ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem("kalimat." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("kalimat." + k, JSON.stringify(v)); } catch {} },
};
const prefs = {
  theme: store.get("theme", "system"),
  size: store.get("size", 21),
  centered: store.get("centered", false),
  sort: store.get("sort", "recent"),
};
function applyTheme() {
  const root = document.documentElement;
  if (prefs.theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", prefs.theme);
}
applyTheme();

// ---------- State ----------
const state = {
  user: undefined, // undefined = still checking, null = signed out
  denied: false, songs: [], loaded: false, lists: [],
  view: "list", id: null, q: "", filter: "all", confirmDelete: false,
  tab: "songs",          // list view tab: "songs" or "lists"
  listId: null,          // the song list being viewed
  fromList: false,       // the song open in detail was opened from a song list
  pickQ: "", pickSel: null, // song picker: search text and chosen song ids
  moved: null,           // song id just moved in a list, highlighted
};
const searching = new Set(); // song ids being searched on this device
let unsubscribe = null, unsubscribeLists = null;

const app = document.getElementById("app");
const fab = document.getElementById("fab");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hasLyrics = s => !!(s.lyrics && s.lyrics.trim());
const current = () => state.songs.find(s => s.id === state.id);
const currentList = () => state.lists.find(l => l.id === state.listId);
/** Signed in with the choir code: can read songs and lists, but not change them. */
const viewer = () => !!(state.user && state.user.isAnonymous);
const songById = id => state.songs.find(s => s.id === id);
/** A list's songs in order, skipping songs that were deleted. */
const listSongs = l => (l && Array.isArray(l.songIds) ? l.songIds : []).map(songById).filter(Boolean);
const fmtDur = n => n > 0 ? `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}` : "";
const isSearching = s => s.status === "requested" || s.status === "searching" || searching.has(s.id);

let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}

function art(s) {
  const src = s && typeof s.artwork === "string" && (s.artwork.startsWith("https://") || s.artwork.startsWith("data:image/")) ? s.artwork : "";
  return `<div class="art" aria-hidden="true">${src ? `<img src="${esc(src)}" alt="" loading="lazy">` : ICON.note}</div>`;
}

// ---------- Lyrics search (runs as soon as a song is queued) ----------
// Lyrics you typed or edited always win: an automatic (queued) search never replaces lyrics a song
// already has, and no search replaces lyrics changed while it was running. Only tapping
// "Search lyrics again" replaces existing lyrics.
async function runSearch(song, manual = false) {
  if (searching.has(song.id)) return;
  const ref = doc(songsCol, song.id);
  if (!manual && hasLyrics(song)) {
    // Queued or interrupted search on a song that already has lyrics: just clear the flag.
    try { await updateDoc(ref, { status: "" }); } catch {}
    return;
  }
  const lyricsAtStart = song.lyrics || "";
  searching.add(song.id);
  refresh();
  try {
    await updateDoc(ref, { status: "searching", searchStartedAt: Date.now() });
    const r = await findLyrics(song.title, song.artist);
    const latest = songById(song.id);
    if (!latest) return; // deleted meanwhile
    if ((latest.lyrics || "") !== lyricsAtStart && hasLyrics(latest)) {
      // You changed the lyrics while the search ran: keep yours.
      await updateDoc(ref, { status: "" });
      return;
    }
    const patch = { status: r.status, updatedAt: Date.now() };
    if (r.status === "notfound" && hasLyrics(latest)) patch.status = ""; // keep existing lyrics, no "not found" label
    if (r.lyrics) {
      Object.assign(patch, { lyrics: r.lyrics, source: r.source, matched: r.matched || "", matchedBy: "" });
      for (const k of ["album", "year", "genre", "duration", "artwork"]) if (r[k]) patch[k] = r[k];
    }
    await updateDoc(ref, patch);
    toast(r.lyrics ? `Lyrics found on ${r.source}: ${song.title}`
      : r.status === "needsartist" ? `Add the singer for “${song.title}” to search its lyrics.`
      : `No lyrics found online for “${song.title}”.`);
  } catch {
    // Couldn't reach the lyrics sites (offline, or a site is down): leave it queued to retry later.
    try { await updateDoc(ref, { status: "requested" }); } catch {}
    toast("Couldn’t reach the lyrics sites. Kalimat will try again when you’re back online.");
  } finally {
    searching.delete(song.id);
    refresh();
  }
}

/** Starts searches for queued songs, one at a time. A "searching" song older than 2 minutes was interrupted. */
let queueRunning = false;
async function processQueue() {
  if (queueRunning || !navigator.onLine || viewer()) return;
  queueRunning = true;
  try {
    const tried = new Set();
    for (;;) {
      const next = state.songs.find(s => !searching.has(s.id) && !tried.has(s.id) &&
        (s.status === "requested" || (s.status === "searching" && Date.now() - (s.searchStartedAt || 0) > 120000)));
      if (!next) break;
      tried.add(next.id);
      await runSearch(next);
    }
  } finally {
    queueRunning = false;
  }
}
window.addEventListener("online", processQueue);

// ---------- Views ----------
function render() {
  fab.hidden = !(state.user && !state.denied && !viewer() && state.view === "list");
  fab.setAttribute("aria-label", state.tab === "lists" ? "New song list" : "Add song");
  if (state.user === undefined || state.joining) app.innerHTML = `<div class="card empty" style="margin-top:40vh"><p>Opening Kalimat…</p></div>`;
  else if (!state.user || state.denied) renderSignIn();
  else if (state.view === "list") renderListView();
  else if (state.view === "detail") renderDetail();
  else if (state.view === "setlist") renderSetlist();
  else if (state.view === "pick") renderPicker();
  else if (state.view === "addto") renderAddTo();
  else renderForm();
  window.scrollTo(0, 0);
}

/** Redraws the current view after data changes, without disturbing a form being typed in. */
function refresh() {
  if (state.view === "list") { if (state.tab === "lists") renderListsTab(); else updateList(); }
  else if (state.view === "detail") renderDetail();
  else if (state.view === "setlist") renderSetlist(true);
  else if (state.view === "addto") renderAddTo();
}

function themeGroup() {
  const b = (v, label) => `<button type="button" data-action="theme" data-value="${v}" aria-pressed="${prefs.theme === v}" aria-label="${label}">${ICON[v === "system" ? "auto" : v === "light" ? "sun" : "moon"]}</button>`;
  return `<div class="pill-group" role="group" aria-label="Appearance">${b("light", "Light mode")}${b("dark", "Dark mode")}${b("system", "Match device")}</div>`;
}

function renderSignIn() {
  const codeForm = `
    <div class="or"><span>or</span></div>
    <form class="card code-form" id="code-form" autocomplete="off">
      <label for="choir-code"><b>Choir member?</b><span>Enter the choir code to read the songs and lists. No Google account needed.</span></label>
      <div class="code-row">
        <input id="choir-code" type="text" placeholder="Choir code" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="go">
        <button type="submit" class="btn btn-primary"><span>Open</span></button>
      </div>
    </form>`;
  app.innerHTML = `
    <header class="topbar"><h1>Kalimat</h1>${themeGroup()}</header>
    <div class="signin">
      <section class="hero"><div class="hero-top"><div><small>${esc(site.name)}</small><div class="big">كلمات</div></div><div class="hero-note" aria-hidden="true">♫</div></div></section>
      ${state.codeChanged ? `<p class="notice">The choir code has changed. Ask the choir for the new one and enter it below.</p>` : ""}
      ${state.denied
        ? `<p>The Google account <b>${esc(state.user && state.user.email)}</b> doesn’t have access to this songbook. Ask the songbook’s owner to add it, or sign in with a different account.</p>
           <button type="button" class="btn btn-soft" data-action="signout"><span>Use a different account</span></button>`
        : `<p>Sign in to open your songbook. Your songs sync across your devices and work offline.</p>
           <button type="button" class="btn btn-primary google-btn" data-action="signin">${ICON.google}<span>Sign in with Google</span></button>
           ${codeForm}`}
    </div>`;
}

/** Signs this device in without an account, then records the choir code. The rules only accept the right code. */
async function joinWithCode(raw) {
  const code = String(raw || "").trim().toLowerCase().replace(/\s+/g, "-");
  if (!code) { toast("Enter the choir code first."); return; }
  state.joining = true; state.codeChanged = false; render();
  try {
    const cred = auth.currentUser && auth.currentUser.isAnonymous ? { user: auth.currentUser } : await signInAnonymously(auth);
    await setDoc(doc(membersCol, cred.user.uid), { code, joinedAt: Date.now() });
    state.joining = false;
    startData(cred.user);
    render();
  } catch (e) {
    state.joining = false;
    if (auth.currentUser && auth.currentUser.isAnonymous) await signOut(auth).catch(() => {});
    render();
    toast(e && e.code === "permission-denied" ? "That code isn’t right. Check it with the choir and try again."
      : "Couldn’t open the songbook. Check your connection and try again.");
  }
}

function tabsBar() {
  return `<div class="tabs" role="group" aria-label="Show">
    ${[["songs", "Songs"], ["lists", "Lists"]].map(([v, l]) =>
      `<button type="button" data-action="tab" data-value="${v}" aria-pressed="${state.tab === v}">${l}</button>`).join("")}
  </div>`;
}

function renderListView() {
  if (state.tab === "lists") return renderListsTab();
  app.innerHTML = `
    <header class="topbar"><h1>Kalimat</h1>${themeGroup()}</header>
    <section class="hero" aria-label="Songbook summary" id="hero"></section>
    ${tabsBar()}
    <label class="search">${ICON.search}<input id="q" type="search" placeholder="Search titles, artists, lyrics" value="${esc(state.q)}" autocomplete="off"></label>
    <div class="controls">
      <div class="seg" role="group" aria-label="Filter">
        ${[["all", "All Songs"], ["fav", "Favorites"], ["need", "Need Lyrics"]].map(([v, l]) =>
          `<button type="button" data-action="filter" data-value="${v}" aria-pressed="${state.filter === v}">${l}</button>`).join("")}
      </div>
      <select class="sort" id="sort" aria-label="Sort by">
        ${[["recent", "Recently added"], ["title", "Title"], ["artist", "Artist"]].map(([v, l]) =>
          `<option value="${v}" ${prefs.sort === v ? "selected" : ""}>${l}</option>`).join("")}
      </select>
    </div>
    <div class="songs" id="songs"></div>
    ${viewer() ? `<section class="card footer-tools"><h3>Choir view</h3>
      <p>You’re reading the songbook with the choir code. Songs and lists can be changed only by the songbook’s editors.</p>
      <div class="row" style="position:relative"><button type="button" class="btn btn-soft" data-action="word"><span>Export songbook to Word</span></button></div>
      <div class="account"><a href="#" data-action="signout">Leave this songbook</a></div></section>` : `<section class="card footer-tools">
      <h3>Backup &amp; export</h3>
      <p>Save a copy of all your songs as a file, bring songs in from a backup file, or make a Word document of all the lyrics with a linked table of contents.</p>
      <div class="row" style="position:relative">
        <button type="button" class="btn btn-soft" data-action="export"><span>Export backup</span></button>
        <button type="button" class="btn btn-soft" data-action="import"><span>Import backup</span></button>
      </div>
      <div class="row" style="position:relative">
        <button type="button" class="btn btn-soft" data-action="word"><span>Export songbook to Word</span></button>
      </div>
      <div class="account">Signed in as ${esc(state.user.email)} · <a href="#" data-action="signout">Sign out</a></div>
    </section>`}`;
  updateList();
}

// ---------- Song lists ----------
function renderListsTab() {
  const lists = [...state.lists].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  app.innerHTML = `
    <header class="topbar"><h1>Kalimat</h1>${themeGroup()}</header>
    ${tabsBar()}
    <div class="songs">
      ${lists.length ? lists.map(l => {
        const n = listSongs(l).length;
        return `<button type="button" class="card song" data-action="openlist" data-id="${esc(l.id)}">
          <div class="art" aria-hidden="true">${ICON.list}</div>
          <div class="song-text"><div class="song-title" dir="auto">${esc(l.name || "Untitled list")}</div>
          <div class="song-sub">${n} ${n === 1 ? "song" : "songs"}${n ? " · " + esc(listSongs(l).slice(0, 3).map(s => s.title).join("، ")) : ""}</div></div>
        </button>`;
      }).join("") : `<div class="card empty"><h2>No song lists yet</h2>
        <p>${viewer() ? "The choir’s song lists will show up here." : "Make a list for a concert or rehearsal, pick its songs, and put them in the order you’ll sing them. Tap + to start."}</p></div>`}
    </div>`;
}

async function newList() {
  const ref = doc(listsCol);
  const now = Date.now();
  setDoc(ref, { name: "", songIds: [], createdAt: now, updatedAt: now })
    .catch(e => toast(e && e.code === "permission-denied" ? "This account can’t change the songbook." : "Couldn’t save. Check your connection and try again."));
  state.listId = ref.id; state.view = "setlist"; state.confirmDelete = false;
  render();
  document.getElementById("list-name")?.focus();
}

/** Shows one song list with its songs in order. `keepName` keeps the name field as typed during live updates. */
function renderSetlist(keepName) {
  const l = currentList();
  if (!l) { state.view = "list"; state.tab = "lists"; return render(); }
  const nameEl = document.getElementById("list-name");
  if (keepName && nameEl && document.activeElement === nameEl) {
    // Only redraw the rows so typing in the name isn't interrupted.
    const rows = document.getElementById("list-rows");
    if (rows) rows.innerHTML = setlistRows(l);
    return;
  }
  const songs = listSongs(l);
  app.innerHTML = `
    <nav class="nav">
      <button type="button" class="icon-btn" data-action="tolists" aria-label="Back to lists">${ICON.back}</button>
      ${viewer() ? "" : `<div class="nav-actions">
        <button type="button" class="text-btn" data-action="pick">Add songs</button>
      </div>`}
    </nav>
    <div class="list-head">
      ${viewer() ? `<h2 class="list-title" dir="auto">${esc(l.name || "Untitled list")}</h2>`
        : `<input class="list-name" id="list-name" dir="auto" placeholder="List name, e.g. Spring concert" value="${esc(l.name)}" aria-label="List name" autocomplete="off">`}
      <p class="hint" style="text-align:left">${songs.length} ${songs.length === 1 ? "song" : "songs"}. ${viewer() ? "Tap a song to open its lyrics." : "Use the arrows to put them in order; tap a song to open its lyrics."}</p>
    </div>
    <div class="list-rows" id="list-rows">${setlistRows(l)}</div>
    ${songs.length ? `<div class="row"><button type="button" class="btn btn-soft" data-action="wordlist"><span>Export this list to Word</span></button></div>` : ""}
    ${viewer() ? "" : `<div class="row">
      <button type="button" class="btn btn-danger ${state.confirmDelete ? "armed" : ""}" data-action="deletelist"><span>${state.confirmDelete ? "Tap again to delete list" : "Delete list"}</span></button>
    </div>
    <p class="hint">Deleting a list keeps its songs in your songbook.</p>`}`;
}

function setlistRows(l) {
  const songs = listSongs(l);
  if (!songs.length && viewer()) return `<div class="card empty"><h2>No songs in this list yet</h2></div>`;
  if (!songs.length) return `<div class="card empty"><h2>No songs in this list</h2><p>Tap “Add songs” to choose songs from your songbook.</p>
    <button type="button" class="btn btn-primary" data-action="pick"><span>Add songs</span></button></div>`;
  return songs.map((s, i) => `
    <div class="card list-row ${state.moved === s.id ? "moved" : ""}">
      <span class="num">${i + 1}</span>
      <button type="button" class="open" data-action="openfromlist" data-id="${esc(s.id)}">
        ${art(s)}
        <div class="song-text"><div class="song-title" dir="auto">${esc(s.title || "Untitled")}</div>
        <div class="song-sub" dir="auto">${esc(s.artist || "Unknown artist")}</div></div>
      </button>
      ${viewer() ? "" : `<div class="order">
        <button type="button" data-action="moveup" data-id="${esc(s.id)}" aria-label="Move ${esc(s.title)} up" ${i === 0 ? "disabled" : ""}>${ICON.up}</button>
        <button type="button" data-action="movedown" data-id="${esc(s.id)}" aria-label="Move ${esc(s.title)} down" ${i === songs.length - 1 ? "disabled" : ""}>${ICON.down}</button>
        <button type="button" class="remove" data-action="removefromlist" data-id="${esc(s.id)}" aria-label="Remove ${esc(s.title)} from list">${ICON.x}</button>
      </div>`}
    </div>`).join("");
}

function saveListSongs(l, songIds) {
  l.songIds = songIds; // show the change at once; the snapshot confirms it
  write(() => updateDoc(doc(listsCol, l.id), { songIds, updatedAt: Date.now() }));
}

function moveInList(id, delta) {
  const l = currentList();
  if (!l) return;
  const ids = listSongs(l).map(s => s.id);
  const i = ids.indexOf(id), j = i + delta;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  state.moved = id;
  saveListSongs(l, ids);
  const rows = document.getElementById("list-rows");
  if (rows) rows.innerHTML = setlistRows(l);
  // Keep the moved song's arrow under the finger.
  rows?.querySelector(`[data-action="${delta < 0 ? "moveup" : "movedown"}"][data-id="${CSS.escape(id)}"]:not(:disabled)`)?.focus();
}

/** Choose which songbook songs are in the current list. New songs go to the end. */
function renderPicker() {
  const l = currentList();
  if (!l) { state.view = "list"; return render(); }
  if (!state.pickSel) state.pickSel = new Set(listSongs(l).map(s => s.id));
  app.innerHTML = `
    <nav class="nav">
      <button type="button" class="text-btn" data-action="pickcancel">Cancel</button>
      <strong dir="auto">${esc(l.name || "Add songs")}</strong>
      <button type="button" class="text-btn" data-action="pickdone">Done</button>
    </nav>
    <label class="search">${ICON.search}<input id="pick-q" type="search" placeholder="Search your songs" value="${esc(state.pickQ)}" autocomplete="off"></label>
    <p class="hint" id="pick-count"></p>
    <div class="picker" id="picker"></div>`;
  updatePicker();
}

function updatePicker() {
  const box = document.getElementById("picker");
  if (!box) return;
  const q = state.pickQ.trim().toLowerCase();
  const cmp = (a, b) => String(a || "").localeCompare(String(b || ""), "ar");
  const songs = state.songs
    .filter(s => !q || [s.title, s.artist, s.album].some(f => String(f || "").toLowerCase().includes(q)))
    .sort((a, b) => cmp(a.title, b.title));
  document.getElementById("pick-count").textContent = `${state.pickSel.size} selected`;
  box.innerHTML = songs.length ? songs.map(s => `
    <label class="card pick">
      <input type="checkbox" data-pick="${esc(s.id)}" ${state.pickSel.has(s.id) ? "checked" : ""}>
      ${art(s)}
      <div class="song-text"><div class="song-title" dir="auto">${esc(s.title || "Untitled")}</div>
      <div class="song-sub" dir="auto">${esc(s.artist || "Unknown artist")}</div></div>
    </label>`).join("") : `<div class="card empty"><p>No songs match.</p></div>`;
}

function finishPicker() {
  const l = currentList();
  if (l) {
    const kept = listSongs(l).map(s => s.id).filter(id => state.pickSel.has(id));
    const added = state.songs.filter(s => state.pickSel.has(s.id) && !kept.includes(s.id))
      .sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "ar")).map(s => s.id);
    saveListSongs(l, [...kept, ...added]);
  }
  state.pickSel = null; state.pickQ = ""; state.view = "setlist";
  render();
}

/** From a song: tick the lists it belongs in. */
function renderAddTo() {
  const s = current();
  if (!s) { state.view = "list"; return render(); }
  const lists = [...state.lists].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  app.innerHTML = `
    <nav class="nav">
      <button type="button" class="icon-btn" data-action="addtodone" aria-label="Back to song">${ICON.back}</button>
      <strong dir="auto">${esc(s.title)}</strong>
      <button type="button" class="text-btn" data-action="addtodone">Done</button>
    </nav>
    <p class="hint">Tick the lists this song belongs in. It’s added at the end of each list.</p>
    <div class="picker">
      ${lists.map(l => `<label class="card pick">
        <input type="checkbox" data-inlist="${esc(l.id)}" ${(l.songIds || []).includes(s.id) ? "checked" : ""}>
        <div class="song-text"><div class="song-title" dir="auto">${esc(l.name || "Untitled list")}</div>
        <div class="song-sub">${listSongs(l).length} songs</div></div></label>`).join("")}
    </div>
    <button type="button" class="btn btn-soft" data-action="newlistwith"><span>New list with this song</span></button>`;
}

function visibleSongs() {
  const q = state.q.trim().toLowerCase();
  let list = state.songs.filter(s =>
    state.filter === "fav" ? s.favorite : state.filter === "need" ? !hasLyrics(s) : true);
  if (q) list = list.filter(s => [s.title, s.artist, s.album, s.lyrics, s.notes].some(f => String(f || "").toLowerCase().includes(q)));
  const cmp = (a, b) => String(a || "").localeCompare(String(b || ""), "ar");
  if (prefs.sort === "title") list.sort((a, b) => cmp(a.title, b.title));
  else if (prefs.sort === "artist") list.sort((a, b) => cmp(a.artist, b.artist) || cmp(a.title, b.title));
  else list.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  return list;
}

function songTag(s) {
  if (isSearching(s)) return `<span class="tag search"><span class="spinner" aria-hidden="true"></span>Searching</span>`;
  if (!hasLyrics(s) && !String(s.artist || "").trim()) return `<span class="tag req">Add singer</span>`;
  if (!hasLyrics(s)) return `<span class="tag">No lyrics</span>`;
  return "";
}

function updateList() {
  const hero = document.getElementById("hero");
  const box = document.getElementById("songs");
  if (!hero || !box) return;
  const songs = state.songs;
  const artists = new Set(songs.map(s => (s.artist || "").trim()).filter(Boolean)).size;
  hero.innerHTML = `
    <div class="hero-top"><div><small>${viewer() ? "Choir Songbook" : "My Songbook"}</small><div class="big">${songs.length} ${songs.length === 1 ? "song" : "songs"}</div></div><div class="hero-note" aria-hidden="true">♫</div></div>
    <div class="stats"><div class="stat"><b>${artists}</b><span>Artists</span></div><div class="stat"><b>${songs.filter(s => s.favorite).length}</b><span>Favorites</span></div><div class="stat"><b>${songs.filter(s => !hasLyrics(s)).length}</b><span>Need Lyrics</span></div></div>`;

  if (!state.loaded) { box.innerHTML = `<div class="card empty"><p>Loading your songbook…</p></div>`; return; }
  const list = visibleSongs();
  if (!list.length) {
    const filtering = state.q || state.filter !== "all";
    box.innerHTML = `<div class="card empty">
      <h2>${filtering ? "No matching songs" : "Your songbook is empty"}</h2>
      <p>${filtering ? "Try a different search or filter." : viewer() ? "No songs have been added yet." : "Tap + to add a song by its title and singer, and Kalimat searches lyrics sites for it straight away. Or import a backup below."}</p></div>`;
    return;
  }
  box.innerHTML = list.map(s => `
    <button type="button" class="card song" data-action="open" data-id="${esc(s.id)}">
      ${art(s)}
      <div class="song-text"><div class="song-title">${esc(s.title || "Untitled")}</div>
      <div class="song-sub">${esc([s.artist, s.album].filter(Boolean).join(" · ") || "Unknown artist")}</div></div>
      <div class="tags">${songTag(s)}${s.favorite ? `<span class="star" aria-label="Favorite">${ICON.star}</span>` : ""}</div>
    </button>`).join("");
}

function renderDetail() {
  const s = current();
  if (!s) { state.view = "list"; return render(); }
  const chips = [s.album, s.year, s.genre, fmtDur(s.duration)].filter(Boolean);
  const busy = isSearching(s);
  const lyricsBody = busy && !hasLyrics(s)
    ? `<p class="hint" style="position:relative"><span class="spinner" aria-hidden="true"></span>Searching LRCLIB and lyrics.ovh…</p>`
    : hasLyrics(s)
    ? `<div class="lyrics ${prefs.centered ? "center" : ""}" dir="rtl" lang="ar" style="font-size:${prefs.size}px">${esc(s.lyrics)}</div>
       ${s.source ? `<div class="source">Source: ${esc(s.source)}</div>` : ""}`
    : viewer() ? `<p class="hint" style="position:relative">No lyrics yet.</p>`
    : `<p class="hint" style="position:relative">${
          !String(s.artist || "").trim() ? "Add the singer’s name with Edit, then search. Without it, a search could find a different song with the same title."
          : s.status === "notfound" ? "No lyrics found on LRCLIB or lyrics.ovh for this title and singer. Check the spelling, or type or paste them in."
          : "No lyrics yet."}</p>
       <div class="row" style="position:relative">
         ${String(s.artist || "").trim() ? `<button type="button" class="btn btn-primary" data-action="search">${ICON.sparkle}<span>Search lyrics online</span></button>` : ""}
         <button type="button" class="btn btn-soft" data-action="edit"><span>${String(s.artist || "").trim() ? "Type them in" : "Add the singer"}</span></button>
       </div>`;
  const titleOnlyNote = hasLyrics(s) && s.matchedBy === "title"
    ? `<div class="matched-note">Found by song title only${s.matched ? `: <span dir="auto">${esc(s.matched)}</span>` : ""}. Check it’s the right song.</div>` : "";
  // Opened from a song list: previous / next song in that list.
  const l = state.fromList ? currentList() : null;
  const order = l ? listSongs(l) : [];
  const pos = order.findIndex(x => x.id === s.id);
  const prev = pos > 0 ? order[pos - 1] : null, next = pos >= 0 ? order[pos + 1] : null;
  const stepNav = l && pos >= 0 ? `<div class="step-nav">
      <button type="button" class="btn btn-soft" data-action="step" data-id="${esc(prev ? prev.id : "")}" ${prev ? "" : "disabled"}>${ICON.back}<span class="step-text"><small>Previous</small><b dir="auto">${prev ? esc(prev.title) : "Start of list"}</b></span></button>
      <button type="button" class="btn btn-soft" data-action="step" data-id="${esc(next ? next.id : "")}" ${next ? "" : "disabled"}><span class="step-text"><small>Next</small><b dir="auto">${next ? esc(next.title) : "End of list"}</b></span>${ICON.next}</button>
    </div>` : "";
  app.innerHTML = `
    <nav class="nav">
      <button type="button" class="icon-btn" data-action="back" aria-label="${l ? "Back to list" : "Back to songs"}">${ICON.back}</button>
      ${l && pos >= 0 ? `<span class="list-badge" dir="auto">${esc(l.name || "List")} · ${pos + 1} of ${order.length}</span>` : ""}
      ${viewer() ? "<span></span>" : `<div class="nav-actions">
        <button type="button" class="icon-btn" data-action="addto" aria-label="Add to a song list">${ICON.list}</button>
        <button type="button" class="icon-btn" data-action="fav" aria-pressed="${!!s.favorite}" aria-label="${s.favorite ? "Remove from favorites" : "Add to favorites"}">${s.favorite ? ICON.star : ICON.starLine}</button>
        <button type="button" class="text-btn" data-action="edit">Edit</button>
      </div>`}
    </nav>
    <header class="detail-head">${art(s)}
      <h2 dir="auto">${esc(s.title || "Untitled")}</h2>
      ${s.artist ? `<div class="artist" dir="auto">${esc(s.artist)}</div>` : ""}
      ${chips.length ? `<div class="chips">${chips.map(c => `<span class="chip" dir="auto">${esc(c)}</span>`).join("")}</div>` : ""}
    </header>
    <section class="card lyrics-card">
      <div class="lyrics-bar"><h3>Lyrics</h3>
        ${hasLyrics(s) ? `<div class="mini">
          <button type="button" data-action="align" aria-label="${prefs.centered ? "Align right" : "Center lyrics"}">${prefs.centered ? ICON.alignC : ICON.alignR}</button>
          <button type="button" data-action="smaller" aria-label="Smaller text">A−</button>
          <button type="button" data-action="bigger" aria-label="Larger text">A+</button>
          <button type="button" data-action="copy" aria-label="Copy lyrics">${ICON.copy}</button></div>` : ""}
      </div>
      ${titleOnlyNote}
      ${lyricsBody}
    </section>
    ${stepNav}
    ${s.notes ? `<section class="card notes"><h3>Notes</h3><p dir="auto">${esc(s.notes)}</p></section>` : ""}
    ${viewer() ? "" : `<div class="row">
      ${hasLyrics(s) && !busy ? `<button type="button" class="btn btn-soft" data-action="search"><span>Search lyrics again</span></button>` : ""}
      <button type="button" class="btn btn-danger ${state.confirmDelete ? "armed" : ""}" data-action="delete"><span>${state.confirmDelete ? "Tap again to delete" : "Delete song"}</span></button>
    </div>`}`;
}

function renderForm() {
  const adding = state.view === "add";
  const s = adding ? {} : current();
  if (!s) { state.view = "list"; return render(); }
  const field = (id, label, value, extra = "") =>
    `<div class="field"><label for="f-${id}">${label}</label><input id="f-${id}" value="${esc(value)}" dir="auto" ${extra}></div>`;
  app.innerHTML = `
    <nav class="nav">
      <button type="button" class="text-btn" data-action="cancel">Cancel</button>
      <strong>${adding ? "Add Song" : "Edit Song"}</strong>
      <button type="button" class="text-btn" data-action="save">Save</button>
    </nav>
    <form class="card form" id="form" autocomplete="off">
      ${field("title", "Song title", s.title, 'required placeholder="e.g. قديش كان في ناس"')}
      ${field("artist", "Singer", s.artist, 'placeholder="e.g. فيروز"')}
      ${adding ? "" : field("album", "Album", s.album) + field("year", "Year", s.year, 'inputmode="numeric"') + field("genre", "Genre", s.genre)}
    </form>
    ${adding ? `<label class="card check"><input type="checkbox" id="f-request" checked>
      <div><b>Search online for lyrics and details</b><span>As soon as you save, Kalimat searches LRCLIB and lyrics.ovh for the lyrics, and iTunes for the album, year and artwork. Add the singer so it finds the right song.</span></div></label>` : ""}
    <section class="card lyrics-edit">
      <label for="f-lyrics">Lyrics${adding ? " (optional)" : ""}</label>
      <textarea id="f-lyrics" dir="rtl" lang="ar" style="font-size:${Math.min(prefs.size, 22)}px" placeholder="اكتب الكلمات هنا">${esc(s.lyrics)}</textarea>
    </section>
    <section class="card lyrics-edit">
      <label for="f-notes">Notes</label>
      <textarea id="f-notes" dir="auto" style="min-height:90px;font-size:16px" placeholder="Solo parts, key, rehearsal notes…">${esc(s.notes)}</textarea>
    </section>`;
  if (adding) document.getElementById("f-title").focus();
}

// ---------- Writes ----------
async function write(fn, okMsg) {
  try { await fn(); if (okMsg) toast(okMsg); return true; }
  catch (e) {
    toast(e && e.code === "permission-denied" ? "This account can’t change the songbook."
      : "Couldn’t save. Check your connection and try again.");
    return false;
  }
}

async function save() {
  const v = id => (document.getElementById("f-" + id)?.value ?? "").trim();
  const title = v("title");
  if (!title) { toast("Add a song title first."); document.getElementById("f-title").focus(); return; }
  const lyrics = (document.getElementById("f-lyrics").value || "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const now = Date.now();
  if (state.view === "add") {
    const wantSearch = document.getElementById("f-request").checked && !lyrics;
    const ref = doc(songsCol);
    const data = { title, artist: v("artist"), album: "", year: "", genre: "", duration: 0, lyrics, notes: v("notes"),
      source: lyrics ? "Added by you" : "", favorite: false, status: wantSearch ? "requested" : "", addedAt: now, updatedAt: now };
    // Don't wait for the server: with the offline cache the write is applied locally at once.
    setDoc(ref, data).catch(() => toast("Couldn’t save. Check your connection and try again."));
    state.view = "detail"; state.id = ref.id;
    render();
  } else {
    const s = current();
    const patch = { title, artist: v("artist"), album: v("album"), year: v("year"), genre: v("genre"), lyrics, notes: v("notes"), updatedAt: now };
    if (lyrics !== (s.lyrics || "")) { patch.source = lyrics ? "Edited by you" : ""; patch.matchedBy = ""; }
    if (lyrics) patch.status = ""; // your lyrics are in: cancel any queued or interrupted search
    // A song still without lyrics is searched again once its title or singer changes.
    if (!lyrics && (patch.title !== s.title || patch.artist !== s.artist)) patch.status = "requested";
    if (await write(() => updateDoc(doc(songsCol, s.id), patch), "Changes saved")) { state.view = "detail"; render(); }
  }
}

function exportBackup() {
  const data = state.songs.map(({ id, ...rest }) => ({ id, ...rest }));
  const lists = state.lists.map(({ id, name, songIds, createdAt, updatedAt }) => ({ id, name, songIds, createdAt, updatedAt }));
  const blob = new Blob([JSON.stringify({ songs: data, lists }, null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `kalimat-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(`Exported ${data.length} songs${lists.length ? ` and ${lists.length} lists` : ""}`);
}

/** Downloads a Word songbook: the whole songbook by title, or one song list in its own order. Songs without lyrics are left out. */
function exportWord(list) {
  const cmp = (a, b) => String(a.title || "").localeCompare(String(b.title || ""), "ar");
  const all = list ? listSongs(list) : [...state.songs].sort(cmp);
  const songs = all.filter(hasLyrics);
  if (!songs.length) { toast("No songs with lyrics to export yet."); return; }
  const date = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const name = list ? String(list.name || "Song list").trim() : "";
  const bytes = buildSongbookDocx(songs, { title: site.name, subtitle: name, date });
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const safe = (name || "Kalimat songbook").replace(/[\\/:*?"<>|]+/g, " ").trim();
  a.download = `${safe} ${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  const skipped = all.length - songs.length;
  toast(`Exported ${songs.length} songs to Word${skipped ? ` (${skipped} without lyrics left out)` : ""}`);
}

async function importBackup(file) {
  let rows;
  try { rows = JSON.parse(await file.text()); } catch { toast("That file isn’t a Kalimat backup."); return; }
  // Older backups are a plain list of songs; newer ones are { songs, lists }.
  const listRows = rows && !Array.isArray(rows) && Array.isArray(rows.lists) ? rows.lists : [];
  if (rows && !Array.isArray(rows)) rows = rows.songs;
  if (!Array.isArray(rows)) { toast("That file isn’t a Kalimat backup."); return; }
  const fields = ["title", "artist", "album", "year", "genre", "duration", "artwork", "lyrics", "notes", "source", "favorite", "status", "addedAt", "updatedAt", "matched", "matchedBy"];
  const valid = rows.filter(r => r && typeof r.title === "string" && r.title.trim());
  const okId = id => typeof id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(id);
  try {
    if (listRows.length) {
      const batch = writeBatch(firestore);
      for (const r of listRows.slice(0, 400)) {
        if (!r || !okId(r.id)) continue;
        batch.set(doc(listsCol, r.id), { name: String(r.name || ""), songIds: (Array.isArray(r.songIds) ? r.songIds : []).filter(okId),
          createdAt: Number(r.createdAt) || Date.now(), updatedAt: Number(r.updatedAt) || Date.now() });
      }
      await batch.commit();
    }
    for (let i = 0; i < valid.length; i += 400) {
      const batch = writeBatch(firestore);
      for (const r of valid.slice(i, i + 400)) {
        const data = {};
        for (const f of fields) if (r[f] !== undefined) data[f] = r[f];
        const id = typeof r.id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(r.id) ? r.id : null;
        batch.set(id ? doc(songsCol, id) : doc(songsCol), data, { merge: true });
      }
      await batch.commit();
    }
    toast(`Imported ${valid.length} songs${listRows.length ? ` and ${listRows.length} lists` : ""}`);
  } catch (e) {
    toast(e && e.code === "permission-denied" ? "This account can’t change the songbook." : "Import didn’t finish. Check your connection and try again.");
  }
}

// ---------- Events ----------
app.addEventListener("click", async e => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const a = el.dataset.action;
  if (el.tagName === "A") e.preventDefault();
  const s = current();
  const editing = ["edit", "save", "fav", "search", "export", "import", "delete", "moveup", "movedown", "removefromlist",
    "pick", "pickdone", "deletelist", "addto", "newlistwith"];
  if (viewer() && editing.includes(a)) return;
  if (a !== "delete") state.confirmDelete = false;
  switch (a) {
    case "signin": signIn(); break;
    case "signout": await signOut(auth); break;
    case "theme": prefs.theme = el.dataset.value; store.set("theme", prefs.theme); applyTheme();
      app.querySelectorAll('[data-action="theme"]').forEach(b => b.setAttribute("aria-pressed", b.dataset.value === prefs.theme)); break;
    case "filter": state.filter = el.dataset.value;
      app.querySelectorAll('[data-action="filter"]').forEach(b => b.setAttribute("aria-pressed", b.dataset.value === state.filter)); updateList(); break;
    case "open": state.id = el.dataset.id; state.fromList = false; state.view = "detail"; render(); break;
    case "back": state.view = state.fromList && currentList() ? "setlist" : "list"; render(); break;
    case "tab": state.tab = el.dataset.value; render(); break;
    case "openlist": state.listId = el.dataset.id; state.moved = null; state.view = "setlist"; render(); break;
    case "tolists": state.view = "list"; state.tab = "lists"; state.fromList = false; render(); break;
    case "openfromlist": state.id = el.dataset.id; state.fromList = true; state.view = "detail"; render(); break;
    case "step": if (el.dataset.id) { state.id = el.dataset.id; render(); } break;
    case "moveup": moveInList(el.dataset.id, -1); break;
    case "movedown": moveInList(el.dataset.id, 1); break;
    case "removefromlist": { const l = currentList(); if (l) { saveListSongs(l, listSongs(l).map(x => x.id).filter(id => id !== el.dataset.id)); renderSetlist(); } break; }
    case "pick": state.pickSel = null; state.pickQ = ""; state.view = "pick"; render(); break;
    case "pickcancel": state.pickSel = null; state.pickQ = ""; state.view = "setlist"; render(); break;
    case "pickdone": finishPicker(); break;
    case "deletelist": {
      const l = currentList();
      if (!state.confirmDelete) { state.confirmDelete = true; renderSetlist(); break; }
      state.confirmDelete = false;
      if (l && await write(() => deleteDoc(doc(listsCol, l.id)), "List deleted")) { state.view = "list"; state.tab = "lists"; state.fromList = false; render(); }
      break;
    }
    case "addto": state.view = "addto"; render(); break;
    case "addtodone": state.view = "detail"; render(); break;
    case "newlistwith": {
      if (!s) break;
      const ref = doc(listsCol), now = Date.now();
      write(() => setDoc(ref, { name: "", songIds: [s.id], createdAt: now, updatedAt: now }));
      state.listId = ref.id; state.fromList = false; state.view = "setlist"; render();
      document.getElementById("list-name")?.focus();
      break;
    }
    case "edit": state.view = "edit"; render(); break;
    case "cancel": state.view = state.view === "edit" && current() ? "detail" : "list"; render(); break;
    case "save": save(); break;
    case "fav": if (s) await write(() => updateDoc(doc(songsCol, s.id), { favorite: !s.favorite })); break;
    case "align": prefs.centered = !prefs.centered; store.set("centered", prefs.centered); renderDetail(); break;
    case "smaller": prefs.size = Math.max(14, prefs.size - 2); store.set("size", prefs.size); renderDetail(); break;
    case "bigger": prefs.size = Math.min(40, prefs.size + 2); store.set("size", prefs.size); renderDetail(); break;
    case "copy":
      try { await navigator.clipboard.writeText(s.lyrics); toast("Lyrics copied"); }
      catch { const r = document.createRange(); r.selectNodeContents(app.querySelector(".lyrics")); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast("Lyrics selected. Use Copy to copy them."); }
      break;
    case "search": if (s) runSearch(s, true); break;
    case "export": exportBackup(); break;
    case "word": exportWord(null); break;
    case "wordlist": exportWord(currentList()); break;
    case "import": document.getElementById("import-file").click(); break;
    case "delete":
      if (!state.confirmDelete) { state.confirmDelete = true; renderDetail(); break; }
      state.confirmDelete = false;
      if (s && await write(() => deleteDoc(doc(songsCol, s.id)), "Song deleted")) { state.view = state.fromList && currentList() ? "setlist" : "list"; render(); }
      break;
  }
});
let nameTimer;
app.addEventListener("input", e => {
  if (e.target.id === "q") { state.q = e.target.value; updateList(); }
  else if (e.target.id === "pick-q") { state.pickQ = e.target.value; updatePicker(); }
  else if (e.target.id === "list-name") {
    const l = currentList(), name = e.target.value.trim();
    if (!l) return;
    l.name = name;
    clearTimeout(nameTimer);
    nameTimer = setTimeout(() => write(() => updateDoc(doc(listsCol, l.id), { name, updatedAt: Date.now() })), 500);
  }
});
app.addEventListener("change", e => {
  if (e.target.id === "sort") { prefs.sort = e.target.value; store.set("sort", prefs.sort); updateList(); }
  else if (e.target.dataset.pick) {
    if (e.target.checked) state.pickSel.add(e.target.dataset.pick); else state.pickSel.delete(e.target.dataset.pick);
    document.getElementById("pick-count").textContent = `${state.pickSel.size} selected`;
  } else if (e.target.dataset.inlist) {
    const l = state.lists.find(x => x.id === e.target.dataset.inlist), s = current();
    if (!l || !s) return;
    const ids = listSongs(l).map(x => x.id).filter(id => id !== s.id);
    saveListSongs(l, e.target.checked ? [...ids, s.id] : ids);
  }
});
app.addEventListener("submit", e => {
  e.preventDefault();
  if (e.target.id === "code-form") joinWithCode(document.getElementById("choir-code").value);
  else if (!viewer()) save();
});
fab.addEventListener("click", () => {
  if (viewer()) return;
  if (state.tab === "lists") return newList();
  state.view = "add"; state.id = null; render();
});
document.getElementById("import-file").addEventListener("change", e => {
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (f) importBackup(f);
});

// ---------- Sign-in & data ----------
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });
// A home-screen app on iPhone can't show Google's sign-in popup, so it signs in by redirect instead.
const standalone = window.navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;

async function signIn() {
  try {
    if (standalone) await signInWithRedirect(auth, provider);
    else await signInWithPopup(auth, provider);
  } catch (e) {
    if (e && (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment")) {
      await signInWithRedirect(auth, provider);
    } else if (e && e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") {
      toast("Sign-in didn’t work. Check your connection and try again.");
    }
  }
}
getRedirectResult(auth).catch(() => toast("Sign-in didn’t work. Try again."));

onAuthStateChanged(auth, user => {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  if (unsubscribeLists) { unsubscribeLists(); unsubscribeLists = null; }
  state.user = user || null;
  state.denied = false; state.songs = []; state.lists = []; state.loaded = false; state.view = "list";
  render();
  // While entering the choir code, wait until the code is recorded before reading songs.
  if (user && !state.joining) startData(user);
});

function startData(user) {
  if (unsubscribe) return;
  unsubscribe = onSnapshot(songsCol, snap => {
    state.songs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.loaded = true;
    refresh();
    processQueue();
  }, err => {
    unsubscribe = null;
    if (err && err.code === "permission-denied") {
      if (user.isAnonymous) {
        // The choir code was changed: ask for the new one.
        state.codeChanged = true;
        signOut(auth).catch(() => {});
      } else { state.denied = true; render(); }
    }
    else toast("Lost connection to your songbook. Reload to try again.");
  });
  unsubscribeLists = onSnapshot(listsCol, snap => {
    state.lists = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (state.view !== "pick") refresh();
  }, () => {});
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
