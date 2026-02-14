<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNarrative, generateNarrativeParallel } from '@/composables/useNarrative';
import { useLanguageStore } from '@/stores/language';
import { useUIStore } from '@/stores/ui';
import { useRouter } from 'vue-router';
import { getHighlightedText } from '@/utils/HighlightText';
import { api } from '@/utils/api';
import SimpanKeDaftar from '@/components/SimpanKeDaftar.vue';
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
    Listbox,
    ListboxButton,
    ListboxOptions,
    ListboxOption,
} from '@headlessui/vue';
import { useMediaControls, onKeyStroke } from '@vueuse/core';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

// Local Type Definitions (In-Place)
interface NarrativeContent {
    title: string;
    paragraphs: string[];
}
interface NarrativeImage {
    paragraphIndex: number;
    data: string; // Base64
    source?: string;
    description?: Record<string, string>; // { en: "...", id: "..." }
}
interface NarrativeData {
    id: number | null;
    image_url: string | null;
    contents: Record<string, NarrativeContent>;
    anchor_sentences: Record<string, string>;
    metadata?: any;
    status: string;
    images: NarrativeImage[]; // [NEW] Structured images
    created_at?: string; // [NEW] Creation timestamp from backend
    updated_at?: string; // [NEW] Update timestamp from backend
}
interface NarrativeListItem {
    id: number;
    sentence_group_id: number;
    title: string;
    lang_code: string;
    image_url: string | null;
    status: string;
    available_languages: string[]; // [NEW] Available languages
    metadata?: any;
    language_statuses?: Record<string, string>;
}

const props = defineProps<{
    groupId?: string | number | null;
    isOpen?: boolean;
    isPublicView?: boolean;
    highlightTarget?: { p: number; s: number } | null;
    highlightText?: string | null; // NEW: Text to highlight
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'saved'): void;
    (e: 'back'): void;
}>();

// State for View Mode
const viewMode = ref<'list' | 'edit'>(props.isPublicView ? 'edit' : 'list');
const activeGroupId = ref<string | number | null>(null);
const narrativeList = ref<NarrativeListItem[]>([]);
const isListLoading = ref(false);
const listSearchQuery = ref('');

// Filter narrative list by Indonesian title search
const filteredNarrativeList = computed(() => {
    // Sort by ID descending (newest first)
    let list = [...narrativeList.value];
    list.sort((a, b) => (b.id || 0) - (a.id || 0));

    if (!listSearchQuery.value.trim()) return list;
    const query = listSearchQuery.value.toLowerCase();
    return list.filter((item: any) => {
        // Search in Indonesian title first, then fallback
        const idTitle = item.title_id || item.contents?.id?.title || item.title || '';
        return idTitle.toLowerCase().includes(query);
    });
});

// Get Indonesian title for display
const getIndonesianTitle = (item: any): string => {
    // API now returns title_id (Indonesian title) directly
    if (item.title_id) return item.title_id;
    // Fallback to contents.id.title if available
    if (item.contents?.id?.title) return item.contents.id.title;
    // Final fallback to default title field
    return item.title || t('untitled');
};

// Read-only mode: isPublicView OR isPreviewMode
const isReadOnly = computed(() => props.isPublicView || isPreviewMode.value);

const {
    fetchNarrative,
    fetchPublicNarrative,
    generateNarrative,
    saveNarrative,
    deleteNarrative,
    getDirectorPlan,
    isLoading,
    error: narrativeError,
} = useNarrative();

const { t } = useI18n();
const router = useRouter();
const uiStore = useUIStore();

const languageStore = useLanguageStore();

const localError = ref<string | null>(null);

// Custom Confirmation Dialog State
const isConfirmDialogOpen = ref(false);
const confirmDialogConfig = reactive({
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    isDestructive: false,
    onConfirm: () => { },
    onCancel: () => { },
});

const showConfirm = (options: { title: string, message: string, confirmText?: string, cancelText?: string, isDestructive?: boolean, onConfirm: () => void, onCancel?: () => void }) => {
    confirmDialogConfig.title = options.title;
    confirmDialogConfig.message = options.message;
    confirmDialogConfig.confirmText = options.confirmText || t('admin.confirm');
    confirmDialogConfig.cancelText = options.cancelText || t('cancel');
    confirmDialogConfig.isDestructive = options.isDestructive || false;
    confirmDialogConfig.onConfirm = () => {
        isConfirmDialogOpen.value = false;
        options.onConfirm();
    };
    confirmDialogConfig.onCancel = () => {
        isConfirmDialogOpen.value = false;
        if (options.onCancel) options.onCancel();
    };
    isConfirmDialogOpen.value = true;
};

const activeLang = ref('id'); // [MOVED UP]
const selectedAnchorLang = ref('en'); // [MOVED UP] Default anchor language

const langStatus = reactive<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({}); // [MOVED UP]
const langErrors = reactive<Record<string, string>>({});  // [MOVED UP]

const narrativeData = reactive<NarrativeData>({
    id: null,
    image_url: null,
    contents: {},
    anchor_sentences: {},
    metadata: {},
    status: 'draft', // [NEW] Default
    images: [], // [NEW]
    created_at: undefined, // [NEW] Creation timestamp
    updated_at: undefined, // [NEW] Update timestamp
});

// [NEW] Status Options
const statusOptions = computed(() => [
    { value: 'draft', label: t('draft'), class: 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]' },
    { value: 'public', label: t('published'), class: 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]' },
    { value: 'hidden', label: t('hidden') || 'Tersembunyi', class: 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]' },
    { value: 'inactive', label: t('inactive'), class: 'bg-[var(--color-error-container)] text-[var(--color-on-error-container)]' },
]);

// [NEW] Computed status for validation


const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'public' || newStatus === 'hidden') {
        if (!canPublish.value) {
            localError.value = t('admin.error_ready_publish');
            return;
        }
    }
    narrativeData.status = newStatus;
    isDirty.value = true;
};

// Fetch List of Narratives (Admin Only)
const fetchNarrativeList = async () => {
    isListLoading.value = true;
    try {
        // Use admin narratives endpoint to see ALL statuses (draft, inactive, etc)
        const res = await api.get('/admin/narration', { params: { page_size: 200, ordering: '-id' } });
        if (res.data && res.data.results) {
            narrativeList.value = res.data.results;
        }
    } catch (err) {
        localError.value = t('admin.failed_load_list') + ": " + (err as any).message;
    } finally {
        isListLoading.value = false;
    }
};

const selectNarrative = (item) => {
    if (item.sentence_group_id) {
        activeGroupId.value = item.sentence_group_id;
        loadNarrative(item.sentence_group_id);
    } else {
        // Standalone narrative: use direct ID
        activeGroupId.value = 0;
        loadNarrative(item.id);
    }
    viewMode.value = 'edit';
};

// Complete State Reset (No Autosave Persistence)
const resetEditorState = () => {
    activeGroupId.value = null;
    narrativeData.id = null;
    narrativeData.image_url = null;
    narrativeData.contents = {}; // Clear all content
    narrativeData.anchor_sentences = {};

    // Reset View State
    activeLang.value = 'id'; // Always back to default
    isDirty.value = false;
    viewMode.value = 'list';

    // Reset UI State
    localError.value = null;
    // Clear validation states
    Object.keys(langStatus).forEach(k => delete langStatus[k]);
    Object.keys(langErrors).forEach(k => delete langErrors[k]);
};

const handleBackToList = () => {
    if (props.groupId) {
        // If loaded directly with prop, emit back and close for compatibility
        resetEditorState(); // Ensure clean state before closing
        emit('back');
        emit('close');
    } else {
        resetEditorState(); // Reset everything
        viewMode.value = 'list';
        activeGroupId.value = null;
        fetchNarrativeList(); // Refresh list
    }
};

// --- Anchor Selection State (for new narratives) ---
const anchorSearchQuery = ref('');
const anchorSearchResults = ref<any[]>([]);
const isSearchingAnchor = ref(false);

const searchAnchorGroups = async () => {
    if (!anchorSearchQuery.value.trim()) {
        anchorSearchResults.value = [];
        return;
    }
    isSearchingAnchor.value = true;
    try {
        const res = await api.get('/admin/sentences/groups/', {
            params: {
                q: anchorSearchQuery.value,
                page_size: 10,
            }
        });
        if (res.data && res.data.results) {
            anchorSearchResults.value = res.data.results;
        }
    } catch (e) {
        console.error("Failed to search anchors", e);
    } finally {
        isSearchingAnchor.value = false;
    }
};

// [NEW] Structured Image Management
const addImageToStructuredStorage = (base64: string, paragraphIndex: number) => {
    // 1. Create new image object
    const newImage: NarrativeImage = {
        paragraphIndex,
        data: base64,
        source: '',
        description: {}
    };

    // 2. Add to images array
    narrativeData.images.push(newImage);

    // 3. Sort images by paragraph index to keep them organized (optional but good for UI)
    narrativeData.images.sort((a, b) => a.paragraphIndex - b.paragraphIndex);

    isDirty.value = true;
};

const removeImageFromStructuredStorage = (index: number) => {
    narrativeData.images.splice(index, 1);
    isDirty.value = true;
};

const updateImageMetadata = (index: number, field: 'source' | 'description', value: any, lang?: string) => {
    const img = narrativeData.images[index];
    if (!img) return;

    if (field === 'source') {
        img.source = value;
    } else if (field === 'description' && lang) {
        if (!img.description) img.description = {};
        img.description[lang] = value;
    }
    isDirty.value = true;
};

const selectAnchorGroup = (group: any) => {
    activeGroupId.value = group.id;
    // Load anchor sentences into narrativeData
    narrativeData.anchor_sentences = group.sentences || {};
    // Check if it already has a narrative, if so load it
    if (group.has_narrative) {
        loadNarrative(group.id);
    } else {
        // Fresh narrative for this group
        narrativeData.id = null;
        narrativeData.image_url = null;
        narrativeData.contents = {};
        isDirty.value = true;
    }
};

const skipAnchorSelection = () => {
    // Enable standalone narratives
    activeGroupId.value = 0;

    // Initialize empty narrative data
    narrativeData.id = null;
    narrativeData.image_url = null;
    narrativeData.contents = {
        id: { title: '', paragraphs: [''] },
        en: { title: '', paragraphs: [''] }
    };
    narrativeData.anchor_sentences = {};

    // Switch to EN by default for standalone
    activeLang.value = 'en';
    isDirty.value = true;
};

// [NEW] Options for Metadata Badges
const levelOptions = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const genreOptions = [
    'Fable', 'Legend', 'Myth', 'Fairy Tale', 'Science Fiction', 'Mystery', 'Slice of Life',
    'Biography', 'Personal Experience', 'Historical Narrative', 'Scientific Narrative', 'Descriptive Narrative',
    'Adventure', 'Horror', 'Romance', 'Tragedy'
];

// Helper to update metadata
const updateMetadata = (key: string, value: string) => {
    if (!narrativeData.metadata) {
        narrativeData.metadata = {};
    }
    narrativeData.metadata[key] = value;
    isDirty.value = true;
};

// Create new narrative (without anchor by default)
const createNewNarrative = () => {
    activeGroupId.value = null; // No anchor/group ID yet
    // Reset narrative data for new creation
    narrativeData.id = null;
    narrativeData.image_url = null;
    narrativeData.contents = {};
    narrativeData.anchor_sentences = {};
    narrativeData.status = 'draft'; // Reset status
    narrativeData.images = []; // [NEW] Reset images

    activeLang.value = 'id'; // Reset to ID default
    viewMode.value = 'edit';
};

// Set anchor language via double-click on tab
const setAnchorLanguage = (langCode: string) => {
    selectedAnchorLang.value = langCode;
};

// Initial Load Logic
onMounted(async () => {
    // Consolidated initialization
    await languageStore.init();

    // Initialize Anchor Language to user's Source Language if available
    if (languageStore.selectedAsal && !selectedAnchorLang.value) {
        selectedAnchorLang.value = languageStore.selectedAsal.kodeBahasa;
    } else if (!selectedAnchorLang.value) {
        selectedAnchorLang.value = 'en'; // Default fallback
    }

    if (props.isPublicView && languageStore.selectedAsal) {
        activeLang.value = languageStore.selectedAsal.kodeBahasa;
    }

    // ROBUST CHECK: Determine if we should start in edit/viewer mode
    const initialGid = props.groupId;
    const hasValidGid = initialGid !== undefined && initialGid !== null && String(initialGid) !== '';

    if (hasValidGid) {
        viewMode.value = 'edit';
        activeGroupId.value = initialGid;
        loadNarrative(initialGid);
    } else {
        viewMode.value = 'list';
        activeGroupId.value = null;
        fetchNarrativeList();
    }
});

// [NEW] Real-time Language Adaptation for Public View
watch(
    () => languageStore.selectedAsal?.kodeBahasa,
    (newLangCode) => {
        if (props.isPublicView && newLangCode) {
            // Update Anchor Language to Source
            if (!selectedAnchorLang.value || selectedAnchorLang.value === 'en') {
                selectedAnchorLang.value = newLangCode;
            }

            // Note: We might NOT want to force activeLang to Source if user wants to read Target
            // But existing logic did this:
            if (newLangCode !== activeLang.value) {
                console.log(`[Narrative] Public view: Language changed to ${newLangCode}`);
                activeLang.value = newLangCode;
            }
        }
    },
    { immediate: true } // Ensure it runs initially too
);

// Wrapper for existing fetching logic
const loadNarrative = async (gid: any) => {
    const numericGid = Number(gid);
    if (isNaN(numericGid) || (!numericGid && gid !== 0)) return;

    // Reset Data
    Object.assign(narrativeData, {
        id: null, image_url: null, contents: {}, anchor_sentences: {}, metadata: {}, status: 'draft', images: []
    });

    localError.value = null;
    try {
        let data;
        if (props.isPublicView) {
            data = await fetchPublicNarrative(numericGid);
        } else {
            data = await fetchNarrative(numericGid);
        }

        if (data) {
            if (data.exists === false) {
                narrativeData.id = null;
                narrativeData.image_url = null;
                narrativeData.contents = {};
                narrativeData.anchor_sentences = data.anchor_sentences || {};
            } else {
                narrativeData.id = data.id || null;
                narrativeData.image_url = data.image_url;

                const contentMap: Record<string, NarrativeContent> = {};
                if (data.contents) {
                    Object.entries(data.contents).forEach(([lang, item]: [string, any]) => {
                        contentMap[lang] = {
                            title: item.title,
                            paragraphs: normalizeContent(item.content || item.paragraphs),
                        };
                        // Use status and error from backend if available
                        langStatus[lang] = item.status || 'success';
                        if (item.error_message) {
                            langErrors[lang] = item.error_message;
                        }
                    });
                }
                narrativeData.contents = contentMap;
                narrativeData.anchor_sentences = data.anchor_sentences || {};
                narrativeData.metadata = data.metadata || null;
                narrativeData.status = data.status || 'draft'; // Load status
                narrativeData.images = data.images || []; // [NEW] Load images
                narrativeData.created_at = data.created_at || null; // [NEW] Load creation timestamp
                narrativeData.updated_at = data.updated_at || null; // [NEW] Load update timestamp
            }

            // Init active content if still empty
            if (!narrativeData.contents[activeLang.value]) {
                narrativeData.contents[activeLang.value] = { title: '', paragraphs: [''] };
            }

            resizeAllTextareas();
        }
    } catch (e: any) {
        localError.value = "Failed to load narrative: " + e.message;
        console.error("Load narrative error", e);
    }
};


const handleDelete = async () => {
    // Delete without confirm as per user request to remove alerts

    // Determine ID to delete: PREFER narrativeData.id (Actual ID) over Group ID
    let idToDelete = 0;
    let isNarrativeId = false;

    if (narrativeData.id) {
        idToDelete = Number(narrativeData.id);
        isNarrativeId = true;
    } else {
        idToDelete = parseInt(String(activeGroupId.value));
        isNarrativeId = false;
    }

    if (isNaN(idToDelete) || idToDelete === 0) {
        // This means it's an unsaved draft (Standalone with no ID yet)
        // Action: Discard/Cancel
        handleBackToList();
        return;
    }

    const success = await deleteNarrative(idToDelete, isNarrativeId);
    if (success) {
        emit('saved');
        resetEditorState(); // Reset state after delete
        if (!props.groupId) {
            // handleBackToList already calls reset, but we explicitly handled it above
            fetchNarrativeList();
        } else {
            emit('close'); // Close modal if in direct mode
        }
    }
};

const isRtl = computed(() => ['ar', 'he', 'fa', 'ur', 'ps'].includes(activeLang.value));
const isDirty = ref(false);
const isGenerating = ref(false);
const isPreviewMode = ref(false);

const showTranslation = ref(true);
const isHighlightEnabled = ref(true);
const showHighlight = ref(true); // Toggle for highlighting

// Computed to check if all necessary languages are successful
const availableLanguages = computed(() => {
    if (!languageStore.opsiBahasa) return [];

    const all = languageStore.opsiBahasa.map((l) => ({
        code: l.kodeBahasa,
        name: l.nama,
    }));

    if (props.isPublicView) {
        // In public view, only show the current source and target languages
        const activePairCodes = [
            languageStore.selectedAsal?.kodeBahasa,
            languageStore.selectedTarget?.kodeBahasa
        ].filter(Boolean);

        return all.filter(l => activePairCodes.includes(l.code));
    }

    return all;
});

// Computed to check if all necessary languages are successful
const isAllLanguagesReady = computed(() => {
    if (!availableLanguages.value) return false;
    if (!availableLanguages.value || availableLanguages.value.length === 0) return false;

    return availableLanguages.value.every(lang => langStatus[lang.code] === 'success');
});
const closeStreamingFn = ref(null);

// [NEW] Computed status for validation (Moved here to fix ReferenceError)
const canPublish = computed(() => {
    // Check if at least one language has content and no critical errors
    // Simpler check: isAllLanguagesReady (which checks 'success' status)
    return isAllLanguagesReady.value;
});

// [NEW] Watcher to force draft if invalid
watch(canPublish, (valid) => {
    if (!valid && narrativeData.status !== 'draft' && narrativeData.status !== 'inactive') {
        // Logic handled in handleStatusChange
    }
});

// [NEW] Computed formatted created date - fallback chain: metadata.generated_at -> created_at
const formattedCreatedAt = computed(() => {
    const dateStr = narrativeData.metadata?.generated_at || narrativeData.created_at;
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return '-';
    }
});

// --- SENTENCE FOCUS TRACKING ---
const focusedSentence = reactive<{ pIdx: number | null, sIdx: number | null }>({
    pIdx: null,
    sIdx: null,
});

// --- CURSOR MANAGEMENT (For contenteditable) ---
function getCaretOffset(element) {
    let caretOffset = 0;
    const doc = element.ownerDocument || element.document;
    const win = doc.defaultView || doc.parentWindow;
    const sel = win.getSelection();
    if (sel.rangeCount > 0) {
        const range = win.getSelection().getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        caretOffset = preCaretRange.toString().length;
    }
    return caretOffset;
}

function setCaretOffset(element, offset) {
    let charCount = 0;
    const range = document.createRange();
    range.setStart(element, 0);
    range.collapse(true);
    const nodeStack: Node[] = [element];
    let node: Node | undefined;
    let found = false;
    let stop = false;

    while (!stop && (node = nodeStack.pop())) {
        if (node.nodeType === 3) { // Text node
            const nextCharCount = charCount + (node.textContent?.length || 0);
            if (!found && offset >= charCount && offset <= nextCharCount) {
                range.setStart(node, offset - charCount);
                range.setEnd(node, offset - charCount);
                stop = true;
                found = true;
            }
            charCount = nextCharCount;
        } else {
            let i = node.childNodes.length;
            while (i--) {
                nodeStack.push(node.childNodes[i]);
            }
        }
    }

    const sel = window.getSelection();
    if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

// --- PARAGRAPH EDITING (Click to Edit) ---
const focusedParagraphIndex = ref<number | null>(null);
const editParagraphs = ref<HTMLTextAreaElement[]>([]);
const documentTextarea = ref<HTMLTextAreaElement | null>(null); // [NEW] Ref for unified editor

const autoResizeTextarea = (el: HTMLElement | EventTarget | null) => {
    const target = el as HTMLTextAreaElement;
    if (!target) return;

    // Reset height dulu supaya bisa mengecil jika teks dihapus
    target.style.height = 'auto';
    // Set height sesuai scrollHeight (konten)
    target.style.height = target.scrollHeight + 'px';
};



// Resize all paragraph textareas (called on content load/change)
const resizeAllTextareas = () => {
    nextTick(() => {
        // For unified editor
        if (documentTextarea.value) autoResizeTextarea(documentTextarea.value);

        // For sentence view
        if (editParagraphs.value) {
            const textareas = Array.isArray(editParagraphs.value)
                ? editParagraphs.value
                : [editParagraphs.value];
            textareas.forEach(el => {
                if (el) autoResizeTextarea(el);
            });
        }
    });
};

const startEditingParagraph = (index) => {
    focusedParagraphIndex.value = index;
    nextTick(() => {
        // Find the active textarea
        if (editParagraphs.value) {
            const el = Array.isArray(editParagraphs.value)
                ? editParagraphs.value[index]
                : editParagraphs.value;
            if (el && el.focus) {
                el.focus();
                autoResizeTextarea(el);
            }
        }
    });
};


// Safe regex for [P,S] indices including Full-Width (CJK) variants & separators:
// Pattern matches: Bracket -> Digits -> Separator -> Digits -> Bracket
// Supports: [ ] ［ ］ 【 】, , . - 、 ，, 0-9 ０-９
// Using String.raw to ensure backslashes are passed to RegExp correctly
const INDEX_PATTERN_SOURCE = String.raw`[\[［【]\s*[\d０-９\u0660-\u0669\u06F0-\u06F9]+\s*[-.,，、]\s*[\d０-９\u0660-\u0669\u06F0-\u06F9]+\s*[\]］】]`;


// Compile Regexes
const STRIP_INDEX_REGEX = new RegExp(INDEX_PATTERN_SOURCE, 'g');
const CHECK_INDEX_REGEX = new RegExp(INDEX_PATTERN_SOURCE);
// Split regex (Lookahead) - Split BEFORE the index
const SPLIT_INDEX_REGEX = new RegExp(String.raw`(?=${INDEX_PATTERN_SOURCE})`);

// Helper to normalize Arabic-Indic digits to Western Arabic digits
const normalizeDigits = (str: string) => {
    if (!str) return '';
    return str.replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
        .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0));
};

// Normalizes all indices in text to standard numerals [1,1]
const normalizeIndicesInText = (text: string) => {
    // Only target the indices patterns
    return text.replace(new RegExp(INDEX_PATTERN_SOURCE, 'g'), (match) => {
        return normalizeDigits(match);
    });
};

// Strip [P,S] indices from text for display
function stripIndices(text) {
    if (!text || typeof text !== 'string') return '';
    return text.replace(STRIP_INDEX_REGEX, '');
}

