/**
 * @file src/utils/validpassword.js
 * @description Validasi password dan konfirmasi password.
 */

/**
 * Validasi Password.
 * - Panjang 8-256 karakter.
 * - Harus mengandung kombinasi huruf besar, huruf kecil, angka, dan simbol.
 * @param {string} passwordValue - Nilai input password.
 * @returns {{status: boolean, message: string}}
 */
export function validatePassword(passwordValue: string): { status: boolean; message: string } {
  const value = passwordValue || '';
  if (!value) {
    return { status: false, message: 'Kata sandi tidak boleh kosong.' };
  }
  if (value.length < 8) {
    return { status: false, message: 'Kata sandi minimal 8 karakter.' };
  }
  if (value.length > 256) {
    return { status: false, message: 'Kata sandi maksimal 256 karakter.' };
  }
  if (!/[a-z]/.test(value)) {
    return {
      status: false,
      message: 'Harus mengandung setidaknya satu huruf kecil.',
    };
  }
  if (!/[A-Z]/.test(value)) {
    return {
      status: false,
      message: 'Harus mengandung setidaknya satu huruf besar.',
    };
  }
  if (!/[0-9]/.test(value)) {
    return {
      status: false,
      message: 'Harus mengandung setidaknya satu angka.',
    };
  }
  // Regex ini mencari karakter apa pun yang BUKAN huruf atau angka (yaitu simbol)
  if (!/[^a-zA-Z0-9]/.test(value)) {
    return {
      status: false,
      message: 'Harus mengandung setidaknya satu simbol (contoh: !@#$).',
    };
  }
  return { status: true, message: '' };
}

/**
 * Validasi Konfirmasi Password.
 * - Memastikan nilainya sama dengan password utama.
 * @param {string} passwordValue - Nilai dari field password utama.
 * @param {string} confirmValue - Nilai dari field konfirmasi password.
 * @returns {{status: boolean, message: string}}
 */
export function validatePasswordConfirm(passwordValue: string, confirmValue: string): { status: boolean; message: string } {
  const password = passwordValue || '';
  const confirm = confirmValue || '';

  // Hanya validasi jika password utama sudah diisi
  if (password) {
    if (!confirm) {
      return {
        status: false,
        message: 'Konfirmasi kata sandi tidak boleh kosong.',
      };
    }
    if (password !== confirm) {
      return { status: false, message: 'Kata sandi tidak cocok.' };
    }
  }
  return { status: true, message: '' };
}
