<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
} from '@headlessui/vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
import { cloneDeep } from 'lodash-es';

// IMPOR KOMPONEN ANAK
import AturAvatar from './Pengaturan/AturAvatar.vue';
import AturIdentitas from './Pengaturan/AturIdentitas.vue';
import AturKontak from './Pengaturan/AturKontak.vue';
import AturKeamanan from './Pengaturan/AturKeamanan.vue';
import Atur2FA from './Pengaturan/Atur2FA.vue';
import AturMinat from './Pengaturan/AturMinat.vue';

// === Stores ===
const authStore = useAuthStore();
const uiStore = useUIStore();
const { user } = storeToRefs(authStore);
const { isAkunOpen } = storeToRefs(uiStore);

// === State Lokal untuk Kontrol Tampilan ===
const viewMode = ref<'main' | '2fa-setup'>('main'); // 'main' atau '2fa-setup'

// === Refs untuk Komponen Anak ===
const identitasRef = ref<any>(null);
const initialFocusRef = ref<HTMLElement | null>(null);
const kontakRef = ref<any>(null);
const keamananRef = ref<any>(null);

// === State Lokal untuk Form ===
const formData = ref<Record<string, any>>({});
const originalFormData = ref<Record<string, any> | null>(null);
const avatarFileToUpload = ref<File | null>(null);
const isSavingProfile = ref(false);

// === Pengecekan Perubahan & Validasi ===
const isFormDirty = computed(() => {
  if (!originalFormData.value) return false;

  const fieldsToCompare = [
    'username',
    'first_name',
    'last_name',
    'email',
    'phone_number',
    'birth_date',
    'location',
    'interests',
    'gender',
  ];

  const dataChanged = fieldsToCompare.some(
    (field) =>
      JSON.stringify(formData.value[field]) !==
      JSON.stringify(originalFormData.value![field]),
  );

  const avatarChanged =
    avatarFileToUpload.value !== null ||
    formData.value.avatarBase64 !== originalFormData.value.avatarBase64;
  const passwordChanged = formData.value.password !== '';

  return dataChanged || avatarChanged || passwordChanged;
});

function isFieldDirty(fieldName: string) {
  if (!originalFormData.value) return false;
  switch (fieldName) {
    case 'avatar':
      return (
        formData.value.avatarBase64 !== originalFormData.value.avatarBase64
      );
    case 'password':
      return (
        formData.value.password !== '' || formData.value.password_confirm !== ''
      );
    case 'first_name':
    case 'last_name':
    case 'username':
    case 'email':
    case 'phone_number':
    case 'birth_date':
    case 'location':
    case 'gender':
    case 'interests':
      return (
        JSON.stringify(formData.value[fieldName]) !==
        JSON.stringify(originalFormData.value[fieldName])
      );
    default:
      return false; // Should not happen with current fields
  }
}

const isFormValid = computed(() => {
  const isIdentitasValid = identitasRef.value?.isSectionValid ?? true;
  const isKontakValid = kontakRef.value?.isSectionValid ?? true;
  const isKeamananValid = keamananRef.value?.isSectionValid ?? true;
  return isIdentitasValid && isKontakValid && isKeamananValid;
});

// === Computed Properties ===
const userInitials = computed(() => {
  if (!user.value) return '';
  // Gunakan formData sebagai sumber data utama untuk tampilan inisial
  const firstName = formData.value.first_name || '';
  const lastName = formData.value.last_name || '';
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
});

const has2FA = computed(() => user.value?.has_2fa_enabled);

// === Lifecycle & Watchers ===
watch(
  user,
  (newUser) => {
    if (newUser && newUser.profile) {
      const cleanData = {
        avatar: newUser.profile.avatar || null,
        avatarBase64: newUser.profile.avatar_base64 || null,
        avatarMimeType: newUser.profile.avatar_mimetype || null,
        avatarTransform: newUser.profile.avatar_transform || null,
        username: newUser.username || '',
        first_name: newUser.first_name || '',
        last_name: newUser.last_name || '',
        email: newUser.email || '',
        phone_number: newUser.profile.phone_number || '',
        birth_date: newUser.profile.birth_date || '',
        location: newUser.profile.location || '',
        gender: newUser.profile.gender || '',
        interests: newUser.profile.interests || [],
        password: '',
        password_confirm: '',
      };
      formData.value = cloneDeep(cleanData);
      originalFormData.value = cloneDeep(cleanData);
      avatarFileToUpload.value = null;
    }
    viewMode.value = 'main';
  },
  { immediate: true, deep: true },
);

