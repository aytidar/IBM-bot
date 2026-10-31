/**
 * storage.js — Nihongo Daily Assistant
 * Utilitas untuk membaca dan menulis data progress ke localStorage.
 * Menangani localStorage kosong, error, dan data korup.
 */

const STORAGE_KEY = "nihongo_daily_v1";

/** Struktur data default progress */
function defaultProgress() {
  return {
    // Materi yang sudah ditandai selesai (array of string ID)
    materiSelesai: [],
    // Riwayat kuis: array of { tanggal, level, kategori, skor, total }
    riwayatKuis: [],
    // Streak harian: { lastDate: "YYYY-MM-DD", count: number }
    streak: { lastDate: null, count: 0 },
    // Tanggal login pertama
    mulaiDari: new Date().toISOString().slice(0, 10),
  };
}

/**
 * Baca seluruh progress dari localStorage.
 * Jika kosong atau korup, kembalikan nilai default.
 * @returns {Object} progress
 */
function getProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    // Merge dengan default untuk field yang mungkin belum ada
    return Object.assign({}, defaultProgress(), parsed);
  } catch (e) {
    console.warn("Storage error — menggunakan data default.", e);
    return defaultProgress();
  }
}

/**
 * Simpan seluruh progress ke localStorage.
 * @param {Object} progress
 */
function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error("Gagal menyimpan progress:", e);
    alert("Penyimpanan gagal. Mungkin kapasitas browser penuh.");
  }
}

// ─── Materi ──────────────────────────────────────────────────────────────────

/**
 * Tandai materi sebagai selesai.
 * @param {string} id — ID unik item materi
 */
function tandaiSelesai(id) {
  const p = getProgress();
  if (!p.materiSelesai.includes(id)) {
    p.materiSelesai.push(id);
    saveProgress(p);
  }
}

/**
 * Hapus tanda selesai suatu materi.
 * @param {string} id
 */
function hapusTandaiSelesai(id) {
  const p = getProgress();
  p.materiSelesai = p.materiSelesai.filter((x) => x !== id);
  saveProgress(p);
}

/**
 * Cek apakah materi sudah diselesaikan.
 * @param {string} id
 * @returns {boolean}
 */
function sudahSelesai(id) {
  return getProgress().materiSelesai.includes(id);
}

// ─── Kuis ─────────────────────────────────────────────────────────────────────

/**
 * Simpan hasil satu sesi kuis.
 * @param {string} level   — "pemula" | "menengah"
 * @param {string} kategori
 * @param {number} skor    — jumlah jawaban benar
 * @param {number} total   — jumlah soal
 */
function simpanHasilKuis(level, kategori, skor, total) {
  const p = getProgress();
  p.riwayatKuis.push({
    tanggal: new Date().toISOString().slice(0, 10),
    level,
    kategori,
    skor,
    total,
  });
  // Batasi riwayat 50 entri terbaru
  if (p.riwayatKuis.length > 50) {
    p.riwayatKuis = p.riwayatKuis.slice(-50);
  }
  saveProgress(p);
}

/**
 * Hitung rata-rata skor kuis (dalam %).
 * @returns {number} 0–100
 */
function rataRataSkor() {
  const p = getProgress();
  if (!p.riwayatKuis.length) return 0;
  const total = p.riwayatKuis.reduce(
    (acc, r) => acc + Math.round((r.skor / r.total) * 100),
    0
  );
  return Math.round(total / p.riwayatKuis.length);
}

// ─── Streak ──────────────────────────────────────────────────────────────────

/**
 * Perbarui streak harian. Panggil setiap kali halaman dibuka.
 */
function perbaruiStreak() {
  const p = getProgress();
  const hari = new Date().toISOString().slice(0, 10);

  if (p.streak.lastDate === hari) {
    // Sudah login hari ini, tidak perlu update
    return;
  }

  const kemarin = new Date();
  kemarin.setDate(kemarin.getDate() - 1);
  const tglKemarin = kemarin.toISOString().slice(0, 10);

  if (p.streak.lastDate === tglKemarin) {
    // Login berturut-turut
    p.streak.count += 1;
  } else {
    // Streak terputus atau pertama kali
    p.streak.count = 1;
  }
  p.streak.lastDate = hari;
  saveProgress(p);
}

/**
 * Dapatkan jumlah hari streak saat ini.
 * @returns {number}
 */
function getStreak() {
  return getProgress().streak.count;
}

// ─── Ekspor / Impor ──────────────────────────────────────────────────────────

/**
 * Ekspor progress ke file JSON yang diunduh browser.
 */
function eksporProgress() {
  const p = getProgress();
  const json = JSON.stringify(p, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nihongo_progress_" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Impor progress dari file JSON.
 * @param {File} file
 * @param {Function} onSuccess — callback setelah berhasil
 */
function imporProgress(file, onSuccess) {
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.materiSelesai || !data.riwayatKuis) {
        throw new Error("Format file tidak valid.");
      }
      saveProgress(data);
      if (typeof onSuccess === "function") onSuccess();
    } catch (err) {
      alert("Gagal mengimpor: " + err.message);
    }
  };
  reader.readAsText(file);
}

/**
 * Reset semua progress ke default.
 */
function resetProgress() {
  saveProgress(defaultProgress());
}

// ─── Statistik ───────────────────────────────────────────────────────────────

/**
 * Hitung persen materi yang sudah selesai dari total yang tersedia.
 * @param {number} totalMateri — jumlah total item materi
 * @returns {number} 0–100
 */
function persenMateriSelesai(totalMateri) {
  if (!totalMateri) return 0;
  const p = getProgress();
  return Math.min(100, Math.round((p.materiSelesai.length / totalMateri) * 100));
}
