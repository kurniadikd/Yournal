<script setup lang="ts">
import { ref, computed, inject, onMounted, defineAsyncComponent } from 'vue'; // [UPDATED] Added onMounted and defineAsyncComponent
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
import { api } from '@/utils/api';
// Removed: import VueTurnstile from 'vue-turnstile'; // Not needed anymore

// [BARU] Import fungsi telemetry untuk mengambil data perangkat
import { getDeviceTelemetry } from '@/utils/telemetry';
import { useSession } from '@/utils/session'; // Import useSession for global validation

// [DEV BYPASS] TurnstileWidget handles its own dev mode badge internally
import TurnstileWidget from '@/components/TurnstileWidget.vue';



// Impor utilitas validasi yang relevan
import {
  validatePassword,
  validatePasswordConfirm,
} from '@/utils/validpassword';
import { validateName, validateUsername } from '@/utils/validname';
import { validateEmail } from '@/utils/validemail';
import { validateReferralCode } from '@/utils/validreferral';

// Impor utilitas formatter
import {
  formatNameOnInput,
  formatNameOnBlur,
  formatUsernameInput,
  formatEmailInput,
  formatNumberOnlyInput,
  formatReferralCodeInput,
} from '@/utils/formatters';

const emit = defineEmits(['switchToLogin']);
const { registerSuccess } = inject('authForm') as any;

// State untuk alur pendaftaran
const registrationStep = ref<'email' | 'verify' | 'details'>('email'); // 'email', 'verify', 'details'
const verificationCode = ref('');
const verifiedEmail = ref('');
const stepError = ref('');
const stepLoading = ref(false);
const successMessage = ref('');

// State Formulir
const registerForm = ref({
  first_name: '',
  last_name: '',
  username: '',
  email: '',
  password: '',
  password_confirm: '',
  referral_code: '',
});

// State UI dan validasi
// const turnstileSiteKey = ref(import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY); // REMOVED
// const turnstileToken = ref(''); // REMOVED
const { isSessionValidated, bypassValidationForDev } = useSession(); // ADDED
const termsAccepted = ref(false);
const isEmailUnique = ref(true);

// Status 'touched' untuk validasi
const emailTouched = ref(false);
const firstNameTouched = ref(false);
const lastNameTouched = ref(false);
const usernameTouched = ref(false);
const passwordTouched = ref(false);
const passwordConfirmTouched = ref(false);
const referralCodeTouched = ref(false);

// Validator menggunakan computed properties
const emailValidation = computed(() =>
  validateEmail(registerForm.value.email, { isUnique: isEmailUnique.value }),
);
const firstNameValidation = computed(() =>
  validateName(registerForm.value.first_name, {
    min: 1,
    max: 50,
    fieldName: t('first_name_label'),
  }),
);
const lastNameValidation = computed(() =>
  validateName(registerForm.value.last_name, {
    min: 1,
    max: 50,
    fieldName: t('last_name_label'),
  }),
);
const usernameValidation = computed(() =>
  validateUsername(registerForm.value.username),
);
const passwordValidation = computed(() =>
  validatePassword(registerForm.value.password),
);
const passwordConfirmValidation = computed(() =>
  validatePasswordConfirm(
    registerForm.value.password,
    registerForm.value.password_confirm,
  ),
);
const referralCodeValidation = computed(() =>
  validateReferralCode(registerForm.value.referral_code),
);

// LANGKAH 1: Kirim Kode Verifikasi
const handleSendCode = async () => {
  emailTouched.value = true;
  if (!emailValidation.value.status) {
    stepError.value = emailValidation.value.message;
    return;
  }
  if (!isSessionValidated.value) {
    // UPDATED
    stepError.value = t('wait_security_verification'); // UPDATED
    return;
  }
  stepLoading.value = true;
  stepError.value = '';
  successMessage.value = '';

  try {
    await api.post('/users/register/', {
      email: registerForm.value.email,
      // 'cf-turnstile-response': turnstileToken.value // REMOVED
    });
    successMessage.value = t('verification_code_sent_msg', { email: registerForm.value.email });
    registrationStep.value = 'verify';
  } catch (error: any) {
    stepError.value =
      error.response?.data?.detail ||
      t('failed_sending_code'); // I should add this key or use generic
    isEmailUnique.value = false;
  } finally {
    stepLoading.value = false;
    // turnstileToken.value = ''; // REMOVED
  }
};

