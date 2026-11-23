// Looks up lyrics and song details from public lyrics APIs.
// Lyrics: LRCLIB, then lyrics.ovh. Album, year, genre and artwork: iTunes Search API.
// A result is only used when its title and singer match what was entered. Without a singer it doesn't
// search: searching by title alone found the wrong song too often (tried and removed 2026-11-22).
// Arabic songs are often listed in Latin letters ("Elli Baana"), so a song typed in Arabic is also
// searched under the Latin spelling iTunes gives it, once both spellings agree letter by letter.

const TIMEOUT_MS = 12000;

async function getJSON(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Loose comparison form: no diacritics, unified alef/ya/ta marbuta, letters and digits only. */
export function norm(text) {
  return String(text || "").toLowerCase()
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

// Consonant outline shared by Arabic and its Latin spellings, so "اللي باعنا" and "Elli Baana" both become "lbn".
// Vowels, long-vowel letters, ع/ء and h are dropped; letters spelled differently across dialects are merged (ج/g/j, ق/k).
const ARABIC_SOUND = {
  "ب": "b", "ت": "t", "ث": "t", "ج": "j", "ح": "", "خ": "k", "د": "d", "ذ": "d", "ر": "r", "ز": "z",
  "س": "s", "ش": "s", "ص": "s", "ض": "d", "ط": "t", "ظ": "z", "غ": "g", "ف": "f", "ق": "k", "ك": "k",
  "ل": "l", "م": "m", "ن": "n", "پ": "b", "ڤ": "f", "گ": "j",
};
export function outline(text) {
  // Doubled letters ("Elli", "اللي") are merged on the original spelling, so جنون stays "jnn" and never looks like "Jeny".
  const t = String(text || "").toLowerCase().replace(/[ً-ْٰـ]/g, "").replace(/(.)\1+/gu, "$1");
  let out = "";
  if (/[؀-ۿ]/.test(t)) {
    for (const ch of t) out += ARABIC_SOUND[ch] ?? "";
  } else {
    out = t.replace(/sh/g, "s").replace(/kh/g, "k").replace(/gh/g, "\u0001").replace(/th|dh/g, "t")
      .replace(/g/g, "j").replace(/\u0001/g, "g").replace(/[qc]/g, "k").replace(/v/g, "f").replace(/p/g, "b")
      .replace(/[^a-z]/g, "").replace(/[aeiouyhw]/g, "");
  }
  return out;
}

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length];
}

/** Same name across Arabic and Latin spellings. Short names must match exactly; longer ones may differ by a letter or two. */
function soundsSame(a, b) {
  const x = outline(a), y = outline(b);
  if (x.length < 2 || y.length < 2) return false;
  const allowed = Math.min(x.length, y.length) <= 3 ? 0 : Math.max(x.length, y.length) <= 8 ? 1 : 2;
  return editDistance(x, y) <= allowed;
}

/** Listings often hold both spellings ("Elli Baana / اللي باعنا", "Ragheb Alama - راغب علامة"): compare each part. */
const parts = text => [String(text || ""), ...String(text || "").split(/\s[-–|/]\s|\s?\/\s?|\(|\)/)].map(s => s.trim()).filter(Boolean);

function sameTitle(wanted, got) {
  return parts(got).some(g => {
    const w = norm(wanted), n = norm(g);
    if (w && n && (w === n || (w.length > 3 && n.includes(w) && n.length <= w.length + 4))) return true;
    return soundsSame(wanted, g);
  });
}

function sameArtist(wanted, got) {
  return parts(got).some(g => {
    const w = norm(wanted), n = norm(g);
    if (w && n && (n.includes(w) || w.includes(n))) return true;
    const x = outline(wanted), y = outline(g);
    return soundsSame(wanted, g) || (x.length >= 4 && y.includes(x));
  });
}

/** Drops "(solo ...)" style notes so the search uses the song name alone. */
export function searchName(text) {
  return String(text || "")
    .replace(/\(.*?\)/g, " ")
    .replace(/(^|\s)(صولو|ديالوج)(?=\s|$)/g, " ")
    .replace(/\s+/g, " ").trim();
}

