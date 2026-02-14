<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useLanguageStore } from '@/stores/language';
import { useUIStore } from '@/stores/ui';
import {
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
  ListboxLabel,
} from '@headlessui/vue';
import { api } from '@/utils/api';
import Header from '@/components/Header.vue';
import Footer from '@/components/Footer.vue';
import { useI18n } from 'vue-i18n';
import { useSession } from '@/utils/session'; // ADDED

import TurnstileWidget from '@/components/TurnstileWidget.vue';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const languageStore = useLanguageStore();
const uiStore = useUIStore();

const selectedTabIndex = ref(0);
const submissionState = ref< 'idle' | 'submitting' | 'success' >('idle'); // 'idle', 'submitting', 'success'

// Form Fields - Feedback
const selectedFeedbackType = ref<any>(null);
const customFeedbackType = ref('');
const feedbackDetails = ref('');
const feedbackFile = ref<File | null>(null);
const feedbackFileError = ref('');
const feedbackFileInput = ref<HTMLInputElement | null>(null);

// Form Fields - Support
const selectedSupportCategory = ref<any>(null);
const supportSubject = ref('');
const supportDetails = ref('');
const supportFile = ref<File | null>(null);
const supportFileError = ref('');
const supportFileInput = ref<HTMLInputElement | null>(null);

// Shared Fields
const userEmail = ref('');
const agreeToTerms = ref(false);
const { isSessionValidated } = useSession(); // UPDATED

const feedbackTypes = computed(() => [
  { id: 'bug', labelKey: 'contact_feedback_type_bug' },
  { id: 'suggestion', labelKey: 'contact_feedback_type_suggestion' },
  { id: 'general', labelKey: 'contact_feedback_type_general' },
  { id: 'other', labelKey: 'contact_feedback_type_other' },
]);

const supportCategories = computed(() => [
  { id: 'account_security', labelKey: 'contact_support_category_security' },
  { id: 'policy', labelKey: 'contact_support_category_policy' },
  { id: 'business', labelKey: 'contact_support_category_business' },
  { id: 'urgent', labelKey: 'contact_support_category_urgent' },
  { id: 'other', labelKey: 'contact_support_category_other' },
]);

const isFeedbackDisabled = computed(() => {
  if (submissionState.value === 'submitting') return true;
  if (!selectedFeedbackType.value) return true;
  if (
    selectedFeedbackType.value?.id === 'other' &&
    !customFeedbackType.value.trim()
  )
    return true;
  if (!feedbackDetails.value.trim()) return true;
  if (wordCount(feedbackDetails.value) < 5) return true;
  if (!userEmail.value.trim()) return true;
  if (!isValidEmail(userEmail.value)) return true;
  if (!agreeToTerms.value) return true;
  if (!isSessionValidated.value) return true;
  return false;
});

const isSupportDisabled = computed(() => {
  if (submissionState.value === 'submitting') return true;
  if (!selectedSupportCategory.value) return true;
  if (!supportSubject.value.trim()) return true;
  if (!supportDetails.value.trim()) return true;
  if (wordCount(supportDetails.value) < 5) return true;
  if (!userEmail.value.trim()) return true;
  if (!isValidEmail(userEmail.value)) return true;
  if (!agreeToTerms.value) return true;
  if (!isSessionValidated.value) return true;
  return false;
});

onMounted(() => {
  if (authStore.isLoggedIn) {
    userEmail.value = authStore.user?.email || '';
  }
});

