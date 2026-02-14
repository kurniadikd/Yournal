<script setup lang="ts">
import { ref, onMounted, computed, reactive, watch } from 'vue';
import { api } from '@/utils/api';
import { useDebounceFn, useEventListener } from '@vueuse/core';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
} from '@headlessui/vue';

// --- TYPES ---
interface TableInfo {
  name: string;
  rows?: number;
  size?: number;
}

interface ColumnSchema {
  name: string;
  data_type: string;
  is_primary_key?: boolean;
  is_nullable?: boolean;
  foreign_key_table?: string;
  [key: string]: any;
}

interface DbStats {
  database_size: number;
  database_name: string;
  total_rows: number;
  table_count: number;
  index_count: number;
  index_size: number;
  active_connections: number;
  pg_version?: string;
}

interface Pagination {
  page: number;
  total: number;
  size: number;
}

interface SortState {
  col: string | null;
  desc: boolean;
}

// --- PROPS & EMITS ---
const emit = defineEmits<{
  (e: 'close'): void;
}>();

// --- CONFIG ---
const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

// --- STATE ---
const tables = ref<TableInfo[]>([]);
const currentTable = ref<string | null>(null);
const schema = ref<ColumnSchema[]>([]);
const items = ref<any[]>([]); // Dynamic data
const loading = ref(false);
const tablesLoading = ref(false); // Loading state untuk list tabel
const mobileMenuOpen = ref(false);
const activePk = ref('id');

// [FITUR BARU] Sidebar Resizing & Collapse
const sidebarWidth = ref(256);
const isSidebarCollapsed = ref(false);
let resizeCleanup: (() => void) | null = null;

const doResize = (event: MouseEvent) => {
  // Menyesuaikan dengan posisi awal sidebar yg mungkin tidak 0
  const newWidth = event.clientX;
  if (newWidth >= 220 && newWidth <= 500) {
    sidebarWidth.value = newWidth;
  }
};

const stopResize = () => {
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  if (resizeCleanup) {
    resizeCleanup();
    resizeCleanup = null;
  }
};

const startResize = (event: MouseEvent) => {
  event.preventDefault();
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';

  // Gunakan useEventListener untuk attach (return function cleanup)
  const stopMove = useEventListener(window, 'mousemove', doResize);
  const stopUp = useEventListener(window, 'mouseup', stopResize);

  // Simpan cleanup function
  resizeCleanup = () => {
    stopMove();
    stopUp();
  };
};

const toggleSidebarCollapse = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
};

// Dashboard & Counts
const tableCounts = reactive<Record<string, number | null>>({}); // Cache jumlah row per tabel
const dbStats = ref<DbStats | null>(null); // Database statistics
const dbStatsLoading = ref(false);

// [FITUR BARU] FK Lookup Cache
// Format: { 'col_name': { id_1: 'Label A', id_2: 'Label B' } }
const fkLookupMap = reactive<Record<string, Record<string | number, string>>>({});

// Table View Config
const density = ref<'normal' | 'compact' | 'comfortable'>('normal');
const hiddenColumns = ref(new Set<string>());

// Pagination, Sort, Filter
const pagination = reactive<Pagination>({ page: 1, total: 0, size: 20 });
const sortState = reactive<SortState>({ col: null, desc: false });
const filters = reactive<Record<string, any>>({});

// Selection
const selectedIds = ref(new Set<string | number>());

// Form State
const showForm = ref(false);
const formData = ref<Record<string, any>>({});
const editPkValue = ref<string | number | null>(null);
const formLoading = ref(false);

// FK Options (untuk Dropdown di Form)
const fkOptions = reactive<Record<string, { value: any; label: string }[]>>({});
const fkLoading = reactive<Record<string, boolean>>({});
const fkCache = reactive<Record<string, any[]>>({});

// Detail & JSON Editor State
const showDetail = ref(false);
const detailItem = ref<any>(null);
const showJsonEditor = ref(false);
const jsonEditorContent = ref('');
const jsonEditorTargetCol = ref<string | null>(null);
const jsonError = ref<string | null>(null);

// --- COMPUTED PROPERTIES ---
const visibleColumns = computed(() => {
  return schema.value.filter(
    (col) =>
      !['password', 'secret', 'token'].includes(col.name) &&
      col.data_type !== 'bytea' &&
      !hiddenColumns.value.has(col.name),
  );
});

const allColumns = computed(() =>
  schema.value.filter(
    (col) => !['password', 'secret', 'token'].includes(col.name),
  ),
);

const totalPages = computed(() => {
  if (pagination.total === 0) return 1;
  return Math.ceil(pagination.total / pagination.size);
});

const isAllSelected = computed(() => {
  return (
    items.value.length > 0 &&
    items.value.every((item) => selectedIds.value.has(item[activePk.value]))
  );
});

const hasActiveFilters = computed(() =>
  Object.values(filters).some((v) => v !== null && v !== ''),
);

const cellPaddingClass = computed(() => {
  switch (density.value) {
    case 'compact':
      return 'px-2 py-1.5 text-xs';
    case 'comfortable':
      return 'px-4 py-4 text-sm';
    default:
      return 'px-4 py-2.5 text-sm';
  }
});

// --- WATCHERS ---
watch(schema, (newSchema) => {
  const pkCol = newSchema.find((col) => col.is_primary_key);
  activePk.value = pkCol ? pkCol.name : 'id';
  hiddenColumns.value.clear();
  // Reset cache lookup tampilan saat ganti tabel
  Object.keys(fkLookupMap).forEach((key) => delete fkLookupMap[key]);
});

// --- API ACTIONS ---
const callApi = async (payload: any) => {
  try {
    const response = await api.post('/admin', payload);
    return response.data;
  } catch (e) {
    console.error('API Error:', e);
    throw e;
  }
};

const loadTables = async () => {
  tablesLoading.value = true;
  try {
    tables.value = await callApi({ op: 'list_tables' });
    // Fetch stats dan counts secara background
    loadDbStats();
    fetchTableCounts();
  } finally {
    tablesLoading.value = false;
  }
};

// Ambil statistik database untuk Dashboard
const loadDbStats = async () => {
  dbStatsLoading.value = true;
  try {
    dbStats.value = await callApi({ op: 'db_stats' });
  } catch (e) {
    console.error('Failed to load DB stats:', e);
    dbStats.value = null;
  } finally {
    dbStatsLoading.value = false;
  }
};

// Format bytes ke human readable
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Ambil jumlah data untuk tampilan Dashboard Tiles
const fetchTableCounts = async () => {
  for (const t of tables.value) {
    try {
      const res = await callApi({
        op: 'list',
        table: t.name,
        page: 1,
        page_size: 1,
        filters: {},
      });
      tableCounts[t.name] = res.total;
    } catch (e) {
      tableCounts[t.name] = null;
    }
  }
};

