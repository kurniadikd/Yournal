<script setup lang="ts">
import { computed, watch, ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useAuthForm } from '@/composables/useAuthForm';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { storeToRefs } from 'pinia';
import { provide } from 'vue';
import { useRouter } from 'vue-router'; // Import router
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

import TwoFactorAuth from '../2FA.vue';
import Masuk from '../Masuk.vue';
import Daftar from '../Daftar.vue';
import LupaPassword from '../LupaPassword.vue';
import DaftarBerhasil from '../DaftarBerhasil.vue';
import MasukBerhasil from '../MasukBerhasil.vue'; // ADDED
import Footer from '../Footer.vue';

const props = defineProps({
  isPage: {
    type: Boolean,
    default: false,
  },
  initialView: {
    type: String,
    default: 'masuk',
  },
});

const authStore = useAuthStore();
const uiStore = useUIStore();
const settingsStore = useSettingsStore();
const router = useRouter(); // Initialize router

const { activeTab, isFullScreenAuth, showLoginSuccessModal } =
  storeToRefs(uiStore);
const { setShowLoginSuccessModal } = uiStore;

const authForm = useAuthForm();
const { loginSuccess, registerSuccess, is2FARequired } = authForm;

const authView = ref(props.initialView); // Initialize from prop

provide('authForm', authForm);

let closeModalTimeout: any = null;

// Watch activeTab only if NOT in page mode
watch(
  activeTab,
  (newTab) => {
    if (props.isPage) return; // Ignore tab changes if in page mode

    const isActive = newTab === 'auth';
    uiStore.setIsFullScreenAuth(isActive);

    if (isActive) {
      authView.value = 'masuk';
      registerSuccess.value = false;
      loginSuccess.value = false;
      authForm.confirmResetSuccess.value = '';
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
  },
  { immediate: true },
);

// Listen to changes in prop to update view if route params change
watch(
  () => props.initialView,
  (newView) => {
    if (props.isPage && newView) {
      authView.value = newView;
    }
  },
);

watch(
  [loginSuccess, registerSuccess],
  ([isLoginSuccess, isRegisterSuccess]) => {
    clearTimeout(closeModalTimeout);

    if (isLoginSuccess) {
      if (settingsStore) settingsStore.fetchUserSettings();

      // Delay closing/redirecting to show success message
      closeModalTimeout = setTimeout(() => {
        if (props.isPage) {
          router.push('/app');
        } else {
          handleCloseAuth();
        }
      }, 3000);
    } else if (isRegisterSuccess) {
      if (settingsStore) settingsStore.saveUserSettings(); // Save settings immediately on register success

      closeModalTimeout = setTimeout(() => {
        handleSwitchToLogin();
      }, 3000);
    }
  },
);

function handleSwitchToLogin() {
  clearTimeout(closeModalTimeout);
  registerSuccess.value = false;
  loginSuccess.value = false;
  authView.value = 'masuk';

  // If isPage, maybe update URL? Optional but good for consistency.
  if (props.isPage && router.currentRoute.value.path !== '/login') {
    router.replace('/login');
  }
}

onUnmounted(() => {
  clearTimeout(closeModalTimeout);
  if (!props.isPage) {
    document.body.classList.remove('overflow-hidden');
    uiStore.setIsFullScreenAuth(false);
  }
});

const handleCloseAuth = () => {
  if (props.isPage) {
    router.push('/'); // Back to home
  } else {
    uiStore.setActiveTab('konteks');
  }
};

const currentTitle = computed(() => {
  if (authView.value === 'masuk') return t('login');
  if (authView.value === 'daftar') return t('register');
  if (authView.value === 'lupaSandi') return t('reset_password_title');
  return '';
});
</script>

<template>
  <div v-if="activeTab === 'auth' || isPage" 
       class="fixed inset-0 z-50 flex flex-col overflow-y-auto hide-scrollbar"
       :class="{ 'bg-[var(--color-background)]': isPage }"
       :style="{ backgroundColor: 'var(--color-background)' }"
  >
    <div class="flex-1 flex items-start justify-center p-4">
    <div class="w-full max-w-sm">
        
        <div class="flex flex-col items-center my-10">
            <img 
                src="/Leksika_icon.svg" 
                alt="Ikon Leksika" 
                class="w-30 h-30 mb-5 flex-shrink-0"
                onerror="this.onerror=null; this.src='https://placehold.co/32x32/F472B6/FFFFFF?text=L'"
            />
            <img 
                src="/leksika-logo.svg" 
                alt="Logo Utama Leksika" 
                class="h-8 w-auto mb-5 flex-shrink-0 dark:invert"
                onerror="this.onerror=null; this.src='https://placehold.co/120x32/F472B6/FFFFFF?text=LEKSIKA'"
            />
        </div>
        
        
        <div
            class="mx-auto w-full max-w-sm rounded-4xl p-6 transition-all duration-300"
            :style="{ backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-background)' }"
        >
            
            <DaftarBerhasil
              v-if="registerSuccess"
              @switchToLogin="handleSwitchToLogin"
              @close="handleCloseAuth"
            />
            
            <MasukBerhasil
              v-else-if="loginSuccess"
              mode="inline"
              @close="handleCloseAuth"
            />
            
            <TwoFactorAuth
              v-else-if="is2FARequired"
              @back="is2FARequired = false"
            />
            
            <div v-else>
              <div class="relative flex items-center justify-center">
                <h2 class="text-2xl font-bold">{{ currentTitle }}</h2>
                <button @click="handleCloseAuth" class="absolute right-0 top-0 p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <hr class="my-4" :style="{ borderColor: 'var(--color-outline-variant)' }" />
              
              <!-- Update events to handle route switching if needed -->
              <Masuk v-if="authView === 'masuk'" 
                     @switchToRegister="props.isPage ? router.push('/signup') : (authView = 'daftar')" 
                     @switchToForgotPassword="authView = 'lupaSandi'" />
              <Daftar v-else-if="authView === 'daftar'" 
                      @switchToLogin="props.isPage ? router.push('/login') : (authView = 'masuk')" />
              <LupaPassword v-else-if="authView === 'lupaSandi'" 
                            @switchToLogin="props.isPage ? router.push('/login') : (authView = 'masuk')" /> 
            </div>
        </div>
    </div>
    </div>

    <!-- Footer for standalone pages -->
    <Footer v-if="isPage" class="mt-12" />
  </div>
</template>

<style scoped>
.modal-box {
  max-width: 400px;
}

.rounded-4xl {
    border-radius: 2rem;
}

.hide-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
