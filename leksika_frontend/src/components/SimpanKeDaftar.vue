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
import BuatDaftar from './BuatDaftar.vue';

const modelValue = defineModel<boolean>({ required: true });

const props = defineProps({
  itemData: { type: Object as () => any, required: true }, // Define more specific interface if possible
  itemType: { type: String, required: true },
});

const emit = defineEmits(['add-to-folder']);

const listsStore = useListsStore();

const folders = computed(() => listsStore.getFolders);
const availableFolders = computed(() => {
  return folders.value.filter(
    (folder: any) =>
      !folder.hidden &&
      folder.name.toLowerCase() !== 'riwayat' &&
      !(folder.special && folder.name.toLowerCase() !== 'favorit'),
  );
});

const selectedFolders = ref<string[]>([]);
const showBuatDaftarModal = ref(false);
const cancelButtonRef = ref<HTMLElement | null>(null);

const initializeSelectedFolders = () => {
  if (!props.itemData?.id) return;
  selectedFolders.value = folders.value
    .filter((folder: any) =>
      // Updated to use generic check with itemType (e.g., 'narasi', 'sentence')
      listsStore.isItemInList(props.itemData.id, folder.name, props.itemType),
    )
    .map((folder: any) => folder.name);
};

watch(
  modelValue,
  (isNowVisible) => {
    if (isNowVisible) {
      initializeSelectedFolders();
      showBuatDaftarModal.value = false;
    }
  },
);

const closeModal = () => {
  modelValue.value = false;
};

const handleSaveChanges = async () => {
  const originalFolders = folders.value
    .filter((folder: any) =>
      listsStore.isItemInList(props.itemData.id, folder.name, props.itemType),
    )
    .map((folder: any) => folder.name);

  const foldersToAdd = selectedFolders.value.filter(
    (name) => !originalFolders.includes(name),
  );
  const foldersToRemove = originalFolders.filter(
    (name) => !selectedFolders.value.includes(name),
  );

  const promises: Promise<any>[] = [];

  // Gunakan format baru dengan itemId, itemType, langPair
  for (const listName of foldersToAdd) {
    promises.push(
      listsStore.addToList({
        itemId: props.itemData.id,
        itemType: props.itemType || 'unknown',
        langPair: props.itemData.lang_pair || props.itemData.langPair || '',
        listName,
        title: props.itemData.title,
        content: props.itemData.content,
        anchor_sentences: props.itemData.anchor_sentences,
      }),
    );
  }
  for (const listName of foldersToRemove) {
    promises.push(
      listsStore.removeFromList({ itemId: props.itemData.id, listName }),
    );
  }

  await Promise.all(promises);
  closeModal();
};

const openBuatDaftarModal = () => {
  showBuatDaftarModal.value = true;
};

const handleFolderCreated = (folderName: string) => {
  // Otomatis pilih folder yang baru dibuat
  selectedFolders.value.push(folderName);
};
</script>

<template>
  <TransitionRoot appear :show="modelValue" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-50" :initial-focus="cancelButtonRef">
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-[var(--color-scrim)]/50" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-2xl font-bold text-center leading-6 text-[var(--color-on-background)] pb-4">
                Simpan ke Daftar
              </DialogTitle>
              
              <div class="flex flex-col">
                <div class="grid grid-cols-3 gap-3 overflow-y-auto max-h-52 custom-scrollbar">
                  <div v-for="folder in folders" :key="folder.id" class="relative">
                    <label :for="`folder-checkbox-${folder.id}`" class="flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-200 ease-in-out aspect-square min-h-[90px] relative cursor-pointer"
                      :class="[selectedFolders.includes(folder.name) ? 'border-[var(--color-primary)] bg-[var(--color-surface-container-highest)]' : 'border-[var(--color-outline-variant)] hover:border-[var(--color-primary-fixed-dim)] hover:shadow-md']">
                      <span class="text-4xl mb-1 z-20" :class="[selectedFolders.includes(folder.name) ? 'text-[var(--color-on-primary-container)]' : '']">
                        {{ folder.icon }}
                      </span>
                      <span class="font-medium text-center text-xs leading-tight line-clamp-2 z-20"
                        :class="{ 'text-[var(--color-on-background)]': !selectedFolders.includes(folder.name), 'text-[var(--color-primary)]': selectedFolders.includes(folder.name) }">
                        {{ folder.name }}
                      </span>
                      <input type="checkbox" :id="`folder-checkbox-${folder.id}`" :value="folder.name" v-model="selectedFolders" class="absolute opacity-0 pointer-events-none" />
                    </label>
                  </div>
                  
                  <button @click="openBuatDaftarModal" class="flex flex-col items-center justify-center p-2 rounded-xl border-2 border-dashed border-[var(--color-outline-variant)] transition-all duration-200 ease-in-out aspect-square min-h-[90px] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-container-low)]">
                    <span class="material-symbols-outlined text-3xl mb-1 text-[var(--color-outline)]">add</span>
                    <span class="font-medium text-center text-xs leading-tight line-clamp-2 text-[var(--color-on-surface-variant)]">Buat Baru</span>
                  </button>
                </div>
              </div>



              <div class="mt-6 grid grid-cols-2 gap-3">
                <button ref="cancelButtonRef" type="button" class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]" @click="closeModal">
                  Batal
                </button>
                <button type="button" class="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2 font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-fixed-dim)]" @click="handleSaveChanges">
                  Simpan Perubahan
                </button>
              </div>

               <!-- Modal Buat Daftar dipindahkan ke SINI, di DALAM DialogPanel -->
              <BuatDaftar 
                v-model="showBuatDaftarModal"
                @folder-created="handleFolderCreated"
              />

            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<style scoped>
.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
.custom-scrollbar::-webkit-scrollbar { width: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(120, 120, 120, 0.3); border-radius: 10px; }
</style>