// Split paragraph by [P,S] indices strictly (per user request)
function splitSentences(paragraph) {
    if (!paragraph || typeof paragraph !== 'string') return [''];

    // [NEW] Safety: Never split Image Tags (Legacy support, optional)
    if (/^\s*\[IMG:/i.test(paragraph)) {
        return [paragraph];
    }

    // STRICT MODE: Split ONLY by Index Codes if any index exists
    if (CHECK_INDEX_REGEX.test(paragraph)) {
        const parts = paragraph.split(SPLIT_INDEX_REGEX);
        // Only return non-empty trimmed parts
        return parts.map(s => s.trim()).filter(s => s.length > 0);
    }

    // Fallback ONLY if absolutely no indices are present
    const sentences = paragraph.split(/([.!?]+(?:\s+|$))/).reduce((acc: string[], cur: string, idx: number) => {
        if (idx % 2 === 0) {
            if (cur.trim()) acc.push(cur.trim());
        } else {
            if (acc.length > 0) acc[acc.length - 1] += cur;
        }
        return acc;
    }, []);

    return sentences.length > 0 ? sentences : [paragraph];
}

// Get display text (strip indices for rendering)
function getDisplayText(text) {
    return stripIndices(text);
}

// Markup indices AND anchor terms for editor backdrop
// Markup indices AND anchor terms for editor backdrop
function markupIndices(text) {
    if (!text) return '';

    // 1. Escape HTML to prevent rendering user input as HTML (match textarea behavior)
    let processed = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // 2. [REMOVED] Handle Base64 Images: [IMG:data:image/...] 
    // structured 'images' array is now used instead.

    // 3. Highlight Anchor Term if enabled (Backdrop only)
    if (isHighlightEnabled.value && anchorTerm.value) {
        processed = getHighlightedText(processed, [anchorTerm.value]);
    }

    // 4. Color Indices patterns [P,S]
    return processed.replace(new RegExp(`(${INDEX_PATTERN_SOURCE})`, 'g'), '<span style="unicode-bidi: isolate; direction: ltr;" class="text-[var(--color-tertiary)] font-bold">$1</span>');
}

// Set focused sentence when user clicks on a sentence span
function setFocusedSentence(pIdx, sIdx) {
    focusedSentence.pIdx = pIdx;
    focusedSentence.sIdx = sIdx;
}

// Clear focus when clicking outside
function clearFocusedSentence() {
    focusedSentence.pIdx = null;
    focusedSentence.sIdx = null;
}

// Join sentences back into paragraph
function joinSentences(sentences) {
    return sentences.filter(s => s.trim()).join(' ');
}

// Handle sentence input (update paragraph at pIdx with modified sentence at sIdx)
function onSentenceInput(pIdx, sIdx, event) {
    if (!activeContent.value || !activeContent.value.paragraphs) return;
    const el = event.target;
    const offset = getCaretOffset(el);
    const newText = el.innerText;

    const sentences = splitSentences(activeContent.value.paragraphs[pIdx] as string);
    sentences[sIdx] = newText;
    activeContent.value.paragraphs[pIdx] = joinSentences(sentences);
    isDirty.value = true;

    // Refresh display & restore cursor
    nextTick(() => {
        el.innerHTML = markupIndices(newText);
        setCaretOffset(el, offset);
    });
}

// Add new sentence at current focus (or end of current paragraph)
function addNewSentence() {
    if (!activeContent.value || !activeContent.value.paragraphs) return;
    const pIdx = focusedSentence.pIdx !== null ? focusedSentence.pIdx : activeContent.value.paragraphs.length - 1;
    if (pIdx < 0) {
        // No paragraphs, create one with empty sentence
        activeContent.value.paragraphs.push('');
    } else {
        // Just add a space to create sentence boundary (AI already includes punctuation)
        const currentPara = activeContent.value.paragraphs[pIdx] || '';
        activeContent.value.paragraphs[pIdx] = currentPara.trim() + ' ';
    }
    isDirty.value = true;
}

// Add new paragraph
function addNewParagraph() {
    if (!activeContent.value) return;
    if (!activeContent.value.paragraphs) {
        activeContent.value.paragraphs = [];
    }
    const insertIdx = focusedSentence.pIdx !== null ? focusedSentence.pIdx + 1 : activeContent.value.paragraphs.length;
    activeContent.value.paragraphs.splice(insertIdx, 0, '');
    isDirty.value = true;
}

// Helper to renumber sentence segments sequentially
function renumberSegments(segments, pNum) {
    return segments
        .filter(seg => seg !== undefined) // keep empty strings if they are valid segments
        .map((seg, idx) => {
            const clean = stripIndices(seg).trimStart();
            return `[${pNum},${idx + 1}] ${clean}`;
        })
        .join(' ');
}

// Helper to renumber all paragraphs starting from a specific index
function renumberSubsequentParagraphs(startIndex) {
    if (!activeContent.value || !activeContent.value.paragraphs) return;
    for (let i = startIndex; i < activeContent.value.paragraphs.length; i++) {
        const pText = activeContent.value.paragraphs[i] as string;
        const segments = splitSentences(pText);
        activeContent.value.paragraphs[i] = renumberSegments(segments, i + 1);
    }
}



const updateCursorPIdx = (el: HTMLElement, text: string, offset: number) => {
    const textBefore = text.substring(0, offset);
    // Count double newlines to find paragraph index
    const pIdx = (textBefore.match(/\n\n+/g) || []).length;
    currentCursorParagraphIndex.value = pIdx;
    console.log(`[Cursor] Paragraph index: ${pIdx}`);
};

const handleDocumentClick = (event: MouseEvent) => {
    const el = event.currentTarget as HTMLElement;
    const offset = getCaretOffset(el);
    updateCursorPIdx(el, el.innerText, offset);
};

const handleDocumentKeyup = (event: KeyboardEvent) => {
    // Only track positional keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
        const el = event.currentTarget as HTMLElement;
        const offset = getCaretOffset(el);
        updateCursorPIdx(el, el.innerText, offset);
    }
};

// [NEW] Unified Document Input (Direct full-text edit)
const handleDocumentInput = (event: Event) => {
    const el = event.target as HTMLDivElement;
    const offset = getCaretOffset(el);
    const val = el.innerText;

    activeFullText.value = val;
    isDirty.value = true;

    // Refresh display & restore cursor
    nextTick(() => {
        el.innerHTML = markupIndices(val);
        setCaretOffset(el, offset);
    });

    // Track paragraph index based on selection for image insertion
    updateCursorPIdx(el, val, offset);

    // Real-time synchronization
    const indexMatches = val.match(/\[(\d+),\d+\]/g);
    const hasMultiParagraphTags = indexMatches && indexMatches.some(m => !m.includes('[1,'));

    if (val.includes('\n\n') || hasMultiParagraphTags) {
        syncParagraphsFromDraft();
    }
};

// Real-time synchronization
const syncParagraphsFromDraft = () => {
    if (!activeContent.value) return;

    // 1. Normalize current draft
    const allText = normalizeIndicesInText(activeFullText.value);

    // 2. Split into segments strictly by index tags
    const segments = allText.split(SPLIT_INDEX_REGEX).filter(s => s.trim());

    if (segments.length === 0) {
        const paragraphs = activeFullText.value.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
        if (paragraphs.length > 0) activeContent.value.paragraphs = paragraphs;
        return;
    }

    const paragraphGroups: Record<number, string[]> = {};
    let lastFoundP = 1;

    segments.forEach(seg => {
        const match = seg.match(CHECK_INDEX_REGEX);
        if (match) {
            const digits = match[0].match(/\d+/g);
            if (digits && digits.length >= 1) lastFoundP = parseInt(digits[0]);
            if (!paragraphGroups[lastFoundP]) paragraphGroups[lastFoundP] = [];
            paragraphGroups[lastFoundP].push(seg.trim());
        } else {
            if (!paragraphGroups[1]) paragraphGroups[1] = [];
            paragraphGroups[1].push(seg.trim());
        }
    });

    const sortedPKeys = Object.keys(paragraphGroups).map(Number).sort((a, b) => a - b);
    const newParagraphs = sortedPKeys.map(pKey => paragraphGroups[pKey].join(' '));
    if (newParagraphs.length > 0) activeContent.value.paragraphs = newParagraphs;
};

// --- 2. LOGIC ENTER YANG ROBUST ---
const handleEnter = (event: KeyboardEvent, pIdx: number) => {
    // Shift+Enter = Baris baru biasa (biarkan default behavior browser)
    if (event.shiftKey) return;

    const el = event.target as HTMLElement;
    const cursor = getCaretOffset(el);
    const val = el.innerText;

    // Logic: Enter biasa = Baris baru di dalam textarea (jangan split paragraf sembarangan)
    // Kecuali jika kursor ada di PALING AKHIR -> Buat Paragraf Baru
    if (cursor === val.length) {
        event.preventDefault(); // Cegah newline di elemen saat ini
        addNewParagraphAfter(pIdx);
        return;
    }

    // Logic: Double Enter (Jika user menekan Enter 2x cepat/ada baris kosong) -> Split Paragraf
    // Cek karakter sebelum kursor
    const charBefore = val.substring(cursor - 1, cursor);
    if (charBefore === '\n') {
        event.preventDefault();
        // Hapus newline tersebut dan split
        splitParagraphAtCursor(pIdx, cursor - 1);
    }
};

const addNewParagraphAfter = (index: number) => {
    if (!activeContent.value) return;
    activeContent.value.paragraphs.splice(index + 1, 0, '');
    isDirty.value = true;

    nextTick(() => {
        // Focus ke elemen baru? Karena bukan textarea, kita butuh cara lain.
        // Untuk sekarang, sinkronisasi state sudah cukup untuk render elemen baru.
    });
};

const splitParagraphAtCursor = (pIdx: number, splitPos: number) => {
    if (!activeContent.value) return;
    const text = activeContent.value.paragraphs[pIdx];
    const firstPart = text.substring(0, splitPos).trim();
    const secondPart = text.substring(splitPos).trim();

    activeContent.value.paragraphs[pIdx] = firstPart;
    activeContent.value.paragraphs.splice(pIdx + 1, 0, secondPart);
    isDirty.value = true;
};

// --- 3. SANITIZATION (SELF-HEALING / DOCUMENT PARSING) ---
// Panggil fungsi ini SEBELUM saveNarrative()
// Logic: Hanya [P,S] index yang boleh memisahkan kalimat dan paragraf. 
const healAndRenumberIndices = () => {
    if (!activeContent.value || !activeContent.value.paragraphs) return;

    // 1. Combine current paragraphs for parsing
    const allText = activeContent.value.paragraphs.join('\n\n');
    const normalizedText = normalizeIndicesInText(allText);

    // 2. Split into segments strictly by index tags
    const segments = normalizedText.split(SPLIT_INDEX_REGEX).filter(s => s.trim());

    if (segments.length === 0) {
        // Fallback: If no tags, just ensure sequential [P,S]
        const newParagraphs = activeContent.value.paragraphs.map((p, pIdx) => {
            const clean = stripIndices(p as string).trim();
            if (!clean) return '';
            return `[${pIdx + 1},1] ${clean}`;
        }).filter(p => p !== '');

        if (newParagraphs.length > 0) activeContent.value.paragraphs = newParagraphs;
        return;
    }

    const paragraphGroups: Record<number, string[]> = {};
    let lastFoundP = 1;

    segments.forEach(seg => {
        const match = seg.match(CHECK_INDEX_REGEX);
        if (match) {
            const digits = match[0].match(/\d+/g);
            if (digits && digits.length >= 1) lastFoundP = parseInt(digits[0]);
            if (!paragraphGroups[lastFoundP]) paragraphGroups[lastFoundP] = [];
            paragraphGroups[lastFoundP].push(stripIndices(seg).trim());
        } else {
            if (!paragraphGroups[1]) paragraphGroups[1] = [];
            paragraphGroups[1].push(seg.trim());
        }
    });

    // 3. Re-assemble into structure
    const sortedPKeys = Object.keys(paragraphGroups).map(Number).sort((a, b) => a - b);
    const newParagraphs: string[] = [];

    sortedPKeys.forEach((pKey, pIdx) => {
        const sentences = paragraphGroups[pKey].filter(s => s.length > 0);
        if (sentences.length > 0) {
            newParagraphs.push(renumberSegments(sentences, pIdx + 1));
        }
    });

    if (newParagraphs.length > 0) {
        activeContent.value.paragraphs = newParagraphs;
    }
};
// Handle Enter key in sentence (Split Sentence OR Create New Paragraph on Double Enter)
function onEnterInSentence(pIdx, sIdx, event) {
    if (!activeContent.value || !activeContent.value.paragraphs) return;

    if (event.shiftKey) {
        addNewParagraph();
        renumberSubsequentParagraphs(pIdx + 2);
        return;
    }

    event.preventDefault(); // Prevent default newline

    const textarea = event.target as HTMLTextAreaElement;
    const cursor = textarea.selectionStart || 0;
    const text = textarea.value;

    // CHECK FOR DOUBLE ENTER (Empty Sentence) -> Split Paragraph
    const cleanText = stripIndices(text as string).trim();
    if (cleanText === '') {
        const allSentences = splitSentences(activeContent.value.paragraphs[pIdx]);

        // Split sentences into two groups: before and after current
        const beforeSentences = allSentences.slice(0, sIdx);
        const afterSentences = allSentences.slice(sIdx + 1); // remove current empty one

        // Update Current Paragraph (Left side)
        activeContent.value.paragraphs[pIdx] = renumberSegments(beforeSentences, pIdx + 1);

        // Create Next Paragraph (Right side, or empty)
        let nextParagraphContent = '';
        if (afterSentences.length > 0) {
            nextParagraphContent = renumberSegments(afterSentences, pIdx + 2);
        }

        // Insert into paragraphs array
        activeContent.value.paragraphs.splice(pIdx + 1, 0, nextParagraphContent);

        // Renumber subsequent
        renumberSubsequentParagraphs(pIdx + 2);

        isDirty.value = true;
        return;
    }

    // NORMAL ENTER: Split Sentence
    const left = text.substring(0, cursor);
    const right = text.substring(cursor);

    const allSentences = splitSentences(activeContent.value.paragraphs[pIdx]);
    // Replace current sentence with two parts
    allSentences.splice(sIdx, 1, left, right);

    // Reflow Indices
    activeContent.value.paragraphs[pIdx] = renumberSegments(allSentences, pIdx + 1);
    isDirty.value = true;
}

// Computed: Get English paragraph count as reference
const expectedParagraphCount = computed(() => {
    // Use English as base - get paragraph count from English content
    const enContent = narrativeData.contents?.['en'];
    if (enContent?.paragraphs?.length) {
        return enContent.paragraphs.length;
    }
    // Fallback: get max paragraph count from all languages
    const counts = Object.values(narrativeData.contents)
        .filter(c => c && c.paragraphs)
        .map(c => c.paragraphs.length);
    return counts.length > 0 ? Math.max(...counts) : 0;
});

const paragraphMismatchLangs = computed(() => {
    const expected = expectedParagraphCount.value;
    if (expected === 0) return {};

    const mismatches = {};
    for (const [langCode, content] of Object.entries(narrativeData.contents || {})) {
        if (content && content.paragraphs) {
            // English is always valid (it's the reference)
            if (langCode === 'en') {
                mismatches[langCode] = false;
            } else {
                mismatches[langCode] = content.paragraphs.length !== expected;
            }
        }
    }
    return mismatches;
});

// Sentence count per paragraph for validation
function getSentenceCountsForLang(langCode) {
    const content = narrativeData.contents?.[langCode];
    if (!content || !content.paragraphs) return [];
    return content.paragraphs.map(p => splitSentences(p).length);
}

// Check if all languages have consistent sentence counts (compared to Russian base)
const sentenceMismatchLangs = computed(() => {
    const languages = Object.keys(narrativeData.contents).filter(
        code => narrativeData.contents[code]?.paragraphs?.length > 0
    );
    if (languages.length < 2) return {};

    // Use English as the base reference language for validation
    const refLang = 'en';
    // If English doesn't exist, skip validation (or fallback)
    if (!narrativeData.contents[refLang]?.paragraphs?.length) {
        return {};
    }
    const refCounts = getSentenceCountsForLang(refLang);

    const mismatches = {};
    for (const langCode of languages) {
        // Russian itself is always valid (it's the reference)
        if (langCode === refLang) {
            mismatches[langCode] = false;
            continue;
        }
        const counts = getSentenceCountsForLang(langCode);
        // Check if sentence counts match per paragraph
        const hasMismatch = counts.length !== refCounts.length ||
            counts.some((c, i) => c !== refCounts[i]);
        mismatches[langCode] = hasMismatch;
    }
    return mismatches;
});

