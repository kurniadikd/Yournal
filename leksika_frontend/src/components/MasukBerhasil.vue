<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';
import { useUIStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  mode: {
    type: String,
    default: 'modal', // 'modal' or 'inline'
  },
});

const emit = defineEmits(['close']);

const uiStore = useUIStore();
const authStore = useAuthStore();
const { showLoginSuccessModal } = storeToRefs(uiStore);
const { setShowLoginSuccessModal } = uiStore;

const firstName = computed(() => authStore.user?.first_name || t('user_generic'));

let closeTimeout: ReturnType<typeof setTimeout> | null = null;

watch(showLoginSuccessModal, (newValue: boolean) => {
  if (props.mode === 'modal') {
    if (newValue) {
      // Automatically close after 3 seconds
      closeTimeout = setTimeout(() => {
        setShowLoginSuccessModal(false);
      }, 3000);
    } else {
      if (closeTimeout) clearTimeout(closeTimeout);
    }
  }
});

const handleCloseModal = () => {
  setShowLoginSuccessModal(false);
  emit('close');
};
</script>

<template>
  <!-- MODAL MODE -->
  <TransitionRoot :show="showLoginSuccessModal" as="template" v-if="mode === 'modal'">
    <Dialog as="div" class="relative z-50" @close="handleCloseModal">
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

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-sm transform overflow-hidden rounded-4xl bg-[var(--color-surface-container-high)] p-6 text-center align-middle shadow-xl transition-all">
              <div class="relative flex flex-col items-center justify-center gap-4 text-center">

                <button @click="handleCloseModal" class="absolute right-0 top-0 p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <svg class="checkmark h-20 w-20 mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                  <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                  <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>

                <DialogTitle as="h2" class="text-2xl font-bold">{{ $t('welcome_user', { name: firstName }) }}</DialogTitle>
                <p class="mt-2 text-[var(--color-on-surface-variant)]">{{ $t('login_success_msg') }}</p>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>

  <!-- INLINE MODE -->
  <div v-else class="relative flex flex-col items-center justify-center gap-4 text-center py-8">
     <button @click="$emit('close')" class="absolute right-0 top-0 p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
     </button>

     <svg class="checkmark h-20 w-20 mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
        <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
        <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
     </svg>

     <h2 class="text-2xl font-bold">{{ $t('welcome_user', { name: firstName }) }}</h2>
     <p class="mt-2 text-[var(--color-on-surface-variant)]">{{ $t('login_success_msg') }}</p>
  </div>
</template>

<style scoped>
/* Style tidak berubah, tetap sama seperti sebelumnya */
.checkmark__circle {
  stroke-dasharray: 166;
  stroke-dashoffset: 166;
  stroke-width: 2;
  stroke-miterlimit: 10;
  stroke: var(--color-success);
  fill: none;
  animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}
.checkmark {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: block;
  stroke-width: 2;
  stroke: var(--color-surface-container-high);
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
  100% { stroke-dashoffset: 0; }
}
@keyframes scale {
  0%, 100% { transform: none; }
  50% { transform: scale3d(1.1, 1.1, 1); }
}
@keyframes fill {
  100% { box-shadow: inset 0px 0px 0px 40px var(--color-success); }
}
.dark .checkmark {
  stroke: var(--color-surface-container-high); 
  box-shadow: inset 0px 0px 0px var(--color-success);
}
.dark .checkmark__check {
  stroke: var(--color-on-success); 
}
</style>
