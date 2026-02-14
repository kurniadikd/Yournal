<script setup lang="ts">
import { ref, computed, onMounted, watchEffect } from 'vue';
import { useListsStore } from '@/stores/lists';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { useLanguageStore } from '@/stores/language';
import { useSearchStore } from '@/stores/search';
import { useLearnStore } from '@/stores/learn';
import { storeToRefs } from 'pinia';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
import BuatDaftar from '@/components/BuatDaftar.vue';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';

// --- State Management ---
const listsStore = useListsStore();
const authStore = useAuthStore();
const uiStore = useUIStore();
const languageStore = useLanguageStore();
const searchStore = useSearchStore();
const learnStore = useLearnStore();
const { userLists } = storeToRefs(listsStore);

// --- Local State for Item View ---
const selectedFolderId = ref(null);
const fetchedItems = ref([]);
const isLoadingItems = ref(false);
const currentFolderName = ref('');
const isBuatDaftarModalOpen = ref(false);
const buatDaftarMode = ref<'create' | 'edit'>('create');
const buatDaftarInitialData = ref<any>({});
const scrollContainerRef = ref(null);
const isHeaderSticky = ref(false);

// --- Filter State ---
const filterType = ref('');
const filterLangPair = ref('');
const sortBy = ref('newest');

// --- Delete Confirmation Modal State ---
const isConfirmDeleteDialogOpen = ref(false);
const itemToDelete = ref(null);
const isDeleting = ref(false);
const deleteError = ref(null);

// --- Computed Properties ---
const displayedFolders = computed(() => {
  const allFolders = userLists.value.filter(
    (list) => !list.hidden && list.name.toLowerCase() !== 'dilaporkan',
  );
  return allFolders; //.slice(0, 12);
});

const currentList = computed(() => {
  return userLists.value.find((list) => list.id === selectedFolderId.value);
});

// Daftar tipe unik dari item yang di-fetch
const availableTypes = computed(() => {
  const types = new Set();
  fetchedItems.value.forEach((item) => {
    if (item.type) types.add(item.type);
  });
  return Array.from(types);
});

// Daftar lang_pair unik dari item yang di-fetch
const availableLangPairs = computed(() => {
  const pairs = new Set();
  fetchedItems.value.forEach((item) => {
    if (item.lang_pair) pairs.add(item.lang_pair);
  });
  return Array.from(pairs);
});

// Active language pair berdasarkan pilihan user (format: "id-en")
const activeLangPair = computed(() => {
  const asal = languageStore.selectedAsal;
  const target = languageStore.selectedTarget;
  if (asal && target && asal.kodeBahasa && target.kodeBahasa) {
    return `${asal.kodeBahasa}-${target.kodeBahasa}`;
  }
  return '';
});

// Items yang sudah di-filter
const filteredItems = computed(() => {
  let items = fetchedItems.value;

  // Filter by type if selected
  if (filterType.value) {
    items = items.filter((item) => item.type === filterType.value);
  }

  // Filter by language pair:
  // - If filterLangPair is empty ("Semua Bahasa"), show ALL items (no lang filtering)
  // - If filterLangPair has a value, filter by that specific pair
  if (filterLangPair.value) {
    items = items.filter((item) => item.lang_pair === filterLangPair.value);
  }

  // Sort logic
  items.sort((a, b) => {
    // Helper to get time value, 0 if missing
    const timeA = a.added_at ? new Date(a.added_at).getTime() : 0;
    const timeB = b.added_at ? new Date(b.added_at).getTime() : 0;
    
    // If we have valid timestamps for both, use them
    if (timeA && timeB) {
         return sortBy.value === 'newest' ? timeB - timeA : timeA - timeB;
    }
    
    // Fallback: If timestamps missing, assume original list order (which is Newest First from backend)
    // To implement "Oldest" without specific timestamps, we reverse the array order concept
    // But since Array.sort compares elements, we rely on implicit original index is hard here without mapping.
    // So we treat "missing timestamp" as "very old" or "preserve order".
    // Simple heuristic: If one has timestamp and other doesn't?
    if (timeA) return sortBy.value === 'newest' ? -1 : 1; 
    if (timeB) return sortBy.value === 'newest' ? 1 : -1;
    
    // If neither has timestamp, preserve original relational order (0)
    // Note: To truly reverse order of untimestamped items for 'oldest', we'd need original index.
    // For now, this is robust enough for new items.
    return 0;
  });
  
  // Explicitly reverse if completely non-timestamped and "oldest" requested?
  // Since sort(0) is unstable/dependant, we might want to just reverse the final array if "oldest" 
  // and no timestamps found? Let's tick to the comparative sort.

  return items;
});

