<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import {
  useDraggable,
  useWindowSize,
  useStorage,
  useEventListener,
} from '@vueuse/core';
import { useSettingsStore } from '@/stores/settings';
import { useLanguageStore } from '@/stores/language';
import { storeToRefs } from 'pinia';

// --- PINIA STATE ---
const settingsStore = useSettingsStore();
const languageStore = useLanguageStore();
const { showVirtualKeyboard, hideNativeKeyboard } = storeToRefs(settingsStore);
const { selectedAsal, selectedTarget } = storeToRefs(languageStore);

// --- ACTIVE INPUT TRACKING ---
const activeInput = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);
const isInputFocused = ref(false);

const handleFocusIn = (e: Event) => {
  const el = e.target as HTMLInputElement | HTMLTextAreaElement;
  if (
    el &&
    (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') &&
    (el as HTMLInputElement).type !== 'checkbox' &&
    (el as HTMLInputElement).type !== 'radio' &&
    (el as HTMLInputElement).type !== 'file'
  ) {
    activeInput.value = el;
    isInputFocused.value = true;

    // Sembunyikan keyboard bawaan jika opsi aktif
    if (showVirtualKeyboard.value && hideNativeKeyboard.value) {
      el.setAttribute('inputmode', 'none');
      el.setAttribute('readonly', 'readonly');
      // Hapus readonly setelah sedikit delay agar bisa mengetik
      setTimeout(() => {
        el.removeAttribute('readonly');
      }, 50);
    }
  }
};

const handleFocusOut = (e: Event) => {
  // Restore inputmode saat blur jika diperlukan
  const el = e.target as HTMLInputElement | HTMLTextAreaElement;
  if (el && hideNativeKeyboard.value) {
    el.removeAttribute('inputmode');
  }

  // Delay untuk mengecek apakah fokus pindah ke elemen keyboard atau input lain
  setTimeout(() => {
    const newActiveElement = document.activeElement;
    const keyboardEl = keyboardRef.value;

    // Jika fokus pindah ke elemen di dalam keyboard, jangan sembunyikan
    if (keyboardEl && keyboardEl.contains(newActiveElement)) {
      return;
    }

    // Jika fokus bukan di input/textarea, sembunyikan keyboard
    if (
      newActiveElement?.tagName !== 'INPUT' &&
      newActiveElement?.tagName !== 'TEXTAREA'
    ) {
      isInputFocused.value = false;
      activeInput.value = null;
    } else if (newActiveElement !== activeInput.value) {
      // Fokus pindah ke input lain
      activeInput.value = newActiveElement as HTMLInputElement | HTMLTextAreaElement;
    }
  }, 150);
};

onMounted(() => {
  // Use VueUse for event listeners (auto cleanup)
  useEventListener(document, 'focusin', handleFocusIn, true);
  useEventListener(document, 'focusout', handleFocusOut, true);
});

// Computed untuk menentukan apakah keyboard harus ditampilkan
const shouldShowKeyboard = computed(() => {
  return showVirtualKeyboard.value && isInputFocused.value;
});

// --- TEMPLATE REFS & VUEUSE ---
const keyboardRef = ref<HTMLElement | null>(null);
const dragHandleRef = ref<HTMLElement | null>(null);
const { width: windowWidth, height: windowHeight } = useWindowSize();
const position = useStorage('virtual-keyboard-position', { x: 100, y: 100 });

const { x, y, isDragging } = useDraggable(keyboardRef, {
  initialValue: position.value,
  handle: dragHandleRef,
  preventDefault: true,
  onEnd: () => {
    const el = keyboardRef.value;
    if (!el) return;
    x.value = Math.max(
      0,
      Math.min(x.value, windowWidth.value - el.offsetWidth),
    );
    y.value = Math.max(
      0,
      Math.min(y.value, windowHeight.value - el.offsetHeight),
    );
    position.value = { x: x.value, y: y.value };
  },
});

const keyboardStyle = computed(() => ({
  transform: `translate(${x.value}px, ${y.value}px)`,
  width: '350px',
  maxWidth: 'calc(100vw - 32px)',
}));

// --- KEYBOARD LAYOUTS DATABASE ---
const KEYBOARD_LAYOUTS: Record<string, string[][]> = {
  // Inggris/Indonesia/Default (QWERTY)
  en: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ],
  // Rusia (Cyrillic)
  ru: [
    ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х'],
    ['ъ', 'ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж'],
    ['э', 'я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю', 'ё'],
  ],
  // Prancis (AZERTY)
  fr: [
    ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
    ['w', 'x', 'c', 'v', 'b', 'n'],
  ],
  // Jerman (QWERTZ)
  de: [
    ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p', 'ü'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö', 'ä'],
    ['y', 'x', 'c', 'v', 'b', 'n', 'm', 'ß'],
  ],
  // Spanyol (QWERTY + ñ)
  es: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ],
  // Yunani (Greek)
  el: [
    [';', 'ς', 'ε', 'ρ', 'τ', 'y', 'θ', 'ι', 'ο', 'π'],
    ['α', 'σ', 'δ', 'φ', 'γ', 'η', 'ξ', 'κ', 'λ'],
    ['ζ', 'χ', 'ψ', 'ω', 'β', 'ν', 'μ'],
  ],
  // Arab (Standard Arabic)
  ar: [
    ['ض', 'ص', 'ث', 'ق', 'f', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
    ['ش', 'س', 'ي', 'b', 'ل', 'ا', 'ت', 'n', 'م', 'k', 'ط'],
    ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ'],
  ],
  // Hindi (Inscript)
  hi: [
    ['ौ', 'ै', 'ा', 'ी', 'ू', 'ब', 'ह', 'ग', 'द', 'ज', 'ड'],
    ['ो', 'े', '्', 'ि', 'ु', 'प', 'र', 'क', 'त', 'च', 'ट'],
    ['ॆ', 'ं', 'म', 'न', 'व', 'ल', 'स', 'य'],
  ],
  // Jepang (JIS Kana - Hiragana Base)
  ja: [
    ['ぬ', 'ふ', 'あ', 'う', 'え', 'お', 'や', 'ゆ', 'よ', 'わ', 'ほ'],
    ['た', 'て', 'い', 'す', 'か', 'ん', 'な', 'に', 'ら', 'せ'],
    ['ち', 'と', 'し', 'は', 'き', 'く', 'ま', 'の', 'り', 'れ'],
    ['つ', 'さ', 'そ', 'ひ', 'こ', 'み', 'も', 'ね', 'る', 'め'],
  ],
  // Korea (2-Set / Dubeolsik)
  ko: [
    ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'],
    ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'],
    ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ'],
  ],
  // Cina (zh) -> Menggunakan Layout 'en' (Pinyin)
};

