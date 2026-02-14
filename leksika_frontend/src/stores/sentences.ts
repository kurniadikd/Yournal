import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSentencesStore = defineStore('sentences', () => {
  // Menyimpan data lengkap grup kalimat yang BARU SAJA diperbarui.
  const lastUpdatedSentenceGroup = ref<any>(null); // Replace 'any' with SentenceGroup type if available

  // Menyimpan ID grup kalimat yang BARU SAJA dihapus.
  const lastDeletedSentenceId = ref<string | number | null>(null);

  // Menyimpan ID grup kalimat yang BARU SAJA dinonaktifkan.
  const lastDeactivatedSentenceId = ref<string | number | null>(null);

  // Menyimpan ID grup kalimat yang BARU SAJA diaktifkan.
  const lastActivatedSentenceId = ref<string | number | null>(null);

  /**
   * Dipanggil setelah berhasil memperbarui data di modal edit.
   * @param {object} sentenceGroup - Objek grup kalimat lengkap dari respons API.
   */
  function setUpdatedSentence(sentenceGroup: any) {
    lastUpdatedSentenceGroup.value = sentenceGroup;
  }

  /**
   * Dipanggil setelah berhasil menghapus data di modal edit.
   * @param {string|number} sentenceId - ID dari grup kalimat yang dihapus.
   */
  function setDeletedSentence(sentenceId: string | number) {
    lastDeletedSentenceId.value = sentenceId;
  }

  /**
   * Dipanggil setelah berhasil menonaktifkan data di modal edit.
   * @param {string|number} sentenceId - ID dari grup kalimat yang dinonaktifkan.
   */
  function setDeactivatedSentence(sentenceId: string | number) {
    lastDeactivatedSentenceId.value = sentenceId;
  }

  /**
   * Dipanggil setelah berhasil mengaktifkan data di modal edit.
   * @param {string|number} sentenceId - ID dari grup kalimat yang diaktifkan.
   */
  function setActivatedSentence(sentenceId: string | number) {
    lastActivatedSentenceId.value = sentenceId;
  }

  /**
   * Membersihkan state setelah sinyal diterima dan diproses.
   */
  function clearLastUpdatedSentence() {
    lastUpdatedSentenceGroup.value = null;
  }

  function clearLastDeletedSentence() {
    lastDeletedSentenceId.value = null;
  }

  function clearLastDeactivatedSentence() {
    lastDeactivatedSentenceId.value = null;
  }

  function clearLastActivatedSentence() {
    lastActivatedSentenceId.value = null;
  }

  return {
    // State
    lastUpdatedSentenceGroup,
    lastDeletedSentenceId,
    lastDeactivatedSentenceId,
    lastActivatedSentenceId,
    // Actions
    setUpdatedSentence,
    setDeletedSentence,
    setDeactivatedSentence,
    setActivatedSentence,
    clearLastUpdatedSentence,
    clearLastDeletedSentence,
    clearLastDeactivatedSentence,
    clearLastActivatedSentence,
  };
});
