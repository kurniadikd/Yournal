import { defineStore } from 'pinia';
import { useStorage } from '@vueuse/core';
import { ref, computed } from 'vue';
import { api } from '@/utils/api';
import { useAuthStore } from '@/stores/auth';

const getFlagUrl = (flagCode: string | null, size = '1x1') => {
  if (!flagCode) return null;
  return `https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/7.5.0/flags/${size}/${flagCode}.svg`;
};

interface Language {
  id: number;
  name: string;
  lang_code: string;
  flag_code: string | null;
  is_active_source: boolean;
  is_active_target: boolean;
  nama?: string;
  kodeBahasa?: string;
  kodeBendera?: string;
  bendera?: string | null;
}

const prosesBahasaDariApi = (bahasa: any): Language => {
  const kodeBahasa = bahasa.lang_code;
  const kodeBendera = bahasa.flag_code;

  return {
    ...bahasa,
    nama: bahasa.name,
    kodeBahasa: kodeBahasa,
    kodeBendera: kodeBendera,
    bendera: kodeBendera ? getFlagUrl(kodeBendera, '1x1') : null,
  };
};

export const useLanguageStore = defineStore('language', () => {
  // --- STATE ---
  const bahasaAsal = useStorage('leksika-language-asal', 'Indonesia');
  const bahasaTarget = useStorage('leksika-language-target', 'English');

  const allLanguages = ref<Language[]>([]);
  const hasFetched = ref(false);
  const hasFetchedAdmin = ref(false);

  // --- GETTERS ---
  const opsiBahasa = computed(() => {
    if (!Array.isArray(allLanguages.value)) return [];
    return allLanguages.value.map(prosesBahasaDariApi);
  });

  const opsiBahasaAsal = computed(() =>
    opsiBahasa.value.filter((b) => b.is_active_source),
  );
  const opsiBahasaTarget = computed(() =>
    opsiBahasa.value.filter((b) => b.is_active_target),
  );

  const selectedAsal = computed(() =>
    opsiBahasa.value.find((b) => b.nama === bahasaAsal.value),
  );
  const selectedTarget = computed(() =>
    opsiBahasa.value.find((b) => b.nama === bahasaTarget.value),
  );

  // --- ACTIONS ---
  async function fetchLanguages(force = false) {
    if (hasFetched.value && !force) return;

    try {
      const response = await api.get('/languages/');
      // Validate that response.data is an array
      if (Array.isArray(response.data)) {
        allLanguages.value = response.data;
        hasFetched.value = true;
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.error(
        'Gagal mengambil daftar bahasa (menggunakan fallback):',
        error,
      );
      // Data fallback jika API gagal atau response invalid
      allLanguages.value = [
        {
          id: 12,
          name: 'Arab',
          lang_code: 'ar',
          flag_code: 'sa',
          is_active_source: true,
          is_active_target: true,
        },
        {
          id: 5,
          name: 'Jerman',
          lang_code: 'de',
          flag_code: 'de',
          is_active_source: true,
          is_active_target: true,
        },
        {
          id: 14,
          name: 'Yunani',
          lang_code: 'el',
          flag_code: 'gr',
          is_active_source: true,
          is_active_target: true,
        },
        {
          id: 2,
          name: 'English',
          lang_code: 'en',
          flag_code: 'gb',
          is_active_source: true,
          is_active_target: true,
        },
        {
          id: 7,
          name: 'Spanyol',
          lang_code: 'es',
          flag_code: 'es',
          is_active_source: true,
          is_active_target: true,
        },
        {
          id: 4,
          name: 'Prancis',
          lang_code: 'fr',
          flag_code: 'fr',
          is_active_source: true,
          is_active_target: true,
        },
        {
          id: 11,
          name: 'Hindi',
          lang_code: 'hi',
          flag_code: 'in',
          is_active_source: true,
          is_active_target: true,
        },
        {
          id: 1,
          name: 'Indonesia',
          lang_code: 'id',
          flag_code: 'id',
          is_active_source: true,
          is_active_target: true,
        },
        {
          id: 6,
          name: 'Italia',
          lang_code: 'it',
          flag_code: 'it',
          is_active_source: true,
          is_active_target: true,
        },
        {
          id: 8,
          name: 'Jepang',
          lang_code: 'ja',
          flag_code: 'jp',
          is_active_source: true,
          is_active_target: true,
        },
        {
          id: 10,
          name: 'Korea',
          lang_code: 'ko',
          flag_code: 'kr',
          is_active_source: true,
          is_active_target: true,
        },
        {
          id: 13,
          name: 'Portugis',
          lang_code: 'pt',
          flag_code: 'pt',
          is_active_source: true,
          is_active_target: true,
        },
        {
          id: 3,
          name: 'Rusia',
          lang_code: 'ru',
          flag_code: 'ru',
          is_active_source: true,
          is_active_target: true,
        },
        {
          id: 9,
          name: 'Cina',
          lang_code: 'zh',
          flag_code: 'cn',
          is_active_source: true,
          is_active_target: true,
        },
      ];
    }
  }

  async function fetchAdminLanguages(force = false) {
    // Check key hasFetchedAdmin, not just hasFetched
    if (hasFetchedAdmin.value && !force) return;

    try {
      const response = await api.get('/admin/languages/');
      if (Array.isArray(response.data)) {
        allLanguages.value = response.data;
        hasFetched.value = true;
        hasFetchedAdmin.value = true;
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.error('Gagal mengambil daftar bahasa admin:', error);
      throw error;
    }
  }

  async function init() {
    const authStore = useAuthStore();
    const isAdmin = authStore.isAdmin;

    if (isAdmin) {
      await fetchAdminLanguages();
      // ADMIN: Validate against ALL languages (including inactive)
      const allNames = allLanguages.value.map((l) => l.name);

      if (!allNames.includes(bahasaAsal.value)) {
        bahasaAsal.value = allNames.includes('Indonesia')
          ? 'Indonesia'
          : allNames[0] || '';
      }
      if (!allNames.includes(bahasaTarget.value)) {
        bahasaTarget.value = allNames.includes('English')
          ? 'English'
          : allNames.find((n) => n !== bahasaAsal.value) || allNames[1] || '';
      }
    } else {
      // USER: Validate against ACTIVE only
      await fetchLanguages();

      const allActiveSourceNames = allLanguages.value
        .filter((l) => l.is_active_source)
        .map((l) => l.name);

      if (!allActiveSourceNames.includes(bahasaAsal.value)) {
        bahasaAsal.value = allActiveSourceNames.includes('Indonesia')
          ? 'Indonesia'
          : allActiveSourceNames[0] || '';
      }

      const allActiveTargetNames = allLanguages.value
        .filter((l) => l.is_active_target)
        .map((l) => l.name);

      if (!allActiveTargetNames.includes(bahasaTarget.value)) {
        bahasaTarget.value = allActiveTargetNames.includes('English')
          ? 'English'
          : allActiveTargetNames.find((n) => n !== bahasaAsal.value) ||
            allActiveTargetNames[1] ||
            '';
      }
    }
  }

  function getFlagUrlByCode(code, size = '1x1') {
    const lang = opsiBahasa.value.find((l) => l.kodeBahasa === code);
    return lang && lang.kodeBendera ? getFlagUrl(lang.kodeBendera, size) : null;
  }

  function setLanguages(asal, target) {
    bahasaAsal.value = asal;
    bahasaTarget.value = target;
  }

  async function addLanguage(languageData) {
    try {
      await api.post('/admin/app-settings/languages/', languageData);
      await fetchAdminLanguages(true);
    } catch (error) {
      console.error('Gagal menambah bahasa:', error);
      throw error;
    }
  }

  async function updateLanguage(id, languageData) {
    try {
      await api.patch(`/admin/languages/${id}/`, languageData);
      await fetchAdminLanguages(true);
    } catch (error) {
      console.error(`Gagal memperbarui bahasa ${id}:`, error);
      throw error;
    }
  }

  return {
    bahasaAsal,
    bahasaTarget,
    allLanguages,
    opsiBahasa,
    opsiBahasaAsal,
    opsiBahasaTarget,
    selectedAsal,
    selectedTarget,
    init,
    fetchLanguages,
    fetchAdminLanguages,
    setLanguages,
    addLanguage,
    updateLanguage,
    getFlagUrl,
    getFlagUrlByCode,
  };
});
