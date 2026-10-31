/**
 * app.js — Nihongo Daily Assistant
 * Logic utama: navigasi aktif, AI tutor lokal, dan helper UI.
 * Dipasang di setiap halaman.
 */

// ─── NAVIGASI AKTIF ──────────────────────────────────────────────────────────
(function markActiveNav() {
  const path = window.location.pathname;
  const filename = path.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-link").forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (href === filename || (filename === "" && href === "index.html")) {
      link.classList.add("active");
    }
  });
})();

// ─── AI TUTOR LOCAL ENGINE ───────────────────────────────────────────────────

/**
 * Basis pengetahuan lokal untuk menjawab pertanyaan bahasa Jepang.
 * Dicek sebelum memanggil LLM API (jika tersedia).
 */
const LOCAL_KB = {
  // Pola: [regex, fungsi_jawaban(match, inputAsli)]
  rules: [
    // Artinya apa / translate
    {
      pattern: /(?:artinya|arti|arti dari|apa arti|translate|terjemahkan|meaning of)\s+[「『"]?([^\s「』"」]+)[」』"]?/i,
      handler: (m, raw) => lookupWord(m[1]),
    },
    // Apa itu / jelaskan
    {
      pattern: /(?:apa itu|jelaskan|apa yang dimaksud|pengertian)\s+([^\?？]+)/i,
      handler: (m) => explainTopic(m[1].trim()),
    },
    // Cara baca / romaji
    {
      pattern: /(?:cara baca|romaji|baca)\s+[「『"]?([^\s「』"」]+)[」』"]?/i,
      handler: (m) => getRomaji(m[1]),
    },
    // Contoh kalimat
    {
      pattern: /(?:contoh kalimat|contoh penggunaan|contoh)\s+([^\?？]+)/i,
      handler: (m) => getContohKalimat(m[1].trim()),
    },
    // Koreksi kalimat
    {
      pattern: /(?:koreksi|perbaiki|benarkan)\s+(.+)/i,
      handler: (m) => koreksiKalimat(m[1].trim()),
    },
    // Salam
    {
      pattern: /(?:salam|sapaan|ucapan|greeting)/i,
      handler: () => listSalam(),
    },
    // Hiragana
    {
      pattern: /(?:hiragana|huruf hiragana)/i,
      handler: () => infoHiragana(),
    },
    // Katakana
    {
      pattern: /(?:katakana|huruf katakana)/i,
      handler: () => infoKatakana(),
    },
    // Angka
    {
      pattern: /(?:angka|nomor|number|bilangan)/i,
      handler: () => listAngka(),
    },
    // Partikel
    {
      pattern: /(?:partikel|particle)\s*(は|が|を|に|で|の|wa|ga|wo|ni|de|no)?/i,
      handler: (m) => infoPartikel(m[1]),
    },
    // Grammar / tata bahasa
    {
      pattern: /(?:tata bahasa|grammar|pola|bentuk)\s*([^\?？]*)/i,
      handler: (m) => infoGrammar(m[1].trim()),
    },
    // Kanji
    {
      pattern: /(?:kanji)\s*([^\?？]*)/i,
      handler: (m) => infoKanji(m[1].trim()),
    },
  ],
};

/** Cari kata di semua dataset */
function lookupWord(kata) {
  kata = kata.trim().toLowerCase();
  const allData = [
    ...DATA_KOSAKATA,
    ...DATA_SALAM,
    ...DATA_ANGKA,
    ...DATA_KANJI,
    ...DATA_HIRAGANA,
    ...DATA_KATAKANA,
  ];

  const results = allData.filter(
    (d) =>
      d.jp === kata ||
      d.romaji?.toLowerCase() === kata ||
      d.arti?.toLowerCase().includes(kata) ||
      d.jp?.includes(kata)
  );

  if (!results.length) {
    return `Maaf, saya tidak menemukan kata <b>「${kata}」</b> di basis data saya. Coba tanyakan dengan kata lain atau periksa ejaannya.`;
  }

  const lines = results.slice(0, 5).map(
    (r) =>
      `<div class="ai-word-row"><span class="ai-jp">${r.jp}</span> <span class="ai-romaji">(${r.romaji})</span> — <span class="ai-arti">${r.arti}</span></div>`
  );
  return `Saya menemukan <b>${results.length}</b> entri untuk <b>「${kata}」</b>:<br>${lines.join("")}`;
}