const selectTable = async (table: string) => {
  currentTable.value = table;
  pagination.page = 1;
  sortState.col = null;
  sortState.desc = false;
  selectedIds.value.clear();
  mobileMenuOpen.value = false;

  // Bersihkan state lama
  Object.keys(filters).forEach((key) => delete filters[key]);
  Object.keys(fkOptions).forEach((key) => delete fkOptions[key]);
  Object.keys(fkLookupMap).forEach((key) => delete fkLookupMap[key]);

  loading.value = true;
  try {
    schema.value = await callApi({ op: 'get_schema', table });
    await refreshData();
  } finally {
    loading.value = false;
    showForm.value = false;
  }
};

// [LOGIC UTAMA] Fetch Data + Fetch Nama FK
const refreshData = async () => {
  loading.value = true;
  let sort_by = null;
  if (sortState.col) {
    sort_by = (sortState.desc ? '-' : '') + sortState.col;
  }

  const activeFilters: Record<string, any> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v !== null && v !== '') activeFilters[k] = v;
  }

  try {
    const res = await callApi({
      op: 'list',
      table: currentTable.value,
      page: Number(pagination.page),
      page_size: Number(pagination.size),
      sort_by,
      filters: activeFilters,
    });
    items.value = res.data;
    pagination.total = res.total;

    // Update count di dashboard juga
    if (currentTable.value) tableCounts[currentTable.value] = res.total;

    // [PENTING] Setelah data tabel didapat, cari label untuk kolom FK
    await fetchFkLabels();

    selectedIds.value.clear();
  } finally {
    loading.value = false;
  }
};

// [LOGIC BARU] Batch Lookup untuk Label FK
const fetchFkLabels = async () => {
  // 1. Cari kolom yang merupakan FK
  const fkCols = schema.value.filter((col) => col.foreign_key_table);
  if (fkCols.length === 0 || items.value.length === 0) return;

  for (const col of fkCols) {
    if (!col.foreign_key_table) continue;
    // 2. Kumpulkan ID unik dari kolom tersebut di halaman ini
    const rawIds = items.value.map((row) => row[col.name]);
    const uniqueIds = [
      ...new Set(rawIds.filter((val) => val !== null && val !== undefined)),
    ];

    if (uniqueIds.length === 0) continue;

    // 3. Cek cache lokal (agar tidak request ulang ID yg sudah ada)
    if (!fkLookupMap[col.name]) fkLookupMap[col.name] = {};
    const uncachedIds = uniqueIds.filter((id) => !fkLookupMap[col.name][id]);

    if (uncachedIds.length === 0) continue;

    try {
      // 4. Request ke tabel referensi menggunakan filter IN (comma separated)
      // Backend sudah kita update untuk menghandle "id": "1,2,5"
      const res = await callApi({
        op: 'list',
        table: col.foreign_key_table,
        page: 1,
        page_size: uncachedIds.length,
        filters: { id: uncachedIds.join(',') }, // Asumsi PK referensi selalu 'id'
      });

      // 5. Tebak field mana yg jadi Label (name, title, dll)
      const labelField =
        Object.keys(res.data[0] || {}).find((k) =>
          [
            'name',
            'title',
            'label',
            'slug',
            'username',
            'email',
            'code',
            'word',
            'text',
          ].includes(k),
        ) || 'id';

      // 6. Simpan ke map
      res.data.forEach((row: any) => {
        fkLookupMap[col.name][row.id] = row[labelField];
      });
    } catch (e) {
      console.warn(`Gagal fetch label FK utk ${col.name}`, e);
    }
  }
};

const applyFilter = useDebounceFn(() => {
  pagination.page = 1;
  refreshData();
}, 300);

const clearFilters = () => {
  Object.keys(filters).forEach((key) => (filters[key] = ''));
  applyFilter();
};

const toggleSort = (colName: string) => {
  if (sortState.col === colName) {
    sortState.desc = !sortState.desc;
  } else {
    sortState.col = colName;
    sortState.desc = false;
  }
  refreshData();
};

const changePage = (val: number | string) => {
  const newPage = Number(val);
  if (newPage > 0 && newPage <= totalPages.value) {
    pagination.page = newPage;
    refreshData();
  }
};

const changePageSize = (val: number | string) => {
  const newSize = Number(val);
  pagination.size = newSize;
  pagination.page = 1;
  refreshData();
};

const toggleColumnVisibility = (colName: string) => {
  if (hiddenColumns.value.has(colName)) hiddenColumns.value.delete(colName);
  else hiddenColumns.value.add(colName);
};