// LANGKAH 2: Verifikasi Kode
const handleVerifyCode = async () => {
  if (verificationCode.value.length !== 6) {
    stepError.value = t('verification_code_hint');
    return;
  }
  stepLoading.value = true;
  stepError.value = '';
  successMessage.value = '';

  try {
    await api.post('/users/register/', {
      email: registerForm.value.email,
      code: verificationCode.value,
    });
    verifiedEmail.value = registerForm.value.email;
    registerForm.value.email = verifiedEmail.value;
    registrationStep.value = 'details';
  } catch (error: any) {
    stepError.value =
      error.response?.data?.detail ||
      t('verification_failed_msg');
  } finally {
    stepLoading.value = false;
  }
};

// Validasi untuk form pendaftaran akhir
const isRegisterFormValid = computed(() => {
  const baseValid =
    firstNameValidation.value.status &&
    lastNameValidation.value.status &&
    usernameValidation.value.status &&
    passwordValidation.value.status &&
    passwordConfirmValidation.value.status &&
    referralCodeValidation.value.status;
  return baseValid && termsAccepted.value;
});

// LANGKAH 3: Pendaftaran Final (Integrasi Telemetry)
const handleRegister = async () => {
  // Tandai semua field sebagai "touched" untuk menampilkan error jika ada
  firstNameTouched.value = true;
  lastNameTouched.value = true;
  usernameTouched.value = true;
  passwordTouched.value = true;
  passwordConfirmTouched.value = true;
  referralCodeTouched.value = true;

  if (!isRegisterFormValid.value) {
    stepError.value = t('check_form_and_terms');
    return;
  }
  if (!isSessionValidated.value) {
    // ADDED
    stepError.value = t('wait_security_verification'); // ADDED
    return;
  }
  stepLoading.value = true;
  stepError.value = '';

  try {
    // [BARU] Ambil data telemetri (fingerprint, gpu, screen, dll) sebelum kirim request
    const deviceData = await getDeviceTelemetry();

    const payload = {
      ...registerForm.value,
      email: verifiedEmail.value,
      code: verificationCode.value,
      // 'cf-turnstile-response': turnstileToken.value, // REMOVED
      device_info: deviceData, // [BARU] Sertakan data perangkat ke backend
    };

    await api.post('/users/register/', payload);

    // Set state ini menjadi true untuk memicu tampilan DaftarBerhasil.vue
    registerSuccess.value = true;
  } catch (error: any) {
    stepError.value =
      error.response?.data?.detail ||
      t('registration_final_error_msg');
  } finally {
    stepLoading.value = false;
    // turnstileToken.value = ''; // REMOVED
  }
};

</script>