/** Jelaskan topik berdasarkan kata kunci */
function explainTopic(topik) {
  const t = topik.toLowerCase();

  // Cek grammar
  const gr = DATA_GRAMMAR.find(
    (g) =>
      g.id.includes(t) ||
      g.judul.toLowerCase().includes(t) ||
      t.includes(g.id)
  );
  if (gr) return formatGrammar(gr);

  // Cek kata
  return lookupWord(topik);
}

/** Format satu entri grammar menjadi HTML */
function formatGrammar(gr) {
  const contohList = gr.contoh
    .map(
      (c) =>
        `<div class="ai-word-row"><span class="ai-jp">${c.jp}</span><br><span class="ai-romaji">${c.romaji}</span><br><span class="ai-arti">${c.arti}</span></div>`
    )
    .join("");
  return `<b>${gr.judul}</b><br>
<b>Pola:</b> ${gr.pola}<br><br>
<b>Penjelasan:</b> ${gr.penjelasan}<br><br>
<b>Contoh:</b><br>${contohList}`;
}

/** Dapatkan romaji dari karakter Jepang */
function getRomaji(karakter) {
  const all = [...DATA_HIRAGANA, ...DATA_KATAKANA, ...DATA_KOSAKATA, ...DATA_KANJI];
  const found = all.find((d) => d.jp === karakter || d.jp?.includes(karakter));
  if (found) {
    return `<span class="ai-jp">${found.jp}</span> dibaca: <b>${found.romaji}</b> (${found.arti})`;
  }
  return `Maaf, saya tidak menemukan cara baca untuk <b>「${karakter}」</b>.`;
}

/** Berikan contoh kalimat dari kata kunci */
function getContohKalimat(kata) {
  const k = kata.toLowerCase();

  // Cari di grammar
  for (const gr of DATA_GRAMMAR) {
    if (gr.id.includes(k) || gr.judul.toLowerCase().includes(k) || k.includes(gr.id)) {
      const c = gr.contoh[0];
      return `Contoh kalimat menggunakan <b>${gr.judul}</b>:<br>
<div class="ai-word-row">
  <span class="ai-jp">${c.jp}</span><br>
  <span class="ai-romaji">${c.romaji}</span><br>
  <span class="ai-arti">${c.arti}</span>
</div>`;
    }
  }

  // Cari di percakapan
  for (const p of DATA_PERCAKAPAN) {
    for (const d of p.dialog) {
      if (d.jp.includes(kata) || d.romaji?.toLowerCase().includes(k)) {
        return `Contoh dari percakapan "<b>${p.judul}</b>":<br>
<div class="ai-word-row">
  <span class="ai-jp">${d.jp}</span><br>
  <span class="ai-romaji">${d.romaji}</span><br>
  <span class="ai-arti">${d.arti}</span>
</div>`;
      }
    }
  }

  return lookupWord(kata);
}

/** Koreksi kalimat sederhana */
function koreksiKalimat(kalimat) {
  const tips = [];

  // Cek akhiran
  if (kalimat.match(/desu$|masu$/i) && !kalimat.match(/[。.]/)) {
    tips.push("💡 Kalimat formal biasanya diakhiri tanda titik (。) dalam tulisan Jepang.");
  }
  if (!kalimat.includes("は") && !kalimat.includes("が") && !kalimat.includes("wa")) {
    tips.push("💡 Pastikan kalimat memiliki partikel topik <b>は (wa)</b> atau subjek <b>が (ga)</b>.");
  }
  if (kalimat.match(/desu|masu/i) && kalimat.match(/da$|da\./i)) {
    tips.push("⚠️ Jangan campur bentuk sopan (desu/masu) dengan bentuk informal (da) dalam satu kalimat.");
  }

  if (!tips.length) {
    return `Kalimat "<b>${kalimat}</b>" terlihat sudah benar secara dasar! 👍<br>
Untuk koreksi mendalam, coba aktifkan mode LLM di <b>config.js</b>.`;
  }

  return `Analisis kalimat "<b>${kalimat}</b>":<br>${tips.join("<br>")}`;
}