const isListEmpty = computed(() => {
  return !filteredItems.value || filteredItems.value.length === 0;
});

const isSystemFolder = computed(() => {
  if (!currentList.value) return true;
  const reserved = ['Favorit', 'Riwayat', 'Dilaporkan'];
  return currentList.value.special || reserved.includes(currentList.value.name);
});

// Helper untuk label tipe
const getTypeLabel = (type) => {
  const labels = {
    word: t('type_word'),
    sentence: t('type_sentence'),
    materi: t('type_materi'),
    narasi: t('type_narasi'),
  };
  return labels[type] || type || '-';
};

// Helper untuk icon tipe
const getTypeIcon = (type) => {
  const icons = {
    word: 'dictionary',
    sentence: 'format_quote',
    materi: 'menu_book',
    narasi: 'auto_stories',
  };
  return icons[type] || 'bookmark';
};

// Helper untuk mendapatkan judul item berdasarkan tipe
const getItemTitle = (item) => {
  if (!item) return t('no_title');

  switch (item.type) {
    case 'word':
      // Word items have base/accented fields
      return item.accented || item.base || item.title || t('no_title');
    case 'sentence':
      // Sentence items - target language text first
      return item.target_text || item.title || t('type_sentence');
    case 'materi':
      // Materi items have title as object with lang codes, or title_display
      if (typeof item.title === 'object') {
        const tgt = languageStore.selectedTarget?.kodeBahasa;
        const src = languageStore.selectedAsal?.kodeBahasa;
        return (
          item.title?.[tgt] ||
          item.title?.[src] ||
          Object.values(item.title)[0] ||
          t('type_materi')
        );
      }
      return item.title_display || item.title || item.name || t('type_materi');
    case 'narasi':
      // Narasi items - similar to materi, may have title object or string
      if (typeof item.title === 'object') {
        const tgt = languageStore.selectedTarget?.kodeBahasa;
        const src = languageStore.selectedAsal?.kodeBahasa;
        return (
          item.title?.[tgt] ||
          item.title?.[src] ||
          Object.values(item.title)[0] ||
          t('type_narasi')
        );
      }
      return item.title || item.name || t('type_narasi');
    default:
      return item.title || item.name || `Item ${item.id}`;
  }
};

// Helper untuk mendapatkan subtitle/deskripsi item berdasarkan tipe
const getItemSubtitle = (item) => {
  if (!item) return '';

  switch (item.type) {
    case 'word':
      // Word items have translations array - show ALL translations for source language
      if (item.translations && Array.isArray(item.translations)) {
        const srcLang = languageStore.selectedAsal?.kodeBahasa;
        // Filter by source language to show translations in user's native language
        const filtered = item.translations.filter(
          (t) => t.language_code === srcLang,
        );
        if (filtered.length > 0) {
          // Show all translations, separated by comma
          return filtered
            .map((t) => t.target_word || t.tl)
            .filter(Boolean)
            .join(', ');
        }
        // Fallback if no translations match source lang: show all available translations
        const allTranslations = item.translations
          .map((t) => t.target_word || t.tl)
          .filter(Boolean);
        return allTranslations.join(', ');
      }
      return item.content || '';
    case 'sentence':
      // Sentence items - source language text
      return item.source_text || item.content || '';
    case 'materi':
      // Materi items have description as object with lang codes
      if (item.description && typeof item.description === 'object') {
        const tgt = languageStore.selectedTarget?.kodeBahasa;
        const src = languageStore.selectedAsal?.kodeBahasa;
        return item.description?.[tgt] || item.description?.[src] || '';
      }
      return item.description || item.content || '';
    case 'narasi':
      // Narasi items - content preview
      return item.content || item.description || '';
    default:
      return item.content || item.description || '';
  }
};

