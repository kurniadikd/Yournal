// src/utils/formatters.js

/**
 * USERNAME: Mengubah ke huruf kecil dan hanya mengizinkan karakter tertentu.
 */
/**
 * USERNAME: Mengubah ke huruf kecil dan hanya mengizinkan karakter tertentu.
 */
export function formatUsernameInput(event: any) {
  const value = event.target.value;
  // Ubah ke huruf kecil, lalu hapus semua karakter yang tidak diizinkan
  return value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
}
export function formatSentenceCapitalization(event: any) {
  const value = event.target.value;
  // Regex: (^\w) => tangkap huruf pertama di awal string.
  // Regex: ((?:\.\s*)\w) => tangkap huruf pertama setelah titik dan spasi (opsional).
  return value.replace(/(^\w|(?:\.\s*)\w)/g, (c: string) => c.toUpperCase());
}
/**
 * NAMA: Memformat nama agar kapital di awal kata dan hanya mengizinkan huruf, spasi & apostrof.
 * Fungsi ini digunakan pada event @input untuk kapitalisasi otomatis saat mengetik.
 */
export function formatNameOnInput(event: any) {
  let value = event.target.value;

  // Langkah 1: Hapus karakter yang tidak diizinkan (hanya izinkan a-z, A-Z, spasi, dan apostrof)
  value = value.replace(/[^a-zA-Z\s']/g, '');

  // Langkah 2: Buat kapital di awal setiap kata
  // Ekspresi regex /(?:^|\s)\S/g mencari karakter non-spasi (\S) yang didahului oleh
  // awal string (^) atau spasi (\s).
  const formatted = value.replace(/(?:^|\s)\S/g, (txt: string) => txt.toUpperCase());

  return formatted;
}

/**
 * NAMA: Hanya mengizinkan huruf & spasi.
 * CATATAN: Fungsi ini sekarang jarang digunakan karena ada formatNameOnInput.
 */
export function filterNameInput(event: any) {
  const value = event.target.value;
  return value.replace(/[^a-zA-Z\s']/g, '');
}

/**
 * NAMA (saat blur): Menghapus spasi ekstra & membuat kapital di awal kata.
 * Fungsi ini memastikan spasi ganda dihapus dan spasi di awal/akhir dipotong.
 */
export function formatNameOnBlur(event: any) {
  // Trim spasi di awal/akhir, dan ganti spasi ganda dengan spasi tunggal
  const value = event.target.value.trim().replace(/\s\s+/g, ' ');

  // Kapitalisasi setiap kata
  const formatted = value.replace(/\w\S*/g, (txt: string) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
  return formatted;
}

/**
 * EMAIL: Menghapus karakter yang tidak valid (spasi, dll.).
 */
export function formatEmailInput(event: any) {
  const value = event.target.value;
  // Hapus semua karakter KECUALI huruf, angka, dan simbol umum email (@ . _ -)
  return value.replace(/[^a-zA-Z0-9@._-]/g, '');
}

/**
 * NOMOR TELEPON: Hanya mengizinkan angka.
 * @param {Event} event - Event input.
 * @param {number} [maxLength=null] - Batas panjang karakter opsional.
 */
export const formatNumberOnlyInput = (event: any, maxLength: number | null = null) => {
  let value = event.target ? event.target.value : event; // Bisa menerima event atau string langsung
  let formatted = value.replace(/[^0-9]/g, '');

  if (maxLength && formatted.length > maxLength) {
    formatted = formatted.slice(0, maxLength);
  }

  return formatted;
};

/**
 * KODE NEGARA: Mengizinkan '+' di awal, sisanya angka.
 */
export function formatCountryCodeInput(event: any) {
  let value = event.target.value.replace(/[^0-9+]/g, '');
  // Pastikan tanda '+' hanya ada satu dan di posisi paling depan
  if (value.lastIndexOf('+') > 0) {
    value = '+' + value.replace(/\+/g, '');
  }
  return value;
}

/**
 * BARU: Membersihkan dan memformat input kode referral.
 * Mengubah menjadi huruf kapital dan hanya mengizinkan huruf serta angka.
 */
export const formatReferralCodeInput = (event: any) => {
  const value = event.target.value;
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
};