/** Daftar salam */
function listSalam() {
  const rows = DATA_SALAM.map(
    (s) =>
      `<div class="ai-word-row"><span class="ai-jp">${s.jp}</span> <span class="ai-romaji">(${s.romaji})</span> — <span class="ai-arti">${s.arti}</span></div>`
  ).join("");
  return `<b>Salam & Ungkapan Dasar Bahasa Jepang:</b><br>${rows}`;
}

/** Info singkat hiragana */
function infoHiragana() {
  return `<b>Hiragana (ひらがな)</b> adalah sistem penulisan Jepang pertama yang perlu dipelajari.<br>
Terdiri dari <b>46 karakter dasar</b> yang masing-masing mewakili satu bunyi suku kata.<br>
Digunakan untuk: kata asli Jepang, partikel tata bahasa, dan akhiran kata kerja.<br><br>
5 vokal pertama: <span class="ai-jp">あ い う え お</span><br>
<span class="ai-romaji">a &nbsp; i &nbsp; u &nbsp; e &nbsp; o</span><br><br>
Pergi ke halaman <b>Materi → Hiragana</b> untuk melihat tabel lengkap!`;
}

/** Info singkat katakana */
function infoKatakana() {
  return `<b>Katakana (カタカナ)</b> adalah sistem penulisan untuk kata-kata serapan dari bahasa asing.<br>
Terdiri dari <b>46 karakter</b> dengan bunyi yang sama seperti hiragana, namun bentuk berbeda.<br>
Contoh: <span class="ai-jp">コーヒー</span> <span class="ai-romaji">(kōhī)</span> = kopi, dari bahasa Inggris "coffee".<br><br>
5 vokal pertama: <span class="ai-jp">ア イ ウ エ オ</span><br>
<span class="ai-romaji">a &nbsp; i &nbsp; u &nbsp; e &nbsp; o</span>`;
}

/** Daftar angka */
function listAngka() {
  const rows = DATA_ANGKA.map(
    (a) =>
      `<div class="ai-word-row"><span class="ai-jp">${a.jp}</span> <span class="ai-romaji">(${a.romaji})</span> = <span class="ai-arti">${a.arti}</span></div>`
  ).join("");
  return `<b>Angka dalam Bahasa Jepang:</b><br>${rows}`;
}

