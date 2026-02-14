<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { storeToRefs } from 'pinia';
import { useClipboard } from '@vueuse/core';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const authStore = useAuthStore();
const uiStore = useUIStore();
const { user } = storeToRefs(authStore);

const referralCode = computed(
  () => user.value?.profile?.owned_referral_code || '-',
);
const referralCount = computed(() => user.value?.profile?.referral_count || 0);

const { copy, copied } = useClipboard({ legacy: true });

const copyReferralCode = () => {
  copy(referralCode.value);
};

const goBack = () => {
  uiStore.setActiveProfileView('utama');
};
</script>

<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="relative flex items-center justify-center">
             <button @click="goBack" class="absolute left-0 w-10 h-10 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] flex items-center justify-center hover:bg-[var(--color-surface-container-highest)] transition-colors">
                <span class="material-symbols-outlined">arrow_back</span>
             </button>
            <h2 class="text-xl font-bold text-[var(--color-on-background)]">{{ $t('referral') }}</h2>
        </div>

        <!-- Stats Card -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-[var(--color-surface-container-high)] p-6 rounded-3xl flex flex-col items-center justify-center text-center">
                <span class="text-4xl font-bold text-[var(--color-primary)] mb-2">{{ referralCount }}</span>
                <span class="text-sm font-medium text-[var(--color-on-surface)]">{{ $t('referral_friend_joined') }}</span>
            </div>
             <div class="bg-[var(--color-surface-container-high)] p-6 rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
                <div class="w-full">
                    <p class="text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">{{ $t('your_referral_code') }}</p>
                    <div 
                        @click="copyReferralCode"
                        class="bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-outline)] rounded-xl p-3 flex items-center justify-between cursor-pointer hover:border-[var(--color-primary)] transition-colors group relative"
                    >
                        <span class="text-lg font-mono font-bold text-[var(--color-on-surface)] tracking-wider w-full select-all">{{ referralCode }}</span>
                        <span class="material-symbols-outlined text-[var(--color-primary)]">content_copy</span>
                    </div>
                </div>
                 <p v-if="copied" class="text-xs text-green-600 font-bold fade-in">{{ $t('copied') }}</p>
                 <p v-else class="text-xs text-[var(--color-outline)]">{{ $t('click_to_copy') }}</p>
            </div>
        </div>

        <!-- Info Section -->
        <div class="bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] p-6 rounded-3xl">
            <div class="flex items-start gap-3">
                <span class="material-symbols-outlined mt-1">info</span>
                <div>
                    <h3 class="font-bold mb-1">{{ $t('how_it_works') }}</h3>
                    <p class="text-sm opacity-90 leading-relaxed">
                        {{ $t('referral_description_text') }}
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
