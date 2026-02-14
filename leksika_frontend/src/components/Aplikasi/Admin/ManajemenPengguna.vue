<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useUsers, useUserMutation } from '@/composables/useUsers';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';
import UserAvatar from '@/components/UserAvatar.vue';
import DetailPengguna from './DetailPengguna.vue';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';
import { useDebounceFn } from '@vueuse/core';
import { api } from '@/utils/api';

// --- INTERFACES ---
interface User {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  is_active?: boolean;
  is_superuser?: boolean;
  account_status?: string;
  last_seen?: string;
  date_joined?: string;
  avatar?: string;
  owned_referral_code?: string;
  referred_by_code?: string;
  is_online?: boolean;
  is_deleted?: boolean;
  gender?: string;
  profile?: {
    account_type?: string;
    gender?: string;
    last_seen?: string;
    [key: string]: any;
  };
  avatar_exif?: any;
  [key: string]: any;
}

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const authStore = useAuthStore();
const { user: loggedInUser } = storeToRefs(authStore);

// State for table controls
const currentPage = ref(1);
const sortKey = ref<string>('date_joined');
const sortOrder = ref<'asc' | 'desc'>('desc');
const searchQuery = ref('');

// --- STATE UI ---
const isSearchFocused = ref(false);
const scrollContainer = ref<HTMLElement | null>(null); // Ref untuk container scroll pagination

// State for the new DetailPengguna modal
const isDetailModalOpen = ref(false);
const isEditMode = ref(false);
const selectedUser = ref<User | null>(null);
const isLoadingDetails = ref(false);

// State for block confirmation modal
const isBlockConfirmModalOpen = ref(false);
const userToBlock = ref<User | null>(null);

// State for avatar preview modal
const isAvatarPreviewOpen = ref(false);
const avatarPreviewData = ref<any>(null);
const isLoadingAvatar = ref(false);

// State for fullscreen image viewer (simplified)
const isFullscreenViewOpen = ref(false);
const fullscreenImageUrl = ref<string | null>(null);

let refreshInterval: number | null = null;

const ordering = computed(() => {
  if (!sortKey.value) return null;
  return (sortOrder.value === 'desc' ? '-' : '') + sortKey.value;
});

// Fetching users data
const {
  data: usersData,
  isLoading,
  isError,
  refetch,
} = useUsers(currentPage, ordering, searchQuery);

const userMutation = useUserMutation(currentPage);

const debouncedSearch = useDebounceFn(() => {
  changePage(1);
}, 300);
watch(searchQuery, debouncedSearch);

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return new Date(dateString).toLocaleDateString('id-ID', options);
};

const getUserInitials = (user: User) => {
  if (!user) return '';
  const firstInitial = user.first_name?.charAt(0) || '';
  const lastInitial = user.last_name?.charAt(0) || '';
  const combinedInitials = `${firstInitial}${lastInitial}`;
  if (combinedInitials.length === 0) {
    return user.username?.charAt(0)?.toUpperCase() || '??';
  }
  return combinedInitials.toUpperCase();
};

const formatDateTimeForInput = (dateString?: string) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

// [LOGIKA STATUS AKUN - BADGE ICON]
const getAccountIcon = (user: User) => {
  // 1. Cek Admin
  if (user.is_superuser || user.account_status === 'Admin') {
    return 'shield_person';
  }

  // 2. Cek Premium
  if (user.account_status === 'Premium') {
    return 'crown';
  }

  // 3. Default: Gratis
  // Cek gender untuk icon. Asumsi user object mungkin punya nested profile atau field flat.
  const gender = user.profile?.gender || user.gender;
  if (gender === 'F' || gender === 'Female' || gender === 'Perempuan') {
    return 'person_2';
  }

  return 'person';
};

// [LOGIKA STATUS AKUN - TABLE VIEW]
const getStatusLabel = (user: User) => {
  if (user.is_active === false) return 'Nonaktif';
  if (user.is_active) return 'Aktif';
  return 'Diblokir';
};

const getStatusClass = (status: string) => {
  if (status === 'Aktif')
    return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border border-green-200 dark:border-green-800';
  if (status === 'Diblokir')
    return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-800';
  if (status.includes('Dihapus') || status === 'Nonaktif')
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600';
  return 'bg-gray-100 text-gray-800';
};

// Function to open the modal for creating a user
const openAddModal = () => {
  isEditMode.value = false;
  selectedUser.value = {
    id: 0, // Placeholder
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    phone_number: '',
    premium_expires_at: null,
    is_active: true,
    is_superuser: false,
    account_type: 'Gratis',
    logs: [],
  };
  isDetailModalOpen.value = true;
};

// Function to open DETAIL modal (Fetch data from API)
const openDetailModal = async (user: User) => {
  isEditMode.value = true;
  isLoadingDetails.value = true;
  isDetailModalOpen.value = true;

  try {
    const response = await api.get(`/admin/users/${user.id}/`);
    const fullData = response.data;

    selectedUser.value = {
      ...fullData,
      password: '',
      account_type:
        fullData.account_type === 'PREMIUM'
          ? 'Premium'
          : fullData.is_superuser
            ? 'Admin'
            : 'Gratis',
      is_superuser: fullData.is_superuser,
      premium_expires_at: formatDateTimeForInput(fullData.premium_expires_at),
    };
  } catch (err) {
    console.error('Gagal mengambil detail user:', err);
    selectedUser.value = { ...user, logs: [] };
  } finally {
    isLoadingDetails.value = false;
  }
};

const handleCloseModal = () => {
  isDetailModalOpen.value = false;
  selectedUser.value = null;
};