/** Info partikel */
function infoPartikel(partikel) {
  const info = {
    "は": "は (wa) — Penanda <b>topik</b> kalimat. Contoh: <span class='ai-jp'>わたしは学生です</span> (Saya adalah pelajar).",
    "wa": "は (wa) — Penanda <b>topik</b> kalimat. Contoh: <span class='ai-jp'>わたしは学生です</span> (Saya adalah pelajar).",
    "が": "が (ga) — Penanda <b>subjek gramatikal</b>. Contoh: <span class='ai-jp'>猫が好きです</span> (Kucing itu disukai / Saya suka kucing).",
    "ga": "が (ga) — Penanda <b>subjek gramatikal</b>. Contoh: <span class='ai-jp'>猫が好きです</span> (Saya suka kucing).",
    "を": "を (wo) — Penanda <b>objek langsung</b>. Contoh: <span class='ai-jp'>ごはんを食べます</span> (Makan nasi).",
    "wo": "を (wo) — Penanda <b>objek langsung</b>. Contoh: <span class='ai-jp'>ごはんを食べます</span> (Makan nasi).",
    "に": "に (ni) — Menunjukkan <b>tujuan, lokasi keberadaan, atau waktu</b>. Contoh: <span class='ai-jp'>学校に行く</span> (Pergi ke sekolah).",
    "ni": "に (ni) — Menunjukkan <b>tujuan, lokasi keberadaan, atau waktu</b>. Contoh: <span class='ai-jp'>学校に行く</span> (Pergi ke sekolah).",
    "で": "で (de) — Menunjukkan <b>tempat aksi atau alat</b>. Contoh: <span class='ai-jp'>バスで行く</span> (Pergi dengan bus).",
    "de": "で (de) — Menunjukkan <b>tempat aksi atau alat</b>. Contoh: <span class='ai-jp'>バスで行く</span> (Pergi dengan bus).",
    "の": "の (no) — Penanda <b>kepemilikan/penghubung kata benda</b>. Contoh: <span class='ai-jp'>私の本</span> (Bukuku).",
    "no": "の (no) — Penanda <b>kepemilikan/penghubung kata benda</b>. Contoh: <span class='ai-jp'>私の本</span> (Bukuku).",
  };

  if (partikel && info[partikel]) return info[partikel];

  return `<b>Partikel utama Bahasa Jepang:</b><br>
${Object.values(info).join("<br>")}`;
}

/** Info tata bahasa berdasarkan kata kunci */
function infoGrammar(kw) {
  if (!kw) {
    const list = DATA_GRAMMAR.map((g) => `• <b>${g.judul}</b> (${g.level})`).join("<br>");
    return `<b>Pola tata bahasa yang tersedia:</b><br>${list}<br><br>Tanyakan pola tertentu, contoh: "jelaskan te-form"`;
  }
  const k = kw.toLowerCase();
  const gr = DATA_GRAMMAR.find(
    (g) =>
      g.id.includes(k) ||
      g.judul.toLowerCase().includes(k) ||
      k.includes(g.id)
  );
  return gr ? formatGrammar(gr) : explainTopic(kw);
}

/** Info kanji berdasarkan kata kunci */
function infoKanji(kw) {
  if (!kw) {
    const list = DATA_KANJI.slice(0, 7)
      .map((k) => `<span class="ai-jp">${k.jp}</span> (${k.romaji}) = ${k.arti}`)
      .join("  •  ");
    return `<b>Kanji dasar:</b><br>${list}<br>…dan lebih banyak lagi. Buka halaman <b>Materi → Kanji</b>!`;
  }
  const k = kw.toLowerCase();
  const found = DATA_KANJI.filter(
    (kanji) =>
      kanji.jp === kw ||
      kanji.romaji?.toLowerCase().includes(k) ||
      kanji.arti?.toLowerCase().includes(k)
  );
  if (!found.length) return lookupWord(kw);

  return found
    .map(
      (kanji) =>
        `<div class="ai-word-row">
          <span class="ai-jp" style="font-size:2em">${kanji.jp}</span>
          <span class="ai-romaji">(${kanji.romaji})</span> — <span class="ai-arti">${kanji.arti}</span><br>
          <small>On'yomi: <b>${kanji.onyomi}</b> | Kun'yomi: <b>${kanji.kunyomi}</b></small>
        </div>`
    )
    .join("");
}

/** Pesan selamat datang dari AI tutor */
function getWelcomeMessage() {
  return `Konnichiwa! こんにちは！ 👋<br>
Saya <b>Sensei AI</b>, tutor bahasa Jepang Anda.<br>
Saya bisa membantu:<br>
• Menjelaskan arti kata — <i>contoh: "arti taberu"</i><br>
• Menjelaskan tata bahasa — <i>contoh: "jelaskan te-form"</i><br>
• Memberi contoh kalimat — <i>contoh: "contoh kalimat desu"</i><br>
• Mengoreksi kalimat — <i>contoh: "koreksi watashi wa gakusei desu"</i><br>
• Menjelaskan hiragana, katakana, angka, partikel, dan kanji<br><br>
Silakan ketik pertanyaan Anda! 😊`;
}

