<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useLanguageStore } from '@/stores/language';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';

const emit = defineEmits(['back']);

const languageStore = useLanguageStore();

interface Language {
  id: number | string;
  name: string;
  lang_code: string;
  flag_code: string;
  is_active_source: boolean;
  is_active_target: boolean;
}

interface NewLanguage {
  name: string;
  lang_code: string;
  flag_code: string;
}

const newLanguage = ref<NewLanguage>({
  name: '',
  lang_code: '',
  flag_code: '',
});

// State untuk melacak perubahan lokal
const localLanguages = ref<Language[]>([]);
const originalLanguages = ref<Partial<Language>[]>([]);

const isModalOpen = ref(false);
const isLoading = ref(false);
const isSaving = ref(false);
const error = ref<string | null>(null);
const saveSuccess = ref(false);

// Inisialisasi data lokal dari store
const initializeLocalData = () => {
  localLanguages.value = languageStore.allLanguages.map((lang: any) => ({
    ...lang,
    is_active_source: lang.is_active_source,
    is_active_target: lang.is_active_target,
  }));
  originalLanguages.value = languageStore.allLanguages.map((lang: any) => ({
    id: lang.id,
    is_active_source: lang.is_active_source,
    is_active_target: lang.is_active_target,
  }));
};

// Watch hanya untuk mendeteksi perubahan jumlah bahasa (misalnya setelah add)
// Tidak menggunakan deep watch untuk menghindari overwrite perubahan lokal
watch(
  () => languageStore.allLanguages.length,
  () => {
    initializeLocalData();
  },
);

onMounted(async () => {
  // Always fetch fresh data for admin management
  await languageStore.fetchAdminLanguages(true);
  initializeLocalData();
});

// Cek apakah ada perubahan yang belum disimpan
const hasChanges = computed(() => {
  if (localLanguages.value.length !== originalLanguages.value.length)
    return false;

  for (const local of localLanguages.value) {
    const original = originalLanguages.value.find((o) => o.id === local.id);
    if (!original) continue;

    if (
      local.is_active_source !== original.is_active_source ||
      local.is_active_target !== original.is_active_target
    ) {
      return true;
    }
  }
  return false;
});

// Dapatkan daftar bahasa yang berubah
const changedLanguages = computed<Language[]>(() => {
  const changes: Language[] = [];
  for (const local of localLanguages.value) {
    const original = originalLanguages.value.find((o) => o.id === local.id);
    if (!original) continue;

    if (
      local.is_active_source !== original.is_active_source ||
      local.is_active_target !== original.is_active_target
    ) {
      changes.push(local);
    }
  }
  return changes;
});

