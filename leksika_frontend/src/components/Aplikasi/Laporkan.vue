<script setup lang="ts">
import { ref, computed, watch, watchEffect } from 'vue';
import { useUIStore } from '@/stores/ui';
import { useListsStore } from '@/stores/lists';
import { useAuthStore } from '@/stores/auth';
import { onKeyStroke } from '@vueuse/core';
import { api } from '@/utils/api';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
  ListboxLabel,
} from '@headlessui/vue';
import { useSession } from '@/utils/session';

import TurnstileWidget from '@/components/TurnstileWidget.vue';

const uiStore = useUIStore();
const authStore = useAuthStore();
const listsStore = useListsStore();

const isModalOpen = computed(() => uiStore.isReportModalOpen);
const itemToReport = computed(() => uiStore.itemToReport as any);

const submissionState = ref<'idle' | 'submitting' | 'success'>('idle');
const selectedReason = ref<any>(null);
const customReason = ref('');
const reportDetails = ref('');
const cancelButtonRef = ref<HTMLElement | null>(null);
const successCloseTimer = ref<any>(null);

const turnstileWidgetRef = ref<any>(null);
const { isSessionValidated, validationStatus } = useSession();

watch(validationStatus, (newStatus) => {
  if (newStatus === 'error') {
    // Jika validasi backend gagal, reset widget agar user bisa coba lagi
    setTimeout(() => {
      if (turnstileWidgetRef.value) turnstileWidgetRef.value.reset();
    }, 1500);
  }
});

watchEffect(() => {
  if (isModalOpen.value && !authStore.isLoggedIn) {
    uiStore.closeReportModal();
    uiStore.openLoginModal();
  }
});

const reportReasons = [
  { id: 'konten_tidak_akurat', label: 'Konten tidak akurat atau salah' },
  { id: 'tidak_pantas', label: 'Mengandung konten tidak pantas' },
  { id: 'spam', label: 'Spam atau promosi' },
  { id: 'lainnya', label: 'Lainnya' },
];

// Helper to count words
const wordCount = (text: string) =>
  text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

const isSubmitDisabled = computed(() => {
  if (submissionState.value === 'submitting') return true;
  if (!selectedReason.value) return true;
  // If "Lainnya" is selected, custom reason text is required
  if (selectedReason.value?.id === 'lainnya' && !customReason.value.trim())
    return true;
  if (!reportDetails.value.trim()) return true;
  if (wordCount(reportDetails.value) < 5) return true; // Minimum 5 words required
  if (!isSessionValidated.value) return true; // UPDATED
  return false;
});

function closeModal() {
  uiStore.closeReportModal();
}

async function handleSubmit() {
  if (isSubmitDisabled.value) return;
  submissionState.value = 'submitting';

  const reasonId =
    selectedReason.value.id === 'lainnya'
      ? `LAINNYA: ${customReason.value}`
      : selectedReason.value.id;

  const payload = {
    feedback_type: 'REPORT',
    reason: reasonId,
    details: reportDetails.value,
    metadata: {
      url: window.location.href,
      theme: document.documentElement.classList.contains('dark')
        ? 'dark'
        : 'light',
      viewport: { width: window.innerWidth, height: window.innerHeight },
      screenResolution: { width: screen.width, height: screen.height },
      language: navigator.language,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
    },
    reported_item_model: itemToReport.value?.tipe,
    reported_item_id: itemToReport.value?.id,
  };

  // [PERBAIKAN] Backend mengharapkan multipart formdata dengan field 'data'
  const formData = new FormData();
  formData.append('data', JSON.stringify(payload));

  try {
    console.log('Mengirim Laporan ke Backend:', payload);
    await api.post('/feedback/', formData);

    if (itemToReport.value?.id) {
      try {
        // Cek apakah list 'Dilaporkan' sudah ada
        let reportedList = listsStore.userLists.find(l => l.name === 'Dilaporkan');
        
        // Jika belum ada, buat baru
        if (!reportedList) {
          try {
            await listsStore.addList({ name: 'Dilaporkan', icon: 'flag', isSystem: true });
            // Refresh local state or just proceed knowing the backend created it
            // addList updates local state, so we should be able to find it, or safely proceed to addToList
          } catch (createError: any) {
             // Ignore if error is "list already exists" race condition, otherwise log
             if (!createError.message?.includes('already exists')) {
                console.warn('Gagal membuat list Dilaporkan:', createError);
             }
          }
        }

        await listsStore.addToList({
          itemId: itemToReport.value.id,
          itemType: itemToReport.value.tipe || 'unknown',
          langPair: '', // Laporan tidak punya lang_pair
          listName: 'Dilaporkan',
        });
      } catch (listError) {
        // Jangan block UI sukses jika gagal masuk list, cukup log saja
        console.error('Gagal menambahkan ke list Dilaporkan:', listError);
      }
    }

    submissionState.value = 'success';
    uiStore.startCooldown('report', 30000);

    if (successCloseTimer.value) clearTimeout(successCloseTimer.value);
    successCloseTimer.value = setTimeout(() => {
      closeModal();
    }, 3000);
  } catch (error) {
    console.error('Gagal mengirim laporan:', error);
    alert('Terjadi kesalahan saat mengirim laporan. Silakan coba lagi.');
    submissionState.value = 'idle';
  }
}

