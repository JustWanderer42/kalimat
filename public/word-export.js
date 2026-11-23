// Builds a Word (.docx) songbook in the browser, laid out like a printed choir songbook:
// a cover page, a linked table of contents (المحتويات), then each song on its own page under a
// "title - singer" heading, right-to-left in Arial. Every page footer has the page number and a 🏠 link
// back to the contents. No outside libraries: the .docx (a zip of XML files) is written here.

const NAVY = "1F3864";

const xmlEsc = s => String(s ?? "")
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hasArabic = s => /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(s);

/** One run of text in Arial; Arabic runs are marked right-to-left. */
function run(text, { size = 24, bold = false, color = "", italic = false, style = "" } = {}) {
  const rtl = hasArabic(text);
  return `<w:r><w:rPr>${style ? `<w:rStyle w:val="${style}"/>` : ""}<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>` +
    `${bold ? "<w:b/><w:bCs/>" : ""}${italic ? "<w:i/><w:iCs/>" : ""}${color ? `<w:color w:val="${color}"/>` : ""}` +
    `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>${rtl ? "<w:rtl/>" : ""}</w:rPr>` +
    `<w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r>`;
}

const para = (inner, pPr = "") => `<w:p><w:pPr>${pPr}</w:pPr>${inner}</w:p>`;
const LINE = `<w:spacing w:before="0" w:after="0" w:line="276" w:lineRule="auto"/>`;

/** Rough page count per song, used only as the starting page numbers in the contents; Word refreshes them on opening. */
function estimatePages(song) {
  const lines = String(song.lyrics || "").split("\n").length + (song.notes ? 3 : 0) + 3;
  return Math.max(1, Math.ceil(lines / 44)); // about 44 lines fit on a page (checked against Word)
}

/**
 * songs: [{ title, artist, lyrics, notes }] in the order they should appear.
 * opts: { title: cover title, subtitle: e.g. list name, date: text under it }
 * Returns a Uint8Array holding the .docx file.
 */