watch(isAkunOpen, (isOpen) => {
  if (isOpen && user.value?.id) {
    // Ensure user ID exists before fetching
    authStore.fetchUserProfile(user.value.id); // Fetch latest data when modal opens
  }
});

// === Fungsi Aksi Utama ===
function handleAvatarUpdate(event: any) {
  if (event) {
    formData.value.avatarBase64 = event.base64;
    formData.value.avatarMimeType = event.mimeType;
    formData.value.avatarTransform = event.transform || null;
  } else {
    formData.value.avatarBase64 = null;
    formData.value.avatarMimeType = null;
    formData.value.avatarTransform = null;
  }
}
async function saveProfile() {
  if (isSavingProfile.value || !isFormValid.value) return;
  isSavingProfile.value = true;

  const payload = new FormData();

  if (isFieldDirty('avatar')) {
    if (avatarFileToUpload.value) {
      payload.append('avatar', avatarFileToUpload.value);
      // Send transform data if available
      if (formData.value.avatarTransform) {
        payload.append(
          'avatar_transform',
          JSON.stringify(formData.value.avatarTransform),
        );
      }
    } else if (formData.value.avatar === null) {
      // Kirim string kosong untuk menandakan avatar dihapus
      payload.append('avatar', '');
    }
  }
  if (isFieldDirty('username'))
    payload.append('username', formData.value.username);
  if (isFieldDirty('first_name'))
    payload.append('first_name', formData.value.first_name);
  if (isFieldDirty('last_name'))
    payload.append('last_name', formData.value.last_name);
  if (isFieldDirty('email')) payload.append('email', formData.value.email);
  if (isFieldDirty('phone_number'))
    payload.append('phone_number', formData.value.phone_number);
  if (isFieldDirty('birth_date'))
    payload.append('birth_date', formData.value.birth_date);
  if (isFieldDirty('location'))
    payload.append('location', formData.value.location);
  if (isFieldDirty('gender')) payload.append('gender', formData.value.gender);
  if (isFieldDirty('interests')) {
    // Backend expects a JSON string for the array
    payload.append('interests', JSON.stringify(formData.value.interests));
  }

  if (isFieldDirty('password')) {
    payload.append('password', formData.value.password);
    payload.append('password_confirm', formData.value.password_confirm);
  }

  try {
    // --- PERUBAHAN UTAMA UNTUK REAKTIVITAS ---
    // 1. Panggil action store dan tunggu data pengguna yang sudah diperbarui.
    const updatedUserData = await authStore.updateProfile(
      user.value!.id,
      payload,
    );

    // 2. Perbarui state lokal `formData` secara eksplisit dengan data baru dari server.
    //    Ini akan memastikan komponen langsung me-render ulang dengan URL avatar yang baru
    //    dan data lainnya yang mungkin berubah.
    formData.value.avatarBase64 = updatedUserData.profile.avatar_base64;
    formData.value.avatarMimeType = updatedUserData.profile.avatar_mimetype;
    formData.value.avatarTransform = updatedUserData.profile.avatar_transform;
    formData.value.username = updatedUserData.username;
    formData.value.first_name = updatedUserData.first_name;
    formData.value.last_name = updatedUserData.last_name;
    formData.value.email = updatedUserData.email;
    formData.value.phone_number = updatedUserData.profile.phone_number;
    formData.value.birth_date = updatedUserData.profile.birth_date;
    formData.value.location = updatedUserData.profile.location;
    formData.value.gender = updatedUserData.profile.gender;
    formData.value.interests = updatedUserData.profile.interests;
    // Reset password fields
    formData.value.password = '';
    formData.value.password_confirm = '';

    // 3. Atur ulang `originalFormData` agar form tidak lagi dianggap 'dirty'.
    originalFormData.value = cloneDeep(formData.value);
    avatarFileToUpload.value = null;

    console.log('Profil berhasil disimpan.');
  } catch (err) {
    console.error('Gagal menyimpan profil:', err);
  } finally {
    isSavingProfile.value = false;
  }
}

