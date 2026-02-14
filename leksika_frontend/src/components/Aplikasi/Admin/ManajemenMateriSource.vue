<template>
  <div>
    <TransitionRoot :show="isOpen" as="template">
      <Dialog @close="closeModal" class="relative z-50">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-300 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-[var(--color-scrim)]" />
        </TransitionChild>

        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-300 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel
              class="modal-box w-full max-w-4xl mx-4 rounded-4xl bg-[var(--color-surface-container-high)] p-6 shadow-2xl flex flex-col max-h-[90vh]">
              <div class="relative flex items-center justify-between mb-4 flex-shrink-0">
                <h2 class="text-2xl font-bold text-[var(--color-on-background)]">
                  Source Code (HTML)
                </h2>
                <button @click="closeModal"
                  class="p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>

              <div class="flex space-x-2 bg-[var(--color-surface-container)] p-1 rounded-xl">
                <button @click="setSourceMode('full')"
                  :class="['flex-1 py-2 text-sm font-semibold rounded-lg transition-all', sourceMode === 'full' ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-md' : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]']">Seluruh
                  Materi</button>
                <button @click="setSourceMode('page')"
                  :class="['flex-1 py-2 text-sm font-semibold rounded-lg transition-all', sourceMode === 'page' ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-md' : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]']">Halaman
                  Ini</button>
              </div>

              <textarea v-model="sourceInput"
                class="w-full flex-grow p-4 border border-[var(--color-outline-variant)] rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-xs font-mono resize-none overflow-y-auto mb-4 min-h-[350px] whitespace-pre"
                spellcheck="false"></textarea>

              <!-- Error Message -->
              <div v-if="sourceError"
                class="text-xs text-[var(--color-error)] mb-2 font-mono bg-[var(--color-error-container)]/20 p-2 rounded-lg">
                <span class="font-bold">❌ Error:</span> {{ sourceError }}
              </div>

              <!-- Parse Warnings -->
              <div v-if="parseWarnings.length > 0"
                class="text-xs text-[var(--color-tertiary)] mb-2 font-mono bg-[var(--color-tertiary-container)]/20 p-2 rounded-lg max-h-24 overflow-y-auto">
                <p class="font-bold mb-1">⚠️ Peringatan ({{ parseWarnings.length }}):</p>
                <ul class="list-disc list-inside space-y-0.5">
                  <li v-for="(w, i) in parseWarnings" :key="i">{{ w }}</li>
                </ul>
              </div>

              <div class="flex justify-end space-x-3 flex-shrink-0">
                <button @click="copyToClipboard"
                  class="px-4 py-2 text-sm font-semibold rounded-xl border border-[var(--color-outline)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] transition-colors">Salin</button>
                <button @click="processSourceInput"
                  class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)]">Simpan
                  Perubahan</button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>



    </TransitionRoot>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { cloneDeep } from 'lodash-es';
import { generateJSON, generateHTML } from '@tiptap/html';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
} from '@headlessui/vue';
import { useClipboard } from '@vueuse/core';

interface Materi {
  id?: number | string;
  contents: string[];
  assignment: any;
  translations?: Record<string, any>;
  title?: Record<string, string>;
  description?: Record<string, string>;
  learning_objectives?: Record<string, string>;
  [key: string]: any;
}

const props = defineProps<{
  isOpen: boolean;
  materi: Materi;
  moduleId?: number | string;
  currentPageIndex: number;
  assignmentPageIndex: number;
  sourceLang?: string;
  targetLang?: string;
  extensions: any[];
  activePageJson?: any;

  // Props Judul Terpisah untuk AI Context
  moduleTitleSrc?: string;
  moduleTitleTgt?: string;
  chapterTitleSrc?: string;
  chapterTitleTgt?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', payload: { type: string; data: any }): void;
}>();

const sourceInput = ref('');
const sourceError = ref<string | null>(null);
const sourceMode = ref<'full' | 'page'>('full');
const PAGE_BREAK_MARKER = '<hr data-page-break="true" class="page-break">';

// --- CLEANING & RESTORING JSON ---