const handleSaveUser = (payload: any) => {
  userMutation.mutate(payload, {
    onSuccess: () => {
      handleCloseModal();
    },
  });
};

const openBlockConfirmModal = (user: User) => {
  userToBlock.value = user;
  isBlockConfirmModalOpen.value = true;
};

const handleBlockUser = () => {
  if (!userToBlock.value) return;

  const payload = {
    id: userToBlock.value.id,
    is_active: !userToBlock.value.is_active,
  };

  userMutation.mutate(payload, {
    onSettled: () => {
      isBlockConfirmModalOpen.value = false;
    },
  });
};

const onBlockModalAfterLeave = () => {
  userToBlock.value = null;
};

// Avatar preview functions
const formatFileSize = (bytes?: number) => {
  if (!bytes) return 'Tidak diketahui';
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

const openAvatarPreview = async (user: User) => {
  if (!user.avatar) return;

  isAvatarPreviewOpen.value = true;
  isLoadingAvatar.value = true;
  avatarPreviewData.value = {
    url: user.avatar,
    username: user.username,
    fullName:
      `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
      user.username,
    metadata: null,
  };

  try {
    const avatarUrl = user.avatar;
    let mimeType = 'Tidak diketahui';
    let fileSize = 'Tidak diketahui';
    let encoding = 'Tidak diketahui';
    let colorSpace = 'Tidak diketahui';
    let bitDepth = 'Tidak diketahui';

    // Check if it's a data URL (base64 encoded)
    if (avatarUrl.startsWith('data:')) {
      // Parse MIME type from data URL prefix (e.g., "data:image/avif;base64,...")
      const mimeMatch = avatarUrl.match(/^data:([^;,]+)/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
        // Detect encoding format
        if (mimeType.includes('avif')) {
          encoding = 'AVIF (AV1 Image File Format)';
          colorSpace = 'YUV 4:2:0';
          bitDepth = '10-bit';
        } else if (mimeType.includes('webp')) {
          encoding = 'WebP (VP8/VP8L)';
          colorSpace = 'YUV 4:2:0';
          bitDepth = '8-bit';
        } else if (mimeType.includes('png')) {
          encoding = 'PNG (Portable Network Graphics)';
          colorSpace = 'RGBA';
          bitDepth = '8-bit per channel';
        } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
          encoding = 'JPEG (Joint Photographic Experts Group)';
          colorSpace = 'YCbCr';
          bitDepth = '8-bit';
        }
      }

      // Calculate actual file size from base64 string
      // Base64 encodes 3 bytes into 4 characters, so actual size = base64Length * 0.75
      const base64Match = avatarUrl.match(/^data:[^,]+,(.*)$/);
      if (base64Match) {
        const base64String = base64Match[1];
        // Account for padding characters (=)
        const padding = (base64String.match(/=+$/) || [''])[0].length;
        const actualBytes = Math.floor((base64String.length * 3) / 4) - padding;
        fileSize = formatFileSize(actualBytes);
      }
    } else {
      // For external URLs, use HEAD request
      try {
        const response = await fetch(avatarUrl, { method: 'HEAD' });
        const contentType = response.headers.get('Content-Type');
        const contentLength = response.headers.get('Content-Length');
        if (contentType) mimeType = contentType;
        if (contentLength) fileSize = formatFileSize(parseInt(contentLength));
      } catch (fetchErr) {
        console.warn('Could not fetch HEAD for avatar:', fetchErr);
      }
    }

    // Get image dimensions by loading the image
    const img = new Image();
    img.src = avatarUrl;
    await new Promise((resolve: any) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    const dimensions =
      img.width && img.height
        ? `${img.width} × ${img.height} px`
        : 'Tidak diketahui';
    const aspectRatio =
      img.width && img.height ? (img.width / img.height).toFixed(2) : null;
    const totalPixels =
      img.width && img.height
        ? (img.width * img.height).toLocaleString('id-ID')
        : 'Tidak diketahui';

    // Check if backend provided EXIF data (from user.avatar_exif or similar field)
    // The backend now sends avatar_exif with EXIF metadata extracted via exiftool
    let exifData: any = null;

    // Try to get EXIF from user data if available (admin panel fetches full user details)
    // The EXIF data is stored when avatar is uploaded
    if (user.avatar_exif) {
      exifData = { ...user.avatar_exif };

      // Reverse Geocoding functionality
      if (exifData.gps_latitude && exifData.gps_longitude) {
        try {
          // Using Nominatim OpenStreetMap API
          const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${exifData.gps_latitude}&lon=${exifData.gps_longitude}&zoom=18&addressdetails=1`;

          // Note: In production, consider using a proxy or a paid service to ensure reliability and avoid rate limits.
          // We use a simple fetch here for demonstration/admin purposes.
          const geoResponse = await fetch(geoUrl, {
            headers: {
              'Accept-Language': 'id', // Prefer Indonesian address
            },
          });

          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            if (geoData && geoData.display_name) {
              exifData.address = geoData.display_name;
            }
          }
        } catch (e) {
          console.warn('Gagal melakukan reverse geocoding:', e);
        }
      }
    }

    avatarPreviewData.value.metadata = {
      mimeType,
      encoding,
      fileSize,
      dimensions,
      aspectRatio: aspectRatio
        ? `${aspectRatio}:1${img.width === img.height ? ' (Persegi)' : ''}`
        : 'Tidak diketahui',
      totalPixels:
        totalPixels !== 'Tidak diketahui'
          ? `${totalPixels} piksel`
          : totalPixels,
      colorSpace,
      bitDepth,
      exif: exifData,
    };
  } catch (err) {
    console.error('Gagal mengambil metadata avatar:', err);
    avatarPreviewData.value.metadata = {
      mimeType: 'Gagal dimuat',
      encoding: 'Gagal dimuat',
      fileSize: 'Gagal dimuat',
      dimensions: 'Gagal dimuat',
      aspectRatio: 'Gagal dimuat',
      totalPixels: 'Gagal dimuat',
      colorSpace: 'Gagal dimuat',
      bitDepth: 'Gagal dimuat',
      exif: null,
    };
  } finally {
    isLoadingAvatar.value = false;
  }
};