// --- LOGIC PEMETAAN BAHASA DB KE LAYOUT ---
function getLayoutCode(dbLangCode: string | undefined): string {
  if (!dbLangCode) return 'en';

  // Jika kode DB ada di daftar layout kita, gunakan langsung
  if (KEYBOARD_LAYOUTS[dbLangCode]) {
    return dbLangCode;
  }

  // Peta manual untuk bahasa yang menggunakan layout lain atau default
  switch (dbLangCode) {
    case 'id':
      return 'en'; // Indonesia -> QWERTY
    case 'it':
      return 'en'; // Italia -> QWERTY
    case 'pt':
      return 'en'; // Portugis -> QWERTY
    case 'zh':
      return 'zh'; // Cina -> Special case, kita map ke 'en' di computed, tapi code tetap 'zh' agar label benar
    default:
      return 'en';
  }
}

// State untuk layout aktif
const currentLayoutCode = ref('en');

// Computed untuk baris kunci berdasarkan layout aktif
const keyRows = computed(() => {
  // Special Case untuk Cina (zh), gunakan layout Inggris (untuk Pinyin)
  if (currentLayoutCode.value === 'zh') {
    return KEYBOARD_LAYOUTS['en'];
  }
  return KEYBOARD_LAYOUTS[currentLayoutCode.value] || KEYBOARD_LAYOUTS['en'];
});

