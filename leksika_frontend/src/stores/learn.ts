// leksika_frontend/src/stores/learn.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/utils/api'; // Use the configured API instance
import { useAuthStore } from '@/stores/auth'; // To check login status for user progress
import { useLanguageStore } from '@/stores/language'; // To get selected languages

// Helper functions (moved from component/previous store)
// Helper functions (moved from component/previous store)
const processSvg = (svgString: string | null): string | null => {
  if (
    !svgString ||
    typeof svgString !== 'string' ||
    !svgString.trim().startsWith('<svg')
  ) {
    return svgString;
  }
  let processedSvg = svgString;
  if (processedSvg.includes('preserveAspectRatio')) {
    processedSvg = processedSvg.replace(
      /preserveAspectRatio="[^"]*"/,
      'preserveAspectRatio="xMidYMid slice"',
    );
  } else {
    processedSvg = processedSvg.replace(
      '<svg',
      '<svg preserveAspectRatio="xMidYMid slice"',
    );
  }
  return processedSvg;
};

const ensureTranslation = (
  obj: any,
  sourceLang: string,
  targetLang: string,
  fields = ['title', 'description'],
) => {
  if (!obj.translations) obj.translations = {};
  if (!obj.translations[targetLang]) obj.translations[targetLang] = {};
  if (!obj.translations[sourceLang]) obj.translations[sourceLang] = {};
  fields.forEach((field) => {
    if (obj.translations[targetLang][field] === undefined) {
      obj.translations[targetLang][field] = '';
    }
    if (obj.translations[sourceLang][field] === undefined) {
      obj.translations[sourceLang][field] = '';
    }
  });
};

// --- INTERFACES ---
export interface Materi {
  id: number;
  title?: string;
  [key: string]: any;
}

export interface Chapter {
  id: number;
  materis?: Materi[];
  isExpanded?: boolean;
  [key: string]: any;
}

export interface Module {
  id: number;
  chapters?: Chapter[];
  isChaptersExpanded?: boolean;
  icon_svg?: string | null;
  icon_settings?: any;
  [key: string]: any;
}

export interface UserProgress {
  score: number | null;
  is_completed: boolean;
  last_completed: string | null;
  answers: any;
}

export const useLearnStore = defineStore('learn', () => {
  // --- State ---
  const publicModules = ref<Module[]>([]);
  const userProgress = ref<Record<string, UserProgress>>({});
  const activeMateri = ref<Materi | null>(null);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const isSubmittingProgress = ref<boolean>(false);

  // --- Getters ---
  const getPublicModuleById = computed(() => (moduleId: number) => {
    return publicModules.value.find((m) => m.id === moduleId);
  });

  const getMateriById = computed(() => (materiId: number) => {
    for (const modul of publicModules.value) {
      if (modul.chapters) {
        for (const chapter of modul.chapters) {
          if (chapter.materis) {
            const materi = chapter.materis.find((m) => m.id === materiId);
            if (materi) return materi;
          }
        }
      }
    }
    return null;
  });

  const getProgressForMateri = computed(() => (materiId: number | string) => {
    return (
      userProgress.value[materiId] || {
        score: null,
        is_completed: false,
        last_completed: null,
        answers: {},
      }
    );
  });

  // --- Actions ---
  async function fetchPublicModules(source_lang: string, target_lang: string) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.get(
        `/${source_lang}-${target_lang}/learn/moduls/`,
      );
      const rawData = Array.isArray(response.data)
        ? response.data
        : response.data.results || [];

      // Process data (similar to admin module processing)
      const processedData = rawData.map((result: any) => {
        ensureTranslation(result, source_lang, target_lang);
        if (result.chapters) {
          result.chapters.forEach((chapter: any) => {
            ensureTranslation(chapter, source_lang, target_lang, ['title']);
            if (chapter.materis) {
              chapter.materis.forEach((materi: any) => {
                ensureTranslation(materi, source_lang, target_lang, ['title']);
              });
            }
            chapter.isExpanded = chapter.isExpanded ?? true; // Add UI state for expansion
          });
        }
        return {
          ...result,
          icon_svg: processSvg(result.icon_svg || null),
          icon_settings: result.icon_settings || {
            scale: 0.66,
            translateX: 0,
            translateY: 0,
          },
          isChaptersExpanded: result.isChaptersExpanded ?? true, // Add UI state for expansion
        };
      });
      publicModules.value = processedData;
    } catch (err: any) {
      error.value =
        'Gagal memuat modul publik. ' +
        (err.response?.data?.detail || err.message);
      console.error('Failed to fetch public modules:', err);
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchUserProgress() {
    const authStore = useAuthStore();
    if (!authStore.isLoggedIn) {
      userProgress.value = {};
      return;
    }

    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.get('/learn/progres/');
      const progressData = Array.isArray(response.data)
        ? response.data
        : response.data.results || [];
      userProgress.value = progressData.reduce((acc: any, item: any) => {
        acc[item.materi_id] = {
          score: item.score,
          is_completed: item.is_completed,
          last_completed: item.last_completed,
          answers: item.answers,
        };
        return acc;
      }, {});
    } catch (err: any) {
      error.value =
        'Gagal memuat progres pengguna. ' +
        (err.response?.data?.detail || err.message);
      console.error('Failed to fetch user progress:', err);
    } finally {
      isLoading.value = false;
    }
  }

  async function submitMateriProgress(materi_id: number, payload: any) {
    const authStore = useAuthStore();
    if (!authStore.isLoggedIn) {
      error.value = 'Anda harus login untuk menyimpan progres.';
      return;
    }

    isSubmittingProgress.value = true;
    error.value = null;
    try {
      const response = await api.post(
        `/learn/progres/submit/${materi_id}/`,
        payload,
      );
      // Update local progress immediately
      userProgress.value[materi_id] = {
        score: response.data.score,
        is_completed: response.data.is_completed,
        last_completed: response.data.last_completed,
        answers: response.data.answers,
      };
      return response.data;
    } catch (err: any) {
      error.value =
        'Gagal mengirim progres materi. ' +
        (err.response?.data?.detail || err.message);
      console.error('Failed to submit materi progress:', err);
      throw err;
    } finally {
      isSubmittingProgress.value = false;
    }
  }

  function setActiveMateri(materiId: number) {
    const found = getMateriById.value(materiId);
    if (found) {
        activeMateri.value = found;
    } else {
        activeMateri.value = null;
    }
  }

  return {
    publicModules,
    userProgress,
    activeMateri,
    isLoading,
    error,
    isSubmittingProgress,
    getPublicModuleById,
    getMateriById,
    getProgressForMateri,
    fetchPublicModules,
    fetchUserProgress,
    submitMateriProgress,
    setActiveMateri,
  };
});