// Character set validation
const validateLanguageScript = (langCode, paragraphs) => {
    if (!paragraphs || paragraphs.length === 0) return { isValid: true };

    // [NEW] Filter out Image Paragraphs to prevent False Positives (Base64 is Latin)
    // Robust Regex: Starts with [IMG:, case insensitive, allows leading whitespace
    const textParagraphs = paragraphs.filter(p => !/^\s*\[IMG:/i.test(p));

    if (textParagraphs.length === 0) return { isValid: true };

    const text = textParagraphs.join(' ');

    // Skip if empty
    if (!text.trim()) return { isValid: true };

    let regex = null;
    let expectedScript = "";

    switch (langCode) {
        case 'ru': // Russian: Cyrillic
            regex = /[\u0400-\u04FF]/;
            expectedScript = t('admin.script_validation_cyrillic');
            // Check if it has NO Cyrillic at all (very strict)
            // Or check if it has Latin (mixed)
            // Strategy: Must contain some Cyrillic, and should not contain much Latin
            break;
        case 'ar': // Arabic
            regex = /[\u0600-\u06FF]/;
            expectedScript = t('admin.script_validation_arabic');
            break;
        case 'hi': // Hindi: Devanagari
            regex = /[\u0900-\u097F]/;
            expectedScript = t('admin.script_validation_devanagari');
            break;
        case 'zh': // Chinese: CJK
            regex = /[\u4E00-\u9FFF]/;
            expectedScript = t('admin.script_validation_cjk');
            break;
        case 'ja': // Japanese: Hiragana/Katakana/Kanji
            regex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
            expectedScript = t('admin.script_validation_japanese');
            break;
        case 'ko': // Korean: Hangul
            regex = /[\uAC00-\uD7AF\u1100-\u11FF]/;
            expectedScript = t('admin.script_validation_hangul');
            break;
        case 'th': // Thai
            regex = /[\u0E00-\u0E7F]/;
            expectedScript = t('admin.script_validation_thai');
            break;
        case 'en':
        case 'id':
        case 'de':
        case 'fr':
        case 'es':
        case 'it':
        case 'pt': // Latin languages
            regex = /[A-Za-z]/;
            expectedScript = t('admin.script_validation_latin');
            if (/[\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u4E00-\u9FFF]/.test(text)) {
                return { isValid: false, reason: t('admin.error_mixed_script') };
            }
            break;
    }

    if (regex) {
        // Must contain at least one character of the expected script
        const hasScript = regex.test(text);
        if (!hasScript) {
            return { isValid: false, reason: t('admin.error_must_contain', { script: expectedScript }) };
        }

        // Strict Check: specific strict rules for non-latin languages
        if (['ru', 'ar', 'hi', 'zh', 'ja', 'ko', 'th'].includes(langCode)) {
            // Should NOT contain Latin blocks (basic strictness)
            // Allow some punctuation/numbers, but minimal Latin text
            // Heuristic: If > 50% Latin, it's probably wrong
            const latinCount = (text.match(/[A-Za-z]/g) || []).length;
            const totalCount = text.length;
            if (latinCount > totalCount * 0.5) { // 50% threshold for mixed content
                return { isValid: false, reason: t('admin.error_dominant_latin', { script: expectedScript }) };
            }
        }
    }

    return { isValid: true };
};

// Character Mismatches Computed Property
const characterMismatchLangs = computed(() => {
    const mismatches = {};
    for (const [langCode, content] of Object.entries(narrativeData.contents || {})) {
        if (content && content.paragraphs) {
            const validation = validateLanguageScript(langCode, content.paragraphs);
            if (!validation.isValid) {
                mismatches[langCode] = validation.reason;
            } else {
                mismatches[langCode] = false;
            }
        }
    }
    return mismatches;
});

// Combined validation: paragraph OR sentence mismatch OR character mismatch
const hasValidationError = computed(() => {
    return (langCode) => {
        const structError = paragraphMismatchLangs.value[langCode] || sentenceMismatchLangs.value[langCode];
        if (structError) return t('admin.error_inconsistent_structure');

        const charError = characterMismatchLangs.value[langCode];
        if (charError) return t('admin.error_wrong_character', { error: charError });

        return null;
    };
});

// Get source and target language codes for public view
// Get source and target language codes for public view
const sourceLangCode = computed(() => languageStore.selectedAsal?.kodeBahasa || 'id');
const targetLangCode = computed(() => languageStore.selectedTarget?.kodeBahasa || 'en');

const validateAnchorIntegrity = (paragraphs, anchorSentence) => {
    if (!anchorSentence) return { isValid: true };
    const normalizedAnchor = anchorSentence.trim();
    // Regex for [P,S] or just [N]
    const reTag = /\[\d+(?:,\d+)?\]/g;

    for (const p of paragraphs) {
        // Split by tag
        // split will include the separators if captured, but we just want to split by them
        const parts = p.split(reTag);
        for (const part of parts) {
            const info = part.trim();
            if (!info) continue;
            // Strict check (allowing for minor punctuation differences at end logic could be added)
            // Ideally: info === normalizedAnchor
            // But let's be slightly flexible with trailing dot
            const infoClean = info.replace(/[.]+$/, '');
            const anchorClean = normalizedAnchor.replace(/[.]+$/, '');

            if (info === normalizedAnchor || infoClean === anchorClean) {
                return { isValid: true };
            }
        }
    }
    return { isValid: false, reason: t('admin.error_anchor_not_found') };
};

// Get content for source language
const sourceContent = computed(() => {
    const code = sourceLangCode.value;
    if (!narrativeData.contents?.[code]) {
        return { title: '', paragraphs: [] };
    }
    return narrativeData.contents[code];
});

// Get content for target language
const targetContent = computed(() => {
    const code = targetLangCode.value;
    if (!narrativeData.contents?.[code]) {
        return { title: '', paragraphs: [] };
    }
    return narrativeData.contents[code];
});

// Get anchor terms for both languages
const sourceAnchorTerm = computed(() => {
    const term = narrativeData.anchor_sentences[sourceLangCode.value];
    if (!term) return null;
    return term.trim();
});

const targetAnchorTerm = computed(() => {
    const term = narrativeData.anchor_sentences[targetLangCode.value];
    if (!term) return null;
    return term.trim();
});

const currentBaseLang = computed(() => {
    // Determine the active anchor language based on data existence
    const baseSentences = narrativeData.anchor_sentences || {};
    if (Object.keys(baseSentences).length > 0) {
        // Priority: en > ru > id > any
        return baseSentences.en ? 'en'
            : (baseSentences.ru ? 'ru'
                : (baseSentences.id ? 'id'
                    : Object.keys(baseSentences)[0]));
    }
    // Fallback for new standalone narratives
    return 'id';
});



const activeContent = computed(() => {
    if (narrativeData.contents && !narrativeData.contents[activeLang.value]) {
        narrativeData.contents[activeLang.value] = { title: '', paragraphs: [''] };
    }
    return narrativeData.contents[activeLang.value];
});

const activeBodyTextSize = computed(() => {
    // Changed to text-base to match DaftarKalimat.vue consistency
    return 'text-base';
});

// Watch activeContent to resize textareas when content changes (initial load, language switch, etc.)
watch(
    () => activeContent.value?.paragraphs,
    () => {
        resizeAllTextareas();
    },
    { deep: true, immediate: true }
);

const activeFullText = ref(''); // [NEW] Unified drafting surface

// Sync activeFullText from structured paragraphs
watch(() => activeContent.value?.paragraphs, (newVal) => {
    if (newVal) {
        const joined = newVal.join('\n\n');
        if (activeFullText.value !== joined) {
            activeFullText.value = joined;
        }
    }
}, { deep: true, immediate: true });

// Public view mode: 'paragraph' or 'sentence' for side-by-side display
const dualViewMode = ref<'paragraph' | 'sentence'>('paragraph');

watch(dualViewMode, async () => {
    await nextTick();
    resizeAllTextareas();
    // If switching to sentence mode, ensure indices are healed/synced first
    if (dualViewMode.value === 'sentence') {
        healAndRenumberIndices();
    }
}, { immediate: true });

// Get anchor term for highlighting (cleaned)
const anchorTerm = computed(() => {
    const term = narrativeData.anchor_sentences?.[activeLang.value];
    if (!term) return null;
    if (!term) return null;
    return term.trim();
});

// Helper wrapper for robust highlighting with debug safety
// Updated to use Regex for better whitespace handling
// const isImageParagraph = (text: string) => { // REMOVED
//    if (!text) return false;
//    return /^\s*\[IMG:/i.test(text);
// };

// [NEW] Robust Sync Deletion (Structure-aware)
const deleteImageFromAllLanguages = (paragraphIndex: number) => {
    // Check if there are images at this index
    const imagesAtIdx = narrativeData.images.filter(img => img.paragraphIndex === paragraphIndex);
    if (imagesAtIdx.length === 0) return;

    showConfirm({
        title: t('delete'),
        message: t('admin.confirm_delete_image'),
        isDestructive: true,
        onConfirm: () => {
            // Remove all images associated with this paragraph index
            // Note: If you want to delete specific images, use removeImageFromStructuredStorage(arrayIndex)
            const initialLength = narrativeData.images.length;
            narrativeData.images = narrativeData.images.filter(img => img.paragraphIndex !== paragraphIndex);

            if (narrativeData.images.length !== initialLength) {
                isDirty.value = true;
            }
        }
    });
};

const renderTargetParagraph = (targetParaText: string, pIdx: number) => {
    if (!targetParaText) return '';

    // [NEW] Check for Image Paragraph - REMOVED (Structured storage handles this now)
    // if (isImageParagraph(targetParaText)) { ... }

    // Get the corresponding source paragraph to determine which sentences to show
    const sourcePara = sourceContent.value?.paragraphs?.[pIdx] || '';
    const sourceSentences = splitSentences(sourcePara);

    // Split the target paragraph into indexed sentences
    const targetSentences = splitSentences(targetParaText);

    // Create a map of index code -> target sentence for efficient lookup
    const targetMap: Record<string, string> = {};
    targetSentences.forEach(s => {
        const match = s.match(CHECK_INDEX_REGEX);
        if (match) {
            targetMap[match[0]] = s;
        }
    });

    let renderedHtml = '';

    sourceSentences.forEach((sourceSentence, sIdx) => {
        const match = sourceSentence.match(CHECK_INDEX_REGEX);
        const indexKey = match ? match[0] : null;

        let targetSentenceText = '';
        if (indexKey && targetMap[indexKey]) {
            targetSentenceText = targetMap[indexKey];
        } else if (!indexKey && targetSentences[sIdx]) {
            // Fallback: if no index key, try matching by position
            targetSentenceText = targetSentences[sIdx];
        }

        const displayText = stripIndices(targetSentenceText).trim();

        if (!displayText) {
            // No matching target sentence: keep empty span for structure
            renderedHtml += `<span id="p-${pIdx}-s-${sIdx}"></span> `;
            return;
        }

        let highlighted = displayText;
        if (isHighlightEnabled.value) {
            const termsToHighlight: string[] = [];
            if (targetAnchorTerm.value) termsToHighlight.push(targetAnchorTerm.value);
            if (props.highlightText && showHighlight.value) termsToHighlight.push(props.highlightText as string);

            if (termsToHighlight.length > 0) {
                highlighted = getHighlightedText(displayText, termsToHighlight);
            }
        }

        // Apply active TTS highlighting if this specific segment is playing
        const isActive = ttsState.activeSegmentId === `p-${pIdx}-s-${sIdx}`;
        const activeClass = isActive ? 'text-[var(--color-primary)] font-bold' : '';

        // Added space for natural paragraph flow
        renderedHtml += `<span id="p-${pIdx}-s-${sIdx}" class="${activeClass}">${highlighted}</span> `;
    });

    return renderedHtml.trim();
};

const renderSourceParagraph = (sourceParaText: string, pIdx: number) => {
    if (!sourceParaText) return '';

    // [NEW] HIDE Image Paragraph in Source View - REMOVED (Structured storage handles this now)
    // if (isImageParagraph(sourceParaText)) { ... }

    const sourceSentences = splitSentences(sourceParaText);
    let renderedHtml = '';

    sourceSentences.forEach((s, sIdx) => {
        const displayText = stripIndices(s).trim();
        if (!displayText) {
            renderedHtml += `<span id="src-p-${pIdx}-s-${sIdx}"></span> `;
            return;
        }

        let highlighted = displayText;
        if (isHighlightEnabled.value) {
            const termsToHighlight: string[] = [];
            if (sourceAnchorTerm.value) termsToHighlight.push(sourceAnchorTerm.value);
            if (props.highlightText && showHighlight.value) termsToHighlight.push(props.highlightText as string);

            if (termsToHighlight.length > 0) {
                highlighted = getHighlightedText(displayText, termsToHighlight);
            }
        }

        renderedHtml += `<span id="src-p-${pIdx}-s-${sIdx}">${highlighted}</span> `;
    });

    return renderedHtml.trim();
};

// Helper to normalize content into array of strings
const normalizeContent = (content) => {
    if (Array.isArray(content) && (content.length === 0 || typeof content[0] === 'string')) {
        return content;
    }
    // If it's TipTap JSON (Object with { type: 'doc', content: [...] })
    if (content && content.type === 'doc' && Array.isArray(content.content)) {
        return content.content
            .filter(node => node.type === 'paragraph' && node.content)
            .map(node => node.content.map(n => n.text || '').join(''))
            .filter(text => text.trim().length > 0);
    }
    return [];
};

// Computed for single textarea: join paragraphs into text with double-newline separation
const fullContent = computed({
    get() {
        if (!activeContent.value) return '';
        return (activeContent.value.paragraphs as string[]).join('\n\n');
    },
    set(value) {
        if (!activeContent.value) return;
        // Split by double-newline to get paragraphs, filter empty ones
        activeContent.value.paragraphs = value
            .split(/\n\n+/)
            .map(p => p.trim())
            .filter(p => p.length > 0);
        if (activeContent.value.paragraphs.length === 0) {
            activeContent.value.paragraphs = [''];
        }
    }
});

// --- SLIDE VIEW STATE ---
const publicPresentationMode = ref<'scroll' | 'slide'>('scroll');
const currentSlideIndex = ref(0);

// --- IMAGE INTERACTION STATE ---
const visibleImageSources = reactive(new Set<string>());
const toggleImageSource = (id: string) => {
    if (visibleImageSources.has(id)) {
        visibleImageSources.delete(id);
    } else {
        visibleImageSources.add(id);
    }
};

const computedSlides = computed(() => {
    const slides: any[] = [];
    if (!targetContent.value) return slides;

    // 1. Title Slide
    slides.push({
        type: 'title',
        content: {
            target: targetContent.value.title,
            source: sourceContent.value?.title
        },
        id: 'title'
    });

    // 2. Content Slides
    const paragraphs = targetContent.value.paragraphs || [];
    const sourceParagraphs = sourceContent.value?.paragraphs || [];

    paragraphs.forEach((p, pIdx) => {
        // Text Slide
        if (dualViewMode.value === 'paragraph') {
             slides.push({
                type: 'text',
                content: {
                    target: p,
                    source: sourceParagraphs[pIdx] || ''
                },
                id: `p-${pIdx}`,
                pIdx
            });
        } else {
            // Split into sentences
            const sentences = splitSentences(p);
            const sourceSens = splitSentences(sourceParagraphs[pIdx] || '');
            sentences.forEach((s, sIdx) => {
                 slides.push({
                    type: 'text',
                    content: {
                        target: s,
                        source: sourceSens[sIdx] || ''
                    },
                    id: `p-${pIdx}-s-${sIdx}`,
                    pIdx,
                    sIdx
                });
            });
        }

        // Image Slide (After paragraph)
        if (narrativeData.images) {
            const images = narrativeData.images.filter(img => img.paragraphIndex === pIdx);
            images.forEach((img, imgIdx) => {
                slides.push({
                    type: 'image',
                    content: img,
                    id: `img-${pIdx}-${imgIdx}`,
                    pIdx
                });
            });
        }
    });

    return slides;
});

const currentSlide = computed(() => computedSlides.value[currentSlideIndex.value]);

const nextSlide = () => {
    if (currentSlideIndex.value < computedSlides.value.length - 1) {
        currentSlideIndex.value++;
    }
};

const prevSlide = () => {
    if (currentSlideIndex.value > 0) {
        currentSlideIndex.value--;
    }
};

onKeyStroke(['ArrowRight', ' '], (e) => {
    if (publicPresentationMode.value === 'slide') {
        e.preventDefault();
        nextSlide();
    }
});
onKeyStroke(['ArrowLeft'], (e) => {
    if (publicPresentationMode.value === 'slide') {
        e.preventDefault();
        prevSlide();
    }
});

const aiConfig = reactive({
    paragraph_count: 5,
    paragraph_length: 'Medium',
    proficiency_level: 'B1', // Default to B1 (Intermediate)
    theme: '',
    narrative_type: 'Slice of Life', // Default type
});

const isConfigModalOpen = ref(false);


const randomizeConfig = () => {
    aiConfig.paragraph_count = Math.floor(Math.random() * (7 - 3 + 1)) + 3;
    const lengths = ['Short', 'Medium', 'Long'];
    aiConfig.paragraph_length = lengths[Math.floor(Math.random() * lengths.length)];
    const levels = ['Beginner', 'Intermediate', 'Advanced'];
    aiConfig.proficiency_level = levels[Math.floor(Math.random() * levels.length)];
    const themes = ['Sejarah', 'Teknologi', 'Budaya', 'Kuliner', 'Pariwisata', 'Tokoh Terkenal', 'Seni', 'Sastra', 'Alam', 'Sains'];
    aiConfig.theme = themes[Math.floor(Math.random() * themes.length)];
    const types = ['Fable', 'Legend', 'Myth', 'Fairy Tale', 'Science Fiction', 'Mystery', 'Slice of Life', 'Biography', 'Personal Experience', 'Historical Narrative', 'Adventure', 'Horror', 'Romance', 'Tragedy'];
    aiConfig.narrative_type = types[Math.floor(Math.random() * types.length)];
};

// AI Director State
const directorPlan = ref<any>(null);
const isLoadingDirector = ref(false);
const directorPromise = ref(null); // Store promise for synchronization

const handleConsultDirector = async () => {
    // Skip if no group id selection yet (null or undefined)
    if (activeGroupId.value == null) return;

    // Don't re-run if already loading
    if (isLoadingDirector.value) return;

    isLoadingDirector.value = true;
    try {
        const numericGid = Number(activeGroupId.value);
        if (!isNaN(numericGid)) {
            // Initiate the plan fetch if not already in progress
            // PASS THE CONFIG so the Director knows the Genre!
            directorPromise.value = getDirectorPlan(numericGid, JSON.parse(JSON.stringify(aiConfig)));
            const plan = await directorPromise.value;
            if (plan) {
                directorPlan.value = plan;
                if (plan.theme) aiConfig.theme = plan.theme;
            }
        }
    } catch (e) {
        console.error("Director failed", e);
    } finally {
        isLoadingDirector.value = false;
    }
};

// AUTO-REGENERATE DIRECTOR PLAN WHEN GENRE CHANGES
watch(() => aiConfig.narrative_type, () => {
    // Debounce slightly or just call it (isLoading handles concurrency)
    // We strictly follow "If genre changes, Director regenerates"
    console.log('[Auto-Director] Genre changed to', aiConfig.narrative_type);
    handleConsultDirector();
});

const openConfig = () => {
    isConfigModalOpen.value = true;
    handleConsultDirector(); // Auto-consult on open
};

const confirmGenerate = async () => {
    isConfigModalOpen.value = false;

    // Reset all language statuses and retry counts
    Object.keys(langStatus).forEach(key => delete langStatus[key]);
    Object.keys(retryCounts).forEach(key => delete retryCounts[key]); // Reset retries
    Object.keys(langErrors).forEach(key => delete langErrors[key]); // Reset error messages

    // Update AI Config theme if Director Plan exists
    // Update AI Config theme if Director Plan exists (or wait for it)
    try {
        if (isLoadingDirector.value && directorPromise.value) {
            // If director is still thinking, wait for it before generating!
            console.log("Waiting for Director Plan...");
            const plan = await directorPromise.value;
            if (plan) {
                directorPlan.value = plan;
                if (plan.theme) aiConfig.theme = plan.theme;
            }
        } else if (directorPlan.value) {
            aiConfig.theme = directorPlan.value.theme; // Ensure theme matches plan
        }
    } catch (e) {
        console.warn("Director failed or timed out, proceeding with defaults", e);
    }

    // CLEAR all existing narratives before regenerating (fresh start)
    narrativeData.contents = {};
    narrativeData.image_url = null;
    isDirty.value = false; // Reset dirty flag since we're regenerating

    // Use languages from anchor_sentences if available, otherwise fallback to availableLanguages
    let targetLangs = Object.keys(narrativeData.anchor_sentences || {});
    const isStandaloneNarrative = targetLangs.length === 0;

    if (isStandaloneNarrative) {
        // For standalone narratives, use default languages from store
        targetLangs = availableLanguages.value.map(l => l.code);
        if (targetLangs.length === 0) {
            console.warn('[Narrative] No languages available for generation.');
            return;
        }
        console.log('[Narrative] Standalone mode: using all available languages.');
    }

    console.log(`[Narrative] Starting generation for ${targetLangs.length} languages:`, targetLangs);

    // Use Client-Orchestrated Parallel Streaming for faster results
    const numericGid = Number(activeGroupId.value);
    closeStreamingFn.value = generateNarrativeParallel(isNaN(numericGid) ? 0 : numericGid, {
        aiConfig: { ...aiConfig },
        targetLanguages: targetLangs, // Use anchor_sentences keys instead of availableLanguages
        baseSentences: narrativeData.anchor_sentences,
        storyOutline: directorPlan.value, // Pass Director Plan
        narrativeId: narrativeData.id, // Pass narrative ID for standalone translations
        baseLang: selectedAnchorLang.value, // Use selected anchor language
        onLanguageStart: (langCode, langName) => {
            // Set to loading when generation actually starts
            langStatus[langCode] = 'loading';
            langErrors[langCode] = ''; // Clear previous error
            console.log(`[Narrative] Generating ${langName}...`);
        },
        onLanguageSuccess: (langCode, data, nid, validationPassed, validationErrors, newImages) => {
            // Update global narrative ID if this is the first successful generation (base)
            if (nid && !narrativeData.id) {
                narrativeData.id = nid;
            }

            // Determine base lang (logic must match handleLanguageSuccessWithRetry)
            // For standalone narratives, default to 'en' (matching backend)
            const baseSentences = narrativeData.anchor_sentences || {};
            const baseLang = baseSentences.en ? 'en'
                : (baseSentences.ru ? 'ru'
                    : (baseSentences.id ? 'id'
                        : Object.keys(baseSentences)[0] || 'en'));

            handleLanguageSuccessWithRetry(langCode, data, langCode === baseLang, validationPassed, validationErrors, newImages);
        },
        onLanguageError: (langCode, error) => {
            handleLanguageErrorWithRetry(langCode, error);
            console.error(`[Narrative] Failed for ${langCode}:`, error);
        },
        onComplete: (successCount, errorCount) => {
            closeStreamingFn.value = null;
            console.log(`[Narrative] Complete: ${successCount} success, ${errorCount} errors`);
            // Set active lang to first successful language
            const successLang = Object.keys(langStatus).find(k => langStatus[k] === 'success');
            if (successLang && !narrativeData.contents[activeLang.value]?.title) {
                activeLang.value = successLang;
            }
        },
    });
};



const regenerateFromAnchor = () => {
    // 1. Validate Anchor
    const anchorCode = selectedAnchorLang.value;
    const anchorContent = narrativeData.contents[anchorCode];

    if (!anchorContent || !anchorContent.title || !anchorContent.paragraphs || anchorContent.paragraphs.length === 0) {
        uiStore.showToast(t('admin.anchor_empty', { code: anchorCode }), 'warning');
        return;
    }

    showConfirm({
        title: t('admin.mass_regen'),
        message: t('admin.mass_regen_confirm', { code: anchorCode }),
        onConfirm: () => {
            // 2. Prepare Base Sentences from Anchor Editorial Content
            // We flatten the paragraphs into a map of sentences to serve as the "Source Of Truth"
            const editorialBaseSentences: Record<string, string> = {};

            // NOTE: Passing raw paragraphs is better for context if backend supports it.
            // But generateNarrativeParallel expects Record<string, string>.
            // Let's pass paragraphs as "sentences" with keys p1, p2...
            anchorContent.paragraphs.forEach((p, idx) => {
                if (typeof p === 'string' && p.trim()) {
                    editorialBaseSentences[`p${idx + 1}`] = p.trim();
                }
            });

            // 3. Identify Target Languages (All available except Anchor)
            const targets = availableLanguages.value
                .map(l => l.code)
                .filter(c => c !== anchorCode);

            if (targets.length === 0) {
                uiStore.showToast("Tidak ada bahasa target yang tersedia.", 'info');
                return;
            }

            // 4. Reset Statuses for Targets
            targets.forEach(code => {
                langStatus[code] = 'idle';
                langErrors[code] = '';
            });

            // 5. Execute Generation
            console.log(`[Regen Massal] From ${anchorCode} to ${targets.join(', ')}`);

            const numericGid = parseInt(String(activeGroupId.value));

            closeStreamingFn.value = generateNarrativeParallel(isNaN(numericGid) ? 0 : numericGid, {
                aiConfig: { ...aiConfig }, // Pass config just in case
                targetLanguages: targets,
                baseSentences: editorialBaseSentences, // Use Editorial Content as Source
                narrativeId: narrativeData.id ? parseInt(String(narrativeData.id)) : null,
                baseLang: anchorCode, // Anchor is the base
                baseContent: anchorContent, // [NEW] Pass Editorial Content (Title + Paras) as Source
                skipBaseGeneration: true, // We already have the anchor content

                onLanguageStart: (langCode, langName) => {
                    langStatus[langCode] = 'loading';
                    langErrors[langCode] = '';
                },
                onLanguageSuccess: (langCode, data, nid, validationPassed, validationErrors, newImages) => {
                    // Update Data using existing handler
                    // Note: handleLanguageSuccessWithRetry must be available in scope
                    if (typeof handleLanguageSuccessWithRetry === 'function') {
                        handleLanguageSuccessWithRetry(langCode, data, false, validationPassed, validationErrors, newImages);
                    } else {
                        // Fallback if function not found (should be there)
                        if (data.contents && data.contents[langCode]) {
                            const item = data.contents[langCode];
                            narrativeData.contents[langCode] = {
                                title: item.title,
                                paragraphs: normalizeContent(item.content || item.paragraphs),
                            };
                            langStatus[langCode] = 'success';
                        }
                    }
                    isDirty.value = true;
                },
                onLanguageError: (langCode, error) => {
                    handleLanguageErrorWithRetry(langCode, error);
                },
                onComplete: (successCount, errorCount) => {
                    closeStreamingFn.value = null;
                    console.log(`[Regen Massal] ${t('admin.success_msg')}: ${successCount}, ${t('admin.error_msg')}: ${errorCount}`);
                },
            });
        }
    });
};

const handleGenerate = () => {
    openConfig();
};

const handleSave = async () => {
    // 1. Run Sanitization (Heal broken indices)
    healAndRenumberIndices();

    // Allow activeGroupId to be 0 for standalone narratives
    if (activeGroupId.value === null) {
        localError.value = t('admin.error_anchor_missing');
        return;
    }

    const contentsToSave = {};
    for (const lang of availableLanguages.value) {
        const code = lang.code;
        const data = narrativeData.contents?.[code];
        // Only include languages that have a title OR at least one non-empty paragraph
        const hasTitle = data?.title?.trim();
        const nonEmptyParagraphs = data?.paragraphs?.filter(p => p.trim()) || [];

        if (hasTitle || nonEmptyParagraphs.length > 0) {
            const hasError = hasValidationError.value(code);
            contentsToSave[code] = {
                title: data.title || '',
                // Ensure indices are normalized to Western numerals before saving
                content: nonEmptyParagraphs.map(p => normalizeIndicesInText(p)),
                status: hasError ? 'error' : 'success',
                error_message: hasError || null,
            };
        }
    }

    // Ensure at least one language has content
    if (Object.keys(contentsToSave).length === 0) {
        localError.value = t('admin.error_no_content') || 'Please enter a title or content before saving.';
        return;
    }

    const gid = parseInt(String(activeGroupId.value)) || 0;
    const nid = parseInt(String(narrativeData.id)) || 0;

    const result = await saveNarrative(
        gid > 0 ? gid : null,
        contentsToSave,
        nid > 0 ? nid : null,
        narrativeData.status, // [NEW] Pass status
        narrativeData.metadata, // [NEW] Pass metadata
        narrativeData.images // [NEW] Pass structured images
    );
    if (result) {
        narrativeData.id = result.id;
        isDirty.value = false;
        localError.value = null; // Clear any previous error
        // Set all saved languages to success
        Object.keys(contentsToSave).forEach(code => {
            langStatus[code] = 'success';
        });
    } else {
        // Display error from composable
        localError.value = narrativeError.value || t('admin.error_save_failed') || 'Failed to save narrative.';
    }
};

// --- INLINE IMAGE INSERT (MS Word Style) ---
const imageUploadInput = ref<HTMLInputElement | null>(null);
const pendingImageInsertIndex = ref<number | string | null>(null);
const isUploadingImage = ref(false);
const currentCursorParagraphIndex = ref<number | string>(0); // Track which paragraph cursor is in

// Called when user focuses/clicks on a paragraph
const onParagraphFocus = (index) => {
    currentCursorParagraphIndex.value = index;
};

// Toolbar button: insert image at cursor position
const triggerImageUploadAtCursor = () => {
    pendingImageInsertIndex.value = currentCursorParagraphIndex.value;
    imageUploadInput.value?.click();
};

// Auto-resize title on load
const titleTextarea = ref<HTMLTextAreaElement | null>(null);
watch(() => activeContent.value?.title, () => {
    nextTick(() => {
        if (titleTextarea.value) autoResizeTextarea(titleTextarea.value);
    });
}, { immediate: true });

// Legacy function for direct index triggering (kept for compatibility)
const triggerImageUpload = (afterIndex) => {
    pendingImageInsertIndex.value = afterIndex;
    imageUploadInput.value?.click();
};

// Helper to convert file to AVIF Base64 (approx 0.8 quality)
const fileToAvif = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not supported'));
                    return;
                }
                ctx.drawImage(img, 0, 0);
                try {
                    const dataUrl = canvas.toDataURL('image/avif', 0.8);
                    resolve(dataUrl);
                } catch (e) {
                    resolve(canvas.toDataURL()); // Fallback
                }
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const handleInsertImage = async (event: any) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
        const base64 = await fileToAvif(file);
        if (base64 && activeContent.value) {
            // Determine insertion index (after current paragraph)
            const currentIdx = typeof pendingImageInsertIndex.value === 'number'
                ? pendingImageInsertIndex.value
                : (typeof currentCursorParagraphIndex.value === 'number' ? currentCursorParagraphIndex.value : activeContent.value.paragraphs.length - 1);

            // [NEW] Use Structured Storage
            addImageToStructuredStorage(base64, currentIdx);

            pendingImageInsertIndex.value = null;
            if (imageUploadInput.value) imageUploadInput.value.value = '';
        }
    } catch (error) {
        console.error("Image conversion failed:", error);
    }
};


