/**
 * Konfigurasi Aplikasi Leksika
 *
 * Versi diambil otomatis dari Git tags saat build.
 * Format: MAJOR.MINOR.PATCH (Semantic Versioning)
 *
 * Cara kerja:
 * - Development: membaca dari git describe
 * - Production: versi sudah di-inject saat build oleh Vite
 *
 * Cara update versi:
 * 1. git commit -m "Your changes"
 * 2. git tag v1.1.0 (atau versi yang diinginkan)
 * 3. git push origin main --tags
 */

// Versi di-inject oleh Vite saat build (dari vite.config.js)
export const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

export const COMMIT_HASH =
  typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : '';

export const BUILD_TIME =
  typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';

export const APP_CONFIG = {
  name: 'Leksika',
  version: APP_VERSION,
  commit: COMMIT_HASH,
  buildTime: BUILD_TIME,
  tagline: 'Platform Pembelajaran Bahasa',
  copyright: `© ${new Date().getFullYear()} Leksika`,
  website: 'https://leksika.id',
};

// Export nama aplikasi
export const APP_NAME = APP_CONFIG.name;