const downloadCSV = () => {
  if (!items.value.length) return;
  const headers = visibleColumns.value.map((c) => c.name);
  const csvContent = [
    headers.join(','),
    ...items.value.map((row) =>
      headers
        .map((fieldName) => {
          let val = row[fieldName];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object')
            val = JSON.stringify(val).replace(/"/g, '""');
          else val = String(val).replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(','),
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${currentTable.value}_export.csv`;
  link.click();
  link.click();
};

const handlePageSizeChange = (e: Event) => {
  const val = (e.target as HTMLSelectElement).value;
  changePageSize(Number(val));
};

const handlePageChange = (e: Event) => {
  const val = (e.target as HTMLInputElement).value;
  changePage(Number(val));
};

// --- SELECTION & BATCH DELETE ---
const toggleSelectAll = () => {
  if (isAllSelected.value) selectedIds.value.clear();
  else
    items.value.forEach((item) => selectedIds.value.add(item[activePk.value]));
};

const toggleSelectRow = (id: string | number) => {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id);
  else selectedIds.value.add(id);
};

const deleteSelected = async () => {
  const count = selectedIds.value.size;
  if (!count) return;
  if (!confirm(`Yakin ingin menghapus ${count} data terpilih?`)) return;

  loading.value = true;
  try {
    // Mengirim array PK ke backend 'delete_many'
    await callApi({
      op: 'delete_many',
      table: currentTable.value,
      pks: Array.from(selectedIds.value),
    });

    selectedIds.value.clear();
    refreshData();
  } catch (e) {
    alert('Gagal menghapus data.');
  } finally {
    loading.value = false;
  }
};

// --- FK SEARCH (Untuk Dropdown Form) ---
const searchFkOptions = useDebounceFn(async (colName: string, refTable: string, query: string) => {
  if (!query && fkCache[refTable]) {
    fkOptions[colName] = fkCache[refTable];
    return;
  }
  fkLoading[colName] = true;
  try {
    const filters = query ? { q: query } : {};
    const res = await callApi({
      op: 'list',
      table: refTable,
      page: 1,
      page_size: 50,
      filters,
    });

    const labelField =
      Object.keys(res.data[0] || {}).find((k) =>
        [
          'name',
          'title',
          'label',
          'slug',
          'username',
          'email',
          'code',
        ].includes(k),
      ) || 'id';
    const mapped = res.data.map((row: any) => ({
      value: row.id,
      label: `${row[labelField]} (ID:${row.id})`,
    }));

    fkOptions[colName] = mapped;
    if (!query) fkCache[refTable] = mapped;
  } finally {
    fkLoading[colName] = false;
  }
}, 300);

const onFkSearchInput = (col: any, table: string, event: Event) => {
  searchFkOptions(col, table, (event.target as HTMLInputElement).value);
};
const initFkOptions = (colName: string, refTable: string) => {
  if (fkCache[refTable]) fkOptions[colName] = fkCache[refTable];
  else searchFkOptions(colName, refTable, '');
};

// --- FORM & JSON EDITOR ---
const openCreate = () => {
  formData.value = {};
  editPkValue.value = null;
  schema.value.forEach((col) => {
    if (col.data_type === 'boolean') formData.value[col.name] = false;
    if (col.foreign_key_table) initFkOptions(col.name, col.foreign_key_table);
    if (['json', 'jsonb'].includes(col.data_type))
      formData.value[col.name] = '{}';
  });
  showForm.value = true;
};

const openEdit = (item: any) => {
  formData.value = JSON.parse(JSON.stringify(item));
  editPkValue.value = item[activePk.value];
  schema.value.forEach((col) => {
    if (col.foreign_key_table) initFkOptions(col.name, col.foreign_key_table);
    if (
      ['json', 'jsonb'].includes(col.data_type) &&
      typeof formData.value[col.name] === 'object'
    ) {
      formData.value[col.name] = JSON.stringify(
        formData.value[col.name],
        null,
        2,
      );
    }
  });
  showForm.value = true;
};

const openJsonEditor = (colName: string) => {
  jsonEditorTargetCol.value = colName;
  let val = formData.value[colName];
  if (typeof val === 'string') {
    try {
      const inner = JSON.parse(val);
      if (typeof inner === 'object' && inner !== null) val = inner;
    } catch (e) { }
  }
  if (typeof val === 'object' && val !== null)
    val = JSON.stringify(val, null, 2);
  else if (!val) val = '{}';

  jsonEditorContent.value = val;
  jsonError.value = null;
  showJsonEditor.value = true;
};

const saveJsonEditor = () => {
  if (!jsonEditorTargetCol.value) return;
  try {
    const parsed = JSON.parse(jsonEditorContent.value);
    formData.value[jsonEditorTargetCol.value] = JSON.stringify(parsed, null, 2);
    showJsonEditor.value = false;
  } catch (e: any) {
    jsonError.value = 'Format JSON tidak valid: ' + e.message;
  }
};

const save = async () => {
  const op = editPkValue.value ? 'update' : 'create';
  const payload: any = { op, table: currentTable.value, data: formData.value };
  if (editPkValue.value) payload.pk = editPkValue.value;

  for (const col of schema.value) {
    if (
      ['json', 'jsonb'].includes(col.data_type) &&
      typeof formData.value[col.name] === 'string'
    ) {
      try {
        formData.value[col.name] = JSON.parse(formData.value[col.name]);
      } catch (e) {
        alert(`Kolom ${col.name} invalid JSON!`);
        return;
      }
    }
    if (col.is_nullable && formData.value[col.name] === '')
      formData.value[col.name] = null;
  }
  try {
    formLoading.value = true;
    await callApi(payload);
    showForm.value = false;
    refreshData();
  } finally {
    formLoading.value = false;
  }
};

const openDetail = (item: any) => {
  detailItem.value = item;
  showDetail.value = true;
};

const jsonPreview = (val: any) => {
  if (!val) return '{}';
  const str = typeof val === 'string' ? val : JSON.stringify(val);
  return str.length > 50 ? str.slice(0, 50) + '...' : str;
};

onMounted(loadTables);
</script>
<template>
  <div
    class="flex flex-col h-full bg-[var(--color-surface-container-low)] text-[var(--color-on-background)] relative overflow-hidden">

    <header
      class="h-16 shrink-0 bg-[var(--color-surface)] border-b border-[var(--color-outline-variant)] flex items-center justify-between px-4 lg:px-6 z-40 shadow-sm">
      <div class="flex items-center gap-3">
        <button @click="toggleSidebarCollapse" title="Toggle Sidebar"
          class="hidden lg:block p-2 -ml-2 rounded-full hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]">
          <span class="material-symbols-outlined">
            {{ isSidebarCollapsed ? 'menu' : 'menu_open' }}
          </span>
        </button>
        <div class="w-px h-6 bg-[var(--color-outline-variant)] hidden lg:block"></div>
        <button v-if="currentTable" @click="currentTable = null"
          class="lg:hidden p-2 -ml-2 rounded hover:bg-[var(--color-surface-container-high)] text-[var(--color-primary)]">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <img src="/Leksika_icon.svg" class="h-8 w-8" alt="Logo" />
        <h1 class="text-xl font-black tracking-tight hidden sm:block">Admin Panel</h1>
      </div>
      <button @click="emit('close')"
        class="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-error)] text-[var(--color-on-error)] rounded-lg text-sm font-bold hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)] transition-colors">
        <span class="material-symbols-outlined text-lg">logout</span>
        <span class="hidden sm:inline">Exit</span>
      </button>
    </header>

    <div class="flex flex-1 overflow-hidden relative">

      <aside :style="{ width: isSidebarCollapsed ? '0px' : sidebarWidth + 'px' }"
        class="hidden lg:flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-outline-variant)] z-20 relative transition-all duration-300 ease-in-out shrink-0"
        :class="{ 'border-r-0': isSidebarCollapsed }">

        <div class="w-full h-full flex flex-col overflow-hidden">
          <div
            class="p-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] flex justify-between items-center">
            <div class="text-xs font-black uppercase tracking-wider text-[var(--color-on-surface)]">Database Tables
            </div>
            <button v-if="currentTable" @click="currentTable = null"
              class="text-[var(--color-primary)] text-xs font-bold hover:underline">Dashboard</button>
          </div>
          <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            <div v-if="tablesLoading" class="p-4 flex justify-center"><span
                class="material-symbols-outlined animate-spin text-[var(--color-primary)]">sync</span></div>
            <button v-else v-for="t in tables" :key="t.name" @click="selectTable(t.name)"
              class="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 group"
              :class="currentTable === t.name
                ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] font-bold'
                : 'text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]'">
              <span class="material-symbols-outlined text-[18px]"
                :class="currentTable === t.name ? 'text-[var(--color-primary)]' : 'text-[var(--color-outline)] group-hover:text-[var(--color-primary)]'">dataset</span>
              <div class="flex-1 flex flex-col overflow-hidden">
                <span class="truncate">{{ t.name }}</span>
                <span class="text-[9px] text-[var(--color-on-surface-variant)] opacity-70">{{ t.rows?.toLocaleString()
                  || 0 }} • {{ formatBytes(t.size || 0) }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Resizer Handle -->
        <div @mousedown="startResize" v-show="!isSidebarCollapsed"
          class="absolute top-0 -right-0.5 h-full w-1.5 cursor-col-resize z-30 group">
          <div class="h-full w-0.5 bg-transparent group-hover:bg-[var(--color-primary)] transition-colors duration-200">
          </div>
        </div>
      </aside>

      <TransitionRoot as="template" :show="mobileMenuOpen">
        <Dialog as="div" class="relative z-50 lg:hidden" @close="mobileMenuOpen = false">
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div class="fixed inset-0 flex">
            <DialogPanel class="relative mr-16 flex w-full max-w-xs flex-1 bg-[var(--color-surface)] shadow-xl">
              <div class="flex flex-col h-full w-full">
                <div
                  class="p-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] flex justify-between items-center">
                  <span class="text-lg font-bold">Pilih Tabel</span>
                  <button v-if="currentTable" @click="currentTable = null; mobileMenuOpen = false"
                    class="text-sm font-bold text-[var(--color-primary)]">Home</button>
                </div>
                <div class="flex-1 overflow-y-auto p-2">
                  <div v-for="t in tables" :key="t.name" @click="selectTable(t.name)"
                    class="px-4 py-3 rounded-lg mb-1 text-sm font-bold cursor-pointer transition-colors flex justify-between items-center"
                    :class="currentTable === t.name ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]' : 'text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]'">
                    <div class="flex flex-col">
                      <span>{{ t.name }}</span>
                      <span class="text-[10px] opacity-70">{{ t.rows?.toLocaleString() || 0 }} rows • {{
                        formatBytes(t.size || 0) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      </TransitionRoot>

      <main class="flex-1 flex flex-col min-w-0 bg-[var(--color-surface-container)] relative">

        <div v-if="!currentTable" class="absolute inset-0 overflow-y-auto custom-scrollbar p-6 sm:p-8">
          <div class="max-w-7xl mx-auto">
            <!-- Database Statistics Header -->
            <div class="mb-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-3xl font-black text-[var(--color-on-background)] tracking-tight">Dashboard Database</h2>
                <button @click="loadDbStats" :disabled="dbStatsLoading"
                  class="flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:underline">
                  <span class="material-symbols-outlined text-sm"
                    :class="dbStatsLoading ? 'animate-spin' : ''">refresh</span>
                  Refresh Stats
                </button>
              </div>

              <!-- DB Stats Cards (Mobile Carousel / Desktop Grid) -->
              <div v-if="dbStats" class="mb-6">
                <!-- Mobile: Horizontal scroll carousel -->
                <div class="sm:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 -mx-6 px-6 scrollbar-hide">
                  <div
                    class="bg-[var(--color-primary)] rounded-xl p-4 text-[var(--color-on-primary)] shadow-md min-w-[140px] snap-start shrink-0">
                    <div class="text-xs opacity-80 font-medium uppercase tracking-wider">Ukuran DB</div>
                    <div class="text-2xl font-black mt-1">{{ formatBytes(dbStats.database_size) }}</div>
                    <div class="text-[10px] opacity-70 mt-1 truncate">{{ dbStats.database_name }}</div>
                  </div>
                  <div
                    class="bg-[var(--color-tertiary)] rounded-xl p-4 text-[var(--color-on-tertiary)] shadow-md min-w-[140px] snap-start shrink-0">
                    <div class="text-xs opacity-80 font-medium uppercase tracking-wider">Total Rows</div>
                    <div class="text-2xl font-black mt-1">{{ dbStats.total_rows >= 1000000 ? (dbStats.total_rows /
                      1000000).toFixed(2) + 'M' : dbStats.total_rows.toLocaleString() }}</div>
                    <div class="text-[10px] opacity-70 mt-1">baris data</div>
                  </div>
                  <div
                    class="bg-[var(--color-secondary)] rounded-xl p-4 text-[var(--color-on-secondary)] shadow-md min-w-[140px] snap-start shrink-0">
                    <div class="text-xs opacity-80 font-medium uppercase tracking-wider">Tabel</div>
                    <div class="text-2xl font-black mt-1">{{ dbStats.table_count }}</div>
                    <div class="text-[10px] opacity-70 mt-1">tabel aktif</div>
                  </div>
                  <div
                    class="bg-[var(--color-primary-container)] rounded-xl p-4 text-[var(--color-on-primary-container)] shadow-md min-w-[140px] snap-start shrink-0">
                    <div class="text-xs opacity-80 font-medium uppercase tracking-wider">Indexes</div>
                    <div class="text-2xl font-black mt-1">{{ dbStats.index_count }}</div>
                    <div class="text-[10px] opacity-70 mt-1">{{ formatBytes(dbStats.index_size) }}</div>
                  </div>
                  <div
                    class="bg-[var(--color-error)] rounded-xl p-4 text-[var(--color-on-error)] shadow-md min-w-[140px] snap-start shrink-0">
                    <div class="text-xs opacity-80 font-medium uppercase tracking-wider">Koneksi</div>
                    <div class="text-2xl font-black mt-1">{{ dbStats.active_connections }}</div>
                    <div class="text-[10px] opacity-70 mt-1">aktif</div>
                  </div>
                  <div
                    class="bg-[var(--color-surface-container-highest)] rounded-xl p-4 text-[var(--color-on-surface)] shadow-md min-w-[140px] snap-start shrink-0">
                    <div class="text-xs opacity-80 font-medium uppercase tracking-wider">PostgreSQL</div>
                    <div class="text-lg font-black mt-1">{{ dbStats.pg_version?.match(/PostgreSQL (\d+\.\d+)/)?.[1] ||
                      '18' }}</div>
                    <div class="text-[10px] opacity-70 mt-1 truncate">{{ dbStats.pg_version?.split(' on ')[0]?.replace('PostgreSQL ', '') }}</div>
                  </div>
                </div>
                <!-- Desktop: Grid layout -->
                <div class="hidden sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div class="bg-[var(--color-primary)] rounded-xl p-4 text-[var(--color-on-primary)] shadow-md">
                    <div class="text-xs opacity-80 font-medium uppercase tracking-wider">Ukuran DB</div>
                    <div class="text-2xl font-black mt-1">{{ formatBytes(dbStats.database_size) }}</div>
                    <div class="text-[10px] opacity-70 mt-1 truncate">{{ dbStats.database_name }}</div>
                  </div>
                  <div class="bg-[var(--color-tertiary)] rounded-xl p-4 text-[var(--color-on-tertiary)] shadow-md">
                    <div class="text-xs opacity-80 font-medium uppercase tracking-wider">Total Rows</div>
                    <div class="text-2xl font-black mt-1">{{ dbStats.total_rows >= 1000000 ? (dbStats.total_rows /
                      1000000).toFixed(2) + 'M' : dbStats.total_rows.toLocaleString() }}</div>
                    <div class="text-[10px] opacity-70 mt-1">baris data</div>
                  </div>
                  <div class="bg-[var(--color-secondary)] rounded-xl p-4 text-[var(--color-on-secondary)] shadow-md">
                    <div class="text-xs opacity-80 font-medium uppercase tracking-wider">Tabel</div>
                    <div class="text-2xl font-black mt-1">{{ dbStats.table_count }}</div>
                    <div class="text-[10px] opacity-70 mt-1">tabel aktif</div>
                  </div>
                  <div
                    class="bg-[var(--color-primary-container)] rounded-xl p-4 text-[var(--color-on-primary-container)] shadow-md">
                    <div class="text-xs opacity-80 font-medium uppercase tracking-wider">Indexes</div>
                    <div class="text-2xl font-black mt-1">{{ dbStats.index_count }}</div>
                    <div class="text-[10px] opacity-70 mt-1">{{ formatBytes(dbStats.index_size) }}</div>
                  </div>
                  <div class="bg-[var(--color-error)] rounded-xl p-4 text-[var(--color-on-error)] shadow-md">
                    <div class="text-xs opacity-80 font-medium uppercase tracking-wider">Koneksi</div>
                    <div class="text-2xl font-black mt-1">{{ dbStats.active_connections }}</div>
                    <div class="text-[10px] opacity-70 mt-1">aktif</div>
                  </div>
                  <div
                    class="bg-[var(--color-surface-container-highest)] rounded-xl p-4 text-[var(--color-on-surface)] shadow-md">
                    <div class="text-xs opacity-80 font-medium uppercase tracking-wider">PostgreSQL</div>
                    <div class="text-lg font-black mt-1">{{ dbStats.pg_version?.match(/PostgreSQL (\d+\.\d+)/)?.[1] ||
                      '18' }}</div>
                    <div class="text-[10px] opacity-70 mt-1 truncate">{{ dbStats.pg_version?.split(' on ')[0]?.replace('PostgreSQL ', '') }}</div>
                  </div>
                </div>
              </div>

              <p class="text-[var(--color-on-surface-variant)] text-sm mb-4">Pilih tabel di bawah untuk mulai mengelola
                data:</p>
            </div>

            <div v-if="tablesLoading" class="flex flex-col items-center justify-center py-20 opacity-60">
              <span class="material-symbols-outlined text-4xl animate-spin text-[var(--color-primary)] mb-4">sync</span>
              <span class="font-bold text-[var(--color-on-surface)]">Memuat tabel...</span>
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div v-for="t in tables" :key="t.name" @click="selectTable(t.name)"
                class="group bg-[var(--color-surface)] border border-[var(--color-outline-variant)] hover:border-[var(--color-primary)] hover:shadow-lg hover:-translate-y-1 rounded-2xl p-5 cursor-pointer transition-all duration-300 flex flex-col justify-between h-32 relative overflow-hidden">

                <span
                  class="material-symbols-outlined absolute -right-4 -bottom-4 text-[6rem] text-[var(--color-surface-container-highest)] opacity-20 group-hover:opacity-40 transition-opacity rotate-12 pointer-events-none">table_chart</span>

                <div class="flex items-start justify-between relative z-10">
                  <div
                    class="h-10 w-10 rounded-xl bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <span class="material-symbols-outlined">dataset</span>
                  </div>
                  <span
                    class="material-symbols-outlined text-[var(--color-outline)] group-hover:text-[var(--color-primary)] transition-colors">arrow_forward</span>
                </div>

                <div class="relative z-10">
                  <h3 class="font-bold text-lg text-[var(--color-on-surface)] truncate capitalize" :title="t.name">{{
                    t.name }}</h3>
                  <div class="mt-0.5 flex items-center gap-2">
                    <p class="text-[11px] uppercase font-bold tracking-widest"
                      :class="t.rows === 0 ? 'text-[var(--color-outline)]' : 'text-[var(--color-primary)]'">
                      {{ t.rows?.toLocaleString() || 0 }} Rows
                    </p>
                    <span class="text-[var(--color-outline)]">•</span>
                    <p class="text-[10px] text-[var(--color-on-surface-variant)]">{{ formatBytes(t.size || 0) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="flex flex-col h-full">
          <div
            class="bg-[var(--color-surface)] border-b border-[var(--color-outline-variant)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm z-10">
            <div class="flex items-center gap-3 min-w-0">
              <button @click="mobileMenuOpen = true"
                class="lg:hidden p-2 -ml-2 rounded hover:bg-[var(--color-surface-container-high)]">
                <span class="material-symbols-outlined">menu</span>
              </button>
              <div>
                <h2 class="text-lg font-bold text-[var(--color-on-surface)] capitalize truncate leading-tight">
                  {{ currentTable }}
                </h2>
                <div class="text-xs text-[var(--color-on-surface-variant)] flex items-center gap-1">
                  <span>Total: <b>{{ pagination.total }}</b> data</span>
                  <span v-if="loading" class="ml-2 flex items-center text-[var(--color-primary)]"><span
                      class="material-symbols-outlined text-sm animate-spin mr-1">sync</span> Loading...</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <Menu as="div" class="relative">
                <MenuButton
                  class="p-2 rounded-lg border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] flex items-center gap-1 text-xs font-bold bg-[var(--color-surface)]"
                  title="Atur Kolom">
                  <span class="material-symbols-outlined text-lg">view_column</span>
                </MenuButton>
                <transition enter-active-class="transition ease-out duration-100"
                  enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100"
                  leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100"
                  leave-to-class="transform opacity-0 scale-95">
                  <MenuItems
                    class="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-[var(--color-surface)] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 max-h-64 overflow-y-auto custom-scrollbar py-1">
                    <div
                      class="px-3 py-2 text-xs font-bold text-[var(--color-primary)] border-b border-[var(--color-outline-variant)]">
                      Toggle Columns</div>
                    <MenuItem v-for="col in allColumns" :key="col.name" v-slot="{ active }">
                    <button @click.stop="toggleColumnVisibility(col.name)"
                      :class="[active ? 'bg-[var(--color-surface-container-high)]' : '', 'group flex w-full items-center px-3 py-2 text-xs']">
                      <span class="material-symbols-outlined text-base mr-2"
                        :class="hiddenColumns.has(col.name) ? 'text-[var(--color-outline)]' : 'text-[var(--color-primary)]'">
                        {{ hiddenColumns.has(col.name) ? 'check_box_outline_blank' : 'check_box' }}
                      </span>
                      {{ col.name }}
                    </button>
                    </MenuItem>
                  </MenuItems>
                </transition>
              </Menu>

              <Menu as="div" class="relative">
                <MenuButton
                  class="p-2 rounded-lg border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] flex items-center gap-1 text-xs font-bold bg-[var(--color-surface)]"
                  title="Kerapatan Baris">
                  <span class="material-symbols-outlined text-lg">density_medium</span>
                </MenuButton>
                <transition enter-active-class="transition ease-out duration-100"
                  enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100">
                  <MenuItems
                    class="absolute right-0 mt-2 w-32 origin-top-right rounded-md bg-[var(--color-surface)] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 py-1">
                    <MenuItem v-for="d in ['compact', 'normal', 'comfortable']" :key="d" v-slot="{ active }">
                    <button @click="density = d as 'normal' | 'compact' | 'comfortable'"
                      :class="[active ? 'bg-[var(--color-surface-container-high)]' : '', density === d ? 'text-[var(--color-primary)] font-bold' : '', 'flex w-full items-center px-3 py-2 text-xs capitalize']">
                      {{ d }}
                    </button>
                    </MenuItem>
                  </MenuItems>
                </transition>
              </Menu>

              <button @click="downloadCSV"
                class="p-2 rounded-lg border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] bg-[var(--color-surface)]"
                title="Export CSV">
                <span class="material-symbols-outlined text-lg">download</span>
              </button>

              <div class="h-6 w-px bg-[var(--color-outline-variant)] mx-1"></div>

              <button v-if="selectedIds.size > 0" @click="deleteSelected"
                class="flex items-center gap-1 px-3 py-2 bg-[var(--color-error)] hover:bg-[var(--color-error-container)] text-[var(--color-on-error)] rounded-lg text-xs font-bold transition-colors shadow-sm">
                <span class="material-symbols-outlined text-lg">delete</span>
                <span class="hidden sm:inline">Hapus ({{ selectedIds.size }})</span>
              </button>

              <button @click="refreshData"
                class="p-2 rounded-lg hover:bg-[var(--color-surface-container-high)] text-[var(--color-primary)]"
                title="Refresh Data">
                <span class="material-symbols-outlined text-lg" :class="loading ? 'animate-spin' : ''">refresh</span>
              </button>

              <button @click="openCreate"
                class="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] text-[var(--color-on-primary)] px-4 py-2 rounded-lg text-xs font-bold shadow transition-colors">
                <span class="material-symbols-outlined text-lg">add</span>
                <span>Baru</span>
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-hidden relative p-2 sm:p-4">
            <div
              class="h-full flex flex-col bg-[var(--color-surface)] rounded-xl border border-[var(--color-outline-variant)] shadow-sm overflow-hidden relative">

              <div v-if="hasActiveFilters"
                class="bg-yellow-50 px-4 py-2 border-b border-yellow-100 flex items-center justify-between text-xs">
                <span class="text-yellow-800 font-medium flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm">filter_alt</span>
                  Filter aktif diterapkan.
                </span>
                <button @click="clearFilters" class="text-yellow-700 hover:text-yellow-900 underline font-bold">Reset
                  Filter</button>
              </div>

              <div class="flex-1 overflow-auto custom-scrollbar relative w-full">
                <table class="min-w-full border-collapse table-auto">
                  <thead
                    class="bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)] sticky top-0 z-30 shadow-sm">
                    <tr>
                      <th
                        class="w-12 border-b border-r border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] sticky left-0 z-40 text-center px-2">
                        <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll"
                          class="w-4 h-4 rounded border-[var(--color-outline)] text-[var(--color-primary)] focus:ring-0 cursor-pointer">
                      </th>

                      <th v-for="col in visibleColumns" :key="col.name"
                        class="border-b border-r border-[var(--color-outline-variant)] min-w-[160px] align-top group bg-[var(--color-surface-container-low)]">
                        <div class="flex flex-col gap-2 p-3">
                          <div class="flex items-center justify-between select-none cursor-pointer"
                            @click="toggleSort(col.name)">
                            <div
                              class="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-[var(--color-on-surface)]">
                              <span class="truncate" :title="col.name">{{ col.name }}</span>
                              <span v-if="col.is_primary_key"
                                class="text-[9px] px-1 bg-amber-100 text-amber-800 rounded border border-amber-200 font-mono">PK</span>
                            </div>
                            <span class="material-symbols-outlined text-sm transition-opacity"
                              :class="sortState.col === col.name ? 'text-[var(--color-primary)] opacity-100' : 'opacity-0 group-hover:opacity-30'">
                              {{ sortState.col === col.name && sortState.desc ? 'arrow_downward' : 'arrow_upward' }}
                            </span>
                          </div>
                          <div class="relative">
                            <input v-model="filters[col.name]" @input="applyFilter" type="text"
                              class="w-full px-2 py-1 text-[11px] bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-md focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-shadow"
                              :placeholder="'Filter...'"
                              :class="filters[col.name] ? 'bg-yellow-50 border-yellow-200' : ''">
                            <button v-if="filters[col.name]" @click="filters[col.name] = ''; applyFilter()"
                              class="absolute right-1 top-1 text-[var(--color-outline)] hover:text-[var(--color-error)]">
                              <span class="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        </div>
                      </th>

                      <th
                        class="w-20 border-b border-l border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] sticky right-0 z-40 text-center text-xs font-bold text-[var(--color-on-surface)] uppercase px-2">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[var(--color-outline-variant)] bg-[var(--color-surface)]">
                    <tr v-for="(item, idx) in items" :key="item[activePk]"
                      class="group hover:bg-[var(--color-surface-container-high)] transition-colors" :class="[
                        selectedIds.has(item[activePk]) ? 'bg-[var(--color-primary-container)]/20' : (idx % 2 === 0 ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-surface-container-low)]/30')
                      ]">

                      <td
                        class="border-r border-[var(--color-outline-variant)] align-middle text-center sticky left-0 z-20 px-2"
                        :class="selectedIds.has(item[activePk]) ? 'bg-[var(--color-surface-container)]' : 'bg-[var(--color-surface)] group-hover:bg-[var(--color-surface-container-high)]'">
                        <input type="checkbox" :checked="selectedIds.has(item[activePk])"
                          @change="toggleSelectRow(item[activePk])"
                          class="w-4 h-4 rounded cursor-pointer text-[var(--color-primary)]">
                      </td>

                      <td v-for="col in visibleColumns" :key="col.name"
                        class="border-r border-[var(--color-outline-variant)] align-middle whitespace-nowrap text-[var(--color-on-surface)]"
                        :class="cellPaddingClass">
                        <div v-if="col.data_type === 'boolean'">
                          <span
                            :class="['inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider', item[col.name] ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200']">
                            {{ item[col.name] ? 'Active' : 'Inactive' }}
                          </span>
                        </div>

                        <div v-else-if="col.foreign_key_table" class="flex flex-col">
                          <span v-if="fkLookupMap[col.name] && fkLookupMap[col.name][item[col.name]]"
                            class="text-sm font-bold text-[var(--color-primary)] hover:underline cursor-help truncate max-w-[200px]"
                            :title="fkLookupMap[col.name][item[col.name]]">
                            {{ fkLookupMap[col.name][item[col.name]] }}
                          </span>
                          <span class="text-[10px] font-mono text-[var(--color-on-surface-variant)] opacity-70">
                            ID: {{ item[col.name] }}
                          </span>
                        </div>

                        <div v-else-if="['json', 'jsonb'].includes(col.data_type)"
                          class="font-mono text-xs text-[var(--color-primary)] cursor-pointer hover:underline truncate max-w-[200px] bg-[var(--color-surface-container)] px-2 py-1 rounded border border-transparent hover:border-[var(--color-primary)]/30"
                          @click="openDetail(item)">
                          {{ jsonPreview(item[col.name]) }}
                        </div>
                        <div v-else-if="['timestamp', 'timestamptz', 'date'].includes(col.data_type)"
                          class="text-xs font-mono text-[var(--color-on-surface-variant)]">
                          {{ item[col.name] ? new Date(item[col.name]).toLocaleString('id-ID') : '-' }}
                        </div>
                        <div v-else class="truncate max-w-[250px]" :title="item[col.name]">
                          {{ item[col.name] }}
                        </div>
                      </td>

                      <td
                        class="border-l border-[var(--color-outline-variant)] text-center sticky right-0 z-20 align-middle px-2"
                        :class="selectedIds.has(item[activePk]) ? 'bg-[var(--color-surface-container)]' : 'bg-[var(--color-surface)] group-hover:bg-[var(--color-surface-container-high)]'">
                        <div class="flex justify-center gap-1">
                          <button @click="openEdit(item)"
                            class="p-1.5 rounded-md hover:bg-[var(--color-primary-container)] text-[var(--color-primary)] transition-colors"
                            title="Edit">
                            <span class="material-symbols-outlined text-[18px]">edit_square</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    <tr v-if="items.length === 0 && !loading">
                      <td :colspan="visibleColumns.length + 2" class="py-16 text-center">
                        <div class="flex flex-col items-center justify-center text-[var(--color-outline)] opacity-60">
                          <span class="material-symbols-outlined text-5xl mb-2">inbox</span>
                          <span class="text-sm font-medium">Tidak ada data ditemukan</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div
                class="border-t border-[var(--color-outline-variant)] bg-[var(--color-surface)] px-4 py-3 flex items-center justify-between shrink-0 z-30">
                <div class="flex items-center gap-3">
                  <select :value="pagination.size" @change="handlePageSizeChange"
                    class="bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] text-xs rounded px-2 py-1.5 cursor-pointer font-bold outline-none focus:border-[var(--color-primary)]">
                    <option v-for="size in PAGE_SIZE_OPTIONS" :key="size" :value="size">{{ size }} baris</option>
                  </select>
                  <span class="text-[var(--color-on-surface-variant)] text-xs">
                    Hal. <b>{{ pagination.page }}</b> dari <b>{{ totalPages }}</b>
                  </span>
                </div>

                <div class="flex items-center gap-1">
                  <button @click="changePage(1)" :disabled="pagination.page <= 1"
                    class="p-1.5 rounded hover:bg-[var(--color-surface-container-high)] disabled:opacity-30 text-[var(--color-on-surface)]"><span
                      class="material-symbols-outlined text-lg">first_page</span></button>
                  <button @click="changePage(pagination.page - 1)" :disabled="pagination.page <= 1"
                    class="p-1.5 rounded hover:bg-[var(--color-surface-container-high)] disabled:opacity-30 text-[var(--color-on-surface)]"><span
                      class="material-symbols-outlined text-lg">chevron_left</span></button>

                  <div class="hidden sm:flex items-center gap-1 px-2">
                    <input type="number" min="1" :max="totalPages" :value="pagination.page" @change="handlePageChange"
                      class="w-12 text-center text-xs p-1 border border-[var(--color-outline-variant)] rounded bg-[var(--color-surface-container-low)] font-mono">
                  </div>

                  <button @click="changePage(pagination.page + 1)" :disabled="pagination.page >= totalPages"
                    class="p-1.5 rounded hover:bg-[var(--color-surface-container-high)] disabled:opacity-30 text-[var(--color-on-surface)]"><span
                      class="material-symbols-outlined text-lg">chevron_right</span></button>
                  <button @click="changePage(totalPages)" :disabled="pagination.page >= totalPages"
                    class="p-1.5 rounded hover:bg-[var(--color-surface-container-high)] disabled:opacity-30 text-[var(--color-on-surface)]"><span
                      class="material-symbols-outlined text-lg">last_page</span></button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>

    <TransitionRoot as="template" :show="showDetail">
      <Dialog as="div" class="relative z-50" @close="showDetail = false">
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <div class="fixed inset-0 overflow-hidden">
          <div class="absolute inset-0 overflow-hidden">
            <div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <TransitionChild as="template" enter="transform transition ease-in-out duration-300"
                enter-from="translate-x-full" enter-to="translate-x-0"
                leave="transform transition ease-in-out duration-300" leave-from="translate-x-0"
                leave-to="translate-x-full">
                <DialogPanel
                  class="pointer-events-auto w-screen max-w-md bg-[var(--color-surface)] shadow-2xl flex flex-col h-full border-l border-[var(--color-outline-variant)]">
                  <div
                    class="bg-[var(--color-surface)] px-6 py-4 border-b border-[var(--color-outline-variant)] flex items-center justify-between">
                    <DialogTitle class="text-lg font-bold">Detail Data</DialogTitle>
                    <button type="button"
                      class="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
                      @click="showDetail = false"><span class="material-symbols-outlined">close</span></button>
                  </div>
                  <div
                    class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[var(--color-surface-container-low)]">
                    <div v-if="detailItem" class="space-y-4">
                      <div v-for="col in schema" :key="col.name"
                        class="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-outline-variant)] shadow-sm">
                        <label
                          class="block text-xs font-black text-[var(--color-primary)] uppercase mb-2 tracking-wider">{{
                            col.name }}</label>
                        <div class="text-sm text-[var(--color-on-surface)] break-words">
                          <pre v-if="['json', 'jsonb'].includes(col.data_type)"
                            class="bg-[#1e1e1e] text-[#d4d4d4] p-3 rounded-lg overflow-x-auto text-xs font-mono border border-gray-700">{{ JSON.stringify(detailItem[col.name], null, 2) }}</pre>
                          <span v-else-if="col.data_type === 'boolean'"
                            :class="detailItem[col.name] ? 'text-green-600 font-bold bg-green-50 px-2 py-1 rounded' : 'text-red-600 font-bold bg-red-50 px-2 py-1 rounded'">{{
                              detailItem[col.name] ? 'Active' : 'Inactive' }}</span>
                          <span v-else>{{ detailItem[col.name] !== null ? detailItem[col.name] : 'NULL' }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

    <TransitionRoot appear :show="showForm" as="template">
      <Dialog as="div" @close="showForm = false" class="relative z-50">
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <div class="fixed inset-0 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4">
            <DialogPanel
              class="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-2xl border border-[var(--color-outline-variant)] flex flex-col max-h-[90vh]">
              <div
                class="px-6 py-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface)] flex justify-between items-center">
                <DialogTitle as="h3" class="text-lg font-bold">{{ editPkValue ? 'Edit Data' : 'Buat Data Baru' }}
                </DialogTitle>
                <button @click="showForm = false"
                  class="p-1 rounded hover:bg-[var(--color-surface-container-high)]"><span
                    class="material-symbols-outlined">close</span></button>
              </div>
              <form @submit.prevent="save"
                class="flex-1 overflow-hidden flex flex-col bg-[var(--color-surface-container-low)]">
                <div class="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
                  <div v-for="col in schema" :key="col.name">
                    <div v-if="!(col.is_primary_key && !editPkValue && col.data_type.includes('int'))">
                      <label
                        class="block text-xs font-bold text-[var(--color-on-surface-variant)] mb-1.5 uppercase tracking-wide">{{
                          col.name }} <span v-if="!col.is_nullable" class="text-[var(--color-error)]">*</span></label>

                      <div v-if="col.data_type === 'boolean'"
                        class="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-outline-variant)]">
                        <button type="button" @click="formData[col.name] = !formData[col.name]"
                          class="relative inline-flex h-6 w-11 rounded-full transition-colors focus:outline-none"
                          :class="formData[col.name] ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-outline)]'"><span
                            :class="formData[col.name] ? 'translate-x-5' : 'translate-x-0'"
                            class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200" /></button>
                        <span class="text-sm font-bold">{{ formData[col.name] ? 'Active' : 'Inactive' }}</span>
                      </div>

                      <div v-else-if="col.enum_values || col.foreign_key_table">
                        <select v-if="col.enum_values" v-model="formData[col.name]"
                          class="w-full p-2.5 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface)] outline-none focus:border-[var(--color-primary)] transition-colors text-sm">
                          <option :value="null" v-if="col.is_nullable">-- NULL --</option>
                          <option v-for="val in col.enum_values" :key="val" :value="val">{{ val }}</option>
                        </select>
                        <div v-else class="relative group">
                          <input type="text" placeholder="Cari ID/Nama..."
                            class="w-full p-2.5 pr-10 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface)] outline-none focus:border-[var(--color-primary)] text-sm"
                            @input="onFkSearchInput(col.name, col.foreign_key_table, $event)">
                          <span
                            class="absolute right-3 top-2.5 material-symbols-outlined text-[var(--color-primary)] animate-spin text-sm"
                            v-if="fkLoading[col.name]">sync</span>
                          <select v-model="formData[col.name]"
                            class="mt-1 w-full p-2 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface)] outline-none text-sm custom-scrollbar"
                            :size="4">
                            <option :value="null" v-if="col.is_nullable">-- NULL --</option>
                            <option v-for="opt in fkOptions[col.name] || []" :key="opt.value" :value="opt.value">{{
                              opt.label }}</option>
                          </select>
                        </div>
                      </div>

                      <div v-else-if="['json', 'jsonb'].includes(col.data_type)">
                        <button type="button" @click="openJsonEditor(col.name)"
                          class="w-full flex items-center justify-between p-3 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface)] text-left group hover:border-[var(--color-primary)] transition-colors">
                          <span class="text-sm font-mono truncate text-[var(--color-on-surface-variant)]">{{
                            formData[col.name] ? 'Edit JSON Content' : '{}' }}</span>
                          <span class="material-symbols-outlined text-[var(--color-primary)]">data_object</span>
                        </button>
                      </div>

                      <input v-else
                        :type="(['integer', 'bigint', 'numeric'].includes(col.data_type) ? 'number' : 'text')"
                        v-model="formData[col.name]"
                        class="w-full p-2.5 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface)] outline-none focus:border-[var(--color-primary)] text-sm transition-colors"
                        :disabled="!!(col.is_primary_key && editPkValue)">
                    </div>
                  </div>
                </div>
                <div
                  class="px-6 py-4 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface)] flex justify-end gap-3">
                  <button type="button"
                    class="px-5 py-2 rounded-lg border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-high)] font-bold text-sm"
                    @click="showForm = false">Batal</button>
                  <button type="submit" :disabled="formLoading"
                    class="px-5 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed)] text-[var(--color-on-primary)] font-bold text-sm flex items-center gap-2 shadow-sm"><span
                      v-if="formLoading" class="material-symbols-outlined animate-spin text-sm">sync</span>Simpan
                    Data</button>
                </div>
              </form>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

    <TransitionRoot appear :show="showJsonEditor" as="template">
      <Dialog as="div" @close="showJsonEditor = false" class="relative z-[60]">
        <div class="fixed inset-0 bg-black/80 backdrop-blur-md" />
        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <DialogPanel
            class="w-full max-w-4xl bg-[#1e1e1e] rounded-xl shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-gray-700">
            <div class="flex justify-between items-center px-4 py-3 border-b border-gray-700 bg-[#252526]">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-yellow-500 text-lg">javascript</span>
                <span class="text-gray-300 font-mono text-sm font-bold">Editor: {{ jsonEditorTargetCol }}</span>
              </div>
              <button @click="showJsonEditor = false" class="text-gray-400 hover:text-white transition-colors"><span
                  class="material-symbols-outlined">close</span></button>
            </div>
            <textarea v-model="jsonEditorContent"
              class="flex-1 w-full bg-[#1e1e1e] text-[#9cdcfe] font-mono text-sm p-4 resize-none focus:outline-none leading-relaxed"
              spellcheck="false"></textarea>
            <div class="px-4 py-3 border-t border-gray-700 bg-[#252526] flex justify-between items-center">
              <span class="text-red-400 text-xs font-mono truncate max-w-md flex items-center gap-2">
                <span v-if="jsonError" class="material-symbols-outlined text-sm">error</span> {{ jsonError }}
              </span>
              <div class="flex gap-3">
                <button @click="showJsonEditor = false"
                  class="px-4 py-2 text-xs font-bold text-gray-300 hover:bg-gray-700 rounded transition-colors">Batal</button>
                <button @click="saveJsonEditor"
                  class="px-4 py-2 text-xs font-bold bg-[#0e639c] text-white hover:bg-[#1177bb] rounded transition-colors flex items-center gap-2"><span
                    class="material-symbols-outlined text-sm">check</span> Terapkan</button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