// Helper for unmatched images (removed legacy logic)
// const unmatchedImages = computed(() => []); // REMOVED
// const removeInlineImage = () => { }; // REMOVED

// Handle paste event: if image is pasted, upload it at current cursor position
const handlePasteImage = async (event: any, paragraphIndex: any) => {
    const clipboardData = event.clipboardData || (window as any).clipboardData;
    if (!clipboardData) return;

    const items = clipboardData.items;
    let imageFile = null;

    for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
            imageFile = items[i].getAsFile();
            break;
        }
    }

    if (!imageFile) return;

    event.preventDefault();

    try {
        const base64 = await fileToAvif(imageFile);
        if (base64 && activeContent.value) {
            const targetIdx = paragraphIndex === 'cursor' ? (currentCursorParagraphIndex.value as number) : paragraphIndex;
            // [NEW] Use Structured Storage
            addImageToStructuredStorage(base64, targetIdx);
        }
    } catch (error) {
        console.error("Paste image conversion failed:", error);
    }
};

// --- REGENERATION ---
// Retry state
const retryCounts = reactive<Record<string, number>>({});
const MAX_RETRIES = 3;

// Shared Helper: Normalize Arabic Numerals in Indices (e.g. [١,١] -> [1,1])
const normalizeArabicNumerals = (text: string): string => {
    // Normalize only content inside brackets [ ]
    return text.replace(/\[([٠١٢٣٤٥٦٧٨٩,]+)\]/g, (match, content) => {
        const western = content.replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d: string) => {
            return '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)];
        });
        return `[${western}]`;
    });
};

// Shared Helper: Validate and Retry (now uses backend validation results)
const handleLanguageSuccessWithRetry = async (code: string, data: any, isBaseGeneration = false, validationPassed?: boolean, validationErrors?: any[], newImages?: any[]) => {
    // Clear previous persistent error for this language
    langErrors[code] = '';

    // 1. Normalize content
    // 1. Normalize content
    let rawParagraphs = data.content || data.paragraphs;

    // [NEW] Normalize Arabic Numerals if detected (Specific for Arabic language)
    if (code === 'ar' && Array.isArray(rawParagraphs)) {
        rawParagraphs = rawParagraphs.map((p: string) => normalizeArabicNumerals(p));
    }

    const normalizedData = {
        title: data.title,
        paragraphs: normalizeContent(rawParagraphs),
    };

    // [NEW] Merge with Structure to Preserve Images (Legacy [IMG:] support)
    // Use activeContent as valid structure template (only for legacy [IMG:] markers)
    if (activeContent.value && activeContent.value.paragraphs && activeContent.value.paragraphs.length > 0) {
        const merged: string[] = [];
        let textPtr = 0;
        activeContent.value.paragraphs.forEach(p => {
            if (p.trim().startsWith('[IMG:')) {
                merged.push(p); // Keep legacy image marker position
            } else {
                // Fill text slot from new translation/generation
                if (textPtr < normalizedData.paragraphs.length) {
                    merged.push(normalizedData.paragraphs[textPtr]);
                    textPtr++;
                }
            }
        });

        // [FIX] Append any remaining NEW paragraphs that weren't consumed by the template
        if (textPtr < normalizedData.paragraphs.length) {
            merged.push(...normalizedData.paragraphs.slice(textPtr));
        }

        normalizedData.paragraphs = merged;
    }

    // [NEW] Update Image Descriptions (if provided by backend)
    if (newImages && Array.isArray(newImages) && narrativeData.images) {
        // Iterate through new images and update descriptions for *this* language (and others if safe)
        // Since backend sends full image objects, we can merge descriptions.
        newImages.forEach((newImg, idx) => {
            const existingImg = narrativeData.images[idx];
            if (existingImg && newImg.description) {
                if (!existingImg.description) existingImg.description = {};

                // Merge descriptions from backend
                // Prioritize the language we just generated, but technically we can sync all?
                // Let's safe merge: only overwrite if backend has value.
                Object.keys(newImg.description).forEach(lang => {
                    if (newImg.description[lang]) {
                        existingImg.description[lang] = newImg.description[lang];
                    }
                });
            }
        });
    }

    // 2. Update Data
    if (narrativeData.contents) {
        narrativeData.contents[code] = normalizedData;
    }
    isDirty.value = true;

    // 3. Use Backend Validation Results (if provided)
    // If validationPassed is undefined, assume success (backward compatibility)
    const isValid = validationPassed !== false;

    // Build error reason from backend validation_errors
    let errorReason = "";
    if (!isValid && validationErrors && validationErrors.length > 0) {
        // Format: "CODE: message (expected: X, actual: Y)"
        errorReason = validationErrors.map((err: any) => {
            let detail = `${err.code}: ${err.message}`;
            if (err.expected) detail += ` (expected: ${err.expected}`;
            if (err.actual) detail += `, actual: ${err.actual}`;
            if (err.expected || err.actual) detail += ')';
            return detail;
        }).join('; ');
    }

    // 4. DECISION: SUCCESS or RETRY
    if (isValid) {
        langStatus[code] = 'success';
        retryCounts[code] = 0; // Reset
    } else {
        const currentRetries = retryCounts[code] || 0;
        if (currentRetries < MAX_RETRIES) {
            console.warn(`[${code}] Validation failed: ${errorReason}. Retrying (${currentRetries + 1}/${MAX_RETRIES})...`);
            retryCounts[code] = currentRetries + 1;
            langStatus[code] = 'loading'; // Visual feedback

            // Trigger Retry with error feedback
            setTimeout(() => {
                regenerateSingleLanguage(code, true, errorReason);
            }, 500);
        } else {
            console.error(`[${code}] Validation failed after ${MAX_RETRIES} attempts: ${errorReason}`);
            langStatus[code] = 'error';
            langErrors[code] = errorReason; // Display error to user
        }
    }
};

// [NEW] Shared Helper for API/Network Error Retries
const handleLanguageErrorWithRetry = (code: string, error: any) => {
    const errorMsg = error?.response?.data?.error || error?.message || error?.toString() || "Unknown error";
    const currentRetries = retryCounts[code] || 0;

    if (currentRetries < MAX_RETRIES) {
        console.warn(`[${code}] API Error: ${errorMsg}. Retrying (${currentRetries + 1}/${MAX_RETRIES})...`);
        retryCounts[code] = currentRetries + 1;
        langStatus[code] = 'loading';
        
        setTimeout(() => {
            regenerateSingleLanguage(code, true, errorMsg);
        }, 1000); // 1s delay for network stability
    } else {
        console.error(`[${code}] API Error after ${MAX_RETRIES} attempts: ${errorMsg}`);
        langStatus[code] = 'error';
        langErrors[code] = errorMsg;
    }
};

const regenerateSingleLanguage = async (specificLangCode = null, isAutoRetry = false, feedback = null) => {
    // Safety check: if specificLangCode is an Event object (or non-string), ignore it.
    if (specificLangCode && typeof specificLangCode !== 'string') specificLangCode = null;

    const langCode = specificLangCode || activeLang.value;
    if (!langCode) return;

    // Block only if THIS specific language is already loading (allows concurrent regeneration of other languages)
    // [FIX] If isAutoRetry is true, we bypass this check to allow the retry to proceed
    if (langStatus[langCode] === 'loading' && !isAutoRetry) return;
    if (isReadOnly.value) return;




    // Proceed without confirm as per user request

    // Reset retry count if manual trigger
    if (!isAutoRetry) {
        retryCounts[langCode] = 0;
    }

    // Per-language loading state (no global lock)

    langStatus[langCode] = 'loading';
    langErrors[langCode] = ''; // Clear previous error

    // Use selectedAnchorLang as the source for translation (Explicitly synced from UI)
    const baseLang = selectedAnchorLang.value || 'en';


    const isBase = langCode === baseLang;

    const numericGid = Number(activeGroupId.value);
    try {
        await generateNarrativeParallel(isNaN(numericGid) ? 0 : numericGid, {
            targetLanguages: [langCode],
            baseLang: baseLang, // [FIX] Explicitly pass anchor for single regeneration
            baseContent: narrativeData.contents[baseLang], // [NEW] Pass editorial content for translation source
            baseSentences: narrativeData.anchor_sentences,

            aiConfig: aiConfig, // Use current config
            skipBaseGeneration: !isBase, // IMPORTANT: Skip base unless we are regenerating base itself
            feedback: feedback, // Pass feedback to API
            narrativeId: narrativeData.id, // Pass for standalone translations
            onLanguageStart: (code) => {
                langStatus[code] = 'loading';
            },
            onLanguageSuccess: (code, data, nid, validationPassed, validationErrors, newImages) => {
                if (nid && !narrativeData.id) {
                    narrativeData.id = nid;
                }
                handleLanguageSuccessWithRetry(code, data, isBase, validationPassed, validationErrors, newImages);
            },
            onLanguageError: (code, err: any) => {
                handleLanguageErrorWithRetry(code, err);
                // Implementation for Network Errors now handled by helper
                if (!isAutoRetry) localError.value = `${t('admin.error_regenerate_failed')} ${code}: ${err}`;
            },
            onComplete: () => {
                // No global lock to release - per-language status handles UI
            }

        });
    } catch (e) {
        // No global lock to release

        langStatus[langCode] = 'error';
    }
};

// --- TTS SYSTEMPORARY_CONTENT_TO_TRIGGER_VIEWD) ---
// Audio & TTS State
const audioElement = ref<HTMLAudioElement | null>(null);
const { playing: isAudioPlaying, currentTime: audioCurrentTime, duration: audioDuration } = useMediaControls(audioElement);

// Watch current time for highlighting active segment
watch(audioCurrentTime, (time) => {
    if (!ttsState.playingId) return;

    // Find segment that matches current time
    const timeMs = time * 1000;
    const segments = ttsState.currentSegments || [];
    const segment = segments.find(s => timeMs >= s.start_ms && timeMs < s.end_ms);
    ttsState.activeSegmentId = segment ? segment.id : null;

    // Auto-stop if reached end of valid segments (optional, usually audio ends naturally)
});

// Reset state when audio ends
watch(isAudioPlaying, (playing) => {
    if (!playing) {
        // Ensure UI resets if it stopped playing naturally
        if (audioElement.value?.ended) {
            stopTTS();
        }
    }
});

const ttsState = reactive<{ loadingId: string | null, playingId: string | null, activeSegmentId: string | null, currentSegments: any[], audioUrl: string | null }>({
    loadingId: null, // 'title' or 'p-{i}' or 'full-narrative' or 'p-{i}-s-{j}'
    playingId: null,
    activeSegmentId: null,
    currentSegments: [],
    audioUrl: null, // Store current URL to revoke later
});

const stopTTS = () => {
    isAudioPlaying.value = false;
    ttsState.playingId = null;
    ttsState.activeSegmentId = null;
    ttsState.currentSegments = [];
    if (ttsState.audioUrl) {
        URL.revokeObjectURL(ttsState.audioUrl);
        ttsState.audioUrl = null;
    }
};

// Helper to get voice name based on language code (assuming a mapping exists)
const getVoiceName = (langCode) => {
    // This is a placeholder. You'd need a proper mapping.
    // Example:
    if (langCode === 'id') return 'id-ID-Wavenet-A';
    if (langCode === 'en') return 'en-US-Wavenet-D';
    return 'default'; // Fallback
};

const playTTS = async (id, text, segments, langCode) => {
    // If already playing this ID, toggle pause/stop
    if (ttsState.playingId === id) {
        if (isAudioPlaying.value) {
            isAudioPlaying.value = false; // Pause
        } else {
            isAudioPlaying.value = true; // Resume
        }
        return;
    }

    // Stop previous
    stopTTS();

    ttsState.loadingId = id;

    try {
        let audioUrl;
        let finalSegments = segments || [];

        if (id === 'full-narrative') {
            // Fetch Stitched Audio (using existing API)
            // Use narrative_id directly
            if (!narrativeData.id) {
                console.error("Cannot play audio: Narrative ID missing");
                return;
            }

            const endpoint = props.isPublicView
                ? `/public/narration/${narrativeData.id}/audio`
                : `/admin/narration/${narrativeData.id}/audio`;

            const response = await api.get(endpoint, {
                params: { lang: langCode }
            });
            // response.data is { audio_base64, map }
            const binary = atob(response.data.audio_base64);
            const array = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
            const blob = new Blob([array], { type: 'audio/wav' });
            audioUrl = URL.createObjectURL(blob);
            finalSegments = response.data.map;
        } else {
            // Simple Element TTS
            const voiceName = langCode === 'ru' ? 'Charon' : 'Kore'; // Match KalimatItem logic

            // Helper: Web Speech API fallback (scoped here or moved out)
            const speakWithWebSpeech = () => {
                return new Promise<void>((resolve, reject) => {
                    if (!('speechSynthesis' in window)) {
                        reject(new Error('Web Speech API tidak didukung'));
                        return;
                    }
                    const synth = window.speechSynthesis;
                    synth.cancel();
                    const utterance = new SpeechSynthesisUtterance(text);
                    // Map lang_code to BCP-47 speech code
                    const speechLangMap: Record<string, string> = {
                        id: 'id-ID', en: 'en-US', ru: 'ru-RU', de: 'de-DE',
                        fr: 'fr-FR', es: 'es-ES', it: 'it-IT', ja: 'ja-JP',
                        ko: 'ko-KR', zh: 'zh-CN', ar: 'ar-SA', pt: 'pt-BR',
                        el: 'el-GR', hi: 'hi-IN',
                    };
                    utterance.lang = speechLangMap[langCode] || 'en-US';
                    utterance.rate = 0.9;
                    const voices = synth.getVoices();
                    const langVoices = voices.filter((v) => v.lang.startsWith(langCode));
                    let matchingVoice = langVoices.find((v) => v.name.includes('Google') || v.name.includes('Premium'));
                    if (!matchingVoice) matchingVoice = langVoices[0] || voices[0];
                    if (matchingVoice) utterance.voice = matchingVoice;
                    utterance.onend = () => resolve();
                    utterance.onerror = (e) => reject(new Error(e.error));
                    synth.speak(utterance);
                });
            };

            try {
                const response = await api.post('/ai/generate-speech', {
                    text: text,
                    voice_name: voiceName,
                }, { responseType: 'arraybuffer' });

                const blob = new Blob([response.data], { type: 'audio/mpeg' });
                audioUrl = URL.createObjectURL(blob);
            } catch (err) {
                console.warn("Gemini TTS failed, attempting Web Speech fallback...", err);
                try {
                    await speakWithWebSpeech();
                    // If Web Speech succeeds, we don't have an audioUrl to set for the global player, 
                    // so we just return here as it plays internally.
                    // However, to keep state consistent:
                    isAudioPlaying.value = false; // WebSpeech handles its own state mostly, but we can't track it easily without more rework
                    ttsState.playingId = null;
                    return;
                } catch (webErr) {
                    console.error("Web Speech also failed:", webErr);
                    throw err; // Throw original error to be caught below
                }
            }

            // Create a single dummy segment for logic consistency if none provided
            if (!finalSegments.length) {
                finalSegments = [{ id: String(id), start_ms: 0, end_ms: 9999999, text }];
            }
        }

        // Setup VueUse Audio
        if (ttsState.audioUrl) URL.revokeObjectURL(ttsState.audioUrl); // Cleanup old
        ttsState.audioUrl = audioUrl;

        if (audioElement.value) audioElement.value.src = audioUrl;
        ttsState.currentSegments = finalSegments;
        ttsState.playingId = id;

        // Auto play
        isAudioPlaying.value = true;
        ttsState.loadingId = null;

    } catch (e) {
        console.error("Play error", e);
        ttsState.loadingId = null;
        stopTTS();
    }
};

const speak = (text: string, id: string) => {
    playTTS(id, text, [], targetLangCode.value);
};

// Contenteditable handlers
const onTitleInput = (e) => {
    if (!activeContent.value) return;
    activeContent.value.title = (e.target as HTMLElement).innerText;
    isDirty.value = true;
};

const onParagraphInput = (index, e) => {
    if (!activeContent.value) return;
    const el = e.target as HTMLElement;
    const val = el.innerText;

    activeContent.value.paragraphs[index] = val;
    isDirty.value = true;

    // Maintain cursor paragraph index for toolbar
    currentCursorParagraphIndex.value = index;

    // Optional: Real-time markup indices if needed (might be heavy for multi-div)
    // For now, keep it simple as text
};

const onParagraphEnter = (index, event: KeyboardEvent) => {
    if (event.shiftKey) return; // Shift+Enter = Normal newline

    event.preventDefault();
    const el = event.target as HTMLElement;
    const cursor = getCaretOffset(el);
    const text = el.innerText;

    const firstPart = text.substring(0, cursor);
    const secondPart = text.substring(cursor);

    activeContent.value.paragraphs[index] = firstPart;
    activeContent.value.paragraphs.splice(index + 1, 0, secondPart);
    isDirty.value = true;

    // Focus next paragraph at start
    nextTick(() => {
        const paragraphs = document.querySelectorAll(`[data-p-idx="${index + 1}"]`);
        if (paragraphs.length > 0) {
            const nextEl = paragraphs[0] as HTMLElement;
            nextEl.focus();
            setCaretOffset(nextEl, 0);
        }
    });
};

const onParagraphBackspace = (index, event: KeyboardEvent) => {
    const el = event.target as HTMLElement;
    const cursor = getCaretOffset(el);

    if (cursor === 0 && index > 0) {
        event.preventDefault();
        const currentText = activeContent.value.paragraphs[index];
        const prevText = activeContent.value.paragraphs[index - 1];
        const mergePoint = prevText.length;

        activeContent.value.paragraphs[index - 1] = prevText + currentText;
        activeContent.value.paragraphs.splice(index, 1);
        isDirty.value = true;

        // Shift images if they were attached to the deleted paragraph or later? 
        // Actually, if we merge P3 into P2, images that were "after P3" should probably now be "after P2"?
        // Or "after P2" images stay where they are. 
        // Logic: if index merged, images after index should be index-1? 
        // Let's keep it simple: images stay with their 'after_index'. 
        // If we delete a paragraph, we should shift subsequent images indices.
        narrativeData.images.forEach(img => {
            if (typeof img.paragraphIndex === 'number') {
                if (img.paragraphIndex === index) {
                    img.paragraphIndex = index - 1; // Move images of deleted P to previous P
                } else if (img.paragraphIndex > index) {
                    img.paragraphIndex -= 1; // Shift subsequent images
                }
            }
        });

        // Focus previous paragraph at merge point
        nextTick(() => {
            const prevEl = document.querySelector(`[data-p-idx="${index - 1}"]`) as HTMLElement;
            if (prevEl) {
                prevEl.focus();
                setCaretOffset(prevEl, mergePoint);
            }
        });
    }
};


watch(() => props.groupId, (newId) => {
    if (newId !== undefined && newId !== null && String(newId) !== '') {
        activeGroupId.value = newId;
        viewMode.value = 'edit'; // Ensure we switch to edit if prop changes externally
        loadNarrative(newId);
    }
});

// Watch for language store changes in public mode
watch(() => languageStore.selectedAsal, (newAsal) => {
    if (props.isPublicView && newAsal) {
        activeLang.value = newAsal.kodeBahasa;
    }
}, { immediate: true });

// --- Public View Actions ---
const showSimpanModal = ref(false);

// Computed property for save item data (for SimpanKeDaftar)
const itemDataForSaving = computed(() => {
    const src = sourceLangCode.value || '';
    const tgt = targetLangCode.value || '';
    const langPair = src && tgt ? `${src}-${tgt}` : '';
    const srcTitle = sourceContent.value?.title || '';
    const tgtTitle = targetContent.value?.title || '';
    const displayTitle = (srcTitle && tgtTitle) ? `${tgtTitle} / ${srcTitle}` : (tgtTitle || srcTitle || 'Narasi');

    return {
        id: props.groupId,
        title: displayTitle,
        content: (targetContent.value?.paragraphs?.[0] || '').slice(0, 100), // Preview
        lang_pair: langPair as any,
        anchor_sentences: narrativeData.anchor_sentences,
    };
});

const handleSaveToList = () => {
    showSimpanModal.value = true;
};

const handleReport = () => {
    // Open report modal for this narrative
    uiStore.openReportModal({
        id: props.groupId,
        tipe: 'narasi',
        appLabel: 'sentences_app',
        konten: targetContent.value?.title || 'Narasi',
        terjemahan: sourceContent.value?.title || '',
    });
};


// --- Highlight Scrolling Logic ---
// REMOVED: Auto-scrolling based on index is disabled as per user request.
// We now rely on text-based highlighting handled in the template via getHighlightedText.
watch(() => props.highlightText, () => {
    // Optional: Only log or handle text change if needed, but no auto-scroll.
    // console.log("Highlight text changed:", props.highlightText);
});

// --- Unsaved Changes Protection ---
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isDirty.value) {
        e.preventDefault();
        e.returnValue = '';
        return '';
    }
};

onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
});

</script>

<style scoped>
/* Fallback styles in case Tailwind classes are missed */
mark {
    background-color: var(--color-primary);
    color: var(--color-on-primary);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-weight: 600;
}

.animate-spin {
    display: inline-block;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}
</style>

