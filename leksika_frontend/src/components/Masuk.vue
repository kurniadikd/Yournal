<script setup lang="ts">
import { inject, ref } from 'vue';
import {
  formatEmailInput,
  formatNumberOnlyInput,
  formatUsernameInput,
} from '@/utils/formatters'; // Ensure .js extension is removed if file is .ts, or keep if it's .js. For now keeping as is but TS might complain if allowJs is not set (it is set).
import { useSession } from '@/utils/session'; // Import useSession
import TurnstileWidget from '@/components/TurnstileWidget.vue';


const emit = defineEmits(['switchToRegister', 'switchToForgotPassword']);

const {
  loginForm,
  loginLoading,
  loginError,
  handleLogin,
  identifierTouched,
  passwordTouched,
} = inject('authForm') as any;

// Get session validation status
const { isSessionValidated, bypassValidationForDev } = useSession();



// Gunakan fungsi-fungsi formatter yang telah ada
const sanitizeIdentifierInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  let value = target.value;

  // Hapus karakter yang tidak diinginkan
  let formatted = value.replace(/[^a-zA-Z0-9_@.+-]/g, '');

  // Opsi: Tetapkan ke lowercase secara default untuk konsistensi
  // formatted = formatted.toLowerCase();

  loginForm.value.identifier = formatted;
};
</script>

<template>
  <div>
    <form @submit.prevent="handleLogin" class="space-y-4" novalidate>
      <div>
        <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ $t('email_username_label') }}</label>
        <input
          type="text"
          :placeholder="$t('login_placeholder')"
          required
          v-model.trim="loginForm.identifier"
          @input="sanitizeIdentifierInput"
          @blur="identifierTouched = true"
          :class="{
            // Gaya input yang disatukan: p-3, rounded-2xl, warna latar dan border dari variabel
            'w-full p-3 border rounded-2xl transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-on-surface)] bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]': true,
            // Gaya error: Menggunakan ring-2 dan var(--color-error)
            'ring-2 ring-[var(--color-error)] border-[var(--color-error)]': identifierTouched && !loginForm.identifier
          }"
        />
        <p v-if="identifierTouched && !loginForm.identifier" class="mt-1 text-xs text-[var(--color-error)] font-medium">
          {{ $t('field_required') }}
        </p>
      </div>

      <div>
        <div class="flex justify-between items-center">
          <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ $t('password_label') }}</label>
          <a @click.prevent="emit('switchToForgotPassword')" class="text-xs text-[var(--color-primary)] hover:underline cursor-pointer">{{ $t('forgot_password_link') }}</a>
        </div>
        <input
          type="password"
          v-model="loginForm.password"
          :placeholder="$t('password_placeholder')"
          required
          @blur="passwordTouched = true"
          :class="{
            // Gaya input yang disatukan: p-3, rounded-2xl, warna latar dan border dari variabel
            'w-full p-3 border rounded-2xl transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-on-surface)] bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]': true,
            // Gaya error: Menggunakan ring-2 dan var(--color-error)
            'ring-2 ring-[var(--color-error)] border-[var(--color-error)]': passwordTouched && !loginForm.password
          }"
        />
        <p v-if="passwordTouched && !loginForm.password" class="mt-1 text-xs text-[var(--color-error)] font-medium">
          {{ $t('field_required') }}
        </p>
      </div>

      <!-- Visible Turnstile Status -->
      <div class="flex justify-center py-2">
        <!-- TurnstileWidget handles both Dev (badge) and Prod (widget) modes -->
        <TurnstileWidget />
      </div>

      <p v-if="loginError" class="text-center text-sm text-[var(--color-error)] font-medium">{{ loginError }}</p>

      <button
        type="submit"
        :disabled="loginLoading || !loginForm.identifier || !loginForm.password || !isSessionValidated"
        :class="{
          // Gaya tombol primary: rounded-2xl, warna primary dan hover primary-fixed-dim
          'w-full rounded-2xl px-4 py-2 font-semibold transition-colors disabled:opacity-50': true,
          'bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)]': !loginLoading,
          'bg-[var(--color-primary)] text-[var(--color-on-primary)] opacity-50 cursor-not-allowed': loginLoading
        }"
      >
        {{ loginLoading ? $t('processing') : $t('login') }}
      </button>
      <!-- Feedback jika tombol disabled hanya karena menunggu validasi sesi -->
      <p v-if="!isSessionValidated && loginForm.identifier && loginForm.password" class="text-center text-xs text-[var(--color-on-surface-variant)] mt-1 animate-pulse">
        {{ $t('waiting_security_check') }}...
      </p>
    </form>

    <p class="mt-4 text-center text-sm text-[var(--color-on-surface-variant)]">
      {{ $t('not_have_account') }}
      <a @click.prevent="emit('switchToRegister')" class="text-[var(--color-primary)] hover:underline cursor-pointer">{{ $t('register_here') }}</a>.
    </p>
  </div>
</template>

<style scoped>

</style>

