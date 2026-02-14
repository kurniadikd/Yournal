// src/utils/sentenceValidation.js
import { api } from '@/utils/api';

/**
 * Memvalidasi dan mengoreksi sekelompok kalimat menggunakan API backend.
 * @param {Object} sentences - Objek kalimat dengan kode bahasa sebagai kunci.
 * @param {Array} availableLanguages - Array objek bahasa yang tersedia dari DB.
 * @returns {Promise<Object>} - Mengembalikan objek dengan kunci adalah kode bahasa
 * dan nilai adalah hasil dari backend (corrected_text atau invalid_words).
 */
/**
 * Memvalidasi dan mengoreksi sekelompok kalimat menggunakan API backend.
 * @param {Object} sentences - Objek kalimat dengan kode bahasa sebagai kunci.
 * @param {Array} availableLanguages - Array objek bahasa yang tersedia dari DB.
 * @returns {Promise<Object>} - Mengembalikan objek dengan kunci adalah kode bahasa
 * dan nilai adalah hasil dari backend (corrected_text atau invalid_words).
 */
export async function validateSentences(sentences: Record<string, string>, availableLanguages: any[] = []): Promise<Record<string, any> | null> {
  try {
    const availableLangCodes = availableLanguages.map(
      (lang) => lang.kodeBahasa,
    );
    const sentencesToValidate: Record<string, string> = {};

    // Filter sentences to only include those with available language codes
    for (const langCode in sentences) {
      if (availableLangCodes.includes(langCode)) {
        sentencesToValidate[langCode] = sentences[langCode];
      }
    }

    if (Object.keys(sentencesToValidate).length === 0) {
      // Return an empty object if there are no sentences to validate
      return {};
    }

    const { data } = await api.post('/api/words/validate-sentence/', {
      sentences: sentencesToValidate,
    });
    return data;
  } catch (error) {
    console.error('Gagal memvalidasi kalimat:', error);
    return null;
  }
}

/**
 * Fungsi untuk memeriksa apakah semua validasi berhasil.
 * @param {Object} validationResults
 * @returns {boolean}
 */
export function isValidationSuccessful(validationResults: Record<string, any>) {
  if (!validationResults) return false;
  return Object.values(validationResults).every((result) => {
    return result.status === 'ok' && result.invalid_words.length === 0;
  });
}