const openAddModal = () => {
  error.value = null;
  newLanguage.value = { name: '', lang_code: '', flag_code: '' };
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

// Simpan semua perubahan
const handleSaveChanges = async () => {
  if (!hasChanges.value) return;

  isSaving.value = true;
  error.value = null;
  saveSuccess.value = false;

  try {
    // Simpan semua bahasa yang berubah
    const updatePromises = changedLanguages.value.map((lang) =>
      languageStore.updateLanguage(lang.id, {
        is_active_source: lang.is_active_source,
        is_active_target: lang.is_active_target,
      }),
    );

    await Promise.all(updatePromises);

    // Update original data setelah berhasil
    initializeLocalData();
    saveSuccess.value = true;

    // Sembunyikan notifikasi sukses setelah 3 detik
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  } catch (err: any) {
    console.error('Gagal menyimpan perubahan:', err);
    error.value = 'Gagal menyimpan perubahan. Silakan coba lagi.';
    // Kembalikan ke data asli jika gagal
    await languageStore.fetchAdminLanguages(true);
  } finally {
    isSaving.value = false;
  }
};

const handleAddLanguage = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    await languageStore.addLanguage(newLanguage.value);
    closeModal();
  } catch (err) {
    error.value = 'Gagal menambahkan bahasa. Pastikan kode bahasa unik.';
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 bg-[var(--color-surface-container)] min-h-screen rounded-3xl w-full h-full flex flex-col">
    <header class="flex items-center mb-6 flex-shrink-0">
        <button @click="emit('back')" class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] transition-colors">
            <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <div class="flex-grow text-center">
            <h1 class="text-xl font-bold text-[var(--color-on-background)]">Manajemen Bahasa</h1>
        </div>
        <div class="w-10"></div> </header>

    <!-- Notifikasi -->
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="saveSuccess" class="mb-4 p-3 rounded-xl bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] flex items-center gap-2">
        <span class="material-symbols-outlined text-base">check_circle</span>
        <span>Perubahan berhasil disimpan!</span>
      </div>
    </Transition>
    
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="error && !isModalOpen" class="mb-4 p-3 rounded-xl bg-[var(--color-error-container)] text-[var(--color-on-error-container)] flex items-center gap-2">
        <span class="material-symbols-outlined text-base">error</span>
        <span>{{ error }}</span>
      </div>
    </Transition>

    <div class="flex justify-between items-center mb-4">
        <button @click="openAddModal" class="flex items-center gap-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 px-4 rounded-xl hover:bg-[var(--color-primary-fixed-dim)] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] dark:focus:ring-offset-neutral-800">
          <span class="material-symbols-outlined text-base">add</span>
          <span>Bahasa Baru</span>
        </button>
        
        <button 
          @click="handleSaveChanges" 
          :disabled="!hasChanges || isSaving"
          class="flex items-center gap-2 font-medium py-2 px-4 rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] dark:focus:ring-offset-neutral-800"
          :class="hasChanges 
            ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)]' 
            : 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] cursor-not-allowed opacity-60'"
        >
          <span v-if="isSaving" class="material-symbols-outlined text-base animate-spin">sync</span>
          <span v-else class="material-symbols-outlined text-base">save</span>
          <span>{{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan' }}</span>
        </button>
    </div>

    <div class="flex-grow flex flex-col overflow-hidden">
      <main class="flex-1 bg-[var(--color-surface-container)] rounded-2xl overflow-hidden flex flex-col">
        <div class="overflow-x-auto flex-1">
          <table class="w-full text-left">
            <thead class="sticky top-0 bg-[var(--color-surface-container-high)] z-10">
              <tr>
                <th class="p-4 font-semibold text-[var(--color-on-surface-variant)] w-1/2">Bahasa</th>
                <th class="p-4 font-semibold text-[var(--color-on-surface-variant)] text-center">Bahasa Asal</th>
                <th class="p-4 font-semibold text-[var(--color-on-surface-variant)] text-center">Bahasa Target</th>
              </tr>
            </thead>
            <tbody class="bg-[var(--color-surface-container)]">
              <tr 
                v-for="language in localLanguages" 
                :key="language.id" 
                class="border-b border-[var(--color-outline-variant)] last:border-b-0 hover:bg-[var(--color-surface-container-low)] transition-all"
                :class="{ 'opacity-50': !language.is_active_source && !language.is_active_target }"
              >
                <td class="p-4">
                  <div class="flex items-center space-x-4">
                    <img 
                      :src="`https://flagicons.lipis.dev/flags/4x3/${language.flag_code}.svg`" 
                      :alt="language.name" 
                      class="w-10 h-10 object-cover rounded-md shadow-sm border border-[var(--color-outline-variant)]"
                    />
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-[var(--color-on-background)]">{{ language.name }}</span>
                        <span 
                          v-if="!language.is_active_source && !language.is_active_target"
                          class="text-xs px-2 py-0.5 rounded-full bg-[var(--color-error-container)] text-[var(--color-on-error-container)]"
                        >
                          Tersembunyi
                        </span>
                      </div>
                      <div class="text-sm text-[var(--color-on-surface-variant)] font-mono">{{ language.lang_code }}</div>
                    </div>
                  </div>
                </td>
                <td class="p-4 text-center">
                    <label class="relative flex items-center justify-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          v-model="language.is_active_source"
                          class="sr-only peer"
                        />
                        <div class="w-5 h-5 bg-[var(--color-surface-container-low)] border-2 border-[var(--color-outline-variant)] rounded flex items-center justify-center
                                    peer-checked:bg-[var(--color-primary)] peer-checked:border-[var(--color-primary)] transition-colors">
                            <svg class="w-3.5 h-3.5 text-[var(--color-on-primary)] hidden peer-checked:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                    </label>
                </td>
                <td class="p-4 text-center">
                    <label class="relative flex items-center justify-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          v-model="language.is_active_target"
                          class="sr-only peer"
                        />
                        <div class="w-5 h-5 bg-[var(--color-surface-container-low)] border-2 border-[var(--color-outline-variant)] rounded flex items-center justify-center
                                    peer-checked:bg-[var(--color-primary)] peer-checked:border-[var(--color-primary)] transition-colors">
                           <svg class="w-3.5 h-3.5 text-[var(--color-on-primary)] hidden peer-checked:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                    </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>

    <TransitionRoot appear :show="isModalOpen" as="template">
      <Dialog as="div" @close="closeModal" class="relative z-50">
        <TransitionChild
          as="template"
          enter="duration-300 ease-out"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black/50" />
        </TransitionChild>

        <div class="fixed inset-0 flex items-center justify-center p-4">
            <TransitionChild
              as="template"
              enter="duration-300 ease-out"
              enter-from="opacity-0 scale-95"
              enter-to="opacity-100 scale-100"
              leave="duration-200 ease-in"
              leave-from="opacity-100 scale-100"
              leave-to="opacity-0 scale-95"
            >
              <DialogPanel class="mx-4 w-full max-w-xl rounded-4xl bg-[var(--color-surface-container-high)] p-6 shadow-2xl flex flex-col max-h-[90vh]">
                <div class="relative flex-shrink-0 flex items-center justify-center mb-6">
                    <h2 class="text-2xl font-bold text-[var(--color-on-background)]">
                        Tambah Bahasa Baru
                    </h2>
                    <button @click="closeModal" class="absolute right-0 top-0 p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>

                <hr class="my-4 border-[var(--color-outline-variant)] flex-shrink-0" />

                <form @submit.prevent="handleAddLanguage" class="flex-1 overflow-y-auto space-y-4 px-1 pt-1 pb-2">
                    <div>
                      <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Nama Bahasa</label>
                      <input type="text" v-model="newLanguage.name" placeholder="Contoh: Spanyol" class="w-full p-3 border rounded-2xl bg-[var(--color-surface-container)] dark:bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" required />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Kode Bahasa (ISO 639-1)</label>
                      <input type="text" v-model="newLanguage.lang_code" placeholder="es" class="w-full p-3 border rounded-2xl bg-[var(--color-surface-container)] dark:bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" required maxlength="10" />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Kode Bendera (ISO 3166-1)</label>
                      <input type="text" v-model="newLanguage.flag_code" placeholder="es" class="w-full p-3 border rounded-2xl bg-[var(--color-surface-container)] dark:bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" required maxlength="10" />
                    </div>
                    <p v-if="error" class="text-[var(--color-error)] pt-1 text-sm">{{ error }}</p>
                </form>

                <div class="mt-8 pt-6 border-t border-[var(--color-outline-variant)] flex-shrink-0 flex justify-end items-center gap-3">
                    <button @click="closeModal" type="button" class="px-4 py-2 h-10 text-sm font-medium text-[var(--color-on-surface)] bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] rounded-xl transition-colors">
                      Batal
                    </button>
                    <button type="submit" @click="handleAddLanguage" :disabled="isLoading" class="px-4 py-2 h-10 text-sm font-medium text-[var(--color-on-primary)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                        <span v-if="isLoading" class="material-symbols-outlined animate-spin text-base">sync</span>
                        {{ isLoading ? 'Menyimpan...' : 'Simpan' }}
                    </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>
