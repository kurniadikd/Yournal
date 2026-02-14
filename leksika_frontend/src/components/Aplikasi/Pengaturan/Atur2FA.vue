<script setup lang="ts">
import { ref, computed } from 'vue';
import QrcodeVue from 'qrcode.vue';
import { api } from '@/utils/api';
import { useAuthStore } from '@/stores/auth';
import { useClipboard } from '@vueuse/core';

const emit = defineEmits(['back', 'success']);
const authStore = useAuthStore();

// --- State Lokal Komponen ---
const otpConfigUrl = ref('');
const secretKey = ref('');
const verificationCode = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const step = ref('initial');
const showManualEntry = ref(false); // State untuk mengganti QR dengan kode

// --- Computed Properties ---
const formattedSecretKey = computed(() => {
  if (!secretKey.value) return '';
  return secretKey.value.replace(/(.{4})/g, '$1 ').trim();
});

// --- Fungsi-fungsi Aksi ---

async function start2FASetup() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await api.get('/users/me/2fa-setup/');
    otpConfigUrl.value = response.data.otp_config_url;
    secretKey.value = response.data.secret_key;
    step.value = 'scan';
  } catch (error) {
    errorMessage.value = 'Gagal memulai pengaturan 2FA. Coba lagi nanti.';
    console.error('Error starting 2FA setup:', error);
  } finally {
    isLoading.value = false;
  }
}

const { copy, copied: copySuccess } = useClipboard({ legacy: true });

/**
 * Menyalin secret key ke clipboard.
 */
function copySecretKey() {
  if (!secretKey.value) return;
  copy(secretKey.value);
}

async function verifyAndEnable2FA() {
  if (verificationCode.value.length !== 6) {
    errorMessage.value = 'Kode harus terdiri dari 6 digit.';
    return;
  }
  isLoading.value = true;
  errorMessage.value = '';
  try {
    await api.post('/users/me/2fa-setup/', { token: verificationCode.value });
    authStore.set2FAStatus(true);
    emit('success');
  } catch (error) {
    errorMessage.value =
      error.response?.data?.error || 'Kode tidak valid. Coba lagi.';
    console.error('Error verifying 2FA token:', error);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col h-full bg-[var(--color-surface-container)]">
    <header class="flex-shrink-0 w-full max-w-3xl mx-auto p-4 md:p-6 flex items-center relative">
      <button @click="emit('back')" aria-label="Kembali" class="text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors rounded-full w-10 h-10 flex items-center justify-center -ml-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h2 class="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-[var(--color-on-background)] whitespace-nowrap">
        Atur Otentikasi 2 Faktor
      </h2>
    </header>

    <div class="flex-grow overflow-y-auto">
      <main class="w-full max-w-3xl mx-auto p-4 md:p-6">
        <div class="bg-[var(--color-surface-container-high)] rounded-2xl p-6 shadow-md">
          
          <div v-if="step === 'initial'" class="text-center">
            <p class="text-[var(--color-on-surface-variant)] mb-4">
              Amankan akun Anda dengan lapisan keamanan tambahan menggunakan aplikasi otentikator.
            </p>
            <button @click="start2FASetup" :disabled="isLoading" class="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-base font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-fixed-dim)] disabled:opacity-50">
              {{ isLoading ? 'Memproses...' : 'Mulai Pengaturan' }}
            </button>
          </div>

          <div v-if="step === 'scan'" class="space-y-6">
            <div>
              <h3 class="font-semibold text-[var(--color-on-background)]">1. Pindai atau Masukkan Kode</h3>
              <p class="text-sm text-[var(--color-on-surface-variant)] mt-1">
                Gunakan aplikasi otentikator Anda untuk memindai gambar atau masukkan kode di bawah ini secara manual.
              </p>
              
              <div class="mt-4 flex justify-center items-center flex-col">
                <div v-if="!showManualEntry && otpConfigUrl" class="p-4 bg-white inline-block rounded-lg">
                  <QrcodeVue :value="otpConfigUrl" :size="200" level="H" render-as="svg" />
                </div>

                <div v-if="showManualEntry" class="w-full p-3 bg-[var(--color-surface-container-high)] rounded-lg">
                  <p class="text-xs text-[var(--color-on-surface-variant)] mb-2">Salin dan masukkan kode ini di aplikasi Anda:</p>
                  <div class="flex items-center justify-between bg-[var(--color-surface-container)] p-2 rounded-md">
                    <code class="font-mono text-[var(--color-on-surface)] tracking-wider">{{ formattedSecretKey }}</code>
                    <button @click="copySecretKey" class="p-1 rounded-md hover:bg-[var(--color-surface-container-low)] transition-colors">
                      <span class="material-symbols-outlined text-base text-[var(--color-outline)]">
                        {{ copySuccess ? 'done' : 'content_copy' }}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              
              <div class="text-center mt-4">
                <button @click="showManualEntry = !showManualEntry" class="text-[var(--color-primary)] text-sm font-semibold hover:underline">
                  {{ showManualEntry ? 'Tampilkan QR Code' : 'Tidak bisa memindai kode?' }}
                </button>
              </div>
              </div>
            
            <div>
              <h3 class="font-semibold text-[var(--color-on-background)]">2. Verifikasi Kode</h3>
              <p class="text-sm text-[var(--color-on-surface-variant)] mt-1">
                Masukkan kode 6 digit yang muncul di aplikasi Anda untuk menyelesaikan pengaturan.
              </p>
              <input
                type="text"
                v-model="verificationCode"
                placeholder="123456"
                maxlength="6"
                class="mt-2 block w-full text-center tracking-[0.5em] text-2xl font-mono px-4 py-2 rounded-xl border border-[var(--color-outline-variant)] shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-[var(--color-surface-container)] placeholder-[var(--color-outline)]"
              />
            </div>

            <button @click="verifyAndEnable2FA" :disabled="isLoading || verificationCode.length < 6" class="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-base font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-fixed-dim)] disabled:opacity-50">
              {{ isLoading ? 'Memverifikasi...' : 'Aktifkan & Selesai' }}
            </button>
          </div>
          
          <p v-if="errorMessage" class="mt-4 text-center text-sm text-[var(--color-error)]">{{ errorMessage }}</p>
        </div>
      </main>
    </div>
  </div>
</template>