// Helper untuk mendapatkan bendera dari lang_pair (e.g., "id-en")
const getLangPairFlags = (pairStr) => {
  if (!pairStr) return null;
  const parts = pairStr.split('-');
  if (parts.length < 2) return null;

  return {
    source: languageStore.getFlagUrlByCode(parts[0]),
    target: languageStore.getFlagUrlByCode(parts[1]),
  };
};

// Helper untuk menghitung jumlah item berdasarkan lang_pair aktif
// Item tanpa lang_pair juga dihitung
const getItemCountByLangPair = (folder) => {
  if (!folder.items || !Array.isArray(folder.items)) return 0;
  if (!activeLangPair.value) return folder.items.length;
  return folder.items.filter(
    (item) => !item.lang_pair || item.lang_pair === activeLangPair.value,
  ).length;
};

// --- Methods ---
const handleClickFolder = (folderId) => {
  selectedFolderId.value = folderId;
  // Reset filter dan sticky state saat pindah folder
  filterType.value = '';
  filterLangPair.value = '';
  isHeaderSticky.value = false;
};

// Handle click on an item - navigate to detail view
const handleItemClick = async (item) => {
  if (!item) return;

  switch (item.type) {
    case 'word':
      // For word items, search for the word to show DetailKata
      const wordQuery = item.accented || item.base || item.title || '';
      if (wordQuery) {
        // Update search store and trigger search
        searchStore.setSearchQuery(wordQuery);
        // performSearch is triggered by watcher in Konteks.vue

        // Close the Disimpan view and go back to main app
        handleBackToProfile();
      }
      break;
    case 'sentence':
      // For sentence items, we could navigate to sentence view
      // Currently just close this view
      handleBackToProfile();
      break;
    case 'materi':
      // Navigate to Pelajari tab and open the specific materi
      // Use item.item_id if available (from backend update), or fallback to item.id
      const materiId = item.item_id || item.id;

      if (materiId) {
        // Close current view first
        handleBackToProfile();

        // Switch to Pelajari tab
        uiStore.setActiveTab('pelajari');

        // Ensure public modules are loaded (if not already) to find the materi
        if (learnStore.publicModules.length === 0) {
          const src = languageStore.selectedAsal?.kodeBahasa || 'id';
          const tgt = languageStore.selectedTarget?.kodeBahasa || 'en';
          await learnStore.fetchPublicModules(src, tgt);
        }

        // Set active view to materi and set the active materi
        uiStore.setActiveLearnView('materi');
        const idToNumber = parseInt(materiId);
        if (!isNaN(idToNumber)) {
          learnStore.setActiveMateri(idToNumber);
        } else {
          learnStore.setActiveMateri(materiId);
        }
      } else {
        handleBackToProfile();
      }
      break;
    case 'narasi':
      // Navigate to Konteks tab and open the narrative view
      const narasiId = item.item_id || item.id;
      if (narasiId) {
        handleBackToProfile();
        uiStore.setActiveTab('konteks');
        // Set the active narrative group ID (handled by Konteks.vue)
        uiStore.setActiveNarrativeGroupId(narasiId);
      } else {
        handleBackToProfile();
      }
      break;
    default:
      break;
  }
};

// Handle scroll untuk sticky header
const handleScroll = (e) => {
  const scrollTop = e.target.scrollTop;
  // Header menjadi sticky setelah scroll melewati ~80px (tinggi centered header)
  isHeaderSticky.value = scrollTop > 80;
};

const handleBackToFolders = () => {
  selectedFolderId.value = null;
  fetchedItems.value = [];
  currentFolderName.value = '';
  filterType.value = '';
  filterLangPair.value = '';
};

const handleBackToProfile = () => {
  selectedFolderId.value = null;
  fetchedItems.value = [];
  currentFolderName.value = '';
  filterType.value = '';
  filterLangPair.value = '';
  uiStore.setActiveProfileView('utama');
};

const openCreateModal = () => {
  buatDaftarMode.value = 'create';
  buatDaftarInitialData.value = {};
  isBuatDaftarModalOpen.value = true;
};

const openEditModal = () => {
  if (!currentList.value) return;
  buatDaftarMode.value = 'edit';
  buatDaftarInitialData.value = { ...currentList.value };
  isBuatDaftarModalOpen.value = true;
};

const handleFolderCreated = (newFolderName) => {
  // Logic setelah folder dibuat
};

const handleFolderUpdated = (updatedFolder) => {
  // Reactivity handles UI update
};