// Fungsi inisialisasi layout awal (Default: Bahasa Target)
const setInitialLayout = () => {
  const targetCode = selectedTarget.value?.kodeBahasa;
  currentLayoutCode.value = getLayoutCode(targetCode);
};

// Watch perubahan bahasa di store
watch([selectedAsal, selectedTarget], () => {
  setInitialLayout();
});

onMounted(() => {
  setInitialLayout();
});

// --- FITUR SWAP BAHASA ---
function swapLayout() {
  const sourceCode = getLayoutCode(selectedAsal.value?.kodeBahasa);
  const targetCode = getLayoutCode(selectedTarget.value?.kodeBahasa);

  // Jika kode layout sekarang SAMA dengan target, pindah ke source
  if (currentLayoutCode.value === targetCode) {
    // Hanya swap jika source berbeda dengan target (misal: bukan en <-> en)
    // Atau jika source/target adalah Cina ('zh'), kita tetap swap kode-nya untuk ganti label
    if (
      sourceCode !== targetCode ||
      sourceCode === 'zh' ||
      targetCode === 'zh'
    ) {
      currentLayoutCode.value = sourceCode;
    }
  } else {
    currentLayoutCode.value = targetCode;
  }
}

// --- KEYBOARD STATE ---
const isShiftActive = ref(false);
const pressedKeys = reactive<Record<string, boolean>>({});

// --- INTERACTION HANDLERS ---
function handlePress(key: string) {
  pressedKeys[key] = true;
}

function insertCharacter(char: string) {
  const el = activeInput.value;
  if (!el) return;

  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const currentVal = el.value || '';

  el.value = currentVal.substring(0, start) + char + currentVal.substring(end);

  // Trigger input event untuk Vue reactivity
  el.dispatchEvent(new Event('input', { bubbles: true }));

  // Set cursor position
  const newPos = start + char.length;
  el.setSelectionRange(newPos, newPos);
  el.focus();
}

function deleteCharacter() {
  const el = activeInput.value;
  if (!el) return;

  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const currentVal = el.value || '';

  let newVal;
  let newCursorPos;

  if (start === end && start > 0) {
    // No selection, delete char before cursor
    newVal = currentVal.substring(0, start - 1) + currentVal.substring(end);
    newCursorPos = start - 1;
  } else {
    // Delete selection
    newVal = currentVal.substring(0, start) + currentVal.substring(end);
    newCursorPos = start;
  }

  el.value = newVal;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.setSelectionRange(newCursorPos, newCursorPos);
  el.focus();
}

function handleRelease(key: string) {
  if (!pressedKeys[key]) return;

  if (key === 'backspace') deleteCharacter();
  else if (key === 'shift') isShiftActive.value = !isShiftActive.value;
  else if (key === 'space') insertCharacter(' ');
  else if (key === 'lang') swapLayout();
  else insertCharacter(isShiftActive.value ? key.toUpperCase() : key);

  delete pressedKeys[key];
}

// --- DYNAMIC STYLING LOGIC ---
const baseKeyStyle =
  'h-11 min-w-0 flex items-center justify-center rounded-xl font-medium transition-colors duration-500 select-none';
const defaultKeyColor =
  'bg-[var(--color-surface-container-highest)] hover:bg-[var(--color-surface-container)] text-[var(--color-on-background)]';
const specialKeyColor =
  'bg-[var(--color-surface-container-highest)] hover:bg-[var(--color-surface-container)] text-[var(--color-on-background)]';
const pressedKeyColor =
  'bg-[var(--color-secondary)] text-[var(--color-on-secondary)] !duration-100'; // **SUDAH DIGANTI**