// Utils
function wordCount(str: string) {
  return str
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const getTrackingMetadata = () => ({
  // Device & Browser
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  language: navigator.language,
  languages: navigator.languages?.join(', ') || navigator.language,
  cookieEnabled: navigator.cookieEnabled,
  doNotTrack: navigator.doNotTrack,

  // Screen & Viewport
  viewport: { width: window.innerWidth, height: window.innerHeight },
  screenResolution: { width: screen.width, height: screen.height },
  colorDepth: screen.colorDepth,
  pixelRatio: window.devicePixelRatio,

  // Time & Timezone
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  timezoneOffset: new Date().getTimezoneOffset(),
  localTime: new Date().toISOString(),

  // Page & Navigation
  url: window.location.href,
  referrer: document.referrer || null,
  pathname: window.location.pathname,

  // App State
  theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  appLanguage: languageStore.selectedAsal?.kodeBahasa || 'id',
  targetLanguage: languageStore.selectedTarget?.kodeBahasa || null,

  // User State
  isLoggedIn: authStore.isLoggedIn,
  userId: authStore.user?.id || null,
  username: authStore.user?.username || null,

  // Connection
  connectionType: (navigator as any).connection?.effectiveType || null,
  onLine: navigator.onLine,
});

// File Handling
const maxFileSize = 5 * 1024 * 1024; // 5MB

function validateFile(file: File | null) {
  if (!file) return { valid: false, error: '' };
  if (file.size > maxFileSize)
    return { valid: false, error: t('contact_attachment_error_size') };
  if (!file.type.startsWith('image/'))
    return { valid: false, error: t('contact_attachment_error_type') };
  return { valid: true, error: '' };
}

function handleFeedbackFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const { valid, error } = validateFile(file);
  if (valid) {
    feedbackFile.value = file;
    feedbackFileError.value = '';
  } else {
    feedbackFileError.value = error;
  }
}

function handleSupportFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const { valid, error } = validateFile(file);
  if (valid) {
    supportFile.value = file;
    supportFileError.value = '';
  } else {
    supportFileError.value = error;
  }
}

function handleFeedbackDrop(event: DragEvent) {
  const file = event.dataTransfer?.files[0];
  if (!file) return;
  const { valid, error } = validateFile(file);
  if (valid) {
    feedbackFile.value = file;
    feedbackFileError.value = '';
  } else {
    feedbackFileError.value = error;
  }
}

function handleSupportDrop(event: DragEvent) {
  const file = event.dataTransfer?.files[0];
  if (!file) return;
  const { valid, error } = validateFile(file);
  if (valid) {
    supportFile.value = file;
    supportFileError.value = '';
  } else {
    supportFileError.value = error;
  }
}

function removeFeedbackFile() {
  feedbackFile.value = null;
  feedbackFileError.value = '';
  if (feedbackFileInput.value) feedbackFileInput.value.value = '';
}

function removeSupportFile() {
  supportFile.value = null;
  supportFileError.value = '';
  if (supportFileInput.value) supportFileInput.value.value = '';
}

async function handleFeedbackSubmit() {
  if (isFeedbackDisabled.value) return;
  submissionState.value = 'submitting';

  const feedbackTypeId =
    selectedFeedbackType.value.id === 'other'
      ? `OTHER: ${customFeedbackType.value}`
      : selectedFeedbackType.value.id.toUpperCase();

  const payload = {
    type: 'feedback',
    feedback_type: feedbackTypeId,
    details: feedbackDetails.value,
    email: userEmail.value,
    metadata: getTrackingMetadata(),
  };

  const formData = new FormData();
  formData.append('data', JSON.stringify(payload));
  if (feedbackFile.value) {
    formData.append('attachment', feedbackFile.value);
  }

  try {
    await api.post('/feedback/', formData);
    submissionState.value = 'success';
  } catch (error) {
    console.error('Gagal mengirim masukan:', error);
    alert('Terjadi kesalahan saat mengirim masukan. Silakan coba lagi.');
    submissionState.value = 'idle';
  }
}

async function handleSupportSubmit() {
  if (isSupportDisabled.value) return;
  submissionState.value = 'submitting';

  // Gabungkan metadata tracking dengan informasi support
  const metadata = {
    ...getTrackingMetadata(),
    support_category: selectedSupportCategory.value.id.toUpperCase(),
    support_subject: supportSubject.value,
  };

  const payload = {
    feedback_type: 'GENERAL', // [PERBAIKAN] Backend hanya menerima: BUG, SUGGESTION, GENERAL, REPORT
    details: `[${selectedSupportCategory.value.id.toUpperCase()}] ${supportSubject.value}\n\n${supportDetails.value}`,
    email: userEmail.value,
    metadata: metadata,
  };

  const formData = new FormData();
  formData.append('data', JSON.stringify(payload));
  if (supportFile.value) {
    formData.append('attachment', supportFile.value);
  }

  try {
    await api.post('/feedback/', formData);
    submissionState.value = 'success';
  } catch (error) {
    console.error('Gagal mengirim dukungan:', error);
    alert('Terjadi kesalahan saat mengirim permintaan. Silakan coba lagi.');
    submissionState.value = 'idle';
  }
}

