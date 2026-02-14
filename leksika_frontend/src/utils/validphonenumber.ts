/**
 * @file src/utils/validphonenumber.js
 * @description Validasi nomor telepon.
 */

/**
 * Validasi Nomor Telepon (tanpa kode negara).
 * - Opsional, tapi jika diisi harus berupa angka dan panjangnya wajar.
 * @param {string} phoneValue - Nilai input nomor telepon.
 * @param {object} [options] - Opsi validasi tambahan.
 * @param {boolean} [options.isUnique=true] - Status keunikan (untuk simulasi pengecekan backend).
 * @returns {{status: boolean, message: string}}
 */
export function validatePhoneNumber(phoneValue: string, options: { isUnique?: boolean } = { isUnique: true }): { status: boolean; message: string } {
  const value = phoneValue ? phoneValue.trim() : '';

  // Jika tidak ada nilai, anggap valid karena nomor telepon bisa jadi opsional
  if (!value) {
    return { status: true, message: '' };
  }

  // 1. Validasi Format
  // Harus berisi angka dan minimal 7 digit
  if (!/^[0-9]{7,}$/.test(value)) {
    return {
      status: false,
      message: 'Format nomor telepon tidak valid (minimal 7 digit).',
    };
  }

  // 2. Validasi Keunikan (PENTING: Logika ini harus diimplementasikan di komponen Vue melalui API)
  if (options.isUnique === false) {
    return {
      status: false,
      message: 'Nomor telepon ini sudah digunakan oleh akun lain.',
    };
  }

  return { status: true, message: '' };
}
