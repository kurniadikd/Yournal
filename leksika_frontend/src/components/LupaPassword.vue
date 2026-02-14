<script setup lang="ts">
import {
  ref,
  inject,
  watch,
  computed,
  onUnmounted,
  defineAsyncComponent,
} from 'vue'; // [UPDATED] Added defineAsyncComponent
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
import { api } from '@/utils/api'; // Import API helper untuk verifikasi kode manual
// import VueTurnstile from 'vue-turnstile'; // REMOVED

// [BARU] Import telemetry untuk merekam perangkat saat reset password
import { getDeviceTelemetry } from '@/utils/telemetry';
import { useSession } from '@/utils/session'; // ADDED

// [DEV BYPASS] Conditional import - only load TurnstileWidget in production
const isDev = import.meta.env.DEV;
const TurnstileWidget = isDev
  ? null
  : defineAsyncComponent(() => import('@/components/TurnstileWidget.vue'));

const emit = defineEmits(['switchToLogin']);

// Mengambil state dan fungsi global dari useAuthForm
const {
  loginForm, // Berisi identifier (email)
  identifierTouched,
  // Step 1: Request Code
  passwordResetLoading,
  passwordResetError,
  passwordResetSuccess,
  handlePasswordReset,
  // Step 3: Confirm Reset (Set Password Baru)
  confirmResetLoading,
  confirmResetError,
  confirmResetSuccess,
  handleConfirmReset,
} = inject('authForm') as any;

// --- STATE LOKAL ---
// const turnstileSiteKey = ref(import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY); // REMOVED
const { isSessionValidated } = useSession(); // ADDED
const codeVerifiedSuccess = ref(false); // Pengganti state inject yang hilang
const verifyCodeLoading = ref(false); // Loading state untuk verifikasi kode

// Kontrol Tampilan Langkah (Step)
// 1: Masukkan Email
// 1.5: Masukkan Kode (Masih di layar yang sama, input email disabled)
// 2: Setel Password Baru
// 3: Sukses
const currentStep = ref(1);

// State Validasi Form Password
const passwordTouched = ref(false);
const passwordConfirmTouched = ref(false);
let redirectTimeout: ReturnType<typeof setTimeout> | null = null;

// Form Input Lokal
const verificationForm = ref({
  code: '',
});

const resetPasswordForm = ref({
  password: '',
  password_confirm: '',
});

// --- COMPUTED PROPERTIES ---

// Menampilkan email user dengan aman
const successIdentifier = computed(() => {
  return loginForm.value.identifier || t('your_account_generic'); // I'll use successIdentifier or add this key
});

// Validasi Password Baru
const passwordValid = computed(
  () => resetPasswordForm.value.password.length >= 8,
);
const passwordConfirmValid = computed(
  () =>
    resetPasswordForm.value.password ===
      resetPasswordForm.value.password_confirm &&
    resetPasswordForm.value.password.length >= 8,
);

const isResetPasswordFormValid = computed(() => {
  return passwordValid.value && passwordConfirmValid.value;
});

// --- WATCHERS ---

// 1. Jika Request Kode Sukses -> Pindah ke Input Kode (Step 1.5)
watch(passwordResetSuccess, (newValue) => {
  if (newValue && currentStep.value === 1) {
    currentStep.value = 1.5;
  }
});

// 2. Jika Verifikasi Kode Sukses (Lokal) -> Pindah ke Setel Password (Step 2)
watch(codeVerifiedSuccess, (newValue) => {
  if (newValue && currentStep.value === 1.5) {
    currentStep.value = 2;
  }
});

// 3. Jika Reset Password Sukses (Global) -> Pindah ke Layar Sukses (Step 3)
watch(confirmResetSuccess, (newValue) => {
  if (newValue && currentStep.value === 2) {
    currentStep.value = 3;
    // Auto-redirect ke login setelah 3 detik
    redirectTimeout = setTimeout(() => {
      emit('switchToLogin');
    }, 3000);
  }
});

onUnmounted(() => {
  if (redirectTimeout) clearTimeout(redirectTimeout);
  // REMOVED: Pastikan properti turnstile dibersihkan saat komponen dilepas
  // if (loginForm.value) {
  //     delete loginForm.value['cf-turnstile-response'];
  // }
});

// --- FUNGSI ---

// Step 1: Kirim Permintaan Kode ke Email
const submitRequestCode = () => {
  if (!loginForm.value.identifier) {
    identifierTouched.value = true;
    return;
  }
  if (!isSessionValidated.value) {
    // UPDATED
    passwordResetError.value = t('wait_security_verification'); // ADDED
    return;
  }
  // Panggil fungsi dari useAuthForm
  handlePasswordReset(loginForm.value.identifier);
};