const clean = lyrics => String(lyrics || "")
  .replace(/\r\n/g, "\n")
  .replace(/\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]\s?/g, "")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

function lrclibHit(t) {
  const text = clean(t.plainLyrics) || clean(t.syncedLyrics);
  return text ? { lyrics: text, source: "LRCLIB", album: t.albumName || "", duration: Math.round(t.duration || 0),
                  matched: `${t.trackName} – ${t.artistName}`, matchedArtist: t.artistName || "" } : null;
}

async function lrclib(title, artist) {
  const queries = [
    { track_name: title, artist_name: artist },
    { q: `${title} ${artist}` },
    { track_name: title },
  ];
  for (const q of queries) {
    const tracks = await getJSON("https://lrclib.net/api/search?" + new URLSearchParams(q));
    for (const t of tracks || []) {
      if (t.instrumental) continue;
      if (!sameTitle(title, t.trackName) || !sameArtist(artist, t.artistName)) continue;
      const hit = lrclibHit(t);
      if (hit) return hit;
    }
  }
  return null;
}

async function lyricsOvh(title, artist) {
  const r = await getJSON(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
  const text = clean(r && r.lyrics);
  return text ? { lyrics: text, source: "lyrics.ovh", matched: `${title} – ${artist}`, matchedArtist: artist } : null;
}

/** The iTunes listing for this song, only when its title (and singer, if given) match what was entered. */
async function itunesMatch(title, artist) {
  for (const country of ["lb", "eg", "us"]) {
    const r = await getJSON("https://itunes.apple.com/search?" + new URLSearchParams({
      term: `${artist} ${title}`.trim(), entity: "song", limit: artist ? "15" : "25", country,
    }));
    const t = (r && r.results || []).find(t => sameTitle(title, t.trackName) && (!artist || sameArtist(artist, t.artistName)));
    if (t) return t;
  }
  return null;
}

/** Tries each [title, singer] spelling on LRCLIB, then lyrics.ovh. */
async function searchWithArtist(spellings) {
  let found = null;
  for (const [t, a] of spellings) if (!found && a) found = await lrclib(t, a);
  for (const [t, a] of spellings) if (!found && a) found = await lyricsOvh(t, a);
  return found;
}

/** Adds the Latin spelling iTunes gives, when it differs from what was typed. */
function withItunesSpelling(spellings, it) {
  if (!it) return spellings;
  const extra = [searchName(it.trackName), searchName(it.artistName)];
  return spellings.some(([t, a]) => norm(t) === norm(extra[0]) && norm(a) === norm(extra[1])) ? spellings : [...spellings, extra];
}

/**
 * Searches for a song. Resolves one of:
 *   { status: "needsartist" }               no singer given, so any match would be a guess
 *   { status: "notfound" }                  nothing matching on LRCLIB or lyrics.ovh
 *   { status: "", lyrics, source, ... }     found; fields ready to save on the song
 * Rejects only when the lyrics sites can't be reached at all (e.g. offline).
 */
export async function findLyrics(rawTitle, rawArtist) {
  const title = searchName(rawTitle), artist = searchName(rawArtist);
  if (!artist) return { status: "needsartist" };
  if (!navigator.onLine) throw new Error("offline");

  const it = await itunesMatch(title, artist);
  const found = await searchWithArtist(withItunesSpelling([[title, artist]], it));
  if (!found) return { status: "notfound" };

  const result = { status: "", lyrics: found.lyrics, source: found.source, matched: found.matched };
  const meta = it ? {
    album: String(it.collectionName || "").replace(" - Single", ""),
    year: String(it.releaseDate || "").slice(0, 4),
    genre: it.primaryGenreName || "",
    duration: Math.round((it.trackTimeMillis || 0) / 1000),
    artwork: String(it.artworkUrl100 || "").replace("100x100bb", "300x300bb"),
  } : {};
  for (const k of ["album", "year", "genre", "duration", "artwork"]) {
    const v = meta[k] || found[k];
    if (v) result[k] = v;
  }
  return result;
}
