<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/utils/api';
import {
  validatePassword,
  validatePasswordConfirm,
} from '@/utils/validpassword';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';

const props = defineProps({
  formData: { type: Object, required: true },
  isPasswordDirty: { type: Boolean, default: false },
});

const emit = defineEmits(['update:formData']);

const router = useRouter();
const authStore = useAuthStore();

// --- Logika Validasi Password Baru ---
const passwordValidation = ref({ status: true, message: '' });
const passwordConfirmValidation = ref({ status: true, message: '' });
const passwordTouched = ref(false);
const passwordConfirmTouched = ref(false);

watch(
  () => props.formData,
  (newData) => {
    if (props.isPasswordDirty) {
      passwordValidation.value = validatePassword(newData.password);
      passwordConfirmValidation.value = validatePasswordConfirm(
        newData.password,
        newData.password_confirm,
      );
    } else {
      passwordValidation.value = { status: true, message: '' };
      passwordConfirmValidation.value = { status: true, message: '' };
      passwordTouched.value = false;
      passwordConfirmTouched.value = false;
    }
  },
  { deep: true },
);

const isSectionValid = computed(() => {
  if (!props.isPasswordDirty) {
    return true;
  }
  return (
    passwordValidation.value.status && passwordConfirmValidation.value.status
  );
});

defineExpose({ isSectionValid });

// --- Logika Hapus Akun (Zona Bahaya) ---
const isDeleteModalOpen = ref(false);
const deletePassword = ref('');
const isDeleting = ref(false);
const deleteError = ref(null);

const openDeleteModal = () => {
  deleteError.value = null;
  deletePassword.value = '';
  isDeleteModalOpen.value = true;
};

const closeDeleteModal = () => {
  if (isDeleting.value) return;
  isDeleteModalOpen.value = false;
  deletePassword.value = '';
  deleteError.value = null;
};

const handleDeleteAccount = async () => {
  if (!deletePassword.value) {
    deleteError.value = 'Kata sandi diperlukan untuk konfirmasi.';
    return;
  }

  isDeleting.value = true;
  deleteError.value = null;

  try {
    // 1. Verifikasi Password (Re-authentication)
    try {
      await api.post('/users/login/', {
        form: {
          identifier: authStore.user.username,
          password: deletePassword.value,
        },
        device_info: null,
      });
    } catch (err) {
      throw new Error('Kata sandi yang Anda masukkan salah.');
    }

    // 2. Soft Delete Akun
    await api.delete(`/users/${authStore.user.id}/delete/`);

    // 3. Logout dan Redirect
    authStore.logout();
    window.location.href = '/';
  } catch (err) {
    console.error('Gagal menghapus akun:', err);
    deleteError.value = err.message || 'Gagal menghapus akun. Mohon coba lagi.';
  } finally {
    isDeleting.value = false;
  }
};
</script>

<template>
  <section class="space-y-4 select-auto">
    
    <div>
      <label for="password" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Kata Sandi Baru</label>
      <input
        type="password"
        id="password"
        :value="formData.password"
        @input="$emit('update:formData', { ...formData, password: $event.target.value })"
        @blur="passwordTouched = true"
        placeholder="Kosongkan jika tidak ingin mengubah"
        class="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors duration-300 text-[var(--color-on-surface)]"
        :class="[
          { 'ring-2 ring-[var(--color-error)]': passwordTouched && !passwordValidation.status },
          isPasswordDirty
            ? 'bg-[var(--color-surface-container-highest)] border-[var(--color-primary)]'
            : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]'
        ]"
      />
      <p v-if="passwordTouched && !passwordValidation.status" class="mt-1 text-xs text-[var(--color-error)] font-medium">
        {{ passwordValidation.message }}
      </p>
    </div>

    <div>
      <label for="password_confirm" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Konfirmasi Kata Sandi Baru</label>
      <input
        type="password"
        id="password_confirm"
        :value="formData.password_confirm"
        @input="$emit('update:formData', { ...formData, password_confirm: $event.target.value })"
        @blur="passwordConfirmTouched = true"
        placeholder="Ulangi kata sandi baru"
        class="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors duration-300 text-[var(--color-on-surface)]"
        :class="[
            { 'ring-2 ring-[var(--color-error)]': passwordConfirmTouched && !passwordConfirmValidation.status },
            isPasswordDirty
              ? 'bg-[var(--color-surface-container-highest)] border-[var(--color-primary)]'
              : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]'
        ]"
      />
      <p v-if="passwordConfirmTouched && !passwordConfirmValidation.status" class="mt-1 text-xs text-[var(--color-error)] font-medium">
        {{ passwordConfirmValidation.message }}
      </p>
    </div>

    <hr class="my-8 border-[var(--color-outline-variant)]" />
    
    <div class="space-y-4">
      <h3 class="text-lg font-bold text-[var(--color-error)]">Zona Bahaya</h3>
      <div class="p-4 rounded-2xl border border-[var(--color-error)] bg-[var(--color-error-container)]/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h4 class="font-medium text-[var(--color-on-surface)]">Hapus Akun</h4>
          
        </div>
        <button 
          type="button" 
          @click="openDeleteModal"
          class="shrink-0 px-4 py-2 text-sm font-semibold text-[var(--color-on-error)] bg-[var(--color-error)] hover:bg-[var(--color-error-container)] rounded-xl transition-colors"
        >
          Hapus Akun Saya
        </button>
      </div>
    </div>

    <TransitionRoot :show="isDeleteModalOpen" as="template">
      <Dialog @close="closeDeleteModal" class="relative z-[60]">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black/60" />
        </TransitionChild>

        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="w-full max-w-sm transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-center align-middle shadow-xl transition-all">
              
              <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-error-container)]">
                <span class="material-symbols-outlined text-4xl text-[var(--color-on-error-container)]">delete_forever</span>
              </div>

              <DialogTitle as="h3" class="mt-4 text-2xl font-bold text-[var(--color-on-background)]">
                Hapus Permanen?
              </DialogTitle>

              <p class="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                Tindakan ini tidak dapat dibatalkan seketika. Masukkan kata sandi Anda untuk konfirmasi.
              </p>

              <div class="mt-6 text-left">
                  <label for="delete_confirmation_pass" class="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1 ml-1">Kata Sandi Saat Ini</label>
                  <input
                      type="password"
                      id="delete_confirmation_pass"
                      v-model="deletePassword"
                      placeholder="Masukkan kata sandi..."
                      class="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--color-error)] transition-colors duration-300 text-[var(--color-on-surface)] border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]"
                      @keyup.enter="handleDeleteAccount"
                  />
              </div>

              <div v-if="deleteError" class="mt-3 text-sm text-[var(--color-error)] bg-[var(--color-error-container)]/20 p-2 rounded-lg flex items-center justify-center gap-2">
                  <span class="material-symbols-outlined text-sm">error</span>
                  {{ deleteError }}
              </div>

              <div class="mt-6 grid grid-cols-2 gap-3">
                <button 
                  type="button" 
                  @click="closeDeleteModal" 
                  class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]"
                >
                  Batal
                </button>
                <button 
                  @click="handleDeleteAccount" 
                  :disabled="isDeleting || !deletePassword"
                  class="w-full rounded-xl bg-[var(--color-error)] px-4 py-2 font-semibold text-[var(--color-on-error)] transition-colors hover:bg-[var(--color-on-error-container)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span v-if="isDeleting" class="material-symbols-outlined animate-spin text-sm">sync</span>
                  <span>{{ isDeleting ? 'Memproses...' : 'Hapus' }}</span>
                </button>
              </div>

            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

  </section>
</template>