const handleFolderDeleted = (deletedFolderId) => {
  if (selectedFolderId.value === deletedFolderId) {
    handleBackToFolders();
  }
};

const openDeleteConfirmation = (e, item) => {
  e.stopPropagation(); // Prevent card click
  if (!currentList.value) return;

  itemToDelete.value = item;
  deleteError.value = null;
  isConfirmDeleteDialogOpen.value = true;
};

const confirmDeleteItem = async () => {
  if (!itemToDelete.value || !currentList.value || isDeleting.value) return;

  isDeleting.value = true;
  deleteError.value = null;

  try {
    await listsStore.removeFromList({
      listName: currentList.value.name,
      itemId: itemToDelete.value.id,
    });
    // Update local fetched items
    fetchedItems.value = fetchedItems.value.filter(
      (i) => i.id !== itemToDelete.value.id,
    );
    isConfirmDeleteDialogOpen.value = false;
    itemToDelete.value = null;
  } catch (err) {
    console.error(err);
    deleteError.value = t('failed_delete_item');
  } finally {
    isDeleting.value = false;
  }
};

const cancelDelete = () => {
  isConfirmDeleteDialogOpen.value = false;
  itemToDelete.value = null;
  deleteError.value = null;
};

// --- Lifecycle & Watchers ---
watchEffect(() => {
  if (authStore.isLoggedIn) {
    listsStore.initializeLists();
  }
});

watchEffect(async () => {
  if (selectedFolderId.value) {
    isLoadingItems.value = true;
    fetchedItems.value = [];
    currentFolderName.value = currentList.value
      ? currentList.value.name
      : 'Daftar'; // Fallback name

    if (currentList.value && currentList.value.items.length > 0) {
      fetchedItems.value = await listsStore.fetchDetailsForItems(
        selectedFolderId.value,
      );
    }
    isLoadingItems.value = false;
  }
});
</script>

