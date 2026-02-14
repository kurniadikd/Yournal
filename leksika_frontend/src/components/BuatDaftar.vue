<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';
import { useListsStore } from '@/stores/lists';

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  mode: { type: String as () => 'create' | 'edit', default: 'create' }, // 'create' or 'edit'
  initialData: {
    type: Object as () => { name: string; icon: string; id: number | null },
    default: () => ({ name: '', icon: '📁', id: null }),
  },
});

const emit = defineEmits([
  'update:modelValue',
  'folder-created',
  'folder-updated',
  'folder-deleted',
]);

const listsStore = useListsStore();

const folders = computed(() => listsStore.getFolders);
const newFolderName = ref('');
const newFolderIcon = ref('📁');
const showIconPickerModal = ref(false);
const newFolderError = ref('');
const showDeleteConfirm = ref(false);

// Ref untuk initial focus
const folderNameInputRef = ref<HTMLInputElement | null>(null);
const iconPickerFirstButtonRef = ref<HTMLButtonElement | null>(null);

const isNewFolderInputValid = computed(() => {
  const name = newFolderName.value.trim();
  if (name === '') return false;

  // In create mode, check if name exists
  if (props.mode === 'create') {
    return !folders.value.some(
      (folder: any) => folder.name.toLowerCase() === name.toLowerCase(),
    );
  }

  // In edit mode, check if name exists but exclude self
  if (props.mode === 'edit') {
    return !folders.value.some(
      (folder: any) =>
        folder.name.toLowerCase() === name.toLowerCase() &&
        folder.id !== props.initialData.id,
    );
  }

  return true;
});

watch(
  () => props.modelValue,
  (isNowVisible) => {
    if (isNowVisible) {
      if (props.mode === 'edit') {
        newFolderName.value = props.initialData.name || '';
        newFolderIcon.value = props.initialData.icon || '📁';
      } else {
        newFolderName.value = '';
        newFolderIcon.value = '📁';
      }
      newFolderError.value = '';
      showIconPickerModal.value = false;
      showDeleteConfirm.value = false;
    }
  },
);

const closeModal = () => {
  emit('update:modelValue', false);
};

const handleSave = async () => {
  newFolderError.value = '';
  const RESERVED_LIST_NAMES = ['Favorit', 'Riwayat', 'Dilaporkan'];
  if (
    RESERVED_LIST_NAMES.map((n) => n.toLowerCase()).includes(
      newFolderName.value.trim().toLowerCase(),
    )
  ) {
    // Allow editing reserved lists IF we are strictly just changing icon? No, backend blocks editing special lists normally.
    // But wait, user might want to edit icon of 'Favorit'? Backend says forbidden.
    // So strictly block.
    if (
      props.mode === 'create' ||
      (props.mode === 'edit' &&
        props.initialData.name !== newFolderName.value.trim())
    ) {
      newFolderError.value = `Nama daftar '${newFolderName.value.trim()}' tidak diizinkan.`;
      return;
    }
  }

  if (isNewFolderInputValid.value) {
    try {
      if (props.mode === 'create') {
        await listsStore.addList({
          name: newFolderName.value.trim(),
          icon: newFolderIcon.value,
        });
        emit('folder-created', newFolderName.value.trim());
      } else {
        await listsStore.updateList({
          listId: props.initialData.id!,
          name: newFolderName.value.trim(),
          icon: newFolderIcon.value,
        });
        emit('folder-updated', {
          ...props.initialData,
          name: newFolderName.value.trim(),
          icon: newFolderIcon.value,
        });
      }
      closeModal();
    } catch (error: any) {
      console.error(error);
      if (error.response && error.response.status === 409) {
        newFolderError.value = 'Daftar dengan nama ini sudah ada.';
      } else if (error.message && error.message.includes('tidak diizinkan')) {
        newFolderError.value = error.message;
      } else {
        newFolderError.value =
          props.mode === 'create'
            ? 'Gagal membuat daftar baru.'
            : 'Gagal menyimpan perubahan.';
      }
    }
  }
};

const handleDelete = async () => {
  try {
    if (props.initialData.id) {
        await listsStore.deleteList(props.initialData.id);
        emit('folder-deleted', props.initialData.id);
        closeModal();
    }
  } catch (error) {
    newFolderError.value = 'Gagal menghapus daftar.';
  }
};

const handleBackFromIconPicker = () => {
  showIconPickerModal.value = false;
};

const selectIcon = (icon: string) => {
  newFolderIcon.value = icon;
  showIconPickerModal.value = false;
};

const allEmojis = [
  '📁',
  '⭐',
  '📚',
  '💡',
  '✅',
  '🎶',
  '📌',
  '📈',
  '📋',
  '🗓️',
  '🔒',
  '🏠',
  '📝',
  '🔔',
  '❤️',
  '💼',
  '🆕',
  '🎁',
  '🚀',
  '🔥',
  '🌈',
  '💰',
  '🎉',
  '✈️',
  '✨',
  '🔑',
  '⚙️',
  '🗣️',
  '📊',
  '🗺️',
  '🔗',
  '🔎',
  '📅',
  '⏰',
  '🛒',
  '🛍️',
  '💳',
  '🍏',
  '🍔',
  '🍕',
  '🌮',
  '🍜',
  '🍣',
  '☕',
  '🍵',
  '🥛',
  '🍉',
  '🍓',
  '🍇',
  '🍍',
  '🎂',
  '🍩',
  '⚽',
  '🏀',
  '🏈',
  '⚾',
  '🎾',
  '🏊',
  '🧘',
  '🎨',
  '🎮',
  '🎸',
  '🐶',
  '🐱',
  '🐼',
  '🦊',
  '🐻',
  '🦁',
  '🐬',
  '🌳',
  '🌸',
  '☀️',
  '🌍',
  '🌊',
  '🚗',
  '🚲',
  '🙂',
  '😄',
  '😂',
  '🤔',
  '💯',
];
</script>