<template>
    <div class="h-full flex flex-col bg-[var(--color-background)] text-[var(--color-on-background)] overflow-hidden relative"
        :class="{ 'rounded-2xl': !groupId }">

        <!-- === LIST VIEW === -->
        <div v-if="viewMode === 'list'" class="flex flex-col h-full overflow-hidden">
            <!-- Header -->
            <header
                class="flex-shrink-0 px-6 py-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface)] flex items-center justify-between z-10">
                <div class="flex items-center gap-3">
                    <button v-if="!groupId" @click="$emit('back')"
                        class="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[var(--color-surface-container-high)] transition-colors">
                        <span class="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 class="text-xl font-bold">{{ $t('admin.manage_narrative') }}</h1>
                </div>
                <button @click="createNewNarrative"
                    class="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] transition-colors text-sm font-medium">
                    <span class="material-symbols-outlined text-lg">add</span>
                    {{ $t('admin.create_new') }}
                </button>
            </header>

            <!-- Content -->
            <div class="flex-grow overflow-y-auto p-4">
                <!-- Search Input -->
                <div class="mb-4">
                    <div class="relative">
                        <span
                            class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-outline)]">search</span>
                        <input v-model="listSearchQuery" type="text" :placeholder="$t('search') + '...'"
                            class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] focus:outline-none transition-colors" />
                    </div>
                </div>

                <div v-if="isListLoading" class="flex items-center justify-center py-8">
                    <LoadingSpinner />
                </div>

                <div v-else-if="filteredNarrativeList.length === 0"
                    class="flex flex-col items-center justify-center py-8 text-[var(--color-outline)]">
                    <span class="material-symbols-outlined text-4xl mb-2">auto_stories</span>
                    <p v-if="listSearchQuery">{{ $t('admin.no_narrative_found', { query: listSearchQuery }) }}</p>
                    <p v-else>{{ $t('admin.no_narrative_data') }}</p>
                </div>

                <!-- Compact List (Adaptive Layout - List View) -->
                <div v-else class="flex flex-col gap-3">
                    <div v-for="item in filteredNarrativeList" :key="item.id" @click="selectNarrative(item)"
                        class="group cursor-pointer flex items-start gap-4 p-4 bg-[var(--color-surface-container-high)] rounded-2xl border border-transparent hover:border-[var(--color-primary)] hover:shadow-lg transition-all">

                        <!-- Thumbnail -->


                        <!-- Info -->
                        <div class="flex-grow min-w-0">
                            <h3 class="font-bold text-base text-[var(--color-on-surface)] leading-relaxed break-words">
                                {{
                                    getIndonesianTitle(item) }}</h3>
                            <div class="flex flex-wrap items-center gap-2 mt-3">
                                <!-- Status Badge (matches editor dropdown styling) -->
                                <span
                                    class="h-7 px-3 rounded-full text-xs font-bold uppercase transition-all flex items-center justify-center whitespace-nowrap"
                                    :class="statusOptions.find(o => o.value === item.status)?.class || 'bg-gray-100 text-gray-600'">
                                    {{statusOptions.find(o => o.value === item.status)?.label || item.status}}
                                </span>

                                <!-- Level Badge (matches editor secondary-container styling) -->
                                <span v-if="item.metadata?.level"
                                    class="h-7 px-3 rounded-full text-xs font-bold flex items-center gap-1 cursor-default transition-all bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] whitespace-nowrap">
                                    {{ item.metadata.level }}
                                </span>

                                <!-- Genre Badge (matches editor tertiary-container styling) -->
                                <span v-if="item.metadata?.genre"
                                    class="h-7 px-3 rounded-full text-xs font-bold flex items-center gap-1 cursor-default transition-all bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)] whitespace-nowrap">
                                    {{ item.metadata.genre }}
                                </span>
                            </div>

                            <!-- Language Status Badges (scrollable, incomplete first) -->
                            <div
                                class="flex items-center gap-2 mt-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-[var(--color-outline)] scrollbar-track-transparent">
                                <!-- Incomplete languages first (X icon) -->
                                <template
                                    v-for="lang in languageStore.opsiBahasa.filter(l => item.language_statuses?.[l.kodeBahasa] !== 'success')"
                                    :key="lang.kodeBahasa + '-other'">
                                    <div class="h-6 px-2 rounded-full text-[10px] font-bold uppercase border border-[var(--color-outline)] text-[var(--color-on-surface-variant)] flex items-center gap-1 transition-all whitespace-nowrap shrink-0"
                                        :title="lang.nama">
                                        {{ lang.kodeBahasa }}
                                        <span
                                            class="material-symbols-outlined text-[12px] text-[var(--color-error)]">close</span>
                                    </div>
                                </template>
                                <!-- Success languages after -->
                                <template
                                    v-for="lang in languageStore.opsiBahasa.filter(l => item.language_statuses?.[l.kodeBahasa] === 'success')"
                                    :key="lang.kodeBahasa + '-success'">
                                    <div class="h-7 px-2 rounded-full text-[10px] font-bold uppercase border border-[var(--color-primary)] text-[var(--color-primary)] flex items-center gap-1 transition-all whitespace-nowrap shrink-0"
                                        :title="lang.nama">
                                        {{ lang.kodeBahasa }}
                                        <span class="material-symbols-outlined text-[12px]">done</span>
                                    </div>
                                </template>
                            </div>
                        </div>

                        <!-- Arrow -->
                        <span
                            class="material-symbols-outlined text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity mt-1">chevron_right</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- === EDITOR VIEW === -->
        <div v-else-if="viewMode === 'edit'"
            class="flex flex-col h-full bg-[var(--color-surface)] overflow-hidden relative">
            <!-- Hidden File Input for Inline Image Upload -->
            <input ref="imageUploadInput" type="file" accept="image/*" class="hidden" @change="handleInsertImage" />

            <!-- Header Toolbar -->
            <div
                class="flex-shrink-0 flex items-center justify-between py-4 px-0 z-10 sticky top-0 bg-[var(--color-surface)]">
                <!-- Left: Back Button -->
                <button @click="isPublicView ? $emit('back') : handleBackToList()"
                    class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] transition-colors z-20 relative">
                    <span class="material-symbols-outlined">arrow_back</span>
                </button>

                <!-- Center: Title -->
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <h2 class="text-xl font-bold text-[var(--color-on-background)] pointer-events-auto">{{ isPublicView
                        ? $t('admin.narrative') : $t('admin.edit_narrative') }}</h2>
                </div>

                <!-- Right: Actions -->
                <div class="flex items-center gap-3 z-20 relative">
                    <div v-if="!isPublicView">
                        <button @click="isPreviewMode = !isPreviewMode"
                            :class="isPreviewMode ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]' : 'bg-[var(--color-surface)] text-[var(--color-on-surface-variant)]'"
                            class="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[var(--color-surface-container-low)] transition-colors"
                            :title="isPreviewMode ? $t('admin.exit_preview') : $t('admin.preview_student_mode')">
                            <span class="material-symbols-outlined">{{ isPreviewMode ? 'preview_off' : 'preview'
                                }}</span>
                        </button>
                    </div>
                    <div v-else>
                        <button @click="handleSaveToList"
                            class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface)] text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] transition-colors"
                            :title="$t('admin.save_to_list')">
                            <span class="material-symbols-outlined">bookmark_add</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Main Scrollable Area -->
            <div class="flex-1 overflow-y-auto custom-scrollbar">
                <!-- Initial Loading State (When opening from list/sentence) -->
                <div v-if="isLoading && (isPublicView || Object.keys(narrativeData.contents).length === 0)"
                    class="flex flex-col items-center justify-center py-20 text-[var(--color-outline)]">
                    <LoadingSpinner size="lg" color="primary" />
                </div>

                <div v-else class="w-full py-4">
                    <!-- Anchor Selection (If no group selected yet) -->
                    <div v-if="activeGroupId === null"
                        class="mb-8 p-8 bg-[var(--color-surface-container)] rounded-3xl border-2 border-dashed border-[var(--color-outline-variant)] flex flex-col items-center text-center">
                        <div
                            class="w-16 h-16 rounded-2xl bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] flex items-center justify-center mb-4">
                            <span class="material-symbols-outlined text-3xl">link</span>
                        </div>
                        <h3 class="text-xl font-bold mb-2">{{ $t('admin.select_anchor_group') }}</h3>
                        <p class="text-[var(--color-on-surface-variant)] mb-6 max-w-md">{{
                            $t('admin.narrative_link_desc') }}
                        </p>

                        <div class="w-full max-w-md relative mb-6">
                            <input v-model="anchorSearchQuery" type="text"
                                :placeholder="$t('admin.search_sentence_id_placeholder')"
                                class="w-full pl-11 pr-4 py-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all"
                                @keyup.enter="searchAnchorGroups" />
                            <span
                                class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-outline)]">search</span>
                            <button @click="searchAnchorGroups"
                                class="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-xl bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] text-sm font-medium hover:opacity-90 transition-opacity">
                                {{ $t('search') }}
                            </button>
                        </div>

                        <!-- Search Results -->
                        <div v-if="isSearchingAnchor" class="flex items-center gap-2 py-8 text-[var(--color-outline)]">
                            <span class="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                            {{ $t('searching') }}
                        </div>
                        <div v-else-if="anchorSearchResults.length > 0"
                            class="w-full max-w-md bg-[var(--color-surface)] rounded-2xl border border-[var(--color-outline-variant)] overflow-hidden">
                            <div v-for="group in anchorSearchResults" :key="group.id" @click="selectAnchorGroup(group)"
                                class="p-3 border-b last:border-0 border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-high)] cursor-pointer transition-colors text-left flex items-start gap-3">
                                <span
                                    class="text-xs font-mono bg-[var(--color-surface-container-highest)] px-1.5 py-0.5 rounded text-[var(--color-outline)] mt-1 shrink-0">{{
                                        group.id }}</span>
                                <div class="flex-grow min-w-0">
                                    <p class="text-sm line-clamp-2">{{ group.sentences?.id || group.sentences?.en || `No
                                        text` }}</p>
                                    <span v-if="group.has_narrative"
                                        class="text-[10px] uppercase font-bold text-[var(--color-secondary)]">Sudah
                                        memiliki narasi</span>
                                </div>
                            </div>
                        </div>
                        <p v-else-if="anchorSearchQuery && !isSearchingAnchor"
                            class="text-xs text-[var(--color-error)]">
                            {{ $t('admin.group_not_found') }}</p>

                        <div class="mt-8 flex items-center gap-4">
                            <button @click="skipAnchorSelection"
                                class="text-sm font-medium text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors">{{
                                    $t('admin.continue_without_anchor') }}</button>
                        </div>
                    </div>

                    <!-- Editor Controls & Content (Hidden if no group and not skipping) -->
                    <template v-if="activeGroupId !== null">
                        <!-- Toolbar / Controls (Moved below header) -->
                        <div class="flex flex-row flex-wrap gap-2 justify-end items-center mb-6">

                            <!-- Admin Controls -->
                            <template v-if="!isPublicView && !isPreviewMode">
                                <!-- VIEW MODE TOGGLE (Toolbar) -->
                                <div class="flex bg-[var(--color-surface-container-highest)] rounded-lg p-1 mr-2">
                                    <button @click="dualViewMode = 'paragraph'"
                                        class="px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1"
                                        :class="dualViewMode === 'paragraph' ? 'bg-[var(--color-surface)] text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'"
                                        title="Tampilan Paragraf">
                                        <span class="material-symbols-outlined text-[16px]">view_headline</span>
                                    </button>
                                    <button @click="dualViewMode = 'sentence'"
                                        class="px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1"
                                        :class="dualViewMode === 'sentence' ? 'bg-[var(--color-surface)] text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'"
                                        title="Tampilan Kalimat">
                                        <span class="material-symbols-outlined text-[16px]">view_list</span>
                                    </button>
                                </div>



                                <button @click="handleGenerate" :disabled="isLoading"
                                    class="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-secondary)] text-[var(--color-on-secondary)] rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
                                    <span class="material-symbols-outlined text-base"
                                        :class="{ 'animate-spin': isLoading }">auto_awesome</span>
                                    <span class="hidden sm:inline">{{ $t('admin.generate_ai') }}</span>
                                </button>

                                <!-- Mass Regenerate Button -->
                                <button @click="regenerateFromAnchor" :disabled="isLoading || closeStreamingFn"
                                    class="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-tertiary)] text-[var(--color-on-tertiary)] rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                                    :title="$t('admin.regen_from_anchor_desc')">
                                    <span class="material-symbols-outlined text-base"
                                        :class="{ 'animate-spin': isLoading && closeStreamingFn }">translate</span>
                                    <span class="hidden sm:inline">{{ $t('admin.mass_regen') }}</span>
                                </button>


                                <!-- Insert Image Button (MS Word Style) -->

                                <button @click="handleDelete" :disabled="isLoading"
                                    class="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-error)] text-[var(--color-on-error)] rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                                    :title="$t('admin.delete_narrative')">
                                    <span class="material-symbols-outlined text-base">delete</span>
                                    <span class="hidden sm:inline">{{ $t('delete') }}</span>
                                </button>

                                <button @click="handleSave" :disabled="isLoading || !isDirty"
                                    class="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
                                    <span class="material-symbols-outlined text-base">save</span>
                                    <span class="hidden sm:inline">{{ isLoading ? $t('saving') : $t('save') }}</span>
                                </button>
                            </template>

                            <!-- Public/Preview Controls -->
                            <template v-if="isPublicView || isPreviewMode">
                                <div class="flex items-center gap-3">
                                    <!-- Global TTS Button (stays outside dropdown for quick access) -->
                                    <button @click="playTTS('full-narrative', null, null, targetLangCode)"
                                        class="flex items-center justify-center w-10 h-10 rounded-full border border-[var(--color-outline)] text-[var(--color-primary)] hover:bg-[var(--color-surface-container-high)] transition-all"
                                        :class="{ 'animate-pulse': ttsState.loadingId === 'full-narrative', 'bg-[var(--color-error-container)] text-[var(--color-on-error-container)] border-transparent': ttsState.playingId === 'full-narrative' }"
                                        :title="$t('admin.read_all')">
                                        <span v-if="ttsState.loadingId === 'full-narrative'"
                                            class="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                                        <span v-else-if="ttsState.playingId === 'full-narrative'"
                                            class="material-symbols-outlined text-xl">stop</span>
                                        <span v-else class="material-symbols-outlined text-xl">volume_up</span>
                                    </button>

                                    <!-- Options Dropdown -->
                                    <Menu as="div" class="relative inline-block text-left">
                                        <MenuButton
                                            class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface-container)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] transition-colors">
                                            <span class="material-symbols-outlined text-xl">more_vert</span>
                                        </MenuButton>
                                        <Transition enter-active-class="transition duration-100 ease-out"
                                            enter-from-class="transform scale-95 opacity-0"
                                            enter-to-class="transform scale-100 opacity-100"
                                            leave-active-class="transition duration-75 ease-in"
                                            leave-from-class="transform scale-100 opacity-100"
                                            leave-to-class="transform scale-95 opacity-0">
                                            <MenuItems
                                                class="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-[var(--color-outline-variant)]/20 rounded-xl bg-[var(--color-surface-container-high)] ring-1 ring-black/5 focus:outline-none overflow-hidden z-20">
                                                <!-- Settings Section -->
                                                <div class="px-2 py-2">
                                                    <!-- Translation Switch -->
                                                    <MenuItem v-slot="{ active }" as="div">
                                                    <div :class="[
                                                        active ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]' : 'text-[var(--color-on-surface)]',
                                                        'group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer'
                                                    ]" @click.stop="showTranslation = !showTranslation">
                                                        <div class="flex items-center gap-2">
                                                            <span
                                                                class="material-symbols-outlined text-lg opacity-70">translate</span>
                                                            <span>{{ $t('translations') }}</span>
                                                        </div>
                                                        <div class="md-switch group relative inline-flex items-center pointer-events-none"
                                                            :class="{ 'selected': showTranslation }" role="switch"
                                                            :aria-checked="showTranslation"
                                                            :aria-label="$t('admin.toggle_translation')">
                                                            <div class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out relative"
                                                                :class="[
                                                                    showTranslation
                                                                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                                                                        : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)]'
                                                                ]">
                                                                <div
                                                                    class="handle-container absolute top-0 left-0 h-full w-full">
                                                                    <div class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
                                                                        :class="[
                                                                            showTranslation
                                                                                ? 'h-[24px] w-[24px] bg-[var(--color-on-primary)] left-[calc(100%-24px-4px)]'
                                                                                : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px]',
                                                                            'group-active:h-[28px] group-active:w-[28px]',
                                                                            showTranslation ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                                                                        ]">
                                                                        <svg v-if="showTranslation"
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                            height="16" viewBox="0 -960 960 960"
                                                                            width="16"
                                                                            class="fill-[var(--color-primary)] opacity-100">
                                                                            <path
                                                                                d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
                                                                        </svg>
                                                                        <svg v-if="!showTranslation"
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                            height="16" viewBox="0 -960 960 960"
                                                                            width="16"
                                                                            class="fill-[var(--color-surface-container-highest)] opacity-100">
                                                                            <path
                                                                                d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                                                                        </svg>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    </MenuItem>

                                                    <!-- Highlight Switch -->
                                                    <MenuItem v-slot="{ active }" as="div">
                                                    <div :class="[
                                                        active ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]' : 'text-[var(--color-on-surface)]',
                                                        'group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer'
                                                    ]" @click.stop="isHighlightEnabled = !isHighlightEnabled">
                                                        <div class="flex items-center gap-2">
                                                            <span
                                                                class="material-symbols-outlined text-lg opacity-70">ink_highlighter</span>
                                                            <span>{{ $t('admin.highlight') }}</span>
                                                        </div>
                                                        <div class="md-switch group relative inline-flex items-center pointer-events-none"
                                                            :class="{ 'selected': isHighlightEnabled }" role="switch"
                                                            :aria-checked="isHighlightEnabled"
                                                            :aria-label="$t('admin.toggle_highlight')">
                                                            <div class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out relative"
                                                                :class="[
                                                                    isHighlightEnabled
                                                                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                                                                        : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)]'
                                                                ]">
                                                                <div
                                                                    class="handle-container absolute top-0 left-0 h-full w-full">
                                                                    <div class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
                                                                        :class="[
                                                                            isHighlightEnabled
                                                                                ? 'h-[24px] w-[24px] bg-[var(--color-on-primary)] left-[calc(100%-24px-4px)]'
                                                                                : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px]',
                                                                            'group-active:h-[28px] group-active:w-[28px]',
                                                                            isHighlightEnabled ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                                                                        ]">
                                                                        <svg v-if="isHighlightEnabled"
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                            height="16" viewBox="0 -960 960 960"
                                                                            width="16"
                                                                            class="fill-[var(--color-primary)] opacity-100">
                                                                            <path
                                                                                d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
                                                                        </svg>
                                                                        <svg v-if="!isHighlightEnabled"
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                            height="16" viewBox="0 -960 960 960"
                                                                            width="16"
                                                                            class="fill-[var(--color-surface-container-highest)] opacity-100">
                                                                            <path
                                                                                d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                                                                        </svg>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    </MenuItem>

                                                    <!-- Slide View Switch -->
                                                    <MenuItem v-slot="{ active }" as="div">
                                                    <div :class="[
                                                        active ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]' : 'text-[var(--color-on-surface)]',
                                                        'group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer'
                                                    ]" @click.stop="publicPresentationMode = publicPresentationMode === 'scroll' ? 'slide' : 'scroll'">
                                                        <div class="flex items-center gap-2">
                                                            <span
                                                                class="material-symbols-outlined text-lg opacity-70">slideshow</span>
                                                            <span>Slide View</span>
                                                        </div>
                                                        <div class="md-switch group relative inline-flex items-center pointer-events-none"
                                                            :class="{ 'selected': publicPresentationMode === 'slide' }" role="switch"
                                                            :aria-checked="publicPresentationMode === 'slide'"
                                                            aria-label="Toggle Slide View">
                                                            <div class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out relative"
                                                                :class="[
                                                                    publicPresentationMode === 'slide'
                                                                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                                                                        : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)]'
                                                                ]">
                                                                <div
                                                                    class="handle-container absolute top-0 left-0 h-full w-full">
                                                                    <div class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
                                                                        :class="[
                                                                            publicPresentationMode === 'slide'
                                                                                ? 'h-[24px] w-[24px] bg-[var(--color-on-primary)] left-[calc(100%-24px-4px)]'
                                                                                : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px]',
                                                                            'group-active:h-[28px] group-active:w-[28px]',
                                                                            publicPresentationMode === 'slide' ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                                                                        ]">
                                                                        <svg v-if="publicPresentationMode === 'slide'"
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                            height="16" viewBox="0 -960 960 960"
                                                                            width="16"
                                                                            class="fill-[var(--color-primary)] opacity-100">
                                                                            <path
                                                                                d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
                                                                        </svg>
                                                                        <svg v-if="publicPresentationMode !== 'slide'"
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                            height="16" viewBox="0 -960 960 960"
                                                                            width="16"
                                                                            class="fill-[var(--color-surface-container-highest)] opacity-100">
                                                                            <path
                                                                                d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                                                                        </svg>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    </MenuItem>
                                                </div>

                                                <!-- View Mode Section -->
                                                <div class="px-2 py-2">
                                                    <p
                                                        class="px-3 py-1 text-xs font-semibold text-[var(--color-outline)] uppercase tracking-wide">
                                                        {{ $t('admin.view_line') }}</p>
                                                    <MenuItem v-slot="{ active }">
                                                    <button @click="dualViewMode = 'paragraph'" :class="[
                                                        active ? 'bg-[var(--color-secondary-container)]' : '',
                                                        dualViewMode === 'paragraph' ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface)]',
                                                        'group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors'
                                                    ]">
                                                        <span
                                                            class="material-symbols-outlined mr-2 text-lg opacity-70">view_agenda</span>
                                                        <span>{{ $t('admin.paragraph') }}</span>
                                                        <span v-if="dualViewMode === 'paragraph'"
                                                            class="material-symbols-outlined ml-auto text-lg">check</span>
                                                    </button>
                                                    </MenuItem>
                                                    <MenuItem v-slot="{ active }">
                                                    <button @click="dualViewMode = 'sentence'" :class="[
                                                        active ? 'bg-[var(--color-secondary-container)]' : '',
                                                        dualViewMode === 'sentence' ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface)]',
                                                        'group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors'
                                                    ]">
                                                        <span
                                                            class="material-symbols-outlined mr-2 text-lg opacity-70">format_list_bulleted</span>
                                                        <span>{{ $t('admin.sentence') }}</span>
                                                        <span v-if="dualViewMode === 'sentence'"
                                                            class="material-symbols-outlined ml-auto text-lg">check</span>
                                                    </button>
                                                    </MenuItem>
                                                </div>



                                                <!-- Actions Section -->
                                                <div class="px-2 py-2">
                                                    <MenuItem v-slot="{ active }">
                                                    <button @click="handleSaveToList" :class="[
                                                        active ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]' : 'text-[var(--color-on-surface)]',
                                                        'group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors'
                                                    ]">
                                                        <span
                                                            class="material-symbols-outlined mr-2 text-lg">bookmark</span>
                                                        {{ $t('save') }}
                                                    </button>
                                                    </MenuItem>
                                                    <MenuItem v-slot="{ active }">
                                                    <button @click="handleReport" :class="[
                                                        active ? 'bg-[var(--color-error-container)] text-[var(--color-on-error-container)]' : 'text-[var(--color-on-surface)]',
                                                        'group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors'
                                                    ]">
                                                        <span class="material-symbols-outlined mr-2 text-lg">flag</span>
                                                        {{ $t('report') }}
                                                    </button>
                                                    </MenuItem>
                                                </div>
                                            </MenuItems>
                                        </Transition>
                                    </Menu>
                                </div>
                            </template>
                        </div>

                        <!-- PUBLIC VIEW: Dual Language Display -->
                        <template v-if="isPublicView || isPreviewMode">


                            <!-- Hidden Audio Element for VueUse -->
                            <audio ref="audioElement" class="hidden"></audio>

                            <!-- Success State (Generated) -->
                            <Transition mode="out-in" name="fade-slide">
                                <div :key="activeLang + dualViewMode"
                                    class="bg-[var(--color-surface-container-high)] rounded-3xl overflow-hidden"
                                    :style="{ fontFamily: 'var(--font-family-utama)' }">
                                    <!-- Title Section (Stacked: Target on top, Source on bottom) -->
                                    <template v-if="publicPresentationMode === 'scroll'">
                                    <div class="p-6 border-b border-[var(--color-outline-variant)]/30 text-center">
                                        <div class="flex items-center justify-center gap-2 mb-2">
                                            <h1 class="text-2xl md:text-3xl font-bold text-[var(--color-on-surface)] leading-tight transition-colors duration-300"
                                                :class="{ 'text-[var(--color-primary)]': ttsState.activeSegmentId === 'title' }">
                                                {{ targetContent.title }}
                                            </h1>
                                            <!-- Title TTS Button -->
                                            <button v-if="targetContent.title"
                                                @click="speak(targetContent.title, 'title')"
                                                class="p-1 rounded-full text-[var(--color-primary)] hover:bg-[var(--color-surface-variant)] transition-colors"
                                                :class="{ 'animate-pulse': ttsState.loadingId === 'title', 'text-[var(--color-error)]': ttsState.playingId === 'title' }">
                                                <span v-if="ttsState.loadingId === 'title'"
                                                    class="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                                                <span v-else-if="ttsState.playingId === 'title'"
                                                    class="material-symbols-outlined text-xl">stop_circle</span>
                                                <span v-else class="material-symbols-outlined text-xl">volume_up</span>
                                            </button>
                                        </div>
                                        <h2 v-if="showTranslation"
                                            class="text-xl md:text-2xl text-[var(--color-on-surface-variant)] leading-relaxed">
                                            {{ sourceContent.title }}
                                        </h2>

                                        <!-- Metadata Badges -->
                                        <div v-if="narrativeData.metadata?.level || narrativeData.metadata?.genre"
                                            class="flex flex-wrap items-center justify-center gap-2 mt-4">
                                            <!-- Level Badge -->
                                            <span v-if="narrativeData.metadata?.level"
                                                class="h-7 px-3 rounded-full text-xs font-bold flex items-center gap-1 cursor-default transition-all bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] whitespace-nowrap">
                                                {{ narrativeData.metadata.level }}
                                            </span>

                                            <!-- Genre Badge -->
                                            <span v-if="narrativeData.metadata?.genre"
                                                class="h-7 px-3 rounded-full text-xs font-bold flex items-center gap-1 cursor-default transition-all bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)] whitespace-nowrap">
                                                {{ narrativeData.metadata.genre }}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Content Area -->
                                    <div class="p-6 md:p-10 space-y-8">
                                        <!-- Per Paragraph Mode -->
                                        <template v-if="dualViewMode === 'paragraph'">
                                            <!-- Inline Image at 'before' position - REMOVED LEGACY LOGIC -->
                                            <TransitionGroup name="list" tag="div" class="space-y-8 relative">
                                                <div v-for="(paragraph, index) in sourceContent.paragraphs"
                                                    :key="`p-${index}`" class="space-y-6 w-full">

                                                    <!-- 1. Text Paragraph -->
                                                    <div class="relative group">
                                                        <!-- Target language (top - primary color, with indent) -->
                                                        <p
                                                            class="text-[var(--color-on-surface)] leading-relaxed text-base text-justify transition-colors duration-300 indent-8">
                                                            <span
                                                                v-html="renderTargetParagraph(targetContent.paragraphs[index], index)"
                                                                :id="`p-${index}`"></span>

                                                            <!-- TTS Button -->
                                                            <button v-if="targetContent.paragraphs[index]"
                                                                @click="speak(targetContent.paragraphs[index], `p-${index}`)"
                                                                class="inline-flex align-baseline ml-1 p-0.5 rounded-full text-[var(--color-primary)] hover:bg-[var(--color-surface-container)] transition-all"
                                                                :class="{ 'animate-pulse': ttsState.loadingId === `p-${index}`, 'text-[var(--color-error)]': ttsState.playingId === `p-${index}` }"
                                                                :title="$t('admin.listen_paragraph')">
                                                                <span v-if="ttsState.loadingId === `p-${index}`"
                                                                    class="material-symbols-outlined text-[1.1em] animate-spin">progress_activity</span>
                                                                <span v-else-if="ttsState.playingId === `p-${index}`"
                                                                    class="material-symbols-outlined text-[1.1em]">stop_circle</span>
                                                                <span v-else
                                                                    class="material-symbols-outlined text-[1.1em]">volume_up</span>
                                                            </button>
                                                        </p>

                                                        <!-- Source language (bottom - muted color, with indent) -->
                                                        <p v-if="showTranslation"
                                                            class="text-[var(--color-on-surface-variant)] leading-relaxed text-base text-justify transition-colors duration-300 indent-2">
                                                            <span
                                                                class="material-symbols-outlined mr-1 opacity-60 select-none text-[1.1em] align-text-bottom">subdirectory_arrow_right</span>
                                                            <span
                                                                v-html="renderSourceParagraph(paragraph, index)"></span>
                                                        </p>
                                                    </div>

                                                    <!-- 2. [NEW] Structured Image (Rendered AFTER paragraph) -->
                                                    <template
                                                        v-for="(img, imgIdx) in narrativeData.images.filter(i => i.paragraphIndex === index)"
                                                        :key="`img-${index}-${imgIdx}`">
                                                        <div class="relative group flex flex-col items-center py-4 cursor-pointer"
                                                            @click="toggleImageSource(`img-${index}-${imgIdx}`)">
                                                            <div class="relative max-w-full">
                                                                <img :src="img.data"
                                                                    class="max-w-full max-h-[50vh] object-contain rounded-xl shadow-sm select-none" />

                                                                <!-- Source Badge (Click to Toggle) -->
                                                                <Transition
                                                                    enter-active-class="transition duration-200 ease-out"
                                                                    enter-from-class="transform scale-95 opacity-0"
                                                                    enter-to-class="transform scale-100 opacity-100"
                                                                    leave-active-class="transition duration-150 ease-in"
                                                                    leave-from-class="transform scale-100 opacity-100"
                                                                    leave-to-class="transform scale-95 opacity-0"
                                                                >
                                                                    <div v-if="img.source && visibleImageSources.has(`img-${index}-${imgIdx}`)"
                                                                        class="absolute bottom-2 right-2 max-w-[80%] px-3 py-1.5 rounded-lg bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] text-xs font-medium  flex items-center gap-1.5 z-10 border border-[var(--color-outline-variant)]/30"
                                                                        title="Sumber Gambar"
                                                                        @click.stop>
                                                                        <span class="material-symbols-outlined text-[10px] opacity-80 shrink-0">public</span>
                                                                        <span class="break-all text-left leading-tight">{{ img.source }}</span>
                                                                    </div>
                                                                </Transition>
                                                            </div>

                                                            <!-- Optional: Caption/Description -->
                                                            <div v-if="img.description"
                                                                class="mt-4 text-center max-w-[90%] mx-auto space-y-2">
                                                                <p v-if="img.description[targetLangCode]"
                                                                    class="text-base text-[var(--color-on-surface)] leading-relaxed">
                                                                    {{ img.description[targetLangCode] }}
                                                                </p>
                                                                <p v-if="showTranslation && img.description[sourceLangCode] && sourceLangCode !== targetLangCode"
                                                                    class="text-base text-[var(--color-on-surface-variant)] leading-relaxed">
                                                                    <span
                                                                        class="material-symbols-outlined mr-1 opacity-60 select-none text-[1.1em] align-text-bottom">subdirectory_arrow_right</span>
                                                                    {{ img.description[sourceLangCode] }}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </template>
                                                </div>
                                            </TransitionGroup>
                                        </template>

                                        <!-- Per Sentence Mode -->
                                        <template v-else>
                                            <!-- Inline Image at 'before' position - REMOVED LEGACY LOGIC -->
                                            <TransitionGroup name="list" tag="div" class="space-y-6 relative">
                                                <div v-for="(paragraph, pIndex) in sourceContent.paragraphs"
                                                    :key="`ps-${pIndex}`" class="space-y-6 w-full">

                                                    <!-- 1. Text Mode (Split into sentences) -->
                                                    <div class="space-y-6">
                                                        <div v-for="(sentence, sIndex) in splitSentences(paragraph)"
                                                            :key="`${pIndex}-${sIndex}`" class="space-y-1.5">
                                                            <!-- Target sentence (top - larger) -->
                                                            <div class="relative group">
                                                                <p
                                                                    class="text-[var(--color-on-surface)] leading-relaxed text-base transition-colors duration-300 text-justify">
                                                                    <span v-html="(() => {
                                                                        const targetPara = targetContent.paragraphs[pIndex] || '';
                                                                        const targetSentences = splitSentences(targetPara);
                                                                        const text = stripIndices(targetSentences[sIndex] || '');

                                                                        if (!isHighlightEnabled) return text;

                                                                        const terms = [];
                                                                        if (targetAnchorTerm) terms.push(targetAnchorTerm);
                                                                        if (props.highlightText && showHighlight) terms.push(props.highlightText);

                                                                        return terms.length > 0 ? getHighlightedText(text, terms) : text;
                                                                    })()" :id="`p-${pIndex}-s-${sIndex}`" :class="{
                                                                        'text-[var(--color-primary)]': ttsState.activeSegmentId === `p-${pIndex}-s-${sIndex}`,
                                                                        'bg-yellow-100 dark:bg-yellow-900/30': highlightTarget?.p === pIndex && highlightTarget?.s === sIndex
                                                                    }"></span><button @click="(() => {
                                                                        const targetPara = targetContent.paragraphs[pIndex] || '';
                                                                        const targetSentences = splitSentences(targetPara);
                                                                        const targetSentence = targetSentences[sIndex] || '';
                                                                        if (targetSentence) playTTS(`p-${pIndex}-s-${sIndex}`, targetSentence, null, targetLangCode);
                                                                    })()"
                                                                        class="inline-flex align-baseline ml-1 p-0.5 rounded-full text-[var(--color-primary)] hover:bg-[var(--color-surface-container)] transition-all"
                                                                        :class="{ 'animate-pulse': ttsState.loadingId === `p-${pIndex}-s-${sIndex}`, 'text-[var(--color-error)]': ttsState.playingId === `p-${pIndex}-s-${sIndex}` }"
                                                                        :title="$t('admin.listen_sentence')">
                                                                        <span
                                                                            v-if="ttsState.loadingId === `p-${pIndex}-s-${sIndex}`"
                                                                            class="material-symbols-outlined text-[1.1em] animate-spin">progress_activity</span>
                                                                        <span
                                                                            v-else-if="ttsState.playingId === `p-${pIndex}-s-${sIndex}`"
                                                                            class="material-symbols-outlined text-[1.1em]">stop_circle</span>
                                                                        <span v-else
                                                                            class="material-symbols-outlined text-[1.1em]">volume_up</span>
                                                                    </button>
                                                                </p>
                                                            </div>
                                                            <!-- Source sentence (bottom - same size) -->
                                                            <p v-if="showTranslation"
                                                                class="text-[var(--color-on-surface-variant)] leading-relaxed text-base text-justify transition-colors duration-300">
                                                                <span
                                                                    class="material-symbols-outlined mr-1 opacity-60 select-none text-[1.1em] align-text-bottom">subdirectory_arrow_right</span>
                                                                <span v-html="(() => {
                                                                    const text = stripIndices(sentence);

                                                                    if (!isHighlightEnabled) return text;

                                                                    const terms = [];
                                                                    if (sourceAnchorTerm) terms.push(sourceAnchorTerm);
                                                                    if (props.highlightText && showHighlight) terms.push(props.highlightText);

                                                                    return terms.length > 0 ? getHighlightedText(text, terms) : text;
                                                                })()"></span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <!-- 2. [NEW] Structured Image (Rendered AFTER paragraph block) -->
                                                    <template
                                                        v-for="(img, imgIdx) in narrativeData.images.filter(i => i.paragraphIndex === pIndex)"
                                                        :key="`img-s-${pIndex}-${imgIdx}`">
                                                        <div class="relative group flex flex-col items-center py-4 cursor-pointer"
                                                            @click="toggleImageSource(`img-s-${pIndex}-${imgIdx}`)">
                                                            <div class="relative max-w-full">
                                                                <img :src="img.data"
                                                                    class="max-w-full max-h-[50vh] object-contain rounded-xl shadow-sm select-none" />
                                                                
                                                                <!-- Source Badge (Click to Toggle) -->
                                                                <Transition
                                                                    enter-active-class="transition duration-200 ease-out"
                                                                    enter-from-class="transform scale-95 opacity-0"
                                                                    enter-to-class="transform scale-100 opacity-100"
                                                                    leave-active-class="transition duration-150 ease-in"
                                                                    leave-from-class="transform scale-100 opacity-100"
                                                                    leave-to-class="transform scale-95 opacity-0"
                                                                >
                                                                    <div v-if="img.source && visibleImageSources.has(`img-s-${pIndex}-${imgIdx}`)"
                                                                        class="absolute bottom-2 right-2 max-w-[80%] px-3 py-1.5 rounded-lg bg-[var(--color-surface-container-high)]/90 backdrop-blur-md text-[var(--color-on-surface)] text-xs font-medium shadow-sm flex items-center gap-1.5 z-10 border border-[var(--color-outline-variant)]/30"
                                                                        title="Sumber Gambar"
                                                                        @click.stop>
                                                                        <span class="material-symbols-outlined text-[10px] opacity-80 shrink-0">public</span>
                                                                        <span class="break-all text-left leading-tight">{{ img.source }}</span>
                                                                    </div>
                                                                </Transition>
                                                            </div>
                                                            <div v-if="img.description"
                                                                class="mt-4 text-center max-w-[90%] mx-auto space-y-2">
                                                                <p v-if="img.description[targetLangCode]"
                                                                    class="text-base text-[var(--color-on-surface)] leading-relaxed">
                                                                    {{ img.description[targetLangCode] }}
                                                                </p>
                                                                <p v-if="showTranslation && img.description[sourceLangCode] && sourceLangCode !== targetLangCode"
                                                                    class="text-base text-[var(--color-on-surface-variant)] leading-relaxed">
                                                                    <span
                                                                        class="material-symbols-outlined mr-1 opacity-60 select-none text-[1.1em] align-text-bottom">subdirectory_arrow_right</span>
                                                                    {{ img.description[sourceLangCode] }}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </template>

                                                    <!-- Paragraph separator -->
                                                    <hr v-if="pIndex < sourceContent.paragraphs.length - 1"
                                                        class="border-[var(--color-outline-variant)]/30" />
                                                </div>
                                            </TransitionGroup>

                                        </template>

                                        <!-- Metadata Information Box (Public View) -->
                                        <div v-if="narrativeData.metadata"
                                            class="mt-8 pt-6 border-t border-[var(--color-outline-variant)]/30">
                                            <h4 class="text-sm font-bold text-[var(--color-on-surface)] mb-2">{{
                                                $t('admin.narrative_info') }}</h4>
                                            <ul
                                                class="text-xs text-[var(--color-on-surface-variant)] space-y-1 list-disc list-inside">
                                                <li><span class="font-medium text-[var(--color-on-surface)]">{{
                                                    $t('admin.level_label') }}:</span>
                                                    {{ narrativeData.metadata.level || '-' }}</li>
                                                <li><span class="font-medium text-[var(--color-on-surface)]">{{
                                                    $t('admin.genre') }}:</span>
                                                    {{ narrativeData.metadata.genre || '-' }}</li>
                                                <li><span class="font-medium text-[var(--color-on-surface)]">{{
                                                    $t('admin.created_at') }}:</span>
                                                    {{ formattedCreatedAt }}
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                    </template>

                                    <!-- SLIDE VIEW -->
                                    <template v-else-if="publicPresentationMode === 'slide'">
                                        <div class="flex flex-col items-center justify-center min-h-[60vh] relative outline-none" tabindex="0" autofocus>
                                            <!-- Slide Content -->
                                            <Transition mode="out-in" name="fade-slide">
                                                <div v-if="currentSlide" :key="currentSlide.id" class="w-full max-w-4xl mx-auto flex flex-col items-center text-center p-8">
                                                    
                                                    <!-- TITLE SLIDE -->
                                                    <div v-if="currentSlide.type === 'title'" class="space-y-6 animate-fade-in-up">
                                                        <h1 class="text-4xl md:text-5xl font-bold text-[var(--color-primary)] leading-tight mb-4">
                                                            {{ currentSlide.content.target }}
                                                        </h1>
                                                        <h2 v-if="showTranslation && currentSlide.content.source" 
                                                            class="text-2xl md:text-3xl text-[var(--color-on-surface-variant)] leading-relaxed opacity-80">
                                                            {{ currentSlide.content.source }}
                                                        </h2>
                                                    </div>

                                                    <!-- IMAGE SLIDE -->
                                                    <div v-else-if="currentSlide.type === 'image'" class="relative group animate-scale-in flex flex-col items-center justify-center cursor-pointer"
                                                        @click="toggleImageSource(currentSlide.id)">
                                                        <div class="relative max-w-full flex justify-center">
                                                            <img :src="currentSlide.content.data" 
                                                                class="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-lg select-none" />
                                                            
                                                            <!-- Source Badge (Click to Toggle) -->
                                                            <Transition
                                                                enter-active-class="transition duration-200 ease-out"
                                                                enter-from-class="transform scale-95 opacity-0"
                                                                enter-to-class="transform scale-100 opacity-100"
                                                                leave-active-class="transition duration-150 ease-in"
                                                                leave-from-class="transform scale-100 opacity-100"
                                                                leave-to-class="transform scale-95 opacity-0"
                                                            >
                                                                <div v-if="currentSlide.content.source && visibleImageSources.has(currentSlide.id)"
                                                                    class="absolute bottom-4 right-4 max-w-[80%] px-3 py-1.5 rounded-lg bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] text-xs font-medium  flex items-center gap-1.5 z-10 border border-[var(--color-outline-variant)]/30"
                                                                    @click.stop>
                                                                    <span class="material-symbols-outlined text-[10px] opacity-80 shrink-0">public</span>
                                                                    <span class="break-all text-left leading-tight">{{ currentSlide.content.source }}</span>
                                                                </div>
                                                            </Transition>
                                                        </div>

                                                        <!-- Optional: Caption/Description -->
                                                        <div v-if="currentSlide.content.description"
                                                            class="mt-4 text-center max-w-[90%] mx-auto space-y-2">
                                                            <p v-if="currentSlide.content.description[targetLangCode]"
                                                                class="text-base text-[var(--color-on-surface)] leading-relaxed">
                                                                {{ currentSlide.content.description[targetLangCode] }}
                                                            </p>
                                                            <p v-if="showTranslation && currentSlide.content.description[sourceLangCode] && sourceLangCode !== targetLangCode"
                                                                class="text-base text-[var(--color-on-surface-variant)] leading-relaxed">
                                                                <span
                                                                    class="material-symbols-outlined mr-1 opacity-60 select-none text-[1.1em] align-text-bottom">subdirectory_arrow_right</span>
                                                                {{ currentSlide.content.description[sourceLangCode] }}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <!-- TEXT SLIDE -->
                                                    <div v-else-if="currentSlide.type === 'text'" class="space-y-8 animate-fade-in-up w-full">
                                                        <p class="text-[var(--color-on-surface)] leading-relaxed text-2xl md:text-3xl text-center font-medium transition-colors duration-300">
                                                            <span v-html="currentSlide.content.target.replace(/\[\d+,\d+\]/g, '')"></span>
                                                            <!-- TTS Button -->
                                                            <button @click="speak(currentSlide.content.target, currentSlide.id)"
                                                                class="inline-flex align-middle ml-2 p-1 rounded-full text-[var(--color-primary)] hover:bg-[var(--color-surface-container)] transition-all"
                                                                :class="{ 'animate-pulse': ttsState.loadingId === currentSlide.id, 'text-[var(--color-error)]': ttsState.playingId === currentSlide.id }">
                                                                <span v-if="ttsState.loadingId === currentSlide.id" class="material-symbols-outlined text-2xl animate-spin">progress_activity</span>
                                                                <span v-else-if="ttsState.playingId === currentSlide.id" class="material-symbols-outlined text-2xl">stop_circle</span>
                                                                <span v-else class="material-symbols-outlined text-2xl">volume_up</span>
                                                            </button>
                                                        </p>
                                                        
                                                        <p v-if="showTranslation && currentSlide.content.source" 
                                                            class="text-[var(--color-on-surface-variant)] leading-relaxed text-xl md:text-2xl text-center opacity-80 transition-colors duration-300">
                                                            <span v-html="currentSlide.content.source.replace(/\[\d+,\d+\]/g, '')"></span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </Transition>

                                            <!-- Navigation Controls -->
                                            <div class="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-[var(--color-surface-container)]/90 backdrop-blur-sm p-2 rounded-full shadow-lg border border-[var(--color-outline-variant)]">
                                                <button @click="prevSlide" :disabled="currentSlideIndex === 0"
                                                    class="p-3 rounded-full hover:bg-[var(--color-surface-container-high)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[var(--color-on-surface)]">
                                                    <span class="material-symbols-outlined text-2xl">arrow_back</span>
                                                </button>
                                                <span class="text-sm font-medium tabular-nums text-[var(--color-on-surface-variant)]">
                                                    {{ currentSlideIndex + 1 }} / {{ computedSlides.length }}
                                                </span>
                                                <button @click="nextSlide" :disabled="currentSlideIndex === computedSlides.length - 1"
                                                    class="p-3 rounded-full hover:bg-[var(--color-surface-container-high)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[var(--color-on-surface)]">
                                                    <span class="material-symbols-outlined text-2xl">arrow_forward</span>
                                                </button>
                                            </div>
                                        </div>
                                    </template>

                                </div>
                            </Transition>
                        </template>


                        <!-- ADMIN VIEW: Single Language with Tabs -->
                        <template v-else>
                            <!-- Metadata Information Box (Top) -->
                            <div v-if="narrativeData.metadata"
                                class="mb-4 p-3 rounded-xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/40 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">


                                <!-- Status Selection Badge -->
                                <div class="flex items-center gap-2">
                                    <span class="text-[var(--color-on-surface-variant)]">{{ $t('admin.status')
                                        }}:</span>
                                    <Listbox :modelValue="narrativeData.status" @update:modelValue="handleStatusChange">
                                        <div class="relative">
                                            <ListboxButton
                                                class="relative h-7 cursor-pointer rounded-full px-3 text-left text-xs font-bold focus:outline-none transition-all border border-transparent hover:brightness-95 active:scale-95 flex items-center gap-1"
                                                :class="statusOptions.find(o => o.value === narrativeData.status)?.class || 'bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)]'">
                                                <span class="block truncate leading-none">{{statusOptions.find(o =>
                                                    o.value === narrativeData.status)?.label ||
                                                    $t('admin.status')}}</span>
                                                <span
                                                    class="material-symbols-outlined text-sm !leading-none">expand_more</span>
                                            </ListboxButton>

                                            <transition leave-active-class="transition duration-100 ease-in"
                                                leave-from-class="opacity-100" leave-to-class="opacity-0">
                                                <ListboxOptions
                                                    class="absolute left-0 mt-1 max-h-60 w-32 overflow-auto rounded-xl bg-[var(--color-surface-container-high)] py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none z-50">
                                                    <ListboxOption v-for="option in statusOptions" :key="option.value"
                                                        :value="option.value" v-slot="{ active, selected }"
                                                        :disabled="(option.value === 'public' || option.value === 'hidden') && !canPublish">
                                                        <li :class="[
                                                            active ? 'bg-[var(--color-surface-container-highest)]' : '',
                                                            'relative cursor-pointer select-none py-1.5 pl-3 pr-4 transition-colors',
                                                            ((option.value === 'public' || option.value === 'hidden') && !canPublish) ? 'opacity-50 cursor-not-allowed' : ''
                                                        ]">
                                                            <span
                                                                :class="[selected ? 'font-bold text-[var(--color-primary)]' : 'font-normal text-[var(--color-on-surface)]', 'block truncate text-xs']">
                                                                {{ option.label }}
                                                            </span>
                                                            <span v-if="selected"
                                                                class="absolute inset-y-0 right-0 flex items-center pr-2 text-[var(--color-primary)]">
                                                                <span
                                                                    class="material-symbols-outlined text-sm">check</span>
                                                            </span>
                                                        </li>
                                                    </ListboxOption>
                                                </ListboxOptions>
                                            </transition>
                                        </div>
                                    </Listbox>
                                </div>

                                <!-- Level Dropdown Badge -->
                                <div class="flex items-center gap-2">
                                    <span class="text-[var(--color-on-surface-variant)]">{{ $t('admin.level_label')
                                    }}:</span>
                                    <Menu as="div" class="relative">
                                        <MenuButton
                                            class="h-7 px-3 rounded-full font-bold text-xs flex items-center gap-1 cursor-pointer transition-all bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] hover:brightness-95 active:scale-95">
                                            <span class="leading-none">{{ narrativeData.metadata.level ||
                                                $t('admin.choose')
                                                }}</span>
                                            <span
                                                class="material-symbols-outlined !text-sm opacity-70 !leading-none">expand_more</span>
                                        </MenuButton>
                                        <Transition enter-active-class="transition duration-100 ease-out"
                                            enter-from-class="transform scale-95 opacity-0"
                                            enter-to-class="transform scale-100 opacity-100"
                                            leave-active-class="transition duration-75 ease-in"
                                            leave-from-class="transform scale-100 opacity-100"
                                            leave-to-class="transform scale-95 opacity-0">
                                            <MenuItems
                                                class="absolute left-0 mt-1 w-24 max-h-60 overflow-y-auto origin-top-left rounded-lg bg-[var(--color-surface-container-high)] shadow-lg ring-1 ring-black/5 focus:outline-none z-30 py-1">
                                                <MenuItem v-for="opt in levelOptions" :key="opt" v-slot="{ active }">
                                                <button @click="updateMetadata('level', opt)" :class="[
                                                    active ? 'bg-[var(--color-secondary-container)]' : '',
                                                    narrativeData.metadata.level === opt ? 'font-bold text-[var(--color-primary)]' : 'text-[var(--color-on-surface)]',
                                                    'group flex w-full items-center px-3 py-1.5 text-xs transition-colors'
                                                ]">
                                                    {{ opt }}
                                                    <span v-if="narrativeData.metadata.level === opt"
                                                        class="material-symbols-outlined ml-auto !text-sm">check</span>
                                                </button>
                                                </MenuItem>
                                            </MenuItems>
                                        </Transition>
                                    </Menu>
                                </div>

                                <!-- Genre Dropdown Badge -->
                                <div class="flex items-center gap-2">
                                    <span class="text-[var(--color-on-surface-variant)]">{{ $t('admin.genre') }}:</span>
                                    <Menu as="div" class="relative">
                                        <MenuButton
                                            class="h-7 px-3 rounded-full font-bold text-xs flex items-center gap-1 cursor-pointer transition-all bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)] hover:brightness-95 active:scale-95 whitespace-nowrap">
                                            <span class="leading-none">{{
                                                narrativeData.metadata.genre || $t('admin.choose') }}</span>
                                            <span
                                                class="material-symbols-outlined !text-sm opacity-70 !leading-none">expand_more</span>
                                        </MenuButton>
                                        <Transition enter-active-class="transition duration-100 ease-out"
                                            enter-from-class="transform scale-95 opacity-0"
                                            enter-to-class="transform scale-100 opacity-100"
                                            leave-active-class="transition duration-75 ease-in"
                                            leave-from-class="transform scale-100 opacity-100"
                                            leave-to-class="transform scale-95 opacity-0">
                                            <MenuItems
                                                class="absolute left-0 mt-1 w-40 max-h-60 overflow-y-auto origin-top-left rounded-lg bg-[var(--color-surface-container-high)] shadow-lg ring-1 ring-black/5 focus:outline-none z-30 py-1">
                                                <MenuItem v-for="opt in genreOptions" :key="opt" v-slot="{ active }">
                                                <button @click="updateMetadata('genre', opt)" :class="[
                                                    active ? 'bg-[var(--color-tertiary-container)]' : '',
                                                    narrativeData.metadata.genre === opt ? 'font-bold text-[var(--color-primary)]' : 'text-[var(--color-on-surface)]',
                                                    'group flex w-full items-center px-3 py-1.5 text-xs transition-colors'
                                                ]">
                                                    {{ opt }}
                                                    <span v-if="narrativeData.metadata.genre === opt"
                                                        class="material-symbols-outlined ml-auto !text-sm">check</span>
                                                </button>
                                                </MenuItem>
                                            </MenuItems>
                                        </Transition>
                                    </Menu>
                                </div>

                                <div class="flex items-center gap-1.5 ml-auto opacity-70">
                                    <span class="text-[var(--color-on-surface-variant)]">{{ $t('admin.created_at')
                                        }}:</span>
                                    <span class="font-medium text-[var(--color-on-surface)]">{{ formattedCreatedAt
                                        }}</span>
                                </div>
                            </div>

                            <!-- Language Tabs -->
                            <div class="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
                                <button v-for="lang in availableLanguages" :key="lang.code"
                                    @click="activeLang = lang.code" @dblclick="setAnchorLanguage(lang.code)"
                                    class="px-4 py-2 rounded-full text-sm font-semibold transition-all border whitespace-nowrap flex items-center gap-1.5"
                                    :class="activeLang === lang.code ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-transparent' : 'bg-transparent border-[var(--color-outline)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-on-surface-variant)]'">
                                    {{ lang.name }}
                                    <!-- Anchor Icon -->
                                    <span v-if="selectedAnchorLang === lang.code"
                                        class="material-symbols-outlined text-base"
                                        :class="activeLang === lang.code ? 'text-[var(--color-on-primary)]' : 'text-[var(--color-primary)]'"
                                        title="Bahasa Anchor (Sumber)">
                                        anchor
                                    </span>
                                    <!-- Status Icons -->
                                    <span v-if="langStatus[lang.code] === 'loading'"
                                        class="material-symbols-outlined text-base animate-spin">progress_activity</span>
                                    <!-- Failed or Incomplete (Cross/Silang) - Sync with List View Logic -->
                                    <span v-else-if="langStatus[lang.code] !== 'success' || langErrors[lang.code] || hasValidationError(lang.code)"
                                        class="material-symbols-outlined text-base text-[var(--color-error)]"
                                        :title="langErrors[lang.code] || hasValidationError(lang.code) || $t('admin.incomplete')">close</span>
                                    <!-- Success (Check/Centang) -->
                                    <span
                                        v-else-if="langStatus[lang.code] === 'success' && !hasValidationError(lang.code)"
                                        class="material-symbols-outlined text-base"
                                        :class="activeLang === lang.code ? 'text-inherit' : 'text-[var(--color-primary)]'">done</span>
                                </button>
                            </div>

                            <!-- Error Display (if activeLang has error) -->
                            <Transition name="fade">
                                <div v-if="langStatus[activeLang] === 'error' || langErrors[activeLang] || hasValidationError(activeLang)"
                                    class="mb-6 p-4 rounded-2xl bg-[var(--color-error-container)] text-[var(--color-on-error-container)] border border-[var(--color-error)]/30 flex items-start gap-3">
                                    <span
                                        class="material-symbols-outlined shrink-0 text-xl text-[var(--color-error)]">error_outline</span>
                                    <div class="text-sm">
                                        <p class="font-bold mb-0.5">{{ $t('admin.language_not_ready') }}</p>
                                        <p class="opacity-90 leading-relaxed">{{ langErrors[activeLang] ||
                                            hasValidationError(activeLang) || $t('admin.error_try_again') }}
                                        </p>
                                    </div>
                                </div>
                            </Transition>


                            <!-- Document Paper -->
                            <Transition mode="out-in" name="fade-slide">
                                <div :key="activeLang"
                                    class="bg-[var(--color-surface-container-high)] rounded-3xl min-h-[60vh] flex flex-col overflow-hidden"
                                    :style="{ fontFamily: 'var(--font-family-utama)' }">

                                    <!-- Content Area (Merged Title + Content) -->
                                    <div class="flex-1 p-6 flex flex-col gap-6">
                                        <!-- Title Area -->
                                        <div
                                            class="border-b border-[var(--color-outline-variant)]/30 pb-4 flex items-center justify-center relative min-h-[3rem]">


                                            <!-- Editable Title (Textarea to prevent cursor jumping) -->
                                            <textarea v-if="activeContent" v-model="activeContent.title"
                                                ref="titleTextarea" rows="1" :readonly="isReadOnly"
                                                @input="isDirty = true; autoResizeTextarea($event.target)"
                                                :placeholder="$t('admin.narrative_title_placeholder')"
                                                :class="['text-2xl md:text-3xl font-bold bg-transparent text-[var(--color-on-surface)] leading-tight outline-none w-full px-4 resize-none overflow-hidden text-center', isReadOnly ? 'cursor-default' : '']"
                                                :dir="isRtl ? 'rtl' : 'ltr'"></textarea>

                                            <!-- Regenerate Button (Visible only to Admin/Editor) -->

                                        </div>

                                        <!-- Editor Toolbar (Sticky Top) -->
                                        <div v-if="!isReadOnly"
                                            class="sticky top-0 z-20 mb-4 transition-all duration-300">
                                            <div
                                                class="flex items-center gap-3 w-full overflow-x-auto scrollbar-none pb-2">
                                                <button v-if="activeLang !== selectedAnchorLang"
                                                    @click="regenerateSingleLanguage(activeLang)"
                                                    :disabled="langStatus[activeLang] === 'loading'"
                                                    class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-surface)]/90 backdrop-blur-md border border-[var(--color-outline-variant)]/30 hover:bg-[var(--color-primary-container)] hover:text-[var(--color-on-primary-container)] hover:border-[var(--color-primary)] transition-all font-bold text-sm text-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Regenerate this language only">
                                                    <span class="material-symbols-outlined text-lg"
                                                        :class="{ 'animate-spin': langStatus[activeLang] === 'loading' }">autorenew</span>
                                                    <span>{{ $t('admin.regenerate') }}</span>
                                                </button>

                                                <button @click="addNewSentence"
                                                    class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-surface)]/90 backdrop-blur-md border border-[var(--color-outline-variant)]/30 hover:bg-[var(--color-primary-container)] hover:text-[var(--color-on-primary-container)] hover:border-[var(--color-primary)] transition-all font-bold text-sm"
                                                    :title="$t('admin.add_sentence')">
                                                    <span class="material-symbols-outlined text-lg">add</span>
                                                    <span>{{ $t('admin.sentence') }}</span>
                                                </button>
                                                <button @click="addNewParagraph"
                                                    class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-surface)]/90 backdrop-blur-md border border-[var(--color-outline-variant)]/30 hover:bg-[var(--color-primary-container)] hover:text-[var(--color-on-primary-container)] hover:border-[var(--color-primary)] transition-all font-bold text-sm"
                                                    :title="$t('admin.add_paragraph')">
                                                    <span class="material-symbols-outlined text-lg">add</span>
                                                    <span>{{ $t('admin.paragraph') }}</span>
                                                </button>
                                                <button @click="triggerImageUploadAtCursor"
                                                    class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-surface)]/90 backdrop-blur-md border border-[var(--color-outline-variant)]/30 hover:bg-[var(--color-primary-container)] hover:text-[var(--color-on-primary-container)] hover:border-[var(--color-primary)] transition-all font-bold text-sm"
                                                    :title="$t('admin.insert_image')">
                                                    <span class="material-symbols-outlined text-lg">add</span>
                                                    <span>{{ $t('admin.image') }}</span>
                                                </button>
                                                <label v-if="props.highlightText"
                                                    class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-surface)]/90 backdrop-blur-md border border-[var(--color-outline-variant)]/30 hover:bg-[var(--color-primary-container)] hover:text-[var(--color-on-primary-container)] hover:border-[var(--color-primary)] transition-all font-bold text-sm cursor-pointer select-none">
                                                    <input type="checkbox" v-model="showHighlight"
                                                        class="w-4 h-4 rounded border-[var(--color-outline)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-transparent">
                                                    <span>{{ $t('admin.highlight') }}</span>
                                                </label>
                                            </div>
                                        </div>

                                        <!-- Narrative Content Area -->
                                        <div class="flex-1 flex flex-col gap-6 relative">
                                            <template v-if="activeContent">

                                                <!-- SENTENCE VIEW (Structured) -->
                                                <div v-if="dualViewMode === 'sentence'" class="space-y-4">
                                                    <div v-for="(paragraph, index) in activeContent.paragraphs"
                                                        :key="index" class="space-y-1">
                                                        <div v-for="(sentence, sIdx) in splitSentences(paragraph)"
                                                            :key="`${index}-${sIdx}`" class="w-full relative group"
                                                            :dir="isRtl ? 'rtl' : 'ltr'" :id="`p-${index}-s-${sIdx}`">

                                                            <!-- Single Layer ContentEditable -->
                                                            <div contenteditable="true"
                                                                @input="(e) => onSentenceInput(index, sIdx, e)"
                                                                @keydown.enter="handleEnter($event, index)"
                                                                @paste="(e) => handlePasteImage(e, index)"
                                                                @focus="onParagraphFocus(index)"
                                                                v-html="markupIndices(sentence)"
                                                                class="relative z-10 block w-full p-3 bg-transparent text-[var(--color-on-surface)] leading-relaxed whitespace-pre-wrap break-words outline-none border border-transparent rounded-lg focus:bg-[var(--color-surface-container-highest)]/30 transition-colors selection:bg-[var(--color-primary)]/30 selection:text-[var(--color-on-surface)]"
                                                                style="font-family: inherit; font-size: inherit; line-height: 1.625;"
                                                                spellcheck="false"></div>
                                                        </div>

                                                        <!-- [NEW] Admin Image Editor (Sentence Mode) -->
                                                        <div v-if="narrativeData.images.some(img => img.paragraphIndex === index)"
                                                            class="mt-2 px-2 space-y-3">
                                                            <div v-for="img in narrativeData.images.filter(i => i.paragraphIndex === index)"
                                                                :key="narrativeData.images.indexOf(img)"
                                                                class="relative group p-3 bg-[var(--color-surface-container)] rounded-xl border border-[var(--color-outline-variant)] flex gap-4 items-start">

                                                                <!-- Image Preview -->
                                                                <div
                                                                    class="relative shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-black/5 border border-[var(--color-outline-variant)]/50">
                                                                    <img :src="img.data"
                                                                        class="w-full h-full object-contain">
                                                                    <button v-if="!isReadOnly"
                                                                        @click="removeImageFromStructuredStorage(narrativeData.images.indexOf(img))"
                                                                        class="absolute top-1 right-1 bg-[var(--color-error)] text-white w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10 hover:bg-red-600"
                                                                        title="Hapus Gambar">
                                                                        <span
                                                                            class="material-symbols-outlined text-xs">close</span>
                                                                    </button>
                                                                </div>

                                                                <!-- Metadata fields -->
                                                                <!-- READ ONLY VIEW (Public) -->
                                                                <div v-if="isReadOnly"
                                                                    class="flex-grow space-y-2 min-w-0 py-1">
                                                                    <!-- Target Language Description -->
                                                                    <div v-if="img.description && img.description[activeLang]"
                                                                        class="text-sm text-[var(--color-on-surface)] leading-relaxed font-serif">
                                                                        {{ img.description[activeLang] }}
                                                                    </div>

                                                                    <!-- Source Language Description (If different and exists) -->
                                                                    <div v-if="activeLang !== selectedAnchorLang && img.description && img.description[selectedAnchorLang]"
                                                                        class="text-xs text-[var(--color-on-surface-variant)] italic mt-1 border-t border-[var(--color-outline-variant)]/30 pt-1">
                                                                        {{ img.description[selectedAnchorLang] }}
                                                                    </div>

                                                                    <div v-else-if="!img.description || (!img.description[activeLang] && !img.description[selectedAnchorLang])"
                                                                        class="text-xs text-[var(--color-outline)] italic">
                                                                        {{ $t('no_description') || 'No description available' }}
                                                                    </div>

                                                                    <!-- Source Attribution -->
                                                                    <div v-if="img.source"
                                                                        class="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mt-2 opacity-70">
                                                                        {{ $t('admin.source') }}: {{ img.source }}
                                                                    </div>
                                                                </div>

                                                                <!-- EDIT MODE -->
                                                                <div v-else class="flex-grow space-y-2 min-w-0">
                                                                    <!-- Source -->
                                                                    <div>
                                                                        <label
                                                                            class="block text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-0.5">{{
                                                                                $t('admin.source') }}</label>
                                                                        <input v-model="img.source"
                                                                            @change="isDirty = true" type="text"
                                                                            class="w-full bg-transparent border-b border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] outline-none text-xs py-1 transition-colors placeholder-[var(--color-outline)]"
                                                                            :placeholder="$t('admin.image_source_placeholder') || 'Image Source'">
                                                                    </div>

                                                                    <!-- Description (Localized) -->
                                                                    <div>
                                                                        <label
                                                                            class="block text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-0.5">
                                                                            {{ $t('description') }} <span
                                                                                class="opacity-50">({{ activeLang
                                                                                }})</span>
                                                                        </label>
                                                                        <textarea v-model="img.description[activeLang]"
                                                                            @input="isDirty = true" rows="1"
                                                                            class="w-full bg-transparent border-b border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] outline-none text-xs py-1 resize-none overflow-hidden transition-colors placeholder-[var(--color-outline)]"
                                                                            :placeholder="$t('admin.image_desc_placeholder') || 'Description'"></textarea>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- DOCUMENT VIEW (Seamless Paragraph Editor) -->
                                                <div v-else class="flex flex-col gap-0 min-h-[50vh]">
                                                    <!-- Optional Image BEFORE all paragraphs -->
                                                    <!-- Optional Image BEFORE all paragraphs -->
                                                    <!-- REMOVED LEGACY INLINE IMAGE LOGIC -->

                                                    <template v-for="(pText, pIdx) in activeContent.paragraphs"
                                                        :key="pIdx">
                                                        <div class="w-full relative group" :dir="isRtl ? 'rtl' : 'ltr'">
                                                            <div :contenteditable="!isPublicView && !isPreviewMode"
                                                                @input="onParagraphInput(pIdx, $event)"
                                                                @keydown.enter="onParagraphEnter(pIdx, $event)"
                                                                @keydown.backspace="onParagraphBackspace(pIdx, $event)"
                                                                @paste="(e) => handlePasteImage(e, pIdx)"
                                                                @focus="onParagraphFocus(pIdx)"
                                                                class="relative z-10 block w-full p-2 bg-transparent text-[var(--color-on-surface)] leading-relaxed whitespace-pre-wrap break-words outline-none border-l-2 border-transparent focus:border-[var(--color-primary)]/30 focus:bg-[var(--color-surface-container-highest)]/5 transition-all selection:bg-[var(--color-primary)]/30 selection:text-[var(--color-on-surface)]"
                                                                style="font-family: inherit; font-size: inherit; line-height: 1.625;"
                                                                :spellcheck="false" v-html="markupIndices(pText)"></div>
                                                        </div>

                                                        <!-- [NEW] Admin Image Editor (Document Mode) -->
                                                        <div v-if="narrativeData.images.some(img => img.paragraphIndex === pIdx)"
                                                            class="mt-2 mb-6 px-4 space-y-3">
                                                            <div v-for="img in narrativeData.images.filter(i => i.paragraphIndex === pIdx)"
                                                                :key="narrativeData.images.indexOf(img)"
                                                                class="relative group p-3 bg-[var(--color-surface-container)] rounded-xl border border-[var(--color-outline-variant)] flex gap-4 items-start">

                                                                <!-- Image Preview -->
                                                                <div
                                                                    class="relative shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-black/5 border border-[var(--color-outline-variant)]/50">
                                                                    <img :src="img.data"
                                                                        class="w-full h-full object-contain">
                                                                    <button v-if="!isReadOnly"
                                                                        @click="removeImageFromStructuredStorage(narrativeData.images.indexOf(img))"
                                                                        class="absolute top-1 right-1 bg-[var(--color-error)] text-white w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10 hover:bg-red-600"
                                                                        title="Hapus Gambar">
                                                                        <span
                                                                            class="material-symbols-outlined text-xs">close</span>
                                                                    </button>
                                                                </div>

                                                                <!-- Metadata fields -->
                                                                <!-- Metadata fields -->
                                                                <!-- READ ONLY VIEW (Public) -->
                                                                <div v-if="isReadOnly"
                                                                    class="flex-grow space-y-2 min-w-0 py-1">
                                                                    <!-- Target Language Description -->
                                                                    <div v-if="img.description && img.description[activeLang]"
                                                                        class="text-sm text-[var(--color-on-surface)] leading-relaxed font-serif">
                                                                        {{ img.description[activeLang] }}
                                                                    </div>

                                                                    <!-- Source Language Description (If different and exists) -->
                                                                    <div v-if="activeLang !== selectedAnchorLang && img.description && img.description[selectedAnchorLang]"
                                                                        class="text-xs text-[var(--color-on-surface-variant)] italic mt-1 border-t border-[var(--color-outline-variant)]/30 pt-1">
                                                                        {{ img.description[selectedAnchorLang] }}
                                                                    </div>

                                                                    <div v-else-if="!img.description || (!img.description[activeLang] && !img.description[selectedAnchorLang])"
                                                                        class="text-xs text-[var(--color-outline)] italic">
                                                                        {{ $t('no_description') || 'No description available' }}
                                                                    </div>

                                                                    <!-- Source Attribution -->
                                                                    <div v-if="img.source"
                                                                        class="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mt-2 opacity-70">
                                                                        {{ $t('admin.source') }}: {{ img.source }}
                                                                    </div>
                                                                </div>

                                                                <!-- EDIT MODE -->
                                                                <div v-else class="flex-grow space-y-2 min-w-0">
                                                                    <!-- Source -->
                                                                    <div>
                                                                        <label
                                                                            class="block text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-0.5">{{
                                                                                $t('admin.source') }}</label>
                                                                        <input v-model="img.source"
                                                                            @change="isDirty = true" type="text"
                                                                            class="w-full bg-transparent border-b border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] outline-none text-xs py-1 transition-colors placeholder-[var(--color-outline)]"
                                                                            :placeholder="$t('admin.image_source_placeholder') || 'Image Source'">
                                                                    </div>

                                                                    <!-- Description (Localized) -->
                                                                    <div>
                                                                        <label
                                                                            class="block text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-0.5">
                                                                            {{ $t('description') }} <span
                                                                                class="opacity-50">({{ activeLang
                                                                                }})</span>
                                                                        </label>
                                                                        <textarea v-model="img.description[activeLang]"
                                                                            @input="isDirty = true" rows="1"
                                                                            class="w-full bg-transparent border-b border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] outline-none text-xs py-1 resize-none overflow-hidden transition-colors placeholder-[var(--color-outline)]"
                                                                            :placeholder="$t('admin.image_desc_placeholder') || 'Description'"></textarea>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </template>
                                                </div>
                                            </template>

                                            <!-- Attachments Section (Media) -->
                                        </div>


                                    </div>
                                </div>
                            </Transition>
                        </template>
                    </template>
                </div>
            </div>


            <!-- Footer Error/Status -->
            <div v-if="narrativeError || localError"
                class="p-2 bg-[var(--color-error-container)] text-[var(--color-on-error-container)] text-center text-sm">
                {{ narrativeError || localError }}
            </div>

            <!-- AI Configuration Modal -->
            <Teleport to="body">
                <TransitionRoot :show="isConfigModalOpen" as="template">
                    <Dialog @close="isConfigModalOpen = false" class="relative z-50">

                        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0"
                            enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100"
                            leave-to="opacity-0">
                            <div class="fixed inset-0 bg-[var(--color-scrim)]/50" />
                        </TransitionChild>

                        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
                            <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
                                enter-to="opacity-100 scale-100" leave="duration-200 ease-in"
                                leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
                                <DialogPanel
                                    class="w-full max-w-sm md:max-w-md xl:max-w-xl rounded-4xl bg-[var(--color-surface-container-high)] p-6 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">

                                    <div class="relative flex items-center justify-center shrink-0">
                                        <DialogTitle class="text-2xl font-bold text-[var(--color-on-background)]">
                                            {{ $t('admin.ai_config_title') }}
                                        </DialogTitle>
                                        <button @click="isConfigModalOpen = false"
                                            class="absolute right-0 top-0 p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors">
                                            <span class="material-symbols-outlined">close</span>
                                        </button>
                                    </div>

                                    <hr class="my-4 border-[var(--color-outline-variant)] shrink-0" />

                                    <div class="space-y-5">
                                        <!-- Anchor Language Selection -->
                                        <div class="space-y-3">
                                            <label
                                                class="block text-sm font-bold text-[var(--color-on-surface)] ml-1">{{
                                                    $t('admin.anchor_lang_source') }}</label>
                                            <Listbox v-model="selectedAnchorLang">
                                                <div class="relative">
                                                    <ListboxButton
                                                        class="relative w-full px-4 py-3 bg-[var(--color-surface-container)] rounded-2xl text-sm font-medium text-[var(--color-on-surface)] cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                                                        <span class="block truncate">{{
                                                            languageStore.opsiBahasa.find(l => l.kodeBahasa ===
                                                                selectedAnchorLang)?.nama || selectedAnchorLang
                                                        }}</span>
                                                        <span
                                                            class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                            <span
                                                                class="material-symbols-outlined text-[var(--color-on-surface-variant)]">expand_more</span>
                                                        </span>
                                                    </ListboxButton>
                                                    <Transition leave-active-class="transition duration-100 ease-in"
                                                        leave-from-class="opacity-100" leave-to-class="opacity-0">
                                                        <ListboxOptions
                                                            class="absolute z-10 mt-1 w-full overflow-auto rounded-xl bg-[var(--color-surface-container-high)] py-1 text-sm ring-1 ring-black/5 focus:outline-none sm:text-sm z-50 max-h-60">
                                                            <ListboxOption v-for="lang in languageStore.opsiBahasa"
                                                                :key="lang.kodeBahasa" :value="lang.kodeBahasa"
                                                                v-slot="{ active, selected }" as="template">
                                                                <li
                                                                    :class="[active ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]' : 'text-[var(--color-on-surface)]', 'relative cursor-pointer select-none py-2 pl-10 pr-4']">
                                                                    <span
                                                                        :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{
                                                                            lang.nama }}</span>
                                                                    <span v-if="selected"
                                                                        class="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-primary)]"><span
                                                                            class="material-symbols-outlined text-lg">check</span></span>
                                                                </li>
                                                            </ListboxOption>
                                                        </ListboxOptions>
                                                    </Transition>
                                                </div>
                                            </Listbox>
                                        </div>
                                        <!-- Paragraph Count -->
                                        <div class="space-y-3 bg-[var(--color-surface-container)] p-4 rounded-2xl">
                                            <div class="flex justify-between text-sm items-center">
                                                <label class="font-bold text-[var(--color-on-surface)]">{{
                                                    $t('admin.paragraph_count') }}</label>
                                                <span
                                                    class="px-3 py-1 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full text-xs font-bold">{{
                                                        aiConfig.paragraph_count }}</span>
                                            </div>
                                            <input type="range" min="3" max="7"
                                                v-model.number="aiConfig.paragraph_count"
                                                class="w-full h-2 bg-[var(--color-surface-variant)] rounded-full appearance-none cursor-pointer accent-[var(--color-primary)]">
                                        </div>

                                        <!-- Length -->
                                        <div class="space-y-3">
                                            <label
                                                class="block text-sm font-bold text-[var(--color-on-surface)] ml-1">{{
                                                    $t('admin.paragraph_length') }}</label>
                                            <div class="flex bg-[var(--color-surface-container)] p-1 rounded-2xl">
                                                <button v-for="len in ['Short', 'Medium', 'Long']" :key="len"
                                                    @click="aiConfig.paragraph_length = len"
                                                    class="flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200"
                                                    :class="aiConfig.paragraph_length === len ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'">
                                                    {{ len }}
                                                </button>
                                            </div>
                                        </div>

                                        <!-- Proficiency -->
                                        <div class="space-y-3">
                                            <label
                                                class="block text-sm font-bold text-[var(--color-on-surface)] ml-1">{{
                                                    $t('admin.proficiency_level') }}</label>
                                            <div class="grid grid-cols-6 gap-2">
                                                <button v-for="level in ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']"
                                                    :key="level" @click="aiConfig.proficiency_level = level"
                                                    type="button" :class="[
                                                        aiConfig.proficiency_level === level
                                                            ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-surface)] border-transparent'
                                                            : 'bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] border-[var(--color-outline-variant)]',
                                                        'flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all duration-200 border'
                                                    ]">
                                                    <span class="text-sm font-black">{{ level }}</span>
                                                    <span
                                                        class="text-[8px] uppercase tracking-tighter opacity-80 leading-none mt-1 font-bold">
                                                        {{
                                                            level === 'A1' ? 'Beginner' :
                                                                level === 'A2' ? 'Elem' :
                                                                    level === 'B1' ? 'Inter' :
                                                                        level === 'B2' ? 'Up-Int' :
                                                                            level === 'C1' ? 'Adv' : 'Mastery'
                                                        }}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>

                                        <!-- Narrative Type Selection -->
                                        <div class="space-y-3">
                                            <label
                                                class="block text-sm font-bold text-[var(--color-on-surface)] ml-1">{{
                                                    $t('admin.narrative_type') }}</label>
                                            <Listbox v-model="aiConfig.narrative_type">
                                                <div class="relative">
                                                    <ListboxButton
                                                        class="relative w-full px-4 py-3 bg-[var(--color-surface-container)] rounded-2xl text-sm font-medium text-[var(--color-on-surface)] cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                                                        <span class="block truncate">{{ aiConfig.narrative_type
                                                            }}</span>
                                                        <span
                                                            class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                            <span
                                                                class="material-symbols-outlined text-[var(--color-on-surface-variant)]">expand_more</span>
                                                        </span>
                                                    </ListboxButton>
                                                    <Transition leave-active-class="transition duration-100 ease-in"
                                                        leave-from-class="opacity-100" leave-to-class="opacity-0">
                                                        <ListboxOptions
                                                            class="absolute z-10 bottom-full mb-1 w-full overflow-auto rounded-xl bg-[var(--color-surface-container-high)] py-1 text-sm ring-1 ring-black/5 focus:outline-none max-h-60">
                                                            <!-- FICTION -->
                                                            <div
                                                                class="px-3 py-1 text-[var(--color-primary)] font-bold text-[10px] uppercase tracking-wider bg-[var(--color-surface-container)]">
                                                                {{ $t('admin.fiction') }}</div>
                                                            <ListboxOption
                                                                v-for="t in ['Fable', 'Legend', 'Myth', 'Fairy Tale', 'Science Fiction', 'Mystery', 'Slice of Life']"
                                                                :key="t" :value="t" v-slot="{ active, selected }"
                                                                as="template">
                                                                <li
                                                                    :class="[active ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]' : 'text-[var(--color-on-surface)]', 'relative cursor-pointer select-none py-2.5 pl-10 pr-4']">
                                                                    <span
                                                                        :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{
                                                                            t }}</span>
                                                                    <span v-if="selected"
                                                                        class="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-primary)]"><span
                                                                            class="material-symbols-outlined text-lg">check</span></span>
                                                                </li>
                                                            </ListboxOption>
                                                            <!-- NON-FICTION -->
                                                            <div
                                                                class="px-3 py-1 text-[var(--color-primary)] font-bold text-[10px] uppercase tracking-wider bg-[var(--color-surface-container)] mt-1">
                                                                {{ $t('admin.non_fiction') }}</div>
                                                            <ListboxOption
                                                                v-for="t in ['Biography', 'Personal Experience', 'Historical Narrative']"
                                                                :key="t" :value="t" v-slot="{ active, selected }"
                                                                as="template">
                                                                <li
                                                                    :class="[active ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]' : 'text-[var(--color-on-surface)]', 'relative cursor-pointer select-none py-2.5 pl-10 pr-4']">
                                                                    <span
                                                                        :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{
                                                                            t }}</span>
                                                                    <span v-if="selected"
                                                                        class="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-primary)]"><span
                                                                            class="material-symbols-outlined text-lg">check</span></span>
                                                                </li>
                                                            </ListboxOption>
                                                            <!-- PLOT / GENRE -->
                                                            <div
                                                                class="px-3 py-1 text-[var(--color-primary)] font-bold text-[10px] uppercase tracking-wider bg-[var(--color-surface-container)] mt-1">
                                                                {{ $t('admin.plot_genre') }}</div>
                                                            <ListboxOption
                                                                v-for="t in ['Adventure', 'Horror', 'Romance', 'Tragedy']"
                                                                :key="t" :value="t" v-slot="{ active, selected }"
                                                                as="template">
                                                                <li
                                                                    :class="[active ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]' : 'text-[var(--color-on-surface)]', 'relative cursor-pointer select-none py-2.5 pl-10 pr-4']">
                                                                    <span
                                                                        :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{
                                                                            t }}</span>
                                                                    <span v-if="selected"
                                                                        class="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-primary)]"><span
                                                                            class="material-symbols-outlined text-lg">check</span></span>
                                                                </li>
                                                            </ListboxOption>
                                                        </ListboxOptions>
                                                    </Transition>
                                                </div>
                                            </Listbox>
                                        </div>

                                        <!-- AI Director Plan -->
                                        <div class="space-y-3">
                                            <label
                                                class="block text-sm font-bold text-[var(--color-on-surface)] ml-1">{{
                                                    $t('admin.ai_director_plan') }}</label>

                                            <div v-if="!directorPlan && !isLoadingDirector"
                                                class="bg-[var(--color-surface-container)] p-4 rounded-2xl flex flex-col items-center gap-2 text-center text-[var(--color-on-surface)]">
                                                <span
                                                    class="material-symbols-outlined text-4xl text-[var(--color-primary)]">movie_edit</span>
                                                <p class="text-sm text-[var(--color-on-surface-variant)]">{{
                                                    $t('admin.ai_director_desc') }}</p>
                                                <button @click="handleConsultDirector"
                                                    class="mt-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-xl font-bold text-sm hover:brightness-110 transition-all cursor-pointer">
                                                    {{ $t('admin.consult_director') }}
                                                </button>
                                            </div>

                                            <div v-else-if="isLoadingDirector"
                                                class="bg-[var(--color-surface-container)] p-6 rounded-2xl flex flex-col items-center justify-center gap-3">
                                                <span
                                                    class="material-symbols-outlined text-3xl text-[var(--color-primary)] animate-spin">progress_activity</span>
                                                <span
                                                    class="text-xs font-medium text-[var(--color-on-surface-variant)]">{{
                                                        $t('admin.analyzing_anchor') }}</span>
                                            </div>

                                            <div v-else
                                                class="bg-[var(--color-surface-container)] p-4 rounded-2xl space-y-3 border border-[var(--color-primary)]/30">
                                                <!-- Plan Content -->
                                                <div class="flex justify-between items-start">
                                                    <h3
                                                        class="font-bold text-[var(--color-primary)] text-sm flex items-center gap-1">
                                                        <span
                                                            class="material-symbols-outlined text-base">verified</span>
                                                        {{ $t('admin.directors_plan') }}
                                                    </h3>
                                                    <button @click="handleConsultDirector"
                                                        class="p-1 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] cursor-pointer"
                                                        :title="$t('admin.regenerate_plan')">
                                                        <span class="material-symbols-outlined text-base">refresh</span>
                                                    </button>
                                                </div>

                                                <div class="space-y-2 text-xs">
                                                    <!-- Element 1: Premise (Character + Goal + Conflict) -->
                                                    <div class="pb-2 border-b border-[var(--color-outline-variant)]">
                                                        <span
                                                            class="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wide">1.
                                                            {{ $t('admin.premiss') }}</span>
                                                        <div class="grid grid-cols-[80px_1fr] gap-1 mt-1 items-start">
                                                            <span class="text-[var(--color-on-surface-variant)] pt-1">{{
                                                                $t('admin.protagonist') }}:</span>
                                                            <input v-model="directorPlan.protagonist_name" type="text"
                                                                class="w-full bg-transparent border-0 border-b border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] focus:ring-0 p-0 text-sm font-medium text-[var(--color-on-surface)] placeholder-[var(--color-outline)]"
                                                                :placeholder="$t('admin.protagonist_name_placeholder')" />
                                                        </div>
                                                        <div class="grid grid-cols-[80px_1fr] gap-1 mt-1 items-start">
                                                            <span class="text-[var(--color-on-surface-variant)] pt-1">{{
                                                                $t('admin.motivation') }}:</span>
                                                            <textarea v-model="directorPlan.protagonist_motivation"
                                                                rows="2"
                                                                class="w-full bg-transparent border-0 border-b border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] focus:ring-0 p-0 text-sm font-medium text-[var(--color-on-surface)] resize-none placeholder-[var(--color-outline)]"
                                                                :placeholder="$t('admin.protagonist_motivation_placeholder')"></textarea>
                                                        </div>
                                                        <div class="grid grid-cols-[80px_1fr] gap-1 mt-1 items-start">
                                                            <span class="text-[var(--color-on-surface-variant)] pt-1">{{
                                                                $t('admin.incident') }}:</span>
                                                            <textarea v-model="directorPlan.inciting_incident" rows="2"
                                                                class="w-full bg-transparent border-0 border-b border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] focus:ring-0 p-0 text-sm font-medium text-[var(--color-on-surface)] resize-none placeholder-[var(--color-outline)]"
                                                                :placeholder="$t('admin.inciting_incident_placeholder')"></textarea>
                                                        </div>
                                                    </div>

                                                    <!-- Element 2: Karakterisasi -->
                                                    <div class="grid grid-cols-[80px_1fr] gap-1 mt-1 items-start">
                                                        <span class="text-[var(--color-on-surface-variant)] pt-1">{{
                                                            $t('admin.flaw') }}:</span>
                                                        <textarea v-model="directorPlan.character_flaw" rows="2"
                                                            class="w-full bg-transparent border-0 border-b border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] focus:ring-0 p-0 text-sm font-medium text-[var(--color-on-surface)] resize-none placeholder-[var(--color-outline)]"
                                                            :placeholder="$t('admin.character_flaw_placeholder')"></textarea>
                                                    </div>
                                                    <div class="grid grid-cols-[80px_1fr] gap-1 mt-1 items-start">
                                                        <span class="text-[var(--color-on-surface-variant)] pt-1">{{
                                                            $t('admin.want') }}:</span>
                                                        <textarea v-model="directorPlan.character_want" rows="2"
                                                            class="w-full bg-transparent border-0 border-b border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] focus:ring-0 p-0 text-sm font-medium text-[var(--color-on-surface)] resize-none placeholder-[var(--color-outline)]"
                                                            :placeholder="$t('admin.character_want_placeholder')"></textarea>
                                                    </div>
                                                    <div class="grid grid-cols-[80px_1fr] gap-1 mt-1 items-start">
                                                        <span class="text-[var(--color-on-surface-variant)] pt-1">{{
                                                            $t('admin.need') }}:</span>
                                                        <textarea v-model="directorPlan.character_need" rows="2"
                                                            class="w-full bg-transparent border-0 border-b border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] focus:ring-0 p-0 text-sm font-medium text-[var(--color-on-surface)] resize-none placeholder-[var(--color-outline)]"
                                                            :placeholder="$t('admin.character_need_placeholder')"></textarea>
                                                    </div>

                                                    <!-- Element 3: Setting -->
                                                    <div class="pb-2 border-b border-[var(--color-outline-variant)]">
                                                        <span
                                                            class="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wide">3.
                                                            {{ $t('admin.setting') }}</span>
                                                        <textarea v-model="directorPlan.setting_atmosphere" rows="2"
                                                            class="mt-1 w-full bg-transparent border-0 border-b border-[var(--color-outline-variant)] focus:border(--color-primary)] focus:ring-0 p-0 text-sm italic text-[var(--color-on-surface)] resize-none placeholder-[var(--color-outline)]"
                                                            :placeholder="$t('admin.setting_atmosphere_placeholder')"></textarea>
                                                    </div>

                                                    <!-- Element 4 & 5: POV & Tone -->
                                                    <div
                                                        class="grid grid-cols-2 gap-2 pb-2 border-b border-[var(--color-outline-variant)]">
                                                        <div>
                                                            <span
                                                                class="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wide">4.
                                                                {{ $t('admin.pov') }}</span>
                                                            <input v-model="directorPlan.pov" type="text"
                                                                class="mt-1 w-full bg-transparent border-0 border-b border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] focus:ring-0 p-0 text-sm font-medium text-[var(--color-on-surface)] placeholder-[var(--color-outline)]"
                                                                :placeholder="$t('admin.pov')" />
                                                        </div>
                                                        <div>
                                                            <span
                                                                class="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wide">5.
                                                                {{ $t('admin.tone') }}</span>
                                                            <input v-model="directorPlan.tone" type="text"
                                                                class="mt-1 w-full bg-transparent border-0 border-b border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] focus:ring-0 p-0 text-sm font-medium text-[var(--color-on-surface)] placeholder-[var(--color-outline)]"
                                                                :placeholder="$t('admin.tone')" />
                                                        </div>
                                                    </div>

                                                    <!-- Element 6: Ending -->
                                                    <div>
                                                        <span
                                                            class="text-[10px) font-bold text-[var(--color-primary)] uppercase tracking-wide">6.
                                                            Ending</span>
                                                        <div class="grid grid-cols-[80px_1fr] gap-1 mt-1 items-start">
                                                            <span class="text-[var(--color-on-surface-variant)] pt-1">{{
                                                                $t('admin.resolution') }}:</span>
                                                            <textarea v-model="directorPlan.resolution" rows="2"
                                                                class="w-full bg-transparent border-0 border-b border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] focus:ring-0 p-0 text-sm font-medium text-[var(--color-on-surface)] resize-none placeholder-[var(--color-outline)]"
                                                                :placeholder="$t('admin.resolution_placeholder')"></textarea>
                                                        </div>
                                                        <div class="grid grid-cols-[80px_1fr] gap-1 items-center">
                                                            <span class="text-[var(--color-on-surface-variant)]">{{
                                                                $t('admin.arc')
                                                                }}:</span>
                                                            <input v-model="directorPlan.ending_arc" type="text"
                                                                class="w-full bg-transparent border-0 border-b border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] focus:ring-0 p-0 text-sm font-medium text-[var(--color-on-surface)] placeholder-[var(--color-outline)]"
                                                                :placeholder="$t('admin.ending_arc_placeholder')" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Actions -->
                                    <div class="grid grid-cols-[auto_1fr] gap-3 pt-2">
                                        <button @click="randomizeConfig"
                                            class="w-12 h-12 flex items-center justify-center rounded-xl bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)] hover:brightness-105 transition-all"
                                            title="Acak Pengaturan">
                                            <span class="material-symbols-outlined">casino</span>
                                        </button>
                                        <button @click="confirmGenerate"
                                            class="flex items-center justify-center gap-2 h-12 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-xl font-bold hover:brightness-110 transition-all active:scale-[0.98]">
                                            <span class="material-symbols-outlined">auto_awesome</span>
                                            Mulai Generate
                                        </button>
                                    </div>

                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </Dialog>
                </TransitionRoot>
            </Teleport>

            <!-- Generic Confirmation Modal -->
            <Teleport to="body">
                <TransitionRoot :show="isConfirmDialogOpen" as="template">
                    <Dialog @close="isConfirmDialogOpen = false" class="relative z-[60]">
                        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0"
                            enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100"
                            leave-to="opacity-0">
                            <div class="fixed inset-0 bg-[var(--color-scrim)]/50" />
                        </TransitionChild>

                        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
                            <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
                                enter-to="opacity-100 scale-100" leave="duration-200 ease-in"
                                leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
                                <DialogPanel
                                    class="w-full max-w-sm rounded-3xl bg-[var(--color-surface-container-high)] p-6 shadow-xl">
                                    <div class="flex items-center gap-3 mb-4">
                                        <div v-if="confirmDialogConfig.isDestructive"
                                            class="w-10 h-10 rounded-full bg-[var(--color-error-container)] text-[var(--color-on-error-container)] flex items-center justify-center shrink-0">
                                            <span class="material-symbols-outlined">warning</span>
                                        </div>
                                        <div v-else
                                            class="w-10 h-10 rounded-full bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] flex items-center justify-center shrink-0">
                                            <span class="material-symbols-outlined">help</span>
                                        </div>
                                        <DialogTitle class="text-xl font-bold text-[var(--color-on-background)]">
                                            {{ confirmDialogConfig.title }}
                                        </DialogTitle>
                                    </div>

                                    <p class="text-[var(--color-on-surface-variant)] mb-8">
                                        {{ confirmDialogConfig.message }}
                                    </p>

                                    <div class="flex items-center justify-end gap-3">
                                        <button @click="confirmDialogConfig.onCancel"
                                            class="px-5 py-2 rounded-full text-sm font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]/30 transition-colors">
                                            {{ confirmDialogConfig.cancelText }}
                                        </button>
                                        <button @click="confirmDialogConfig.onConfirm"
                                            class="px-6 py-2 rounded-full text-sm font-bold transition-all shadow-sm hover:shadow-md active:scale-95"
                                            :class="confirmDialogConfig.isDestructive ? 'bg-[var(--color-error)] text-[var(--color-on-error)] hover:brightness-110' : 'bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:brightness-110'">
                                            {{ confirmDialogConfig.confirmText }}
                                        </button>
                                    </div>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </Dialog>
                </TransitionRoot>
            </Teleport>

            <!-- Simpan Ke Daftar Modal -->
            <SimpanKeDaftar v-if="itemDataForSaving" v-model="showSimpanModal" :item-data="itemDataForSaving"
                item-type="narasi" />


        </div> <!-- Close Editor View Div (Line 1791) -->
    </div> <!-- Close Main Container Div (Line 1721) -->