onKeyStroke('Escape', (e) => {
  if (isModalOpen.value) {
    e.preventDefault();
    closeModal();
  }
});

watch(isModalOpen, (isOpen) => {
  if (!isOpen) {
    setTimeout(() => {
      selectedReason.value = null;
      customReason.value = '';
      reportDetails.value = '';
      submissionState.value = 'idle';
      if (successCloseTimer.value) {
        clearTimeout(successCloseTimer.value);
        successCloseTimer.value = null;
      }
    }, 300);
  }
});
</script>

<template>
  <TransitionRoot appear :show="isModalOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-50" :initial-focus="cancelButtonRef">
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-[var(--color-scrim)]/50" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-left align-middle shadow-xl transition-all">
              
              <div v-if="submissionState !== 'success'">
                <DialogTitle as="h3" class="text-2xl font-bold text-center leading-6 text-[var(--color-on-background)] pb-4">
                  Laporkan Konten
                </DialogTitle>
                
                <div class="p-3 rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]">
                  <slot name="content" :item="itemToReport"></slot>
                </div>

                <form @submit.prevent="handleSubmit" class="mt-4 space-y-4">
                  <Listbox v-model="selectedReason">
                    <ListboxLabel class="block text-sm font-medium text-[var(--color-on-surface-variant)]">Apa masalahnya?</ListboxLabel>
                    <div class="relative mt-2">
                      <ListboxButton class="relative w-full cursor-pointer rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] py-3 pl-4 pr-10 text-left text-[var(--color-on-surface)] shadow-sm transition focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] sm:text-sm">
                        <span class="block truncate">{{ selectedReason ? selectedReason.label : 'Pilih alasan laporan...' }}</span>
                        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <span class="material-symbols-outlined text-[var(--color-on-surface-variant)]">unfold_more</span>
                        </span>
                      </ListboxButton>
                      <transition
                        leave-active-class="transition duration-100 ease-in"
                        leave-from-class="opacity-100"
                        leave-to-class="opacity-0"
                      >
                        <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-[var(--color-surface-container-highest)] py-1 shadow-lg ring-1 ring-[var(--color-outline-variant)] focus:outline-none sm:text-sm">
                          <ListboxOption
                            v-for="reason in reportReasons"
                            :key="reason.id"
                            :value="reason"
                            v-slot="{ active, selected }"
                            as="template"
                          >
                            <li :class="[
                              active ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]' : 'text-[var(--color-on-surface)]',
                              'relative cursor-pointer select-none py-3 pl-10 pr-4 transition-colors'
                            ]">
                              <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                                {{ reason.label }}
                              </span>
                              <span v-if="selected" class="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-primary)]">
                                <span class="material-symbols-outlined text-xl">check</span>
                              </span>
                            </li>
                          </ListboxOption>
                        </ListboxOptions>
                      </transition>
                    </div>
                  </Listbox>

                  <!-- Custom reason input when "Lainnya" is selected -->
                  <div v-if="selectedReason?.id === 'lainnya'">
                    <label for="customReason" class="block text-sm font-medium text-[var(--color-on-surface-variant)]">Alasan Kustom <span class="text-[var(--color-error)]">*</span></label>
                    <textarea 
                      id="customReason" v-model="customReason" rows="2"
                      class="mt-1 w-full px-4 py-2 border rounded-xl bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] sm:text-sm"
                      placeholder="Tuliskan alasan laporan Anda..."
                    ></textarea>
                  </div>

                  <div>
                    <label for="details" class="block text-sm font-medium text-[var(--color-on-surface-variant)]">
                      Detail Masalah <span class="text-[var(--color-error)]">*</span>
                      <span class="text-xs font-normal ml-1">(minimal 5 kata)</span>
                    </label>
                    <textarea 
                      id="details" v-model="reportDetails" rows="3"
                      class="mt-1 w-full px-4 py-2 border rounded-xl bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] sm:text-sm"
                      placeholder="Jelaskan masalah yang Anda temukan..."
                    ></textarea>
                    <p v-if="reportDetails.trim() && wordCount(reportDetails) < 5" class="text-xs text-[var(--color-error)] mt-1">
                      Detail harus minimal 5 kata (saat ini: {{ wordCount(reportDetails) }} kata)
                    </p>
                  </div>
                  
                  <!-- Visible Turnstile Status -->
                  <div class="flex justify-center py-2">
                    <TurnstileWidget ref="turnstileWidgetRef" :show-status="true" />
                  </div>
                </form>

                <div class="mt-6 grid grid-cols-2 gap-3">
                  <button ref="cancelButtonRef" type="button" class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]" @click="closeModal">Batal</button>
                  <button type="button" :disabled="isSubmitDisabled" class="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2 font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-fixed-dim)] disabled:opacity-50" @click="handleSubmit">
                    {{ 
                      submissionState === 'submitting' ? 'Mengirim...' : 
                      validationStatus === 'validating' ? 'Memverifikasi...' :
                      validationStatus === 'error' ? 'Gagal Verifikasi' :
                      'Kirim' 
                    }}
                  </button>
                </div>
              </div>

              <div v-else class="relative flex flex-col items-center justify-center gap-2 text-center h-full py-8">
                <button @click="closeModal" class="absolute right-0 top-0 p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <svg class="checkmark h-20 w-20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                  <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                  <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>
                <DialogTitle as="h2" class="text-2xl font-bold text-[var(--color-on-background)] mt-4">Laporan Terkirim</DialogTitle>
                <p class="mt-1 text-sm text-[var(--color-on-surface-variant)]">Terima kasih atas masukan Anda!</p>
              </div>

            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<style scoped>
/* Animasi centang */
.checkmark__circle {
  stroke-dasharray: 166;
  stroke-dashoffset: 166;
  stroke-width: 2;
  stroke-miterlimit: 10;
  stroke: var(--color-tertiary);
  fill: none;
  animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}
.checkmark {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: block;
  stroke-width: 2;
  stroke: var(--color-on-tertiary);
  stroke-miterlimit: 10;
  margin: 0 auto;
  box-shadow: inset 0px 0px 0px var(--color-tertiary);
  animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
}
.checkmark__check {
  transform-origin: 50% 50%;
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
}
@keyframes stroke {
  100% { stroke-dashoffset: 0; }
}
@keyframes scale {
  0%, 100% { transform: none; }
  50% { transform: scale3d(1.1, 1.1, 1); }
}
@keyframes fill {
  100% { box-shadow: inset 0px 0px 0px 40px var(--color-tertiary); }
}
.dark .checkmark {
  stroke: var(--color-inverse-on-surface);
}
.dark .checkmark__check {
  stroke: var(--color-inverse-on-surface);
}
</style>