export function buildSongbookDocx(songs, opts = {}) {
  const title = opts.title || "Songbook";
  const heading = s => [s.title, s.artist].map(x => String(x || "").trim()).filter(Boolean).join(" - ") || "Untitled";

  // Cover
  let body = "";
  for (let i = 0; i < 9; i++) body += para("", `<w:bidi/>${LINE}`);
  body += para(run(title, { size: 48, bold: true, color: NAVY }), `<w:bidi/><w:spacing w:before="160" w:line="276" w:lineRule="auto"/><w:jc w:val="center"/>`);
  if (opts.subtitle) body += para(run(opts.subtitle, { size: 40, bold: true, color: NAVY }), `<w:bidi/><w:spacing w:before="160" w:line="276" w:lineRule="auto"/><w:jc w:val="center"/>`);
  body += para("", `<w:bidi/>${LINE}`);
  if (opts.date) body += para(run(opts.date, { size: 40, bold: true, color: NAVY }), `<w:bidi/><w:spacing w:before="160" w:line="276" w:lineRule="auto"/><w:jc w:val="center"/>`);

  // Contents page
  body += `<w:p><w:pPr><w:pageBreakBefore/><w:bidi/><w:spacing w:after="360" w:line="276" w:lineRule="auto"/></w:pPr>` +
    `<w:bookmarkStart w:id="0" w:name="TOC_Home"/>${run("المحتويات", { size: 22, bold: true, color: NAVY })}<w:bookmarkEnd w:id="0"/></w:p>`;
  // Cover is page 1 and the contents start on page 2 (about 30 entries a page).
  let page = 2 + Math.max(1, Math.ceil(songs.length / 30));
  const fld = (type) => `<w:r><w:fldChar w:fldCharType="${type}"/></w:r>`;
  songs.forEach((s, i) => {
    const anchor = `_Toc${100000 + i}`;
    const start = i === 0 ? `${fld("begin")}<w:r><w:instrText xml:space="preserve"> TOC \\o "1-1" \\h \\z </w:instrText></w:r>${fld("separate")}` : "";
    body += `<w:p><w:pPr><w:pStyle w:val="TOC1"/><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9350"/></w:tabs></w:pPr>${start}` +
      `<w:hyperlink w:anchor="${anchor}" w:history="1">${run(heading(s), { size: 24, style: "Hyperlink" })}` +
      `<w:r><w:rPr><w:webHidden/></w:rPr><w:tab/></w:r>${fld("begin")}` +
      `<w:r><w:rPr><w:webHidden/></w:rPr><w:instrText xml:space="preserve"> PAGEREF ${anchor} \\h </w:instrText></w:r>${fld("separate")}` +
      `<w:r><w:rPr><w:webHidden/></w:rPr><w:t>${page}</w:t></w:r>${fld("end")}</w:hyperlink></w:p>`;
    page += estimatePages(s);
  });
  body += songs.length ? `<w:p>${fld("end")}</w:p>` : para(run("No songs with lyrics yet.", { size: 22, color: "786A6C" }), "<w:bidi/>");

  // Songs, each starting on a new page (the Heading1 style breaks the page)
  songs.forEach((s, i) => {
    const anchor = `_Toc${100000 + i}`;
    body += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:bookmarkStart w:id="${i + 1}" w:name="${anchor}"/>` +
      `${run(heading(s), { size: 28, bold: true, color: NAVY })}<w:bookmarkEnd w:id="${i + 1}"/></w:p>`;
    for (const line of String(s.lyrics || "").replace(/\r\n?/g, "\n").split("\n")) {
      body += para(line.trim() ? run(line.trimEnd()) : "", `<w:bidi/>${LINE}`);
    }
    const notes = String(s.notes || "").trim();
    if (notes) {
      body += para("", `<w:bidi/>${LINE}`);
      for (const line of notes.split("\n")) body += para(run(line, { size: 20, italic: true, color: "786A6C" }), `<w:bidi/>${LINE}`);
    }
  });

  const sect = `<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="12240" w:h="15840"/>` +
    `<w:pgMar w:top="950" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="636" w:gutter="0"/><w:cols w:space="720"/><w:titlePg/></w:sectPr>`;

  const NS = `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`;
  const files = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`,
    "docProps/core.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${xmlEsc([title, opts.subtitle].filter(Boolean).join(" – "))}</dc:title><dc:creator>Kalimat</dc:creator>
<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</dcterms:created>
</cp:coreProperties>`,
    "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
<Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>`,
    // updateFields: Word offers to refresh the contents' page numbers when the file is opened.
    "word/settings.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings ${NS}><w:updateFields w:val="true"/><w:defaultTabStop w:val="720"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`,
    "word/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${NS}>
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-GB" w:eastAsia="en-US" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:before="120" w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="0" w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:pageBreakBefore/><w:bidi/><w:spacing w:after="360" w:line="276" w:lineRule="auto"/><w:jc w:val="left"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:bCs/><w:color w:val="${NAVY}"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="toc 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="39"/><w:unhideWhenUsed/><w:pPr><w:bidi/><w:spacing w:after="100"/></w:pPr></w:style>
<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/><w:unhideWhenUsed/></w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:basedOn w:val="DefaultParagraphFont"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:color w:val="1F3864"/><w:u w:val="none"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:pPr><w:tabs><w:tab w:val="center" w:pos="4680"/><w:tab w:val="right" w:pos="9360"/></w:tabs><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:style>
</w:styles>`,
    "word/footer1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr ${NS}><w:p><w:pPr><w:pStyle w:val="Footer"/><w:rPr><w:b/><w:color w:val="${NAVY}"/></w:rPr></w:pPr>` +
      `<w:r><w:rPr><w:b/><w:color w:val="${NAVY}"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:b/><w:color w:val="${NAVY}"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>` +
      `<w:r><w:rPr><w:b/><w:color w:val="${NAVY}"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:b/><w:color w:val="${NAVY}"/></w:rPr><w:t>2</w:t></w:r><w:r><w:rPr><w:b/><w:color w:val="${NAVY}"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>` +
      `<w:r><w:tab/></w:r><w:r><w:tab/></w:r><w:hyperlink w:anchor="TOC_Home" w:tooltip="Back to contents" w:history="1">` +
      `<w:r><w:rPr><w:rStyle w:val="Hyperlink"/><w:rFonts w:ascii="Apple Color Emoji" w:hAnsi="Apple Color Emoji" w:cs="Segoe UI Emoji"/><w:b/><w:color w:val="${NAVY}"/></w:rPr><w:t>🏠</w:t></w:r></w:hyperlink></w:p></w:ftr>`,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${NS}><w:body>${body}${sect}</w:body></w:document>`,
  };
  return zip(files);
}

// ---------- Minimal zip writer (stored, no compression) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function zip(files) {
  const enc = new TextEncoder();
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const parts = [], central = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = enc.encode(name), data = enc.encode(content), crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true); local.setUint16(10, dosTime, true); local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true); local.setUint16(28, 0, true);
    parts.push(new Uint8Array(local.buffer), nameBytes, data);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
    cen.setUint16(10, 0, true); cen.setUint16(12, dosTime, true); cen.setUint16(14, dosDate, true);
    cen.setUint32(16, crc, true); cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true);
    cen.setUint16(28, nameBytes.length, true); cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const cenSize = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, Object.keys(files).length, true); end.setUint16(10, Object.keys(files).length, true);
  end.setUint32(12, cenSize, true); end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let pos = 0;
  for (const p of all) { out.set(p, pos); pos += p.length; }
  return out;
}