<template>
  <div>
    <form v-if="registrationStep === 'email'" @submit.prevent="handleSendCode" class="space-y-4">
      <p class="text-center text-sm text-[var(--color-on-surface-variant)] mb-4">
        {{ $t('enter_email_instruction') }}
      </p>
      <div>
        <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ $t('email_label') }}</label>
        <input
          type="email"
          v-model="registerForm.email"
          @input="registerForm.email = formatEmailInput($event); isEmailUnique = true"
          @blur="emailTouched = true"
          :class="{ 
            'w-full p-3 border rounded-2xl transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-on-surface)] bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]': true,
            'ring-2 ring-[var(--color-error)] border-[var(--color-error)]': emailTouched && !emailValidation.status 
          }"
          placeholder="contoh@email.com"
          required
        />
        <p v-if="emailTouched && !emailValidation.status" class="mt-1 text-xs text-[var(--color-error)] font-medium">
          {{ emailValidation.message }}
        </p>
      </div>

      <p v-if="stepError" class="text-center text-sm text-[var(--color-error)] font-medium">{{ stepError }}</p>

      <!-- Visible Turnstile Widget -->
      <div class="flex justify-center py-2">
        <TurnstileWidget theme="auto" size="normal" />
      </div>

      <button 
        type="submit" 
        :disabled="stepLoading || !registerForm.email || !isSessionValidated" 
        class="w-full rounded-2xl px-4 py-2 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)]"
      >
        {{ stepLoading ? $t('sending') : $t('send_code_button') }}
      </button>
      <p v-if="!isSessionValidated && registerForm.email" class="text-center text-xs text-[var(--color-on-surface-variant)] mt-1 animate-pulse">
        {{ $t('waiting_security_check') }}...
      </p>
    </form>
    
    <form v-if="registrationStep === 'verify'" @submit.prevent="handleVerifyCode" class="space-y-4">
      <p v-if="successMessage" class="text-center text-sm text-[var(--color-on-tertiary-container)] bg-[var(--color-tertiary-container)] p-3 rounded-xl mb-4">
        {{ successMessage }}
      </p>
       <div>
          <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ $t('email_label') }}</label>
          <input
            type="email"
            :value="registerForm.email"
            class="w-full p-3 border rounded-2xl bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)] border-[var(--color-outline-variant)] cursor-not-allowed"
            disabled
          />
       </div>
       <div>
          <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ $t('verification_code_label') }}</label>
          <input 
              type="text" 
              v-model="verificationCode" 
              :placeholder="$t('verify_code_placeholder')"
              class="w-full text-center tracking-[0.5em] p-3 border rounded-2xl transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-on-surface)] bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]"
              required 
              maxlength="6"
              @input="verificationCode = formatNumberOnlyInput($event, 6)"
          />
      </div>

      <p v-if="stepError" class="text-center text-sm text-[var(--color-error)] font-medium">{{ stepError }}</p>
      
      <button 
        type="submit" 
        :disabled="stepLoading || verificationCode.length < 6" 
        class="w-full rounded-2xl px-4 py-2 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)]"
      >
        {{ stepLoading ? $t('verifying') : $t('verify_button') }}
      </button>
       <p class="text-center text-sm text-[var(--color-on-surface-variant)]">
        {{ $t('wrong_email_link') }} <a @click.prevent="registrationStep = 'email'; stepError='';" class="text-[var(--color-primary)] hover:underline cursor-pointer">{{ $t('cancel') }}</a>
      </p>
    </form>

    <form v-if="registrationStep === 'details'" @submit.prevent="handleRegister" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ $t('verified_email_label') }}</label>
        <input
            type="email"
            :value="verifiedEmail"
            class="w-full p-3 border rounded-2xl bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)] border-[var(--color-outline-variant)] cursor-not-allowed"
            disabled
          />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ $t('first_name_label') }}</label>
          <input type="text" v-model="registerForm.first_name" :placeholder="$t('first_name_placeholder')" required @input="registerForm.first_name = formatNameOnInput($event)" @blur="firstNameTouched = true; registerForm.first_name = formatNameOnBlur($event)" :class="{'w-full p-3 border rounded-2xl transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-on-surface)] bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]': true, 'ring-2 ring-[var(--color-error)] border-[var(--color-error)]': firstNameTouched && !firstNameValidation.status}"/>
          <p v-if="firstNameTouched && !firstNameValidation.status" class="mt-1 text-xs text-[var(--color-error)] font-medium">{{ firstNameValidation.message }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ $t('last_name_label') }}</label>
          <input type="text" v-model="registerForm.last_name" :placeholder="$t('last_name_placeholder')" required @input="registerForm.last_name = formatNameOnInput($event)" @blur="lastNameTouched = true; registerForm.last_name = formatNameOnBlur($event)" :class="{'w-full p-3 border rounded-2xl transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-on-surface)] bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]': true, 'ring-2 ring-[var(--color-error)] border-[var(--color-error)]': lastNameTouched && !lastNameValidation.status}"/>
          <p v-if="lastNameTouched && !lastNameValidation.status" class="mt-1 text-xs text-[var(--color-error)] font-medium">{{ lastNameValidation.message }}</p>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ $t('username_label') }}</label>
        <div class="relative flex items-center">
          <span class="absolute left-3 text-[var(--color-on-surface-variant)]">@</span>
          <input type="text" v-model="registerForm.username" @input="registerForm.username = formatUsernameInput($event)" @blur="usernameTouched = true" :placeholder="$t('username_placeholder')" :class="{ 'w-full pl-7 pr-4 p-3 border rounded-2xl transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-on-surface)] bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]': true, 'ring-2 ring-[var(--color-error)] border-[var(--color-error)]': usernameTouched && !usernameValidation.status }" required/>
        </div>
        <p v-if="usernameTouched && !usernameValidation.status" class="mt-1 text-xs text-[var(--color-error)] font-medium">{{ usernameValidation.message }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ $t('password_label') }}</label>
        <input type="password" v-model="registerForm.password" @blur="passwordTouched = true" :placeholder="$t('password_placeholder')" :class="{ 'w-full p-3 border rounded-2xl transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-on-surface)] bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]': true, 'ring-2 ring-[var(--color-error)] border-[var(--color-error)]': passwordTouched && !passwordValidation.status }" required/>
        <p v-if="passwordTouched && !passwordValidation.status" class="mt-1 text-xs text-[var(--color-error)] font-medium">{{ passwordValidation.message }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ $t('confirm_password_label') }}</label>
        <input type="password" v-model="registerForm.password_confirm" @blur="passwordConfirmTouched = true" :placeholder="$t('confirm_password_placeholder')" :class="{ 'w-full p-3 border rounded-2xl transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-on-surface)] bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]': true, 'ring-2 ring-[var(--color-error)] border-[var(--color-error)]': passwordConfirmTouched && !passwordConfirmValidation.status }" required/>
        <p v-if="passwordConfirmTouched && !passwordConfirmValidation.status" class="mt-1 text-xs text-[var(--color-error)] font-medium">{{ passwordConfirmValidation.message }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ $t('referral_code_label') }}</label>
        <input
          type="text"
          v-model="registerForm.referral_code"
          :placeholder="$t('referral_code_placeholder')"
          @input="registerForm.referral_code = formatReferralCodeInput($event)"
          @blur="referralCodeTouched = true"
          :class="{
            'w-full p-3 border rounded-2xl transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-on-surface)] bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]': true,
            'ring-2 ring-[var(--color-error)] border-[var(--color-error)]': referralCodeTouched && !referralCodeValidation.status
          }"
        />
        <p v-if="referralCodeTouched && !referralCodeValidation.status" class="mt-1 text-xs text-[var(--color-error)] font-medium">
          {{ referralCodeValidation.message }}
        </p>
      </div>
      
      <div class="flex items-start gap-3 pt-2">
        <input id="terms-checkbox" type="checkbox" v-model="termsAccepted" class="h-4 w-4 mt-0.5 shrink-0 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"/>
        <label for="terms-checkbox" class="text-sm text-[var(--color-on-surface-variant)]">
          {{ $t('terms_agreement') }}
          <a href="/terms" target="_blank" class="font-semibold text-[var(--color-primary)] hover:underline">{{ $t('terms_and_conditions') }}</a>
          {{ $t('and') }}
          <a href="/privacy" target="_blank" class="font-semibold text-[var(--color-primary)] hover:underline">{{ $t('privacy_policy') }}</a>.
        </label>
      </div>

      <!-- Visible Turnstile Widget -->
      <div class="flex justify-center py-2">
        <TurnstileWidget theme="auto" size="normal" />
      </div>
      
      <p v-if="stepError" class="text-center text-sm text-[var(--color-error)] font-medium">{{ stepError }}</p>
      
      <button type="submit" :disabled="stepLoading || !isRegisterFormValid || !isSessionValidated" class="w-full rounded-2xl px-4 py-2 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)]">
        {{ stepLoading ? $t('processing') : $t('register') }}
      </button>
      <p v-if="!isSessionValidated && isRegisterFormValid" class="text-center text-xs text-[var(--color-on-surface-variant)] mt-1 animate-pulse">
        {{ $t('waiting_security_check') }}...
      </p>
    </form>

    <p class="mt-4 text-center text-sm text-[var(--color-on-surface-variant)]">
      <span>{{ $t('have_account') }} <a @click.prevent="emit('switchToLogin')" class="text-[var(--color-primary)] hover:underline cursor-pointer">{{ $t('login_here') }}</a>.</span>
    </p>
  </div>
</template>
