<script setup lang="ts">
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
} from '@headlessui/vue';
import { useUIStore } from '@/stores/ui';
import { storeToRefs } from 'pinia';
import { onKeyStroke } from '@vueuse/core';
import { APP_VERSION } from '@/config/app';

const uiStore = useUIStore();
const { isInfoAplikasiOpen } = storeToRefs(uiStore);

function closeModal() {
  uiStore.closeInfoAplikasiModal();
}

onKeyStroke('Escape', (e) => {
  if (isInfoAplikasiOpen.value) {
    e.preventDefault();
    closeModal();
  }
});
</script>

<template>
  <Teleport to="body">
  <TransitionRoot appear :show="isInfoAplikasiOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-50">
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-[var(--color-scrim)]/50" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="w-full max-w-xs transform overflow-hidden rounded-4xl bg-[var(--color-surface-container-high)] p-8 text-center align-middle shadow-xl transition-all">
              
              <!-- Logo -->
              <img src="/Leksika_icon.svg" alt="Leksika" class="w-24 h-24 mx-auto mb-4" />
              
              <!-- App Name -->
              <h3 class="text-2xl font-bold text-[var(--color-on-background)] mb-2">Leksika</h3>
              
              <!-- Version -->
              <span class="inline-flex items-center rounded-full bg-[var(--color-primary-container)] px-4 py-1.5 text-sm font-medium text-[var(--color-on-primary-container)]">
                v{{ APP_VERSION }}
              </span>

              <!-- Close Button -->
              <div class="mt-6">
                <button 
                  type="button" 
                  class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-3 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]" 
                  @click="closeModal"
                >
                  {{ $t('close') }}
                </button>
              </div>

            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
  </Teleport>
</template>