const closeAvatarPreview = () => {
  isAvatarPreviewOpen.value = false;
};

const onAvatarModalAfterLeave = () => {
  avatarPreviewData.value = null;
};

// Fullscreen image viewer functions (simplified - Artikel.vue style)
const openFullscreenView = (imageUrl: string) => {
  fullscreenImageUrl.value = imageUrl;
  isFullscreenViewOpen.value = true;
};

const closeFullscreenView = () => {
  isFullscreenViewOpen.value = false;
  fullscreenImageUrl.value = null;
};

// Format EXIF value for display
const formatExifValue = (value: any) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    // Format large numbers with thousand separators
    if (Number.isInteger(value) && value > 1000) {
      return value.toLocaleString('id-ID');
    }
    // Format floating point with max 6 decimal places
    if (!Number.isInteger(value)) {
      return parseFloat(value.toFixed(6)).toString();
    }
  }
  return String(value);
};

// Get Google Maps URL for GPS coordinates
const getGpsMapUrl = (lat: number | string, lon: number | string) => {
  if (!lat || !lon) return undefined;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
};

// --- Pagination and Sorting Logic ---
const totalPages = computed(() => {
  if (!usersData.value || usersData.value.count === 0) return 1;
  return Math.ceil(usersData.value.count / 10);
});

// Menghitung range halaman untuk ditampilkan di scrollbar
const visiblePageRange = computed(() => {
  const total = totalPages.value || 1;
  return Array.from({ length: total }, (_, i) => i + 1);
});

const changePage = (newPage: number) => {
  if (newPage > 0 && newPage <= totalPages.value) {
    currentPage.value = newPage;
  } else if (newPage === 1) {
    currentPage.value = 1;
  }
};

// Logic scroll ke active page (disamakan dengan ManajemenKata)
function scrollToActivePage(page: number) {
  nextTick(() => {
    const container = scrollContainer.value;
    if (!container) return;
    const activeBtn = container.querySelector(`button[data-page="${page}"]`);
    if (!activeBtn) return;
    const containerRect = container.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    const scrollOffset =
      btnRect.left -
      containerRect.left -
      containerRect.width / 2 +
      btnRect.width / 2;
    container.scrollBy({ left: scrollOffset, behavior: 'auto' });
  });
}

// Wrapper handlePageClick untuk tombol pagination
const handlePageClick = (page: number) => {
  changePage(page);
  scrollToActivePage(page);
};

// Watch perubahan page untuk auto scroll
watch(currentPage, (p) => {
  setTimeout(() => {
    scrollToActivePage(p);
  }, 50);
});

function setSort(key: string) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    const fieldMap: Record<string, string> = {
      Tipe: 'profile__account_type',
      'Status Akun': 'is_active',
      'Terakhir Dilihat': 'profile__last_seen',
      Bergabung: 'date_joined',
    };
    if (fieldMap[key]) {
      sortKey.value = fieldMap[key];
    } else {
      sortKey.value = key;
    }
    sortOrder.value = 'asc';
  }
}

