/**
 * config.js — Nihongo Daily Assistant
 * Isi API_KEY dengan key OpenAI / Gemini Anda jika ingin
 * menggunakan LLM. Biarkan kosong ("") untuk mode lokal offline.
 *
 * Contoh OpenAI  : API_KEY = "sk-..."
 * Contoh Gemini  : API_KEY = "AIza..."
 */

const CONFIG = {
  // Isi dengan API key LLM Anda, atau biarkan kosong untuk mode lokal
  API_KEY: "",

  // "openai" | "gemini" — pilih provider sesuai API key di atas
  PROVIDER: "openai",

  // Model yang dipakai (contoh: "gpt-4o-mini", "gemini-1.5-flash")
  MODEL: "gpt-4o-mini",
};