// [LOGIKA BARU]: Restore data penting (ID & Judul) agar tidak tertimpa editan JSON
const restoreMetadata = (data: any) => {
  // 1. Restore ID (Identity)
  if (props.materi.id) data.id = props.materi.id;

  // 2. FORCE RESTORE TRANSLATIONS (Judul & Deskripsi)
  // Ini memastikan bahwa meskipun user mengedit judul di JSON,
  // sistem akan menimpanya kembali dengan judul asli dari props.materi
  if (props.materi.translations) {
    data.translations = cloneDeep(props.materi.translations);
  }

  // 3. Restore Assignment Config
  if (props.materi.assignment && data.assignment) {
    // Restore judul assignment juga agar konsisten
    if (props.materi.assignment.translations) {
      data.assignment.translations = cloneDeep(
        props.materi.assignment.translations,
      );
    }

    if (data.assignment.max_score === undefined) {
      data.assignment.max_score = props.materi.assignment.max_score;
    }
  }
  return data;
};

// --- LOGIKA UTAMA EDITOR ---

// Bersihkan HTML dari atribut verbose yang tidak diperlukan user
const cleanHtmlOutput = (html: string) => {
  let clean = html
    // 1. Hapus atribut teknis global
    .replace(/\s+xmlns="[^"]*"/g, '')
    .replace(/\s+contenteditable="[^"]*"/g, '')
    .replace(/\s+data-node-view-[^=]*="[^"]*"/g, '')

    // 2. Bersihkan Tabel (Table Cleaning)
    .replace(/\s+style="[^"]*"/g, '')
    .replace(/<colgroup>[\s\S]*?<\/colgroup>/g, '')
    .replace(/\s+colspan="1"/g, '')
    .replace(/\s+rowspan="1"/g, '')

    // 3. Formatting Dasar
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+>/g, '>')
    .trim();

  return clean;
};

