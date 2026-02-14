<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
// 1. Tambahkan 'close' ke dalam emits
defineEmits(['switchToLogin', 'close']);
</script>

<template>
  <div class="relative flex flex-col items-center justify-center gap-4 text-center h-full">

    <!-- Ikon Tutup: var(--color-outline) dan var(--color-on-background) -->
    <button @click="$emit('close')" class="absolute right-0 top-0 p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <svg class="checkmark h-20 w-20 mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
      <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
      <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
    </svg>
    
    <!-- Judul: Akan mewarisi var(--color-on-background) dari induk -->
    <h2 class="text-2xl font-bold">{{ $t('registration_success_title') }}</h2>
    
    <!-- Teks Deskripsi: var(--color-on-surface-variant) -->
    <p class="mt-2 text-[var(--color-on-surface-variant)]">
      {{ $t('registration_success_desc') }}
    </p>
    
    <!-- Tombol: var(--color-primary) dan rounded-2xl (mengikuti komponen Masuk.vue) -->
    <button
      @click="$emit('switchToLogin')"
      class="w-full mt-4 rounded-2xl px-4 py-2 font-semibold transition-colors
             bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)]"
    >
      {{ $t('back_to_login') }}
    </button>
  </div>
</template>

<style scoped>
.checkmark__circle {
  stroke-dasharray: 166;
  stroke-dashoffset: 166;
  stroke-width: 2;
  stroke-miterlimit: 10;
  stroke: var(--color-success); /* Warna hijau */
  fill: none;
  animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}

.checkmark {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: block;
  stroke-width: 2;
  stroke: var(--color-on-success);
  stroke-miterlimit: 10;
  margin: 0 auto;
  box-shadow: inset 0px 0px 0px var(--color-success);
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
    box-shadow: inset 0px 0px 0px 40px var(--color-success);
  }
}

/* Dark Mode Styles - Menggunakan warna latar belakang gelap sebagai stroke checkmark*/
.dark .checkmark {
  stroke: var(--color-surface-dim); 
  box-shadow: inset 0px 0px 0px var(--color-success);
}

.dark .checkmark__check {
  stroke: var(--color-surface-dim); 
}
</style>