<template>
  <TransitionRoot appear :show="modelValue" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-[60]" :initialFocus="folderNameInputRef">
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-[var(--color-scrim)]/50" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-2xl font-bold text-center leading-6 text-[var(--color-on-background)] pb-4">
                {{ mode === 'edit' ? 'Edit Daftar' : 'Buat Daftar Baru' }}
              </DialogTitle>
              
              <div v-if="!showDeleteConfirm">
                  <div class="flex flex-col items-center mb-6">
                    <div class="relative w-[90px] h-[90px] flex items-center justify-center p-2 rounded-xl border-2 border-[var(--color-outline-variant)] mb-4 bg-[var(--color-surface-container)]">
                      <span class="text-4xl">{{ newFolderIcon }}</span>
                    </div>
                    <button @click="showIconPickerModal = true" class="text-sm font-medium text-[var(--color-primary)] hover:underline">Atur Ikon</button>
                  </div>
                  <div class="space-y-4">
                    <div>
                      <label for="new-folder-name" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Nama Daftar</label>
                      <input 
                        ref="folderNameInputRef"
                        id="new-folder-name" 
                        v-model="newFolderName" 
                        type="text" 
                        class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 text-[var(--color-on-surface)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:outline-none" 
                        placeholder="Masukkan nama daftar..."
                      />
                      <p v-if="newFolderError" class="mt-1 text-sm text-[var(--color-error)]">{{ newFolderError }}</p>
                    </div>
                  </div>

                  <div class="mt-6 flex flex-col gap-3">
                    <div class="grid grid-cols-2 gap-3">
                        <button type="button" class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]" @click="closeModal">
                        Batal
                        </button>
                        <button type="button" :disabled="!isNewFolderInputValid" class="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2 font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-fixed-dim)] disabled:opacity-50" @click="handleSave">
                        {{ mode === 'edit' ? 'Simpan' : 'Buat' }}
                        </button>
                    </div>
                    
                    <button v-if="mode === 'edit'" type="button" class="w-full rounded-xl border border-[var(--color-error)] text-[var(--color-error)] px-4 py-2 font-semibold hover:bg-[var(--color-error-container)] transition-colors" @click="showDeleteConfirm = true">
                        Hapus Daftar
                    </button>
                  </div>
              </div>

              <!-- Delete Confirmation View -->
              <div v-else class="text-center py-4">
                  <span class="material-symbols-outlined text-5xl text-[var(--color-error)] mb-4">warning</span>
                  <h4 class="text-lg font-bold text-[var(--color-on-background)] mb-2">Hapus Daftar?</h4>
                  <p class="text-[var(--color-on-surface-variant)] mb-6">
                      Apakah Anda yakin ingin menghapus daftar ini? Semua item di dalamnya akan tetap ada di database tetapi tidak lagi dikelompokkan disini.
                      <br><span class="text-xs italic">(Item tidak akan terhapus permanen dari sistem)</span>
                  </p>
                  
                  <div class="grid grid-cols-2 gap-3">
                      <button type="button" class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]" @click="showDeleteConfirm = false">
                      Batal
                      </button>
                      <button type="button" class="w-full rounded-xl bg-[var(--color-error)] px-4 py-2 font-semibold text-[var(--color-on-error)] transition-colors hover:bg-[var(--color-error-container)]" @click="handleDelete">
                      Ya, Hapus
                      </button>
                  </div>
              </div>

            </DialogPanel>
          </TransitionChild>
        </div>
      </div>

      <!-- Icon Picker Modal -->
      <TransitionRoot appear :show="showIconPickerModal" as="template">
        <Dialog as="div" @close="showIconPickerModal = false" class="relative z-[70]" :initialFocus="iconPickerFirstButtonRef">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
            <div class="fixed inset-0 bg-[var(--color-scrim)]/20" />
          </TransitionChild>
          <div class="fixed inset-0 overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
                <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-left align-middle shadow-xl transition-all">
                  <DialogTitle as="h3" class="text-xl font-bold leading-6 text-[var(--color-on-background)] text-center mb-4">
                    Pilih Ikon
                  </DialogTitle>
                  <div class="grid grid-cols-6 gap-2 max-h-96 overflow-y-auto custom-scrollbar">
                    <button 
                      v-for="(emoji, index) in allEmojis" 
                      :key="emoji" 
                      :ref="index === 0 ? (el) => iconPickerFirstButtonRef = el : undefined"
                      @click="selectIcon(emoji)"
                      class="flex items-center justify-center p-2 rounded-xl border-2 transition-all duration-200 ease-in-out aspect-square"
                      :class="[ newFolderIcon === emoji ? 'border-[var(--color-primary)] bg-[var(--color-surface-container-highest)]' : 'border-[var(--color-outline-variant)] hover:border-[var(--color-primary)]' ]">
                      <span class="text-3xl">{{ emoji }}</span>
                    </button>
                  </div>
                  <div class="mt-6 flex justify-center">
                    <button type="button" class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]" @click="handleBackFromIconPicker">
                      Kembali
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </TransitionRoot>
    </Dialog>
  </TransitionRoot>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(120, 120, 120, 0.3); border-radius: 10px; }
</style>