// Step 1.5: Verifikasi Kode (LOGIKA LOKAL)
const submitVerifyCode = async () => {
  // Validasi panjang kode
  if (verificationForm.value.code.length !== 6) {
    passwordResetError.value = t('verification_code_hint');
    return;
  }

  verifyCodeLoading.value = true;
  passwordResetError.value = ''; // Reset error sebelumnya

  try {
    // Panggil API Backend untuk memvalidasi kode (tanpa mereset password dulu)
    await api.post('/users/password-reset/', {
      email: loginForm.value.identifier,
      code: verificationForm.value.code,
    });

    // Jika tidak throw error, berarti kode valid
    codeVerifiedSuccess.value = true;
  } catch (err: any) {
    console.error('Verifikasi Kode Gagal:', err);
    passwordResetError.value =
      err.response?.data?.message || t('verification_failed_msg');
  } finally {
    verifyCodeLoading.value = false;
  }
};

// Step 2: Konfirmasi Password Baru (Integrasi Telemetry)
const submitConfirmReset = async () => {
  passwordTouched.value = true;
  passwordConfirmTouched.value = true;

  if (!isResetPasswordFormValid.value) {
    confirmResetError.value = 'Mohon periksa kata sandi Anda.';
    return;
  }

  // [BARU] Ambil data telemetri sebelum mengirim request reset
  // Ini penting untuk audit trail jika akun di-takeover
  const deviceData = await getDeviceTelemetry();

  const payload = {
    email: loginForm.value.identifier,
    code: verificationForm.value.code, // Kode dari step sebelumnya
    password: resetPasswordForm.value.password,
    password_confirm: resetPasswordForm.value.password_confirm,
    device_info: deviceData, // [BARU] Sertakan data device
  };

  // Panggil fungsi global untuk finalisasi
  handleConfirmReset(payload);
};

// Formatter Input Email
const sanitizeIdentifierInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  let value = target.value;
  let formatted = value.replace(/[^a-zA-Z0-9_@.+-]/g, '');
  loginForm.value.identifier = formatted;
};
</script>