<template>
  <div class="bg-[var(--color-surface-container-high)] rounded-3xl p-5 shadow-sm h-full flex flex-col">
    <div class="mb-4 shrink-0">
      <!-- Top Navigation Bar -->
      <div class="flex items-center justify-between mb-2">
         <button 
          @click="selectedFolderId ? handleBackToFolders() : handleBackToProfile()" 
          class="p-2 rounded-full text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)] hover:text-[var(--color-primary)] transition-colors"
          title="Kembali"
        >
          <span class="material-symbols-outlined text-xl">arrow_back</span>
        </button>

         <!-- Title for Main View (Not Folder Detail) -->
         <h3 v-if="!selectedFolderId" class="text-lg font-bold text-[var(--color-on-background)] flex items-center gap-2">
            <span class="material-symbols-outlined text-[var(--color-primary)]">bookmarks</span>
            <span>{{ $t('bookmarks') }}</span>
         </h3>
         
         <!-- Compact Folder Header (muncul di tengah saat scroll) -->
         <div v-if="selectedFolderId && isHeaderSticky" class="flex items-center gap-2 transition-all duration-300">
            <span class="text-xl">{{ currentList ? currentList.icon : '📁' }}</span>
            <span class="text-sm font-bold text-[var(--color-on-surface)] truncate max-w-[150px]">{{ currentFolderName }}</span>
         </div>
         
         <!-- Spacer ketika tidak ada title di tengah -->
         <div v-if="selectedFolderId && !isHeaderSticky" class="flex-1"></div>

        <div class="flex items-center gap-2">
            <!-- Tombol Tambah Daftar (Hanya muncul di view daftar folder) -->
            <button 
                v-if="!selectedFolderId"
                @click="openCreateModal"
                class="p-2 rounded-full text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)] hover:text-[var(--color-primary)] transition-colors"
                title="Buat Daftar Baru"
            >
                <span class="material-symbols-outlined text-xl">add</span>
            </button>
            
             <!-- Tombol Edit Daftar (Muncul di pojok kanan atas saat di dalam folder) -->
            <button 
                v-if="selectedFolderId && !isSystemFolder" 
                @click="openEditModal" 
                class="p-2 rounded-full text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)] hover:text-[var(--color-primary)] transition-colors" 
                title="Edit Daftar"
            >
                <span class="material-symbols-outlined text-xl">edit</span>
            </button>
        </div>
      </div>

      <!-- Centered Header for Folder Detail View (tersembunyi saat sticky) -->
      <div v-if="selectedFolderId && !isHeaderSticky" class="flex flex-col items-center justify-center py-4 text-center transition-all duration-300">
         <div class="relative group">
            <span class="text-6xl mb-2 block filter drop-shadow-sm">{{ currentList ? currentList.icon : '📁' }}</span>
         </div>
         <div class="flex items-center gap-2 mt-1">
             <h2 class="text-2xl font-bold text-[var(--color-on-surface)]">
                {{ currentFolderName }}
             </h2>
         </div>
      </div>
    </div>

    <!-- Folder List View -->
    <div v-if="!selectedFolderId" class="overflow-y-auto pr-1 custom-scrollbar flex-1">
      <div v-if="displayedFolders.length > 0">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div
            v-for="folder in displayedFolders"
            :key="folder.id"
            @click="handleClickFolder(folder.id)"
            class="group flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-container)] cursor-pointer hover:bg-[var(--color-primary-container)] hover:text-[var(--color-on-primary-container)] transition-all border border-transparent hover:border-[var(--color-primary)]"
          >
            <span class="text-2xl group-hover:scale-110 transition-transform">{{ folder.icon }}</span>
            
            <div class="flex flex-col overflow-hidden text-left">
              <span class="text-sm font-semibold text-[var(--color-on-surface)] group-hover:text-[var(--color-on-primary-container)] truncate">
                {{ folder.name }}
              </span>
              <span class="text-[10px] text-[var(--color-outline)] group-hover:text-[var(--color-on-primary-container)] opacity-80">
                {{ getItemCountByLangPair(folder) }} item
              </span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-4 text-[var(--color-on-surface-variant)] text-sm">
        <p>{{ $t('no_folders_yet') }}</p>
      </div>
    </div>

    <!-- Item List View -->
    <div v-else ref="scrollContainerRef" @scroll="handleScroll" class="overflow-y-auto pr-1 custom-scrollbar flex-1">
      <!-- Filter Section -->
      <div v-if="fetchedItems.length > 0" class="flex flex-wrap gap-2 mb-4">
        <!-- Filter by Type -->
        <select 
          v-model="filterType" 
          class="px-3 py-1.5 text-sm rounded-lg bg-[var(--color-surface-container)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] focus:outline-none"
        >
          <option value="">{{ $t('all_types') }}</option>
          <option v-for="type in availableTypes" :key="type as string" :value="type as string">
            {{ getTypeLabel(type) }}
          </option>
        </select>
        
        <!-- Filter by Language Pair -->
        <select 
          v-if="availableLangPairs.length > 0"
          v-model="filterLangPair" 
          class="px-3 py-1.5 text-sm rounded-lg bg-[var(--color-surface-container)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] focus:outline-none"
        >
          <option value="">{{ $t('all_languages') }}</option>
          <option v-for="pair in availableLangPairs" :key="pair as string" :value="pair as string">
            {{ (pair as string).toUpperCase() }}
          </option>
        </select>

        <!-- Sort dropdown -->
        <select 
          v-model="sortBy" 
          class="px-3 py-1.5 text-sm rounded-lg bg-[var(--color-surface-container)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] focus:outline-none"
        >
          <option value="newest">{{ $t('newest') }}</option>
          <option value="oldest">{{ $t('oldest') }}</option>
        </select>
        
        <!-- Result count -->
        <span class="text-xs text-[var(--color-outline)] self-center ml-auto">
          {{ $t('total_items_count', { current: filteredItems.length, total: fetchedItems.length }) }}
        </span>
      </div>

      <div v-if="isLoadingItems" class="flex justify-center py-8">
        <LoadingSpinner size="lg" color="primary" />
      </div>
      
      <div v-else-if="!isListEmpty" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div 
          v-for="item in filteredItems"
          :key="item.id"
          class="bg-[var(--color-surface-container)] rounded-xl p-3 border border-[var(--color-outline-variant)] hover:border-[var(--color-primary)] transition-colors cursor-pointer group relative"
          @click="handleItemClick(item)"
        >
          <!-- Header with type capsule and lang_pair badge -->
          <div class="flex items-center justify-between mb-2">
            <span 
              class="px-2 py-0.5 text-[10px] font-semibold rounded-full"
              :class="[
                item.type === 'word' ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]' :
                item.type === 'sentence' ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]' :
                'bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]'
              ]"
            >
              {{ getTypeLabel(item.type) }}
            </span>
            
             <div class="flex items-center gap-2">
                <div v-if="item.lang_pair" class="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--color-surface-container-highest)]">
                   <img 
                     v-if="getLangPairFlags(item.lang_pair)?.source" 
                     :src="getLangPairFlags(item.lang_pair).source" 
                     class="w-4 h-4 rounded-full object-cover"
                     alt="Source"
                   />
                   <span v-else class="text-[10px] font-bold uppercase">{{ item.lang_pair.split('-')[0] }}</span>
                   
                   <span class="material-symbols-outlined text-[10px] text-[var(--color-outline)]">arrow_forward</span>
                   
                   <img 
                     v-if="getLangPairFlags(item.lang_pair)?.target" 
                     :src="getLangPairFlags(item.lang_pair).target" 
                     class="w-4 h-4 rounded-full object-cover"
                     alt="Target"
                   />
                   <span v-else class="text-[10px] font-bold uppercase">{{ item.lang_pair.split('-')[1] }}</span>
                </div>
                
                <button @click="(e) => openDeleteConfirmation(e, item)" class="p-1 rounded-full text-[var(--color-error)] hover:bg-[var(--color-error-container)] transition-colors" title="Hapus dari daftar">
                    <span class="material-symbols-outlined text-sm">delete</span>
                </button>
             </div>
          </div>
          
          <!-- Item Content - unified display using helper functions -->
          <h4 class="font-bold text-[var(--color-on-surface)] text-sm">{{ getItemTitle(item) }}</h4>
          <p v-if="getItemSubtitle(item)" class="text-xs text-[var(--color-on-surface-variant)] mt-1 line-clamp-2">{{ getItemSubtitle(item) }}</p>
        </div>
      </div>
      
      <div v-else class="text-center py-8 bg-[var(--color-surface-container-low)] rounded-xl border border-dashed border-[var(--color-outline-variant)]">
        <span class="material-symbols-outlined text-4xl text-[var(--color-outline)] mb-2">folder_open</span>
        <p class="text-sm text-[var(--color-on-surface-variant)]">
          {{ filterType || filterLangPair ? $t('no_items_match') : $t('list_empty') }}
        </p>
      </div>
    </div>
    
    <BuatDaftar 
      v-model="isBuatDaftarModalOpen"
      :mode="buatDaftarMode"
      :initial-data="buatDaftarInitialData"
      @folder-created="handleFolderCreated"
      @folder-updated="handleFolderUpdated"
      @folder-deleted="handleFolderDeleted"
    />

    <!-- Delete Confirmation Modal -->
    <TransitionRoot :show="isConfirmDeleteDialogOpen" as="template">
      <Dialog @close="cancelDelete" class="relative z-[60]">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black/60" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="w-full max-w-sm transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-center align-middle shadow-xl transition-all">
              <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-error-container)]">
                <span class="material-symbols-outlined text-4xl text-[var(--color-on-error-container)]">delete</span>
              </div>
              <DialogTitle as="h3" class="mt-4 text-2xl font-bold text-[var(--color-on-background)]">{{ $t('delete_item_confirm') }}</DialogTitle>
              <p class="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                {{ $t('delete_item_desc', { list: currentList?.name }) }}
              </p>
              <div v-if="deleteError" class="mt-4 text-sm text-[var(--color-error)]">{{ deleteError }}</div>
              <div class="mt-6 grid grid-cols-2 gap-3">
                <button type="button" @click="cancelDelete" class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]">{{ $t('cancel') }}</button>
                <button @click="confirmDeleteItem" :disabled="isDeleting" class="w-full rounded-xl bg-[var(--color-error)] px-4 py-2 font-semibold text-[var(--color-on-error)] transition-colors hover:bg-[var(--color-on-error-container)] disabled:opacity-50">
                  <span v-if="isDeleting">{{ $t('deleting') }}</span>
                  <span v-else>{{ $t('delete_yes') }}</span>
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>

<style scoped>
/* Scrollbar tipis untuk list item */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--color-outline-variant);
  border-radius: 20px;
}
</style>