function resetForm() {
  selectedFeedbackType.value = null;
  customFeedbackType.value = '';
  feedbackDetails.value = '';
  feedbackFile.value = null;
  feedbackFileError.value = '';
  if (feedbackFileInput.value) feedbackFileInput.value.value = '';

  selectedSupportCategory.value = null;
  supportSubject.value = '';
  supportDetails.value = '';
  supportFile.value = null;
  supportFileError.value = '';
  if (supportFileInput.value) supportFileInput.value.value = '';

  agreeToTerms.value = false;
  submissionState.value = 'idle';
  if (!authStore.isLoggedIn) {
    userEmail.value = '';
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[var(--color-background)]">
    <!-- Header -->
    <Header />

    <!-- Main Content -->
    <main class="flex-grow">
      <section class="py-12 md:py-20">
        <div class="container mx-auto px-4 md:px-8 max-w-2xl">
          <div class="bg-[var(--color-surface-container-high)] rounded-3xl p-6 md:p-8 shadow-lg">
            
            <!-- Success State -->
            <div v-if="submissionState === 'success'" class="flex flex-col items-center justify-center text-center py-12">
              <svg class="checkmark h-20 w-20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
              <h2 class="text-2xl font-bold text-[var(--color-on-background)] mt-6">
                {{ selectedTabIndex === 0 ? $t('contact_feedback_success_title') : $t('contact_support_success_title') }}
              </h2>
              <p class="mt-2 text-[var(--color-on-surface-variant)] max-w-sm">
                {{ selectedTabIndex === 0 ? $t('contact_feedback_success_msg') : $t('contact_support_success_msg') }}
              </p>
              
              <div class="flex gap-3 mt-8">
                <button @click="resetForm" class="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-6 py-3 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]">
                  {{ $t('contact_btn_send_again') }}
                </button>
                <button @click="router.push('/')" class="rounded-xl bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-fixed-dim)]">
                  {{ $t('contact_btn_go_home') }}
                </button>
              </div>
            </div>

            <!-- Form State -->
            <div v-else>
              <!-- Header -->
              <div class="text-center mb-6">
                <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-primary-container)] flex items-center justify-center">
                  <span class="material-symbols-outlined text-3xl text-[var(--color-on-primary-container)]">contact_support</span>
                </div>
                <h2 class="text-2xl md:text-3xl font-bold text-[var(--color-on-background)]">{{ $t('contact_title') }}</h2>
              </div>

              <!-- Tabs -->
              <TabGroup :selectedIndex="selectedTabIndex" @change="selectedTabIndex = $event">
                <TabList class="flex gap-2 p-1 rounded-xl bg-[var(--color-surface-container)] mb-6">
                  <Tab v-slot="{ selected }" as="template">
                    <button
                      :class="[
                        'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200',
                        selected 
                          ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-md' 
                          : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'
                      ]"
                    >
                      <span class="material-symbols-outlined text-lg">rate_review</span>
                      {{ $t('contact_tab_feedback') }}
                    </button>
                  </Tab>
                  <Tab v-slot="{ selected }" as="template">
                    <button
                      :class="[
                        'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200',
                        selected 
                          ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-md' 
                          : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'
                      ]"
                    >
                      <span class="material-symbols-outlined text-lg">support_agent</span>
                      {{ $t('contact_tab_support') }}
                    </button>
                  </Tab>
                </TabList>

                <TabPanels>
                  <!-- Panel Masukan -->
                  <TabPanel>
                    <p class="text-sm text-[var(--color-on-surface-variant)] text-center mb-6">
                      {{ $t('contact_feedback_desc') }}
                    </p>

                    <form @submit.prevent="handleFeedbackSubmit" class="space-y-5">
                      <!-- Email -->
                      <div>
                        <label for="feedback-email" class="block text-sm font-medium text-[var(--color-on-surface-variant)]">
                          {{ $t('contact_email_label') }} <span class="text-[var(--color-error)]">*</span>
                        </label>
                        <div class="relative mt-1">
                          <span class="absolute inset-y-0 left-0 flex items-center pl-3">
                            <span class="material-symbols-outlined text-lg text-[var(--color-outline)]">alternate_email</span>
                          </span>
                          <input 
                            id="feedback-email" 
                            type="email" 
                            v-model="userEmail"
                            :disabled="authStore.isLoggedIn && authStore.user?.email"
                            class="w-full pl-10 pr-4 py-3 border rounded-xl bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            :placeholder="$t('contact_email_placeholder')"
                          />
                          <span v-if="authStore.isLoggedIn && authStore.user?.email" class="absolute inset-y-0 right-0 flex items-center pr-3">
                            <span class="material-symbols-outlined text-lg text-[var(--color-tertiary)]">verified</span>
                          </span>
                        </div>
                        <p v-if="userEmail.trim() && !isValidEmail(userEmail)" class="text-xs text-[var(--color-error)] mt-1">
                          {{ $t('contact_email_invalid') }}
                        </p>
                      </div>

                      <!-- Jenis Masukan -->
                      <Listbox v-model="selectedFeedbackType">
                        <ListboxLabel class="block text-sm font-medium text-[var(--color-on-surface-variant)]">
                          {{ $t('contact_feedback_type_label') }} <span class="text-[var(--color-error)]">*</span>
                        </ListboxLabel>
                        <div class="relative mt-1">
                          <ListboxButton class="relative w-full cursor-pointer rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] py-3 pl-4 pr-10 text-left text-[var(--color-on-surface)] shadow-sm transition focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] text-sm">
                            <span class="block truncate">{{ selectedFeedbackType ? $t(selectedFeedbackType.labelKey) : $t('contact_feedback_type_placeholder') }}</span>
                            <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                              <span class="material-symbols-outlined text-[var(--color-on-surface-variant)]">unfold_more</span>
                            </span>
                          </ListboxButton>
                          <transition leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
                            <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-[var(--color-surface-container-highest)] py-1 shadow-lg ring-1 ring-[var(--color-outline-variant)] focus:outline-none text-sm">
                              <ListboxOption v-for="type in feedbackTypes" :key="type.id" :value="type" v-slot="{ active, selected }" as="template">
                                <li :class="[active ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]' : 'text-[var(--color-on-surface)]', 'relative cursor-pointer select-none py-3 pl-10 pr-4 transition-colors']">
                                  <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ $t(type.labelKey) }}</span>
                                  <span v-if="selected" class="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-primary)]">
                                    <span class="material-symbols-outlined text-xl">check</span>
                                  </span>
                                </li>
                              </ListboxOption>
                            </ListboxOptions>
                          </transition>
                        </div>
                      </Listbox>

                      <!-- Custom Type -->
                      <div v-if="selectedFeedbackType?.id === 'other'">
                        <label for="customType" class="block text-sm font-medium text-[var(--color-on-surface-variant)]">
                          {{ $t('contact_custom_type_label') }} <span class="text-[var(--color-error)]">*</span>
                        </label>
                        <input 
                          id="customType" v-model="customFeedbackType"
                          class="mt-1 w-full px-4 py-3 border rounded-xl bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                          :placeholder="$t('contact_custom_type_placeholder')"
                        />
                      </div>

                      <!-- Detail -->
                      <div>
                        <label for="feedback-details" class="block text-sm font-medium text-[var(--color-on-surface-variant)]">
                          {{ $t('contact_feedback_details_label') }} <span class="text-[var(--color-error)]">*</span>
                          <span class="text-xs font-normal ml-1 text-[var(--color-outline)]">({{ $t('contact_min_words') }})</span>
                        </label>
                        <textarea 
                          id="feedback-details" v-model="feedbackDetails" rows="4"
                          class="mt-1 w-full px-4 py-3 border rounded-xl bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                          :placeholder="$t('contact_feedback_details_placeholder')"
                        ></textarea>
                        <p class="text-xs mt-1" :class="feedbackDetails.trim() && wordCount(feedbackDetails) < 5 ? 'text-[var(--color-error)]' : 'text-[var(--color-outline)]'">
                          {{ $t('contact_word_count', { count: wordCount(feedbackDetails) }) }}
                        </p>
                      </div>

                      <!-- Attachment (Optional) -->
                      <div>
                        <label class="block text-sm font-medium text-[var(--color-on-surface-variant)]">
                          {{ $t('contact_attachment_label') }} <span class="text-[var(--color-outline)] font-normal text-xs">{{ $t('contact_attachment_optional') }}</span>
                        </label>
                        <div 
                          class="mt-1 border-2 border-dashed border-[var(--color-outline-variant)] rounded-xl p-4 text-center cursor-pointer transition-colors hover:bg-[var(--color-surface-container)]"
                          @drop.prevent="handleFeedbackDrop" 
                          @dragover.prevent 
                          @click="feedbackFileInput.click()"
                        >
                          <input type="file" ref="feedbackFileInput" class="hidden" accept="image/*" @change="handleFeedbackFileSelect" />
                          
                          <div v-if="feedbackFile" class="flex items-center justify-between bg-[var(--color-surface-container-highest)] p-2 rounded-lg">
                             <div class="flex items-center gap-2 overflow-hidden">
                                <span class="material-symbols-outlined text-[var(--color-primary)]">image</span>
                                <span class="text-sm text-[var(--color-on-surface)] truncate">{{ feedbackFile.name }}</span>
                             </div>
                             <button type="button" @click.stop="removeFeedbackFile" class="p-1 rounded-full hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)] text-[var(--color-on-surface-variant)] transition-colors" :title="$t('contact_remove_file')">
                                <span class="material-symbols-outlined text-lg">close</span>
                             </button>
                          </div>
                          
                          <div v-else class="text-[var(--color-on-surface-variant)] py-4">
                            <span class="material-symbols-outlined text-3xl mb-2 text-[var(--color-outline)]">cloud_upload</span>
                            <p class="text-sm font-medium">{{ $t('contact_drag_drop') }}</p>
                            <p class="text-xs text-[var(--color-outline)] mt-1">{{ $t('contact_attachment_hint') }}</p>
                          </div>
                        </div>
                        <p v-if="feedbackFileError" class="text-xs text-[var(--color-error)] mt-1">{{ feedbackFileError }}</p>
                      </div>

                      <!-- Consent -->
                      <div class="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-surface-container)]">
                        <input id="feedback-consent" type="checkbox" v-model="agreeToTerms" class="mt-0.5 w-5 h-5 rounded cursor-pointer accent-[var(--color-primary)]" />
                        <label for="feedback-consent" class="text-sm text-[var(--color-on-surface-variant)] cursor-pointer">
                          {{ $t('contact_consent_text') }}
                          <router-link to="/privacy" class="text-[var(--color-primary)] hover:underline">{{ $t('contact_privacy_policy') }}</router-link>.
                        </label>
                      </div>

                      <!-- Visible Turnstile Widget -->
                      <div class="flex justify-center py-2">
                        <TurnstileWidget :show-status="true" />
                      </div>

                      <!-- Buttons -->
                      <div class="flex gap-3 pt-2">
                        <button type="button" class="flex-1 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-3 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]" @click="router.back()">
                          {{ $t('contact_btn_back') }}
                        </button>
                        <button type="submit" :disabled="isFeedbackDisabled" class="flex-1 rounded-xl bg-[var(--color-primary)] px-4 py-3 font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-fixed-dim)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                          <span v-if="submissionState === 'submitting'" class="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                          {{ submissionState === 'submitting' ? $t('contact_sending') : $t('contact_btn_send_feedback') }}
                        </button>
                      </div>
                    </form>
                  </TabPanel>

                  <!-- Panel Dukungan -->
                  <TabPanel>
                    <p class="text-sm text-[var(--color-on-surface-variant)] text-center mb-6">
                      {{ $t('contact_support_desc') }}
                    </p>

                    <form @submit.prevent="handleSupportSubmit" class="space-y-5">
                      <!-- Email -->
                      <div>
                        <label for="support-email" class="block text-sm font-medium text-[var(--color-on-surface-variant)]">
                          {{ $t('contact_email_label') }} <span class="text-[var(--color-error)]">*</span>
                        </label>
                        <div class="relative mt-1">
                          <span class="absolute inset-y-0 left-0 flex items-center pl-3">
                            <span class="material-symbols-outlined text-lg text-[var(--color-outline)]">alternate_email</span>
                          </span>
                          <input 
                            id="support-email" 
                            type="email" 
                            v-model="userEmail"
                            :disabled="authStore.isLoggedIn && authStore.user?.email"
                            class="w-full pl-10 pr-4 py-3 border rounded-xl bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            :placeholder="$t('contact_email_placeholder')"
                          />
                          <span v-if="authStore.isLoggedIn && authStore.user?.email" class="absolute inset-y-0 right-0 flex items-center pr-3">
                            <span class="material-symbols-outlined text-lg text-[var(--color-tertiary)]">verified</span>
                          </span>
                        </div>
                        <p v-if="userEmail.trim() && !isValidEmail(userEmail)" class="text-xs text-[var(--color-error)] mt-1">
                          {{ $t('contact_email_invalid') }}
                        </p>
                      </div>

                      <!-- Kategori -->
                      <Listbox v-model="selectedSupportCategory">
                        <ListboxLabel class="block text-sm font-medium text-[var(--color-on-surface-variant)]">
                          {{ $t('contact_support_category_label') }} <span class="text-[var(--color-error)]">*</span>
                        </ListboxLabel>
                        <div class="relative mt-1">
                          <ListboxButton class="relative w-full cursor-pointer rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] py-3 pl-4 pr-10 text-left text-[var(--color-on-surface)] shadow-sm transition focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] text-sm">
                            <span class="block truncate">{{ selectedSupportCategory ? $t(selectedSupportCategory.labelKey) : $t('contact_support_category_placeholder') }}</span>
                            <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                              <span class="material-symbols-outlined text-[var(--color-on-surface-variant)]">unfold_more</span>
                            </span>
                          </ListboxButton>
                          <transition leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
                            <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-[var(--color-surface-container-highest)] py-1 shadow-lg ring-1 ring-[var(--color-outline-variant)] focus:outline-none text-sm">
                              <ListboxOption v-for="cat in supportCategories" :key="cat.id" :value="cat" v-slot="{ active, selected }" as="template">
                                <li :class="[active ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]' : 'text-[var(--color-on-surface)]', 'relative cursor-pointer select-none py-3 pl-10 pr-4 transition-colors']">
                                  <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ $t(cat.labelKey) }}</span>
                                  <span v-if="selected" class="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-primary)]">
                                    <span class="material-symbols-outlined text-xl">check</span>
                                  </span>
                                </li>
                              </ListboxOption>
                            </ListboxOptions>
                          </transition>
                        </div>
                      </Listbox>

                      <!-- Subjek -->
                      <div>
                        <label for="support-subject" class="block text-sm font-medium text-[var(--color-on-surface-variant)]">
                          {{ $t('contact_support_subject_label') }} <span class="text-[var(--color-error)]">*</span>
                        </label>
                        <input 
                          id="support-subject" v-model="supportSubject"
                          class="mt-1 w-full px-4 py-3 border rounded-xl bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                          :placeholder="$t('contact_support_subject_placeholder')"
                        />
                      </div>

                      <!-- Detail -->
                      <div>
                        <label for="support-details" class="block text-sm font-medium text-[var(--color-on-surface-variant)]">
                          {{ $t('contact_support_details_label') }} <span class="text-[var(--color-error)]">*</span>
                          <span class="text-xs font-normal ml-1 text-[var(--color-outline)]">({{ $t('contact_min_words') }})</span>
                        </label>
                        <textarea 
                          id="support-details" v-model="supportDetails" rows="5"
                          class="mt-1 w-full px-4 py-3 border rounded-xl bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                          :placeholder="$t('contact_support_details_placeholder')"
                        ></textarea>
                        <p class="text-xs mt-1" :class="supportDetails.trim() && wordCount(supportDetails) < 5 ? 'text-[var(--color-error)]' : 'text-[var(--color-outline)]'">
                          {{ $t('contact_word_count', { count: wordCount(supportDetails) }) }}
                        </p>
                      </div>

                      <!-- Attachment (Optional) -->
                      <div>
                        <label class="block text-sm font-medium text-[var(--color-on-surface-variant)]">
                          {{ $t('contact_attachment_label') }} <span class="text-[var(--color-outline)] font-normal text-xs">{{ $t('contact_attachment_optional') }}</span>
                        </label>
                        <div 
                          class="mt-1 border-2 border-dashed border-[var(--color-outline-variant)] rounded-xl p-4 text-center cursor-pointer transition-colors hover:bg-[var(--color-surface-container)]"
                          @drop.prevent="handleSupportDrop" 
                          @dragover.prevent 
                          @click="supportFileInput.click()"
                        >
                          <input type="file" ref="supportFileInput" class="hidden" accept="image/*" @change="handleSupportFileSelect" />
                          
                          <div v-if="supportFile" class="flex items-center justify-between bg-[var(--color-surface-container-highest)] p-2 rounded-lg">
                             <div class="flex items-center gap-2 overflow-hidden">
                                <span class="material-symbols-outlined text-[var(--color-primary)]">image</span>
                                <span class="text-sm text-[var(--color-on-surface)] truncate">{{ supportFile.name }}</span>
                             </div>
                             <button type="button" @click.stop="removeSupportFile" class="p-1 rounded-full hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)] text-[var(--color-on-surface-variant)] transition-colors" :title="$t('contact_remove_file')">
                                <span class="material-symbols-outlined text-lg">close</span>
                             </button>
                          </div>
                          
                          <div v-else class="text-[var(--color-on-surface-variant)] py-4">
                            <span class="material-symbols-outlined text-3xl mb-2 text-[var(--color-outline)]">cloud_upload</span>
                            <p class="text-sm font-medium">{{ $t('contact_drag_drop') }}</p>
                            <p class="text-xs text-[var(--color-outline)] mt-1">{{ $t('contact_attachment_hint') }}</p>
                          </div>
                        </div>
                        <p v-if="supportFileError" class="text-xs text-[var(--color-error)] mt-1">{{ supportFileError }}</p>
                      </div>

                      <!-- Consent -->
                      <div class="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-surface-container)]">
                        <input id="support-consent" type="checkbox" v-model="agreeToTerms" class="mt-0.5 w-5 h-5 rounded cursor-pointer accent-[var(--color-primary)]" />
                        <label for="support-consent" class="text-sm text-[var(--color-on-surface-variant)] cursor-pointer">
                          {{ $t('contact_consent_text') }}
                          <router-link to="/privacy" class="text-[var(--color-primary)] hover:underline">{{ $t('contact_privacy_policy') }}</router-link>.
                        </label>
                      </div>

                      <!-- Visible Turnstile Widget -->
                      <div class="flex justify-center py-2">
                        <TurnstileWidget :show-status="true" />
                      </div>

                      <!-- Buttons -->
                      <div class="flex gap-3 pt-2">
                        <button type="button" class="flex-1 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-3 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]" @click="router.back()">
                          {{ $t('contact_btn_back') }}
                        </button>
                        <button type="submit" :disabled="isSupportDisabled" class="flex-1 rounded-xl bg-[var(--color-primary)] px-4 py-3 font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-fixed-dim)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                          <span v-if="submissionState === 'submitting'" class="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                          {{ submissionState === 'submitting' ? $t('contact_sending') : $t('contact_btn_send_support') }}
                        </button>
                      </div>
                    </form>
                  </TabPanel>
                </TabPanels>
              </TabGroup>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <Footer />
  </div>
</template>

<style scoped>
.checkmark__circle {
  stroke-dasharray: 166;
  stroke-dashoffset: 166;
  stroke-width: 2;
  stroke-miterlimit: 10;
  stroke: var(--color-primary);
  fill: none;
  animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}

.checkmark {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: block;
  stroke-width: 2;
  stroke: var(--color-on-primary);
  stroke-miterlimit: 10;
  margin: 0 auto;
  box-shadow: inset 0px 0px 0px var(--color-primary);
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
    box-shadow: inset 0px 0px 0px 40px var(--color-primary);
  }
}
</style>
