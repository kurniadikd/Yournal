/**
 * @file src/utils/validemail.js
 * @description Validasi alamat email.
 */

/**
 * Validasi Email.
 * - Format harus benar jika diisi.
 * @param {string} emailValue - Nilai input email.
 * @param {object} [options] - Opsi validasi tambahan.
 * @param {boolean} [options.isUnique=true] - Status keunikan (untuk simulasi pengecekan backend).
 * @returns {{status: boolean, message: string}}
 */
export function validateEmail(emailValue: string, options: { isUnique?: boolean } = { isUnique: true }): { status: boolean; message: string } {
  const value = emailValue ? emailValue.trim() : '';

  // Jika kosong, anggap valid. Komponen yang akan menentukan apakah field ini wajib atau tidak.
  if (!value) {
    return { status: true, message: '' };
  }

  // 1. Validasi Format
  // Regex standar yang cukup kuat untuk validasi format email di sisi klien
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { status: false, message: 'Format email tidak valid.' };
  }

  // 2. Validasi Keunikan (PENTING: Logika ini harus diimplementasikan di komponen Vue melalui API)
  if (options.isUnique === false) {
    return {
      status: false,
      message: 'Email ini sudah digunakan oleh akun lain.',
    };
  }

  return { status: true, message: '' };
}