function revertChanges() {
  if (originalFormData.value) {
    formData.value = cloneDeep(originalFormData.value);
    avatarFileToUpload.value = null;
  }
}

function closeModal() {
  uiStore.closeAkunModal();
  setTimeout(() => {
    revertChanges(); // Kembalikan perubahan jika modal ditutup tanpa menyimpan
    viewMode.value = 'main';
  }, 300);
}
</script>

<template>
  <Teleport to="body">
  <TransitionRoot :show="isAkunOpen" as="template">
    <Dialog as="div" class="relative z-50" @close="closeModal" :initialFocus="initialFocusRef">
      
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      </TransitionChild>

      <div class="fixed inset-0 flex">
        <TransitionChild
          as="template"
          enter="transform transition ease-out duration-300"
          enter-from="translate-x-full"
          enter-to="translate-x-0"
          leave="transform transition ease-in duration-200"
          leave-from="translate-x-0"
          leave-to="translate-x-full"
        >
          <DialogPanel class="relative w-full h-full bg-[var(--color-background)] flex flex-col select-none" tabindex="-1">
            
            <Transition name="fade" mode="out-in">
              <div v-if="viewMode === '2fa-setup'" key="2fa-setup" class="w-full h-full flex flex-col">
                <Atur2FA @back="viewMode = 'main'" @success="viewMode = 'main'" />
              </div>

              <div v-else key="main-account" class="w-full h-full flex flex-col">
                <header class="flex-shrink-0 w-full max-w-3xl mx-auto p-4 md:p-6 flex items-center relative">
                  <button @click="closeModal" :aria-label="$t('back')" class="text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors rounded-full w-10 h-10 flex items-center justify-center -ml-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <h2 class="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-[var(--color-on-background)] whitespace-nowrap">{{ $t('account_settings') }}</h2>
                </header>

                <div class="flex-grow overflow-y-auto">
                  <main class="w-full max-w-3xl mx-auto p-4 md:p-6 space-y-8">
                    <div class="bg-[var(--color-surface-container-high)] rounded-2xl p-6 transition-all duration-500 delay-100 opacity-0 translate-y-8" :class="{ '!opacity-100 !translate-y-0': isAkunOpen }">
                      <h3 class="text-xl font-bold text-[var(--color-on-background)] mb-4">{{ $t('profile_photo') }}</h3>
                      <AturAvatar
                        :avatar-base64="formData.avatarBase64"
                        :avatar-mime-type="formData.avatarMimeType"
                        :avatar-transform="formData.avatarTransform"
                        :user-initials="userInitials"
                        :has-existing-avatar="!!originalFormData?.avatarBase64"
                        :is-dirty="isFieldDirty('avatar')"
                        @update:avatar="handleAvatarUpdate($event)"
                        @update:avatar-file="avatarFileToUpload = $event"
                      />
                    </div>

                    <div class="bg-[var(--color-surface-container-high)] rounded-2xl p-6 transition-all duration-500 delay-200 opacity-0 translate-y-8" :class="{ '!opacity-100 !translate-y-0': isAkunOpen }">
                      <h3 class="text-xl font-bold text-[var(--color-on-background)] mb-4">{{ $t('identity') }}</h3>
                      <AturIdentitas
                        ref="initialFocusRef"
                        :initial-data="originalFormData"
                        :form-data="formData"
                        @update:form-data="formData = $event"
                      />
                    </div>

                    <div class="bg-[var(--color-surface-container-high)] rounded-2xl p-6 transition-all duration-500 delay-300 opacity-0 translate-y-8" :class="{ '!opacity-100 !translate-y-0': isAkunOpen }">
                      <h3 class="text-xl font-bold text-[var(--color-on-background)] mb-4">{{ $t('interests_personalization') }}</h3>
                      <AturMinat
                        :form-data="formData"
                        @update:form-data="formData = $event"
                      />
                    </div>
                    
                    <div class="bg-[var(--color-surface-container-high)] rounded-2xl p-6 transition-all duration-500 delay-300 opacity-0 translate-y-8" :class="{ '!opacity-100 !translate-y-0': isAkunOpen }">
                      <h3 class="text-xl font-bold text-[var(--color-on-background)] mb-4">{{ $t('contact') }}</h3>
                      <AturKontak
                        ref="kontakRef"
                        :initial-data="originalFormData"
                        :form-data="formData"
                        :is-email-dirty="isFieldDirty('email')"
                        :is-phone-dirty="isFieldDirty('phone_number')"
                        @update:form-data="formData = $event"
                      />
                    </div>

                    <div class="bg-[var(--color-surface-container-high)] rounded-2xl p-6 transition-all duration-500 delay-400 opacity-0 translate-y-8" :class="{ '!opacity-100 !translate-y-0': isAkunOpen }">
                      <h3 class="text-xl font-bold text-[var(--color-on-background)] mb-4">{{ $t('security') }}</h3>
                      <AturKeamanan
                        ref="keamananRef"
                        :form-data="formData"
                        :is-password-dirty="isFieldDirty('password')"
                        @update:form-data="formData = $event"
                      />
                      <hr class="my-6 border-[var(--color-outline-variant)]">
                      
                      <div v-if="false">
                        <div class="flex items-center justify-between">
                          <div class="text-left cursor-pointer flex-grow mr-4" @click="viewMode = '2fa-setup'">
                            <h4 class="font-semibold text-[var(--color-on-background)]">{{ $t('2fa_title') }}</h4>
                            <p class="text-sm text-[var(--color-on-surface-variant)] mt-1">{{ $t('2fa_desc') }}</p>
                          </div>
                          <div
                            class="md-switch group relative inline-flex items-center flex-shrink-0"
                            :class="{ 'selected': has2FA }"
                            @click="viewMode = '2fa-setup'"
                            role="switch"
                            :aria-checked="has2FA"
                            tabindex="0"
                            @keydown.space.prevent="viewMode = '2fa-setup'"
                            @keydown.enter.prevent="viewMode = '2fa-setup'"
                          >
                            <div
                                class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out cursor-pointer relative"
                                :class="[
                                    has2FA
                                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] group-hover:bg-[var(--color-primary-fixed-dim)]'
                                    : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)] group-hover:bg-[var(--color-surface-container-high)] group-hover:border-[var(--color-outline)]'
                                ]"
                            >
                                <div class="handle-container absolute top-0 left-0 h-full w-full pointer-events-none">
                                    <div
                                        class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] shadow-sm"
                                        :class="[
                                            has2FA
                                                ? 'h-[24px] w-[24px] bg-[var(--color-on-primary)] left-[calc(100%-24px-4px)]' 
                                                : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px] group-hover:bg-[var(--color-on-surface-variant)]',
                                            'group-active:h-[28px] group-active:w-[28px]',
                                            has2FA ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                                        ]"
                                    >
                                        <svg v-if="has2FA" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-primary)] opacity-100"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
                                        <svg v-if="!has2FA" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-surface-container-highest)] opacity-100"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
                                    </div>
                                </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </main>
                </div>

                <footer v-if="isFormDirty" class="flex-shrink-0 w-full max-w-3xl mx-auto p-4 md:p-6 bg-[var(--color-background)] border-t border-[var(--color-outline-variant)] flex justify-end space-x-3 transition-opacity duration-300 delay-500 opacity-0" :class="{ '!opacity-100': isAkunOpen }">
                  <button @click="revertChanges" :disabled="isSavingProfile" class="px-5 py-2 rounded-xl font-semibold text-[var(--color-on-surface)] bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] disabled:opacity-50">
                    {{ $t('cancel') }}
                  </button>
                  <button 
                    @click="saveProfile" 
                    :disabled="isSavingProfile || !isFormValid" 
                    class="px-5 py-2 rounded-xl font-semibold text-[var(--color-on-primary)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{{ isSavingProfile ? $t('sending') : $t('save_changes') }}</span>
                  </button>
                </footer>
              </div>
            </Transition>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