</template> <!-- Close Component Template (Line 1720) -->

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: var(--color-outline-variant);
    border-radius: 20px;
}

.scrollbar-none::-webkit-scrollbar {
    display: none;
}

/* Slider Thumb Custom */
input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: var(--color-surface);
    /* [MODIFIED] */
    cursor: pointer;
    box-shadow: 0 2px 6px var(--color-shadow);
    /* [MODIFIED] var */
    border: 2px solid var(--color-outline-variant);
    /* [MODIFIED] var */
    margin-top: -2px;
}

/* Contenteditable placeholder styling */
.empty-placeholder:empty::before {
    content: attr(data-placeholder);
    color: var(--color-outline);
    pointer-events: none;
}

[contenteditable]:focus {
    outline: none;
}

/* --- ANIMATIONS (Lightweight & Efficient) --- */

/* 1. Page/View Transitions (Fade + Slide) */
.fade-slide-enter-active,
.fade-slide-leave-active {
    transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
    will-change: opacity, transform;
}

.fade-slide-enter-from {
    opacity: 0;
    transform: translateY(10px);
}

.fade-slide-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

/* 2. List Item Transitions */
.list-enter-active,
.list-leave-active {
    transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.list-enter-from,
.list-leave-to {
    opacity: 0;
    transform: translateX(-15px);
}

.list-leave-active {
    position: absolute;
    width: 100%;
    /* Ensure layout doesn't collapse weirdly during leave */
}

/* 3. Scale/Popup Transitions */
.scale-enter-active,
.scale-leave-active {
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    /* Bouncy */
}

.scale-enter-from,
.scale-leave-to {
    opacity: 0;
    transform: scale(0.9);
}

/* Sentence Focus Underline (Admin Edit Mode) */
.sentence-span {
    position: relative;
    cursor: text;
    display: inline;
    margin-right: 0.25em;
    /* Ensure spacing between sentences */
}

.sentence-span:last-child {
    margin-right: 0;
}

.sentence-focused {
    text-decoration: underline;
    text-decoration-color: var(--color-primary);
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
}
</style>
