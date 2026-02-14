<script setup lang="ts">
import { inject, ref, computed } from 'vue';

const emit = defineEmits(['back']);
const {
  twoFactorCode,
  twoFactorError,
  twoFactorLoading,
  handle2FAVerification,
} = inject('authForm') as any;
</script>

<template>
  <div class="space-y-6">
    <div class="text-center">
      <h2 class="text-2xl font-bold text-neutral-900 dark:text-white">Verifikasi 2-Faktor</h2>
      <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Masukkan kode 6 digit dari aplikasi otentikasi Anda.
      </p>
    </div>
    
    <div class="flex justify-center">
      <input
        type="text"
        v-model="twoFactorCode"
        placeholder="123456"
        maxlength="6"
        @keyup.enter="handle2FAVerification"
        class="w-full text-center tracking-[0.5em] text-2xl font-mono px-4 py-2 rounded-xl border border-neutral-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 dark:bg-neutral-700 dark:border-neutral-600 placeholder-neutral-400 dark:placeholder-neutral-500"
      />
    </div>

    <p v-if="twoFactorError" class="text-center text-sm text-red-500">{{ twoFactorError }}</p>
    
    <button
      @click="handle2FAVerification"
      :disabled="twoFactorLoading || twoFactorCode.length < 6"
      class="w-full rounded-xl bg-pink-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-pink-700 disabled:opacity-50"
    >
      {{ twoFactorLoading ? 'Memverifikasi...' : 'Verifikasi' }}
    </button>

    <div class="text-center mt-4">
      <a @click.prevent="$emit('back')" class="text-sm text-pink-500 hover:underline cursor-pointer">
        Kembali ke Login
      </a>
    </div>
  </div>
</template>
