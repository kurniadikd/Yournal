/**
 * @file src/utils/dirtyForm.js
 * @description Utilitas untuk mendeteksi perubahan pada form.
 */

import { cloneDeep, isEqual } from 'lodash-es';

/**
 * Membandingkan dua objek untuk mendeteksi perubahan.
 * Utilitas ini menyalin objek awal agar tidak dimodifikasi dan
 * melakukan perbandingan mendalam untuk memastikan semua properti
 * (termasuk properti dalam objek bersarang atau array) diperiksa.
 * * @param {object} initialData - Objek data asli/awal.
 * @param {object} currentData - Objek data form saat ini.
 * @returns {boolean} - true jika ada perubahan, false jika tidak.
 */
export function isFormDirty(initialData: Record<string, any>, currentData: Record<string, any>): boolean {
  // Menggunakan cloneDeep untuk memastikan perbandingan tidak mengubah objek asli.
  // Menggunakan isEqual untuk perbandingan mendalam (deep comparison).
  return !isEqual(cloneDeep(initialData), cloneDeep(currentData));
}

/**
 * Utilitas untuk mengidentifikasi properti mana saja yang berubah.
 * Berguna untuk styling per-field atau mengirim hanya data yang berubah ke API.
 * * @param {object} initialData - Objek data asli/awal.
 * @param {object} currentData - Objek data form saat ini.
 * @returns {object} - Objek baru yang hanya berisi properti yang berubah.
 */
export function getChangedFields(initialData: Record<string, any>, currentData: Record<string, any>): Record<string, any> {
  const changedFields: Record<string, any> = {};

  if (!initialData || !currentData) {
    return changedFields;
  }

  for (const key in currentData) {
    // Memastikan properti ada di kedua objek sebelum membandingkan.
    if (Object.prototype.hasOwnProperty.call(initialData, key)) {
      if (!isEqual(currentData[key], initialData[key])) {
        changedFields[key] = currentData[key];
      }
    }
  }

  return changedFields;
}
