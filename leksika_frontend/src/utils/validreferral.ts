/**
 * Memvalidasi kode referral.
 * Kode ini opsional. Jika diisi, harus hanya berisi huruf kapital (A-Z) dan angka (0-9).
 * @param {string} code - Kode referral yang akan divalidasi.
 * @returns {{status: boolean, message: string}}
 */
export function validateReferralCode(code: string): { status: boolean; message: string } {
  // Jika kode kosong, dianggap valid karena opsional.
  if (!code) {
    return {
      status: true,
      message: '',
    };
  }

  // Pola regex untuk hanya memperbolehkan huruf kapital dan angka.
  const referralRegex = /^[A-Z0-9]+$/;

  if (!referralRegex.test(code)) {
    return {
      status: false,
      message: 'Kode referral hanya boleh berisi huruf kapital dan angka.',
    };
  }

  // Anda juga bisa menambahkan validasi panjang kode di sini jika perlu.
  // Contoh: if (code.length < 6 || code.length > 8) { ... }

  return {
    status: true,
    message: '',
  };
}
