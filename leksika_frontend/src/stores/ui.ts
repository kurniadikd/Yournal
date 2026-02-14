import { defineStore } from 'pinia';
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
// 1. Import useBreakpoints dari VueUse
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core';

export const useUIStore = defineStore('ui', () => {
  // --- STATE RESPONSIF (BARU & EFISIEN) ---
  const breakpoints = useBreakpoints(breakpointsTailwind);

  // Definisi Mode UI
  const isMobile = breakpoints.smaller('md'); // < 768px (HP)
  const isTablet = breakpoints.between('md', 'xl'); // 768px - 1280px (Tablet)
  const isDesktop = breakpoints.greaterOrEqual('xl'); // >= 1280px (Desktop / Sidebar Mode)

  // Alias Kompatibilitas (Agar kode di file lain seperti Navigasi.vue tetap jalan)
  const isSmallScreen = isMobile;
  const isXLargeScreen = isDesktop;
  // (Variable isMediumScreen dan isLargeScreen jarang dipakai, jadi bisa kita sederhanakan)

  // --- STATE APPLIKASI ---
  const isSidebarOpen = ref<boolean>(false);
  const isLogoPressed = ref<boolean>(false);
  const isSearchFocused = ref<boolean>(false);
  const activeTab = ref<string>('konteks');
  const isReportModalOpen = ref<boolean>(false);
  const itemToReport = ref<any>(null); // Replace 'any' with specific interface if known

  const activeLearnView = ref<string>('menu');
  const activeProfileView = ref<string>('utama');

  const isAdminEditingMateri = ref<boolean>(false);
  const isFullScreenAuth = ref<boolean>(false);
  const isOnboardingActive = ref<boolean>(false);

  const activeCooldowns = ref<Record<string, number>>({});

  // State for pending narrative navigation (from Disimpan)
  const pendingNarrativeGroupId = ref<string | number | null>(null);

  // State untuk floating search bar
  const floatingState = ref<'docked' | 'floating' | 'hiding'>('docked');
  const containerHeight = ref<number>(0);
  const containerTop = ref<number>(0);
  const lastScrollY = ref<number>(0);

  const historyStyle = ref<Record<string, string>>({});

  // State Modal
  const isPengaturanOpen = ref(false);
  const isPersonalisasiOpen = ref(false);
  const isLoginOpen = ref(false);
  const isAkunOpen = ref(false);
  const isMasukanOpen = ref(false);
  const isLainnyaOpen = ref(false);
  const isInfoAplikasiOpen = ref(false);
  const isColorPaletteOpen = ref(false);
  const isAiLogOpen = ref(false);
  const showLoginSuccessModal = ref(false);

  // Toast State
  const toastMessage = ref<string>('');
  const toastType = ref<'info' | 'success' | 'error' | 'warning'>('info'); // 'info', 'success', 'error', 'warning'
  const isToastVisible = ref<boolean>(false);
  let toastTimeout: ReturnType<typeof setTimeout> | null = null;

  // --- GETTERS (COMPUTED) ---
  const isActionOnCooldown = computed(() => {
    return (featureKey) => {
      const endTime = activeCooldowns.value[featureKey];
      return endTime && Date.now() < endTime;
    };
  });

  const isLearnViewOpen = computed(() => {
    return activeLearnView.value === 'materi';
  });

  // 2. PERBAIKAN LOGIKA NAVIGASI
  const isNavVisible = computed(() => {
    // Sembunyikan Navigasi jika mode Auth Fullscreen aktif
    if (isFullScreenAuth.value) return false;

    // Mode Desktop: Sidebar SELALU muncul (kecuali auth fullscreen)
    if (isDesktop.value) return true;

    // Mode Mobile/Tablet:
    // Sembunyikan jika sedang belajar materi (agar fokus) - TAPI TIDAK untuk admin editing
    if (isLearnViewOpen.value && !isAdminEditingMateri.value) return false;

    // Default Mobile: Tampilkan Bottom Nav
    return true;
  });

  // --- ACTIONS ---
  const setShowLoginSuccessModal = (value) => {
    showLoginSuccessModal.value = value;
  };
  const setIsAdminEditingMateri = (value) => {
    isAdminEditingMateri.value = value;
  };
  const setIsFullScreenAuth = (value) => {
    isFullScreenAuth.value = value;
  };
  const setIsOnboardingActive = (value) => {
    isOnboardingActive.value = value;
  };

  const startCooldown = (featureKey, durationInMs = 30000) => {
    const endTime = Date.now() + durationInMs;
    activeCooldowns.value[featureKey] = endTime;
    setTimeout(() => {
      delete activeCooldowns.value[featureKey];
    }, durationInMs);
  };

  const openReportModal = (item) => {
    itemToReport.value = item;
    isReportModalOpen.value = true;
  };
  const closeReportModal = () => {
    isReportModalOpen.value = false;
    setTimeout(() => {
      itemToReport.value = null;
    }, 300);
  };

  const toggleSidebar = (value?: boolean) => {
    if (typeof value === 'boolean') {
      isSidebarOpen.value = value;
    } else {
      isSidebarOpen.value = !isSidebarOpen.value;
    }
  };
  const handleLogoClick = () => {
    isLogoPressed.value = true;
    setTimeout(() => window.location.reload(), 150);
  };

  const setSearchFocus = (value) => {
    isSearchFocused.value = value;
  };
  const setActiveTab = (tabName) => {
    activeTab.value = tabName;
  };
  const setActiveLearnView = (view) => {
    activeLearnView.value = view;
  };
  const setActiveProfileView = (view) => {
    activeProfileView.value = view;
  };
  const setActiveNarrativeGroupId = (groupId) => {
    pendingNarrativeGroupId.value = groupId;
  };

  const initializeFloatingSearch = (containerElement: HTMLElement | null, wrapperElement: HTMLElement | null) => {
    if (!containerElement || !wrapperElement) return;
    lastScrollY.value = window.scrollY;
    nextTick(() => {
      if (containerElement && wrapperElement) {
        containerTop.value = containerElement.offsetTop;
        containerHeight.value = wrapperElement.offsetHeight;
      }
    });
  };
  const handleScroll = () => {
    if (isSearchFocused.value) {
      if (floatingState.value !== 'docked') floatingState.value = 'floating';
      return;
    }
    const currentScrollY = window.scrollY;
    if (currentScrollY <= containerTop.value) {
      floatingState.value = 'docked';
    } else {
      floatingState.value =
        currentScrollY < lastScrollY.value ? 'floating' : 'hiding';
    }
    lastScrollY.value = currentScrollY;
  };
  const adjustContainerHeight = (wrapperElement: HTMLElement | null) => {
    if (wrapperElement) {
      containerHeight.value = wrapperElement.offsetHeight;
    }
  };

  const updateHistoryPosition = (searchBarElement) => {
    if (!searchBarElement) return;
    const rect = searchBarElement.getBoundingClientRect();
    historyStyle.value = {
      position: 'fixed',
      width: `${rect.width}px`,
      top: `${rect.bottom + 8}px`,
      left: `${rect.left}px`,
      zIndex: '20',
    };
  };

  const openPengaturanModal = () => {
    isPengaturanOpen.value = true;
  };
  const closePengaturanModal = () => {
    isPengaturanOpen.value = false;
  };
  const openPersonalisasiModal = () => {
    isPersonalisasiOpen.value = true;
  };
  const closePersonalisasiModal = () => {
    isPersonalisasiOpen.value = false;
  };
  const openLoginModal = () => {
    isLoginOpen.value = true;
  };
  const closeLoginModal = () => {
    isLoginOpen.value = false;
  };
  const openAkunModal = () => {
    isAkunOpen.value = true;
  };
  const closeAkunModal = () => {
    isAkunOpen.value = false;
  };
  const openMasukanModal = () => {
    isMasukanOpen.value = true;
  };
  const closeMasukanModal = () => {
    isMasukanOpen.value = false;
  };
  const openLainnyaModal = () => {
    isLainnyaOpen.value = true;
  };
  const closeLainnyaModal = () => {
    isLainnyaOpen.value = false;
  };
  const openInfoAplikasiModal = () => {
    isInfoAplikasiOpen.value = true;
  };
  const closeInfoAplikasiModal = () => {
    isInfoAplikasiOpen.value = false;
  };
  const toggleColorPalette = () => {
    isColorPaletteOpen.value = !isColorPaletteOpen.value;
  };
  const closeColorPalette = () => {
    isColorPaletteOpen.value = false;
  };
  const toggleAiLog = () => {
    isAiLogOpen.value = !isAiLogOpen.value;
  };
  const closeAiLog = () => {
    isAiLogOpen.value = false;
  };

  // Toast Functions
  const showToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration = 3000) => {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastMessage.value = message;
    toastType.value = type;
    isToastVisible.value = true;
    toastTimeout = setTimeout(() => {
      isToastVisible.value = false;
    }, duration);
  };

  const hideToast = () => {
    if (toastTimeout) clearTimeout(toastTimeout);
    isToastVisible.value = false;
  };

  // --- 3. MENGHAPUS EVENT LISTENER MANUAL ---
  // Logika window.addEventListener('resize') dihapus karena useBreakpoints sudah otomatis.

  return {
    // State Responsif Baru
    isMobile,
    isTablet,
    isDesktop,
    // State Kompatibilitas (Agar kode lama tidak error)
    isSmallScreen,
    isXLargeScreen,

    // State Lainnya
    isSidebarOpen,
    isLogoPressed,
    isSearchFocused,
    activeTab,
    activeLearnView,
    activeProfileView,
    isAdminEditingMateri,
    floatingState,
    containerHeight,
    historyStyle,
    isPengaturanOpen,
    isPersonalisasiOpen,
    isLoginOpen,
    isAkunOpen,
    isMasukanOpen,
    isLainnyaOpen,
    isInfoAplikasiOpen,
    isReportModalOpen,
    itemToReport,
    activeCooldowns,
    isFullScreenAuth,
    isOnboardingActive,
    isColorPaletteOpen,
    isAiLogOpen,
    showLoginSuccessModal,
    pendingNarrativeGroupId,
    // Toast State
    toastMessage,
    toastType,
    isToastVisible,

    // Getters
    isActionOnCooldown,
    isLearnViewOpen,
    isNavVisible,

    // Actions
    toggleSidebar,
    handleLogoClick,
    setSearchFocus,
    setActiveTab,
    setActiveLearnView,
    setActiveProfileView,
    setActiveNarrativeGroupId,
    setIsAdminEditingMateri,
    setIsFullScreenAuth,
    setIsOnboardingActive,
    initializeFloatingSearch,
    handleScroll,
    adjustContainerHeight,
    updateHistoryPosition,
    openPengaturanModal,
    closePengaturanModal,
    openPersonalisasiModal,
    closePersonalisasiModal,
    openLoginModal,
    closeLoginModal,
    openAkunModal,
    closeAkunModal,
    openMasukanModal,
    closeMasukanModal,
    openLainnyaModal,
    closeLainnyaModal,
    openInfoAplikasiModal,
    closeInfoAplikasiModal,
    startCooldown,
    openReportModal,
    closeReportModal,
    toggleColorPalette,
    closeColorPalette,
    toggleAiLog,
    closeAiLog,
    setShowLoginSuccessModal,
    // Toast Actions
    showToast,
    hideToast,
  };
});
