/**
 * @file src/utils/validname.js
 * @description Validasi terkait nama depan, belakang, dan username.
 */

// Daftar username yang dilarang. Gunakan Set untuk pencarian yang efisien.
const FORBIDDEN_USERNAMES = new Set([
  'admin',
  'root',
  'administrator',
  'support',
  'contact',
  'help',
  'moderator',
  'testuser',
  'kurniadi',
  'khamdanu',
  'kurniadikhamdanu',
  'polyglot',
  'poliglot',
  'indonesia',
  'indonesian',
  'pelajar',
  'siswa',
  'siswi',
  'superadmin',
]);

/**
 * Validasi Nama (untuk nama depan & belakang).
 * @param {string} nameValue - Nilai input nama.
 * @param {object} config - Konfigurasi { min, max, fieldName }.
 * @returns {{status: boolean, message: string}}
 */
/**
 * Validasi Nama (untuk nama depan & belakang).
 * @param {string} nameValue - Nilai input nama.
 * @param {object} config - Konfigurasi { min, max, fieldName }.
 * @returns {{status: boolean, message: string}}
 */
export function validateName(
  nameValue: string,
  config: { min: number; max: number; fieldName: string } = { min: 1, max: 50, fieldName: 'Nama' },
): { status: boolean; message: string } {
  const value = nameValue ? nameValue.trim() : '';

  if (!value) {
    return {
      status: false,
      message: `${config.fieldName} tidak boleh kosong.`,
    };
  }
  if (value.length < config.min) {
    return {
      status: false,
      message: `${config.fieldName} minimal ${config.min} karakter.`,
    };
  }
  if (value.length > config.max) {
    return {
      status: false,
      message: `${config.fieldName} maksimal ${config.max} karakter.`,
    };
  }
  // Hanya mengizinkan huruf, spasi (untuk nama ganda), dan apostrof (untuk nama seperti O'Brian)
  if (!/^[a-zA-Z\s']+$/.test(value)) {
    return {
      status: false,
      message: `${config.fieldName} hanya boleh berisi huruf.`,
    };
  }
  return { status: true, message: '' };
}

/**
 * Validasi Username.
 * - Panjang 4-20 karakter.
 * - Hanya huruf kecil, angka, underscore (_), dan titik (.).
 * - Memeriksa daftar username terlarang.
 * @param {string} usernameValue - Nilai input username.
 * @returns {{status: boolean, message: string}}
 */
export function validateUsername(usernameValue: string): { status: boolean; message: string } {
  const value = usernameValue ? usernameValue.trim() : '';

  if (!value) {
    return { status: false, message: 'Username tidak boleh kosong.' };
  }
  if (value.length < 4) {
    return { status: false, message: 'Username minimal 4 karakter.' };
  }
  if (value.length > 20) {
    return { status: false, message: 'Username maksimal 20 karakter.' };
  }
  // Regex ini memastikan semua aturan karakter terpenuhi sekaligus (termasuk tidak ada spasi)
  if (!/^[a-z0-9_.]+$/.test(value)) {
    return {
      status: false,
      message: 'Username hanya boleh berisi huruf kecil, angka, "_", dan "."',
    };
  }

  // PERIKSA DAFTAR TERLARANG
  if (FORBIDDEN_USERNAMES.has(value)) {
    return { status: false, message: 'Username ini tidak tersedia.' };
  }

  return { status: true, message: '' };
}