const formatHTML = (html: string) => {
  // Bersihkan atribut verbose terlebih dahulu
  let cleaned = cleanHtmlOutput(html);

  let f = '';
  let reg = /(>)(<)(\/*)/g;
  let xml = cleaned.replace(reg, '$1\r\n$2$3');
  let pad = 0;
  xml.split('\r\n').forEach((node) => {
    let indent = 0;
    if (node.match(/.+<\/\w[^>]*>$/)) indent = 0;
    else if (node.match(/^<\/\w/)) {
      if (pad !== 0) pad -= 1;
    } else if (node.match(/^<\w[^>]*[^/]>.*$/)) indent = 1;
    let padding = '';
    for (let i = 0; i < pad; i++) padding += '  ';
    f += padding + node + '\r\n';
    pad += indent;
  });
  return f.trim();
};

const currentMateriState = computed(() => {
  const copy = cloneDeep(props.materi);
  // Sinkronkan state dengan halaman aktif
  if (props.activePageJson) {
    if (props.currentPageIndex === props.assignmentPageIndex)
      copy.assignment.contents = props.activePageJson;
    else if (props.currentPageIndex > 0)
      copy.contents[props.currentPageIndex] = props.activePageJson;
  }
  return copy;
});

const updateSourcePreview = () => {
  if (sourceMode.value === 'full') {
    // === MODE FULL (ALWAYS HTML) ===
    const materi = currentMateriState.value;
    const srcLang = props.sourceLang || 'id';
    const tgtLang = props.targetLang || 'en';

    const title_tgt =
      materi.title?.[tgtLang] ||
      materi.translations?.[tgtLang]?.title ||
      '(Judul Target)';
    const title_src =
      materi.title?.[srcLang] ||
      materi.translations?.[srcLang]?.title ||
      '(Judul Asal)';
    const desc_tgt =
      materi.description?.[tgtLang] ||
      materi.translations?.[tgtLang]?.description ||
      '';
    const desc_src =
      materi.description?.[srcLang] ||
      materi.translations?.[srcLang]?.description ||
      '';
    const obj_tgt =
      materi.learning_objectives?.[tgtLang] ||
      materi.translations?.[tgtLang]?.learning_objectives ||
      '';
    const obj_src =
      materi.learning_objectives?.[srcLang] ||
      materi.translations?.[srcLang]?.learning_objectives ||
      '';

    // Halaman depan ditampilkan sebagai HTML biasa, tapi dibungkus marker khusus
    // Marker ini akan dihapus saat parsing sehingga perubahan apapun di bagian ini diabaikan
    const frontPageHtml = `<!-- FRONT_PAGE_START -->
<h1>${title_tgt}</h1>
<h2>${title_src}</h2>
<h3>Deskripsi</h3>
<p><strong>[${tgtLang.toUpperCase()}]</strong> ${desc_tgt || '<em>(kosong)</em>'}</p>
<p><strong>[${srcLang.toUpperCase()}]</strong> ${desc_src || '<em>(kosong)</em>'}</p>
<h3>Tujuan Pembelajaran</h3>
<p><strong>[${tgtLang.toUpperCase()}]</strong> ${obj_tgt || '<em>(kosong)</em>'}</p>
<p><strong>[${srcLang.toUpperCase()}]</strong> ${obj_src || '<em>(kosong)</em>'}</p>
<!-- FRONT_PAGE_END -->`;

    // Include SEMUA halaman konten (termasuk index 1 dst)
    const contentPages = materi.contents.slice(1); // Skip index 0 (metadata placeholder)

    // Include halaman assignment
    const allPages = [...contentPages, materi.assignment.contents];

    // Generate HTML untuk setiap halaman
    const pagesHtml = allPages.map((p: any) => typeof p === 'string' ? p : generateHTML(p, props.extensions));

    // Gabungkan dengan page break marker
    const contentHtml = formatHTML(
      pagesHtml.join(`\n\n${PAGE_BREAK_MARKER}\n\n`),
    );

    // Gabungkan halaman depan dengan konten (dipisah page break)
    sourceInput.value =
      frontPageHtml + `\n\n${PAGE_BREAK_MARKER}\n\n` + contentHtml;

  } else {
    // Mode Halaman Tunggal (ALWAYS HTML)
    let p;
    if (props.currentPageIndex === props.assignmentPageIndex)
      p = currentMateriState.value.assignment;
    else if (props.currentPageIndex === 0)
      p = currentMateriState.value.translations;
    else p = currentMateriState.value.contents[props.currentPageIndex];

    sourceInput.value =
      props.currentPageIndex === 0
        ? 'N/A (Metadata Only)'
        : formatHTML(
          typeof (props.currentPageIndex === props.assignmentPageIndex ? p.contents : p) === 'string'
            ? (props.currentPageIndex === props.assignmentPageIndex ? p.contents : p)
            : generateHTML(
              props.currentPageIndex === props.assignmentPageIndex
                ? p.contents
                : p,
              props.extensions,
            ),
        );
  }
};

// Helper: Bersihkan HTML dari komentar dan whitespace sebelum parsing
const cleanHtmlForParsing = (html: string) => {
  return (
    html
      // Hapus bagian FRONT_PAGE (read-only, perubahan diabaikan)
      .replace(/<!-- FRONT_PAGE_START -->[\s\S]*?<!-- FRONT_PAGE_END -->/g, '')
      .replace(/<!--[\s\S]*?-->/g, '') // Hapus komentar HTML lainnya
      .replace(/^\s*\n/gm, '') // Hapus baris kosong
      .trim()
  );
};

// Ref untuk peringatan parsing
const parseWarnings = ref<string[]>([]);

// Helper: Validasi hasil parsing - deteksi node yang mungkin gagal diparse
const validateParsedContent = (json: any) => {
  const warnings: string[] = [];

  const checkNode = (node: any, path = 'root') => {
    if (!node || typeof node !== 'object') return;

    // Check soalPilihanGanda
    if (node.type === 'soalPilihanGanda') {
      if (node.attrs?.question === 'Tulis pertanyaan di sini...') {
        warnings.push(
          `⚠️ [${path}] soalPilihanGanda: question menggunakan default`,
        );
      }
      if (!node.attrs?.options || node.attrs.options.length === 0) {
        warnings.push(`⚠️ [${path}] soalPilihanGanda: options kosong`);
      }
    }

    // Check soalIsian
    if (node.type === 'soalIsian') {
      if (node.attrs?.question === 'Tulis pertanyaan di sini...') {
        warnings.push(`⚠️ [${path}] soalIsian: question menggunakan default`);
      }
    }

    // Check percakapan
    if (node.type === 'percakapan') {
      // PERBAIKAN: Cek Array.isArray sebelum cek length
      if (
        !node.attrs?.messages ||
        !Array.isArray(node.attrs.messages) ||
        node.attrs.messages.length === 0
      ) {
        warnings.push(
          `⚠️ [${path}] percakapan: messages kosong atau format salah`,
        );
      } else {
        // PERBAIKAN: Pastikan array sebelum panggil .some()
        const hasDefault =
          Array.isArray(node.attrs.messages) &&
          node.attrs.messages.some(
            (m: any) => m.text === 'Privet!' || m.text === 'Kak dela?',
          );
        if (hasDefault) {
          warnings.push(`⚠️ [${path}] percakapan: menggunakan default messages`);
        }
      }
    }

    // Check soalKelompokan
    if (node.type === 'soalKelompokan') {
      if (!node.attrs?.pairs || node.attrs.pairs.length === 0) {
        warnings.push(`⚠️ [${path}] soalKelompokan: pairs kosong`);
      }
    }

    // Check soalRumpang
    if (node.type === 'soalRumpang') {
      if (
        node.attrs?.sentence === 'Saya belajar bahasa [Rusia] setiap [hari].'
      ) {
        warnings.push(`⚠️ [${path}] soalRumpang: sentence menggunakan default`);
      }
    }

    // Recursively check content
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach((child: any, i: number) =>
        checkNode(child, `${path}.content[${i}]`),
      );
    }
  };

  checkNode(json);
  return warnings;
};

const processSourceInput = () => {
  sourceError.value = null;
  const s = sourceInput.value.trim();

  try {
    let result: any = null;
    let saveType: string | null = null;

    if (sourceMode.value === 'full') {
      saveType = 'full';

      // === MODE FULL HTML (ONLY) ===
      // Bersihkan HTML dulu
      const cleanedHtml = cleanHtmlForParsing(s);

      // Split berdasarkan page break marker, lalu parse setiap halaman
      const pages = cleanedHtml
        .split(PAGE_BREAK_MARKER)
        .map((html) => html.trim())
        .filter((html) => html);

      if (pages.length === 0) {
        throw new Error('Tidak ada konten halaman yang ditemukan');
      }

      // Buat struktur materi baru dengan contents dari HTML
      const newContents = pages
        .slice(0, -1)
        .map((html) =>
          generateJSON(cleanHtmlForParsing(html), props.extensions),
        );
      const assignmentContent = generateJSON(
        cleanHtmlForParsing(pages[pages.length - 1]),
        props.extensions,
      );

      // Clone materi asli dan update contents
      result = cloneDeep(props.materi);

      // Perbarui contents (keep index 0 as metadata placeholder)
      result.contents = [
        result.contents[0] || { type: 'doc', content: [] },
        ...newContents,
      ];

      // Perbarui assignment contents
      if (result.assignment) {
        result.assignment.contents = assignmentContent;
      }

      // [RESTORING] Kembalikan ID dan JUDUL sistem sebelum save
      result = restoreMetadata(result);
    } else {
      // === MODE HALAMAN TUNGGAL ===
      if (props.currentPageIndex === props.assignmentPageIndex) {
        saveType = 'assignment';
        result = generateJSON(cleanHtmlForParsing(s), props.extensions);
      } else if (props.currentPageIndex === 0) {
        saveType = 'metadata';
        // HTML tidak mendukung metadata page ini, jadi biarkan saja atau error?
        // Secara UI tombol HTML disabled untuk page 0.
        // Tapi jika somehow user memaksa save:
        result = props.materi; // No op
      } else {
        saveType = 'content';
        result = generateJSON(cleanHtmlForParsing(s), props.extensions);
      }
    }

    // Validasi hasil parsing
    parseWarnings.value = [];
    if (result) {
      // Validasi contents jika mode full
      if (saveType === 'full' && result.contents) {
        result.contents.forEach((page: any, i: number) => {
          const warnings = validateParsedContent(page);
          warnings.forEach((w) =>
            parseWarnings.value.push(`Halaman ${i}: ${w}`),
          );
        });
        if (result.assignment?.contents) {
          const warnings = validateParsedContent(result.assignment.contents);
          warnings.forEach((w) => parseWarnings.value.push(`Assignment: ${w}`));
        }
      } else {
        const warnings = validateParsedContent(result);
        parseWarnings.value = warnings;
      }

      if (parseWarnings.value.length > 0) {
        console.warn('[parseWarnings]', parseWarnings.value);
      }
    }

    emit('save', { type: saveType!, data: result });
  } catch (e: any) {
    sourceError.value = e.message;
    parseWarnings.value = [];
    console.error('[processSourceInput] Error:', e);
  }
};

const closeModal = () => emit('close');
const setSourceMode = (m: 'full' | 'page') => {
  sourceMode.value = m;
  updateSourcePreview();
};

const { copy } = useClipboard({ legacy: true });
const copyToClipboard = () => {
  copy(sourceInput.value);
  alert('Tersalin!');
};

watch(
  () => props.isOpen,
  (v) => {
    if (v) updateSourcePreview();
  },
);
</script>

<style lang="postcss" scoped>
@reference "tailwindcss";

/* Custom Scrollbar for Pre blocks */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--color-outline-variant);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--color-outline);
}

input[type="range"] {
  @apply accent-[var(--color-primary)];
}
</style>