<template>
  <div>
    <div v-if="currentStep === 3" class="text-center p-4">
         <div class="relative flex flex-col items-center justify-center gap-4 text-center h-full">
            <svg class="checkmark h-20 w-20 mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
            <h2 class="text-2xl font-bold">{{ $t('password_reset_success_title') }}</h2>
            <p class="mt-2 text-[var(--color-on-surface-variant)]">
                {{ $t('password_reset_success_desc', { email: successIdentifier }) }}
            </p>
            <p class="mt-4 text-sm text-[var(--color-on-surface-variant)]">
                {{ $t('redirecting_to_login') }}
            </p>
            <button @click="emit('switchToLogin')" class="mt-4 w-full rounded-2xl px-4 py-2 font-semibold bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)]">
                {{ $t('continue_to_login') }}
            </button>
        </div>
    </div>

    <div v-else-if="currentStep === 1 || currentStep === 1.5">
        <p v-if="currentStep === 1" class="text-center text-sm text-[var(--color-on-surface-variant)] mb-4">
            {{ $t('enter_email_reset') }}
        </p>

        <p v-if="currentStep === 1.5 && passwordResetSuccess" class="text-center text-sm text-[var(--color-on-tertiary-container)] bg-[var(--color-tertiary-container)] p-2 rounded-xl mb-4">
            {{ passwordResetSuccess }}
        </p>

        <form @submit.prevent="currentStep === 1 ? submitRequestCode() : submitVerifyCode()" class="space-y-4" novalidate>
            <div>
                <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ $t('email_label') }}</label>
                <input
                    type="email"
                    :placeholder="$t('email_placeholder')"
                    required
                    :disabled="currentStep === 1.5"
                    v-model.trim="loginForm.identifier"
                    @input="sanitizeIdentifierInput"
                    @blur="identifierTouched = true"
                    :class="{
                        'w-full p-3 border rounded-2xl transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-on-surface)] bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]': true,
                        'ring-2 ring-[var(--color-error)] border-[var(--color-error)]': identifierTouched && !loginForm.identifier
                    }"
                />
                <p v-if="identifierTouched && !loginForm.identifier" class="mt-1 text-xs text-[var(--color-error)] font-medium">
                    {{ $t('field_required') }}
                </p>
            </div>

            <div v-if="currentStep === 1.5">
                <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ $t('verification_code_label') }}</label>
                <input 
                    type="text" 
                    v-model="verificationForm.code" 
                    placeholder="_ _ _ _ _ _" 
                    class="w-full text-center tracking-[0.5em] p-3 border rounded-2xl transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-on-surface)] bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]"
                    required 
                    maxlength="6" 
                    @input="verificationForm.code = ($event.target as HTMLInputElement).value.replace(/[^0-9]/g, '').substring(0, 6)"
                />
            </div>
            
            <p v-if="passwordResetError" class="text-center text-sm text-[var(--color-error)] font-medium">{{ passwordResetError }}</p>

            <!-- Visible Turnstile Widget -->
            <div v-if="currentStep === 1" class="flex justify-center py-2">
                <TurnstileWidget :show-status="true" />
            </div>
            
            <button
                type="submit"
                :disabled="(currentStep === 1 && (passwordResetLoading || !loginForm.identifier || !isSessionValidated)) || (currentStep === 1.5 && (verifyCodeLoading || verificationForm.code.length < 6))"
                :class="{
                    'w-full rounded-2xl px-4 py-2 font-semibold transition-colors disabled:opacity-50': true,
                    'bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)]': !passwordResetLoading && !verifyCodeLoading,
                    'bg-[var(--color-primary)] text-[var(--color-on-primary)] opacity-50 cursor-not-allowed': passwordResetLoading || verifyCodeLoading
                }"
            >
                <span v-if="currentStep === 1">
                    {{ passwordResetLoading ? $t('sending') : $t('send_reset_code') }}
                </span>
                <span v-else>
                    {{ verifyCodeLoading ? $t('verifying') : $t('verify_and_continue') }}
                </span>
            </button>
        </form>
        
         <p class="mt-4 text-center text-sm text-[var(--color-on-surface-variant)]">
            <a @click.prevent="emit('switchToLogin')" class="text-[var(--color-primary)] hover:underline cursor-pointer">Batal dan kembali ke Masuk</a>.
        </p>
    </div>

    <div v-else-if="currentStep === 2">
         <p class="text-center text-sm text-[var(--color-on-surface-variant)] mb-4">
            {{ $t('enter_new_password_for', { email: successIdentifier }) }}
        </p>

        <form @submit.prevent="submitConfirmReset" class="space-y-4" novalidate>
            <div>
                <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ $t('new_password_label') }}</label>
                <input 
                    type="password" 
                    v-model="resetPasswordForm.password" 
                    :placeholder="$t('new_password_placeholder')" 
                    @blur="passwordTouched = true"
                    :class="{
                        'w-full p-3 border rounded-2xl transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-on-surface)] bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]': true,
                        'ring-2 ring-[var(--color-error)] border-[var(--color-error)]': passwordTouched && !passwordValid
                    }"
                    required 
                />
                <p v-if="passwordTouched && !passwordValid" class="mt-1 text-xs text-[var(--color-error)] font-medium">
                    {{ $t('password_min_length_error') }}
                </p>
            </div>
            <div>
                <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ $t('confirm_new_password_label') }}</label>
                <input 
                    type="password" 
                    v-model="resetPasswordForm.password_confirm" 
                    :placeholder="$t('confirm_new_password_placeholder')" 
                    @blur="passwordConfirmTouched = true"
                    :class="{
                        'w-full p-3 border rounded-2xl transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-on-surface)] bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]': true,
                        'ring-2 ring-[var(--color-error)] border-[var(--color-error)]': passwordConfirmTouched && !passwordConfirmValid
                    }"
                    required 
                />
                <p v-if="passwordConfirmTouched && !passwordConfirmValid" class="mt-1 text-xs text-[var(--color-error)] font-medium">
                    {{ $t('password_mismatch_error') }}
                </p>
            </div>

            <p v-if="confirmResetError" class="text-center text-sm text-[var(--color-error)] font-medium">{{ confirmResetError }}</p>

            <button 
                type="submit" 
                :disabled="confirmResetLoading || !isResetPasswordFormValid" 
                :class="{
                    'w-full rounded-2xl px-4 py-2 font-semibold transition-colors disabled:opacity-50': true,
                    'bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)]': !confirmResetLoading,
                    'bg-[var(--color-primary)] text-[var(--color-on-primary)] opacity-50 cursor-not-allowed': confirmResetLoading
                }"
            >
                {{ confirmResetLoading ? $t('processing') : $t('set_new_password_button') }}
            </button>
        </form>
         <p class="mt-4 text-center text-sm text-[var(--color-on-surface-variant)]">
            <a @click.prevent="emit('switchToLogin')" class="text-[var(--color-primary)] hover:underline cursor-pointer">Batal dan kembali ke Masuk</a>.
        </p>
    </div>
  </div>
</template>

<style scoped>
/* Style untuk animasi Checkmark Sukses */
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
  100% {
    stroke-dashoffset: 0;
  }
}
@keyframes scale {
  0%, 100% {
    transform: none;
  }
  50% {
    transform: scale3d(1.1, 1.1, 1);
  }
}
@keyframes fill {
  100% { 
    box-shadow: inset 0px 0px 0px 52px var(--color-tertiary);
  }
}
</style>