function getKeyClass(key: string, type = 'default') {
  if (pressedKeys[key] || (key === 'shift' && isShiftActive.value)) {
    return pressedKeyColor;
  }
  return type === 'special' ? specialKeyColor : defaultKeyColor;
}
</script>

<template>
  <Transition name="keyboard-fade">
    <div
      v-if="shouldShowKeyboard"
      ref="keyboardRef"
      :class="[
        'fixed top-0 left-0 z-50 will-change-transform',
        'p-2 rounded-2xl shadow-xl shadow-[0_0_35px_rgba(0,0,0,0.25)] ring-1 ring-[var(--color-primary)]/50',
        'bg-[var(--color-surface-container)] text-[var(--color-on-background)]',
        { 'is-dragging': isDragging }
      ]"
      :style="keyboardStyle"
      @mousedown.prevent
    >
      <div
        ref="dragHandleRef"
        class="w-full h-5 flex justify-center items-center mb-2 cursor-grab active:cursor-grabbing"
        style="touch-action: none;"
      >
        <div class="w-8 h-1 rounded-full bg-[var(--color-outline-variant)]"></div>
      </div>

      <div class="flex flex-col items-center gap-1">
        <div v-for="(row, ri) in keyRows" :key="ri" class="flex w-full justify-center gap-1">
          <button
            v-for="key in row"
            :key="key"
            @mousedown.prevent="handlePress(key)"
            @mouseup="handleRelease(key)"
            @mouseleave="handleRelease(key)"
            @touchstart.prevent="handlePress(key)"
            @touchend="handleRelease(key)"
            @touchcancel="handleRelease(key)"
            :class="[baseKeyStyle, 'flex-1 text-base', getKeyClass(key)]"
          >
            {{ isShiftActive ? key.toUpperCase() : key }}
          </button>
        </div>

        <div class="flex w-full justify-center gap-1">
          <button
            @mousedown.prevent="handlePress('shift')"
            @mouseup="handleRelease('shift')"
            @touchstart.prevent="handlePress('shift')"
            @touchend="handleRelease('shift')"
            :class="[baseKeyStyle, 'flex-[1.5] text-xl font-bold', getKeyClass('shift', 'special')]">
            <span class="material-symbols-outlined">arrow_upward</span>
          </button>
          
          <button
            @mousedown.prevent="handlePress('lang')"
            @mouseup="handleRelease('lang')"
            @touchstart.prevent="handlePress('lang')"
            @touchend="handleRelease('lang')"
            :class="[baseKeyStyle, 'flex-[1.5] text-xl font-bold relative', getKeyClass('lang', 'special')]">
            <span class="material-symbols-outlined">language</span>
            <span class="absolute bottom-0.5 right-1 text-[9px] uppercase font-bold opacity-70">{{ currentLayoutCode }}</span>
          </button>

          <button
            @mousedown.prevent="handlePress('space')"
            @mouseup="handleRelease('space')"
            @mouseleave="handleRelease('space')"
            @touchstart.prevent="handlePress('space')"
            @touchend="handleRelease('space')"
            @touchcancel="handleRelease('space')"
            :class="[baseKeyStyle, 'text-xl flex-[5]', getKeyClass('space')]">
            &nbsp;
          </button>
          
          <button
            @mousedown.prevent="handlePress('backspace')"
            @mouseup="handleRelease('backspace')"
            @mouseleave="handleRelease('backspace')"
            @touchstart.prevent="handlePress('backspace')"
            @touchend="handleRelease('backspace')"
            @touchcancel="handleRelease('backspace')"
            :class="[baseKeyStyle, 'flex-[2] text-xl', getKeyClass('backspace', 'special')]">
            <span class="material-symbols-outlined">backspace</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.keyboard-fade-enter-active,
.keyboard-fade-leave-active {
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
}
.keyboard-fade-enter-from,
.keyboard-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
.is-dragging {
  transition: none;
}
</style>
