<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue';
import { useVibrate } from '@vueuse/core';
import { useUIStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

const uiStore = useUIStore();
const authStore = useAuthStore();
const {
  activeTab,
  isSmallScreen,
  isXLargeScreen,
  isLearnViewOpen,
  isNavVisible,
} = storeToRefs(uiStore);

const isAdmin = computed(() => authStore.isAdmin);
const isLoggedIn = computed(() => authStore.isLoggedIn);

const { vibrate } = useVibrate({ pattern: [20] });
const isTextVisible = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

const { t } = useI18n();

const navItems = computed(() => {
  const items = [
    { name: t('learn'), icon: 'cognition_2', tab: 'pelajari' },
    { name: t('context'), icon: 'book_3', tab: 'konteks' },
    { name: t('translator'), icon: 'translate', tab: 'penerjemah' },
    { name: t('profile'), icon: 'account_circle', tab: 'profil' },
  ];

  if (isAdmin.value) {
    items.splice(3, 0, {
      name: t('admin_nav'),
      icon: 'shield_person',
      tab: 'admin',
    });
  }

  return items;
});

const handleTabClick = (tabName: string) => {
  if (tabName === activeTab.value) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (tabName === 'admin' && !isLoggedIn.value) {
    uiStore.openLoginModal();
    return;
  }

  uiStore.setActiveTab(tabName);
  vibrate();

  if (isSmallScreen.value) {
    if (timer) clearTimeout(timer);
    isTextVisible.value = true;
    timer = setTimeout(() => {
      isTextVisible.value = false;
    }, 3000);
  }
};

watch(isXLargeScreen, (newValue) => {
  if (newValue) {
    isTextVisible.value = true;
    if (timer) clearTimeout(timer);
  } else {
    isTextVisible.value = false;
  }
});

onUnmounted(() => {
  if (timer) clearTimeout(timer);
});
</script>

<template>
  <Transition name="slide-in-up">
    <div v-if="isNavVisible" class="fixed z-40 bg-[var(--color-surface-container-high)]
             bottom-0 left-0 right-0 h-16
             md:max-w-lg md:mx-auto md:rounded-t-2xl md:fixed md:bottom-0 md:px-4
             lg:max-w-xl lg:fixed lg:bottom-0
             xl:sticky xl:top-0 xl:h-screen xl:w-64 xl:max-w-none xl:mx-0 xl:rounded-none xl:mb-0
             transition-all duration-300 ease-in-out">

      <nav class="flex h-full items-center justify-around
                   xl:flex-col xl:items-start xl:justify-start xl:py-6 xl:px-4 xl:space-y-4">
        <button v-for="item in navItems" :key="item.tab" @click="handleTabClick(item.tab)" class="flex flex-col items-center justify-center w-full p-2 space-y-1
                   xl:flex-row xl:justify-start xl:space-y-0 xl:space-x-3 xl:py-2 xl:px-3 xl:rounded-xl
                   transition-all duration-300 ease-in-out" :class="activeTab === item.tab
                    ? 'bg-[var(--color-secondary)] rounded-3xl' : 'hover:bg-[var(--color-surface-container)]'"
          :aria-label="t('open_tab', { tab_name: item.name })"
          :aria-current="activeTab === item.tab ? 'page' : undefined">
          <span class="material-symbols-outlined transition-all duration-300 flex items-center justify-center
                        text-2xl xl:text-2xl" :class="{
                          'font-bold text-[var(--color-on-secondary)]': activeTab === item.tab, 'text-[var(--color-on-surface-variant)]': activeTab !== item.tab,
                          'text-3xl': !isTextVisible && isSmallScreen
                        }">
            {{ item.icon }}
          </span>
          <span class="text-xs font-medium transition-all duration-300
                        xl:text-sm xl:opacity-100" :class="{
                          'text-[var(--color-on-secondary)]': activeTab === item.tab, 'text-[var(--color-on-surface-variant)]': activeTab !== item.tab,
                          'opacity-100 h-auto': isTextVisible || !isSmallScreen,
                          'opacity-0 h-0': !isTextVisible && isSmallScreen
                        }">
            {{ item.name }}
          </span>
        </button>
      </nav>
    </div>
  </Transition>
</template>

<style scoped>
.material-symbols-outlined {
  font-variation-settings:
    'FILL' 0,
    'GRAD' 0,
    'opsz' 24;
}

.material-symbols-outlined.font-bold {
  font-variation-settings:
    'FILL' 1,
    'GRAD' 0,
    'opsz' 24;
}

/* Transisi Geser-Keluar untuk Navigasi */
.slide-in-up-enter-active,
.slide-in-up-leave-active {
  transition: transform 0.3s ease-in-out;
}

.slide-in-up-enter-from,
.slide-in-up-leave-to {
  transform: translateY(100%);
}

@media (min-width: 1280px) {

  .slide-in-up-enter-from,
  .slide-in-up-leave-to {
    transform: translateX(-100%);
  }
}
</style>