onMounted(() => {
  refreshInterval = window.setInterval(() => {
    if (!isDetailModalOpen.value && !isBlockConfirmModalOpen.value) {
      refetch();
    }
  }, 30000);

  // Initial scroll position
  setTimeout(() => {
    scrollToActivePage(currentPage.value);
  }, 50);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 h-full flex flex-col bg-[var(--color-surface-container)] rounded-3xl">

    <header class="flex items-center mb-6 flex-shrink-0">
      <button @click="emit('back')"
        class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] transition-colors"
        aria-label="Kembali">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div class="flex-grow text-center">
        <h1 class="text-xl font-bold text-[var(--color-on-background)]">Manajemen Pengguna</h1>
      </div>
      <div class="w-10"></div>
    </header>

    <div class="flex flex-col sm:flex-row items-center gap-4 mb-4">
      <div class="relative w-full sm:flex-grow">
        <span
          class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-outline)] pointer-events-none">search</span>
        <input type="text" v-model="searchQuery" placeholder="Cari nama, username, email, kode..."
          class="p-2 pl-10 w-full rounded-xl bg-[var(--color-surface-container-high)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition text-[var(--color-on-background)]"
          @focus="isSearchFocused = true" @blur="isSearchFocused = false" />
      </div>

      <div class="flex items-center gap-4 flex-shrink-0 w-full sm:w-auto">
        <button @click="refetch" :disabled="isLoading" :class="[
          'flex items-center justify-center text-[var(--color-on-surface)] font-medium py-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed',
          'bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] focus:ring-[var(--color-primary)]',
          'flex-1 sm:flex-none',
          'transition-all duration-300 ease-in-out',
          isSearchFocused ? 'sm:px-2 sm:gap-0' : 'sm:px-4 sm:gap-2'
        ]" title="Refresh Data">
          <span class="material-symbols-outlined text-base" :class="{ 'animate-spin': isLoading }">refresh</span>
          <span :class="['hidden sm:grid', isSearchFocused ? 'grid-cols-[0fr]' : 'grid-cols-[1fr]']"
            class="transition-[grid-template-columns] duration-300 ease-in-out overflow-hidden">
            <span class="overflow-hidden whitespace-nowrap">Refresh</span>
          </span>
        </button>

        <button @click="openAddModal" :class="[
          'flex items-center justify-center bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 rounded-xl hover:bg-[var(--color-primary-fixed-dim)] shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] dark:focus:ring-offset-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed',
          'flex-1 sm:flex-none',
          'transition-all duration-300 ease-in-out',
          isSearchFocused ? 'sm:px-2 sm:gap-0' : 'sm:px-4 sm:gap-2'
        ]">
          <span class="material-symbols-outlined text-base">add</span>
          <span :class="['hidden sm:grid', isSearchFocused ? 'grid-cols-[0fr]' : 'grid-cols-[1fr]']"
            class="transition-[grid-template-columns] duration-300 ease-in-out overflow-hidden">
            <span class="overflow-hidden whitespace-nowrap">Pengguna Baru</span>
          </span>
        </button>
      </div>

    </div>

    <div v-if="isLoading && !usersData" class="text-center py-12 flex-grow flex items-center justify-center">
      <div>
        <span class="material-symbols-outlined animate-spin text-4xl text-[var(--color-outline)]">sync</span>
        <p class="mt-2 text-[var(--color-on-surface-variant)]">Memuat data pengguna...</p>
      </div>
    </div>
    <div v-else-if="isError" class="text-center text-[var(--color-error)]">Gagal memuat pengguna.</div>
    <div v-else-if="usersData && usersData.results.length === 0"
      class="text-center py-12 bg-[var(--color-surface-container)] rounded-2xl shadow-sm flex-grow flex items-center justify-center">
      <div>
        <span class="material-symbols-outlined text-5xl text-[var(--color-outline)]">person_search</span>
        <p class="mt-2 font-semibold text-[var(--color-on-surface-variant)]">
          {{ searchQuery ? `Tidak ada pengguna yang cocok` : `Belum ada pengguna terdaftar` }}.
        </p>
      </div>
    </div>

    <div v-else-if="usersData" class="flex-grow flex flex-col overflow-hidden">
      <main class="flex-1 bg-[var(--color-surface-container)] rounded-2xl overflow-hidden flex flex-col">
        <div class="overflow-x-auto flex-1">
          <table class="w-full text-left min-w-[1200px]">
            <thead class="sticky top-0 bg-[var(--color-surface-container-high)] z-10">
              <tr>
                <th @click="setSort('id')"
                  class="p-4 font-semibold text-[var(--color-on-surface)] cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors">
                  <div class="flex items-center gap-1">ID <span v-if="sortKey === 'id'"
                      class="material-symbols-outlined text-sm">{{ sortOrder === 'asc' ? 'arrow_upward' :
                        'arrow_downward' }}</span></div>
                </th>
                <th @click="setSort('username')"
                  class="p-4 font-semibold text-[var(--color-on-surface)] cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors">
                  <div class="flex items-center gap-1">Nama <span v-if="sortKey === 'username'"
                      class="material-symbols-outlined text-sm">{{ sortOrder === 'asc' ? 'arrow_upward' :
                        'arrow_downward' }}</span></div>
                </th>
                <th @click="setSort('profile__account_type')"
                  class="p-4 font-semibold text-[var(--color-on-surface)] cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors">
                  <div class="flex items-center gap-1">Tipe <span v-if="sortKey === 'profile__account_type'"
                      class="material-symbols-outlined text-sm">{{ sortOrder === 'asc' ? 'arrow_upward' :
                        'arrow_downward' }}</span></div>
                </th>

                <th @click="setSort('is_active')"
                  class="p-4 font-semibold text-[var(--color-on-surface)] cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors">
                  <div class="flex items-center gap-1">Status Akun <span v-if="sortKey === 'is_active'"
                      class="material-symbols-outlined text-sm">{{ sortOrder === 'asc' ? 'arrow_upward' :
                        'arrow_downward' }}</span></div>
                </th>

                <th @click="setSort('profile__last_seen')"
                  class="p-4 font-semibold text-[var(--color-on-surface)] cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors">
                  <div class="flex items-center gap-1">Terakhir Dilihat <span v-if="sortKey === 'profile__last_seen'"
                      class="material-symbols-outlined text-sm">{{ sortOrder === 'asc' ? 'arrow_upward' :
                        'arrow_downward' }}</span></div>
                </th>
                <th @click="setSort('date_joined')"
                  class="p-4 font-semibold text-[var(--color-on-surface)] cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors">
                  <div class="flex items-center gap-1">Bergabung <span v-if="sortKey === 'date_joined'"
                      class="material-symbols-outlined text-sm">{{ sortOrder === 'asc' ? 'arrow_upward' :
                        'arrow_downward' }}</span></div>
                </th>
                <th class="p-4 font-semibold text-[var(--color-on-surface)]">Kode Milik</th>
                <th class="p-4 font-semibold text-[var(--color-on-surface)]">Kode Digunakan</th>
                <th class="p-4 font-semibold text-[var(--color-on-surface)] text-right w-32">Aksi</th>
              </tr>
            </thead>
            <tbody class="bg-[var(--color-surface-container)]">
              <tr v-for="user in usersData.results" :key="user.id"
                class="border-b border-[var(--color-outline-variant)] last:border-b-0 hover:bg-[var(--color-surface-container-high)] transition-colors">
                <td class="p-4 whitespace-nowrap text-sm text-[var(--color-on-surface)] font-mono transition-opacity"
                  :class="{ 'opacity-60': !user.is_active }">
                  {{ user.id }}
                </td>
                <td class="p-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10 transition-transform duration-200"
                      :class="{ 'cursor-pointer hover:scale-110': user.avatar }"
                      @click="user.avatar && openAvatarPreview(user)"
                      :title="user.avatar ? 'Klik untuk melihat foto profil' : ''">
                      <UserAvatar :avatar-url="user.avatar" :initials="getUserInitials(user)" :size="40" />
                    </div>
                    <div class="ml-4 transition-opacity" :class="{ 'opacity-60': !user.is_active }">
                      <div class="text-sm font-medium text-[var(--color-on-background)]">{{ user.first_name }} {{
                        user.last_name }}</div>
                      <div class="text-sm text-[var(--color-on-surface)]">@{{ user.username }}</div>
                    </div>
                  </div>
                </td>
                <td class="p-4 whitespace-nowrap transition-opacity" :class="{ 'opacity-60': !user.is_active }">
                  <span :class="{
                    'bg-[var(--color-secondary)] text-[var(--color-on-secondary)]': user.account_status === 'Premium',
                    'bg-[var(--color-tertiary)] text-[var(--color-on-tertiary)]': user.account_status === 'Admin',
                    'bg-[var(--color-primary)] text-[var(--color-on-primary)]': user.account_status === 'Gratis'
                  }" class="px-2 py-0.5 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full">
                    <span class="material-symbols-outlined text-xs">{{ getAccountIcon(user) }}</span>
                    {{ user.account_status }}
                  </span>
                </td>

                <td class="p-4 whitespace-nowrap">
                  <span :class="getStatusClass(getStatusLabel(user))"
                    class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                    {{ getStatusLabel(user) }}
                  </span>
                </td>

                <td class="p-4 whitespace-nowrap text-sm transition-opacity" :class="{ 'opacity-60': !user.is_active }">
                  <span v-if="user.id === loggedInUser?.id || user.is_online"
                    class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                    Online
                  </span>
                  <span v-else-if="user.last_seen" class="text-[var(--color-on-surface)]">{{ formatDate(user.last_seen)
                    }}</span>
                  <span v-else class="text-[var(--color-on-surface)]">Tidak pernah</span>
                </td>
                <td class="p-4 whitespace-nowrap text-sm text-[var(--color-on-surface)] transition-opacity"
                  :class="{ 'opacity-60': !user.is_active }">
                  {{ formatDate(user.date_joined) }}
                </td>
                <td class="p-4 whitespace-nowrap text-sm text-[var(--color-on-surface)] font-mono transition-opacity"
                  :class="{ 'opacity-60': !user.is_active }">
                  {{ user.owned_referral_code || 'N/A' }}
                </td>
                <td class="p-4 whitespace-nowrap text-sm text-[var(--color-on-surface)] font-mono transition-opacity"
                  :class="{ 'opacity-60': !user.is_active }">
                  {{ user.referred_by_code || 'N/A' }}
                </td>
                <td class="p-4 text-right align-middle">
                  <div class="flex items-center justify-end gap-2">
                    <button @click="openDetailModal(user)"
                      class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-on-surface)] hover:bg-[var(--color-primary-container)] hover:text-[var(--color-on-primary-container)] transition-colors"
                      title="Lihat Detail & Log">
                      <span class="material-symbols-outlined text-base">user_attributes</span>
                    </button>

                    <button v-if="user.id !== loggedInUser?.id && !user.is_deleted" @click="openBlockConfirmModal(user)"
                      class="flex items-center justify-center w-8 h-8 rounded-full transition-colors" :class="[
                        user.is_active
                          ? 'text-[var(--color-on-surface)] hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)]'
                          : 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)]'
                      ]" :title="user.is_active ? 'Blokir Pengguna' : 'Aktifkan Pengguna'">
                      <span class="material-symbols-outlined text-base">block</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <nav v-if="totalPages > 1"
          class="p-4 bg-[var(--color-surface-container)] flex justify-between items-center gap-4">
          <div class="flex items-center gap-2">
            <button @click="handlePageClick(1)" :disabled="currentPage <= 1"
              class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-on-surface)] enabled:hover:bg-[var(--color-surface-container-high)] transition-colors disabled:opacity-50"
              title="Halaman Pertama"><span class="material-symbols-outlined text-lg">first_page</span></button>
            <button @click="handlePageClick(currentPage - 1)" :disabled="currentPage <= 1"
              class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-on-surface)] enabled:hover:bg-[var(--color-surface-container-high)] transition-colors disabled:opacity-50"
              title="Halaman Sebelumnya"><span class="material-symbols-outlined text-lg">chevron_left</span></button>
          </div>
          <div ref="scrollContainer" class="flex justify-start items-center gap-2 overflow-x-auto scrollbar-hide px-2"
            style="white-space: nowrap;">
            <template v-for="(page, index) in visiblePageRange" :key="index">
              <button v-if="typeof page === 'number'" :data-page="page" @click="handlePageClick(page)"
                :aria-current="page === currentPage ? 'page' : null"
                :class="['inline-block px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap', page === currentPage ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-md' : 'text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]']">
                {{ page }}
              </button>
            </template>
          </div>
          <div class="flex items-center gap-2">
            <button @click="handlePageClick(currentPage + 1)" :disabled="currentPage >= totalPages"
              class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-on-surface)] enabled:hover:bg-[var(--color-surface-container-high)] transition-colors disabled:opacity-50"
              title="Halaman Selanjutnya"><span class="material-symbols-outlined text-lg">chevron_right</span></button>
            <button @click="handlePageClick(totalPages)" :disabled="currentPage >= totalPages"
              class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-on-surface)] enabled:hover:bg-[var(--color-surface-container-high)] transition-colors disabled:opacity-50"
              title="Halaman Terakhir"><span class="material-symbols-outlined text-lg">last_page</span></button>
          </div>
        </nav>
      </main>
    </div>

    <DetailPengguna :is-open="isDetailModalOpen" :user="selectedUser" :is-loading="isLoadingDetails"
      :is-saving="userMutation.isPending.value" :is-edit-mode="isEditMode" @close="handleCloseModal"
      @save="handleSaveUser" />

    <TransitionRoot :show="isBlockConfirmModalOpen" as="template" @after-leave="onBlockModalAfterLeave">
      <Dialog @close="isBlockConfirmModalOpen = false" class="relative z-60">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black/60" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel v-if="userToBlock"
              class="w-full max-w-sm transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-center align-middle shadow-xl transition-all">
              <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
                :class="userToBlock.is_active ? 'bg-[var(--color-error-container)]' : 'bg-[var(--color-primary-container)]'">
                <span class="material-symbols-outlined text-4xl"
                  :class="userToBlock.is_active ? 'text-[var(--color-on-error-container)]' : 'text-[var(--color-on-primary-container)]'">
                  {{ userToBlock.is_active ? 'block' : 'lock_open' }}
                </span>
              </div>
              <DialogTitle as="h3" class="mt-4 text-2xl font-bold text-[var(--color-on-background)]">
                {{ userToBlock.is_active ? 'Blokir Pengguna?' : 'Aktifkan Pengguna?' }}
              </DialogTitle>
              <p class="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                Anda yakin ingin {{ userToBlock.is_active ? 'memblokir' : 'mengaktifkan kembali' }} pengguna <strong>@{{
                  userToBlock.username }}</strong>?
              </p>
              <div class="mt-6 grid grid-cols-2 gap-3">
                <button type="button" @click="isBlockConfirmModalOpen = false"
                  class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]">Batal</button>
                <button @click="handleBlockUser" :disabled="userMutation.isPending.value"
                  class="w-full rounded-xl px-4 py-2 font-semibold transition-colors" :class="{
                    'bg-[var(--color-error)] text-[var(--color-on-error)] hover:bg-[var(--color-error-container)]': userToBlock.is_active,
                    'bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)]': !userToBlock.is_active,
                    'opacity-50 cursor-not-allowed': userMutation.isPending.value
                  }">
                  <span v-if="userMutation.isPending.value">Memproses...</span>
                  <span v-else>Ya, {{ userToBlock.is_active ? 'Blokir' : 'Aktifkan' }}</span>
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Avatar Preview Modal -->
    <TransitionRoot :show="isAvatarPreviewOpen" as="template" @after-leave="onAvatarModalAfterLeave">
      <Dialog @close="closeAvatarPreview" class="relative z-60">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black/80" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel v-if="avatarPreviewData"
              class="w-full max-w-3xl max-h-[90vh] flex flex-col transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] shadow-xl transition-all">
              <!-- Header -->
              <div class="flex items-center justify-between p-4 border-b border-[var(--color-outline-variant)]">
                <div class="flex items-center gap-3">
                  <DialogTitle as="h3" class="text-lg font-bold text-[var(--color-on-background)]">
                    Foto Profil
                  </DialogTitle>
                  <span class="text-sm text-[var(--color-on-surface-variant)]">{{ avatarPreviewData.fullName }} (@{{
                    avatarPreviewData.username }})</span>
                </div>
                <button @click="closeAvatarPreview"
                  class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] transition-colors">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>

              <!-- Content: Vertical scrollable layout -->
              <div class="flex-1 overflow-y-auto">
                <!-- Image Preview - Square Container (centered) -->
                <div class="p-4 flex items-center justify-center bg-[var(--color-surface-container-lowest)]">
                  <div
                    class="aspect-square w-full max-w-[280px] relative group rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 border border-[var(--color-outline-variant)]">
                    <img :src="avatarPreviewData.url" :alt="`Foto profil ${avatarPreviewData.fullName}`"
                      class="w-full h-full object-contain cursor-zoom-in transition-transform duration-300 group-hover:scale-105"
                      @click="openFullscreenView(avatarPreviewData.url)" />

                    <!-- Zoom Hint Overlay -->
                    <div
                      class="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div
                        class="bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-sm">zoom_in</span>
                        <span>Klik untuk memperbesar</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Metadata Panel (Below image) -->
                <div class="p-4">
                  <div v-if="isLoadingAvatar" class="flex items-center justify-center py-8">
                    <span
                      class="material-symbols-outlined animate-spin text-2xl text-[var(--color-outline)]">sync</span>
                    <span class="ml-2 text-sm text-[var(--color-on-surface-variant)]">Memuat metadata...</span>
                  </div>
                  <div v-else-if="avatarPreviewData.metadata" class="space-y-4">
                    <!-- Basic Info Section -->
                    <div class="bg-[var(--color-surface-container)] rounded-2xl p-4">
                      <h4 class="text-sm font-semibold text-[var(--color-on-surface)] mb-3 flex items-center gap-2">
                        <span class="material-symbols-outlined text-base">image</span>
                        Informasi Gambar
                      </h4>
                      <div class="space-y-2 text-sm">
                        <div class="flex justify-between py-1 border-b border-[var(--color-outline-variant)]/30">
                          <span class="text-[var(--color-on-surface-variant)]">Tipe MIME</span>
                          <span class="text-[var(--color-on-surface)] font-mono text-xs">{{
                            avatarPreviewData.metadata.mimeType }}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b border-[var(--color-outline-variant)]/30">
                          <span class="text-[var(--color-on-surface-variant)]">Format Encoding</span>
                          <span class="text-[var(--color-on-surface)]">{{ avatarPreviewData.metadata.encoding }}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b border-[var(--color-outline-variant)]/30">
                          <span class="text-[var(--color-on-surface-variant)]">Dimensi</span>
                          <span class="text-[var(--color-on-surface)]">{{ avatarPreviewData.metadata.dimensions
                            }}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b border-[var(--color-outline-variant)]/30">
                          <span class="text-[var(--color-on-surface-variant)]">Rasio Aspek</span>
                          <span class="text-[var(--color-on-surface)]">{{ avatarPreviewData.metadata.aspectRatio
                            }}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b border-[var(--color-outline-variant)]/30">
                          <span class="text-[var(--color-on-surface-variant)]">Total Piksel</span>
                          <span class="text-[var(--color-on-surface)]">{{ avatarPreviewData.metadata.totalPixels
                            }}</span>
                        </div>
                        <div class="flex justify-between py-1">
                          <span class="text-[var(--color-on-surface-variant)]">Ukuran File</span>
                          <span class="text-[var(--color-on-surface)]">{{ avatarPreviewData.metadata.fileSize }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Technical Details Section -->
                    <div class="bg-[var(--color-surface-container)] rounded-2xl p-4">
                      <h4 class="text-sm font-semibold text-[var(--color-on-surface)] mb-3 flex items-center gap-2">
                        <span class="material-symbols-outlined text-base">tune</span>
                        Detail Teknis
                      </h4>
                      <div class="space-y-2 text-sm">
                        <div class="flex justify-between py-1 border-b border-[var(--color-outline-variant)]/30">
                          <span class="text-[var(--color-on-surface-variant)]">Color Space</span>
                          <span class="text-[var(--color-on-surface)]">{{ avatarPreviewData.metadata.colorSpace
                            }}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b border-[var(--color-outline-variant)]/30">
                          <span class="text-[var(--color-on-surface-variant)]">Bit Depth</span>
                          <span class="text-[var(--color-on-surface)]">{{ avatarPreviewData.metadata.bitDepth }}</span>
                        </div>
                        <div class="flex justify-between py-1">
                          <span class="text-[var(--color-on-surface-variant)]">Compression</span>
                          <span class="text-[var(--color-on-surface)]">{{
                            avatarPreviewData.metadata.encoding.includes('AVIF') ? 'Lossy (AV1)' :
                              avatarPreviewData.metadata.encoding.includes('WebP') ? 'Lossy (VP8)' : 'Standard' }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- EXIF Data Section (if available) -->
                    <div v-if="avatarPreviewData.metadata.exif"
                      class="bg-[var(--color-surface-container)] rounded-2xl p-4">
                      <h4 class="text-sm font-semibold text-[var(--color-on-surface)] mb-3 flex items-center gap-2">
                        <span class="material-symbols-outlined text-base">photo_camera</span>
                        Data EXIF Lengkap
                      </h4>

                      <!-- Ringkasan Utama -->
                      <div class="space-y-2 text-sm mb-4">
                        <div v-if="avatarPreviewData.metadata.exif.device"
                          class="flex justify-between py-1 border-b border-[var(--color-outline-variant)]/30">
                          <span class="text-[var(--color-on-surface-variant)]">Perangkat</span>
                          <a :href="`https://www.gsmarena.com/res.php3?sSearch=${encodeURIComponent(avatarPreviewData.metadata.exif.device)}`"
                            target="_blank" rel="noopener noreferrer"
                            class="text-[var(--color-primary)] hover:underline flex items-center gap-1"
                            title="Cari spesifikasi perangkat di GSMArena">
                            {{ avatarPreviewData.metadata.exif.device }}
                            <span class="material-symbols-outlined text-sm">search</span>
                          </a>
                        </div>
                        <div v-if="avatarPreviewData.metadata.exif.date_captured"
                          class="flex justify-between py-1 border-b border-[var(--color-outline-variant)]/30">
                          <span class="text-[var(--color-on-surface-variant)]">Tanggal Diambil</span>
                          <span class="text-[var(--color-on-surface)]">{{ avatarPreviewData.metadata.exif.date_captured
                            }}</span>
                        </div>
                        <div v-if="avatarPreviewData.metadata.exif.gps"
                          class="py-1 border-b border-[var(--color-outline-variant)]/30">
                          <div class="flex justify-between items-center">
                            <span class="text-[var(--color-on-surface-variant)]">Lokasi GPS</span>
                            <a :href="getGpsMapUrl(avatarPreviewData.metadata.exif.gps_latitude, avatarPreviewData.metadata.exif.gps_longitude)"
                              target="_blank" rel="noopener noreferrer"
                              class="text-[var(--color-primary)] hover:underline flex items-center gap-1">
                              {{ avatarPreviewData.metadata.exif.gps }}
                              <span class="material-symbols-outlined text-sm">open_in_new</span>
                            </a>
                          </div>
                          <!-- Mini Map Embed -->
                          <div class="mt-2 rounded-lg overflow-hidden border border-[var(--color-outline-variant)]/30">
                            <iframe
                              :src="`https://maps.google.com/maps?q=${avatarPreviewData.metadata.exif.gps_latitude},${avatarPreviewData.metadata.exif.gps_longitude}&z=15&output=embed`"
                              class="w-full h-32" frameborder="0" loading="lazy"></iframe>
                          </div>
                          <div v-if="avatarPreviewData.metadata.exif.address"
                            class="mt-2 p-2 bg-[var(--color-surface-container-high)] rounded-lg flex gap-2 items-start">
                            <span
                              class="material-symbols-outlined text-sm text-[var(--color-primary)] mt-0.5">location_on</span>
                            <span class="text-xs text-[var(--color-on-surface)] leading-relaxed">{{
                              avatarPreviewData.metadata.exif.address }}</span>
                          </div>

                        </div>
                        <div v-if="avatarPreviewData.metadata.exif.software"
                          class="flex justify-between py-1 border-b border-[var(--color-outline-variant)]/30">
                          <span class="text-[var(--color-on-surface-variant)]">Software</span>
                          <span class="text-[var(--color-on-surface)]">{{ avatarPreviewData.metadata.exif.software
                            }}</span>
                        </div>
                        <div v-if="avatarPreviewData.metadata.exif.original_dimensions"
                          class="flex justify-between py-1 border-b border-[var(--color-outline-variant)]/30">
                          <span class="text-[var(--color-on-surface-variant)]">Dimensi Asli</span>
                          <span class="text-[var(--color-on-surface)]">{{
                            avatarPreviewData.metadata.exif.original_dimensions }}</span>
                        </div>
                        <div v-if="avatarPreviewData.metadata.exif.iso"
                          class="flex justify-between py-1 border-b border-[var(--color-outline-variant)]/30">
                          <span class="text-[var(--color-on-surface-variant)]">ISO</span>
                          <span class="text-[var(--color-on-surface)]">{{ avatarPreviewData.metadata.exif.iso }}</span>
                        </div>
                        <div v-if="avatarPreviewData.metadata.exif.exposure_time"
                          class="flex justify-between py-1 border-b border-[var(--color-outline-variant)]/30">
                          <span class="text-[var(--color-on-surface-variant)]">Exposure</span>
                          <span class="text-[var(--color-on-surface)]">{{ avatarPreviewData.metadata.exif.exposure_time
                            }}</span>
                        </div>
                        <div v-if="avatarPreviewData.metadata.exif.f_number"
                          class="flex justify-between py-1 border-b border-[var(--color-outline-variant)]/30">
                          <span class="text-[var(--color-on-surface-variant)]">Aperture</span>
                          <span class="text-[var(--color-on-surface)]">{{ avatarPreviewData.metadata.exif.f_number
                            }}</span>
                        </div>
                        <div v-if="avatarPreviewData.metadata.exif.focal_length" class="flex justify-between py-1">
                          <span class="text-[var(--color-on-surface-variant)]">Focal Length</span>
                          <span class="text-[var(--color-on-surface)]">{{ avatarPreviewData.metadata.exif.focal_length
                            }}</span>
                        </div>
                      </div>

                      <!-- Raw Data (Collapsible) -->
                      <details v-if="avatarPreviewData.metadata.exif.raw_data" class="mt-2">
                        <summary
                          class="cursor-pointer text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1">
                          <span class="material-symbols-outlined text-sm">expand_more</span>
                          Lihat Semua Metadata ({{ Object.keys(avatarPreviewData.metadata.exif.raw_data).length }}
                          field)
                        </summary>
                        <div
                          class="mt-2 max-h-64 overflow-y-auto bg-[var(--color-surface-container-low)] rounded-lg p-2">
                          <div class="space-y-1 text-xs font-mono">
                            <template v-for="(value, key) in avatarPreviewData.metadata.exif.raw_data" :key="key">
                              <div v-if="!['SourceFile', 'Directory', 'FileName', 'FilePermissions'].includes(key)"
                                class="flex gap-2 py-0.5 border-b border-[var(--color-outline-variant)]/20">
                                <span class="text-[var(--color-on-surface-variant)] min-w-[140px] truncate"
                                  :title="key">{{ key }}</span>
                                <span class="text-[var(--color-on-surface)] flex-1 break-all">{{ formatExifValue(value)
                                  }}</span>
                              </div>
                            </template>
                          </div>
                        </div>
                      </details>
                    </div>

                    <!-- No EXIF notice -->
                    <div v-else class="bg-[var(--color-surface-container)] rounded-2xl p-4">
                      <h4 class="text-sm font-semibold text-[var(--color-on-surface)] mb-2 flex items-center gap-2">
                        <span class="material-symbols-outlined text-base">photo_camera</span>
                        Data EXIF Asli
                      </h4>
                      <p class="text-xs text-[var(--color-on-surface-variant)] italic">
                        Data EXIF (perangkat, GPS, tanggal pengambilan) tidak tersedia.
                        Metadata EXIF dihapus saat gambar diproses untuk menjaga privasi dan mengoptimalkan ukuran file.
                      </p>
                    </div>

                  </div>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Fullscreen Image Viewer (Simplified) -->
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0"
      enter-to-class="opacity-100" leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100"
      leave-to-class="opacity-0">
      <div v-if="isFullscreenViewOpen" @click="closeFullscreenView"
        class="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center cursor-zoom-out">
        <img :src="fullscreenImageUrl" alt="Fullscreen preview" class="max-w-full max-h-full object-contain p-4" />
        <button
          class="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
          <span class="material-symbols-outlined text-2xl">close</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
  height: 6px;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