/**
 * Proses input pengguna dan kembalikan respons AI.
 * Coba LLM API terlebih dahulu jika tersedia, lalu fallback ke lokal.
 * @param {string} input
 * @returns {Promise<string>} HTML string jawaban
 */
async function processAIInput(input) {
  const trimmed = input.trim();
  if (!trimmed) return "Silakan ketik pertanyaan Anda.";

  // Coba LLM jika API key tersedia
  if (typeof CONFIG !== "undefined" && CONFIG.API_KEY) {
    try {
      return await callLLM(trimmed);
    } catch (e) {
      console.warn("LLM gagal, fallback ke lokal:", e.message);
      // Lanjut ke lokal engine
    }
  }

  return localEngine(trimmed);
}

/** Mesin jawaban lokal berbasis aturan */
function localEngine(input) {
  const inp = input.toLowerCase();
  for (const rule of LOCAL_KB.rules) {
    const m = input.match(rule.pattern) || inp.match(rule.pattern);
    if (m) {
      const answer = rule.handler(m, input);
      if (answer) return answer;
    }
  }

  // Fallback: coba cari kata langsung
  const wordAnswer = lookupWord(input);
  if (!wordAnswer.startsWith("Maaf")) return wordAnswer;

  return `Maaf, saya belum bisa menjawab pertanyaan itu. 🙏<br>
Coba tanyakan seperti ini:<br>
• <i>"arti [kata]"</i> — mencari arti<br>
• <i>"jelaskan [topik]"</i> — penjelasan<br>
• <i>"contoh kalimat [kata]"</i> — contoh<br>
• <i>"koreksi [kalimat]"</i> — koreksi<br>
• <i>"hiragana"</i> / <i>"katakana"</i> / <i>"angka"</i> / <i>"partikel"</i>`;
}

// ─── LLM API CALLER ──────────────────────────────────────────────────────────

/**
 * Panggil LLM API (OpenAI atau Gemini) berdasarkan CONFIG.
 * @param {string} userMsg
 * @returns {Promise<string>} HTML string jawaban
 */
async function callLLM(userMsg) {
  const systemPrompt = `Kamu adalah tutor bahasa Jepang yang ramah untuk pelajar Indonesia. 
Jawab dalam Bahasa Indonesia. 
Setiap kata/kalimat Jepang WAJIB disertai romaji dan arti Indonesia dalam format: 「kata」(romaji) = arti.
Gunakan format HTML sederhana: <b>, <br>, <span>. Jangan gunakan markdown.`;

  if (CONFIG.PROVIDER === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.MODEL}:generateContent?key=${CONFIG.API_KEY}`;
    const body = {
      contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + userMsg }] }],
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Gemini API error: " + res.status);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Tidak ada respons.";
  }

  // Default: OpenAI compatible
  const url = "https://api.openai.com/v1/chat/completions";
  const body = {
    model: CONFIG.MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMsg },
    ],
    max_tokens: 600,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + CONFIG.API_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("OpenAI API error: " + res.status);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "Tidak ada respons.";
}

// ─── KATA HARI INI ───────────────────────────────────────────────────────────

/**
 * Dapatkan kata hari ini berdasarkan tanggal (deterministic).
 * @returns {Object} entri dari DATA_WORD_OF_DAY
 */
function getWordOfDay() {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today - new Date(today.getFullYear(), 0, 0)) / 86400000
  );
  const idx = dayOfYear % DATA_WORD_OF_DAY.length;
  return DATA_WORD_OF_DAY[idx];
}

// ─── HELPER ──────────────────────────────────────────────────────────────────

/** Escape HTML untuk menghindari XSS pada input pengguna */
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Format tanggal ke locale Indonesia */
function formatTanggal(isoDate) {
  return new Date(isoDate).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
