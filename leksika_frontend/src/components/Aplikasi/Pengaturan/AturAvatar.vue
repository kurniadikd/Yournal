<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
} from '@headlessui/vue';
import { useEventListener } from '@vueuse/core';

// IMPORT KOMPONEN UserAvatar
import UserAvatar from '@/components/UserAvatar.vue';

const props = defineProps({
  avatarBase64: { type: String, default: null },
  avatarMimeType: { type: String, default: null },
  avatarTransform: { type: Object, default: null },
  userInitials: { type: String, required: true },
  hasExistingAvatar: { type: Boolean, required: true },
  isDirty: { type: Boolean, required: true },
});

const emit = defineEmits(['update:avatar', 'update:avatarFile']);

const fileInput = ref(null);
const showDeleteAvatarModal = ref(false);
const showPreviewModal = ref(false);
const previewImageSrc = ref(null);
const pendingFile = ref(null);

// --- NEW: Pan/Zoom State ---
const imageRef = ref(null);
const containerRef = ref(null);
const scale = ref(1);
const offsetX = ref(0);
const offsetY = ref(0);
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const imageNaturalSize = ref({ width: 0, height: 0 });

// Computed property untuk URL avatar yang sudah di-base64 (Hanya untuk tampilan lokal)
const displayAvatarSrc = computed(() => {
  if (props.avatarBase64 && props.avatarMimeType) {
    return `data:${props.avatarMimeType};base64,${props.avatarBase64}`;
  }
  return null;
});

// Computed transform style for the image
const imageTransformStyle = computed(() => {
  return {
    transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${scale.value})`,
    cursor: isDragging.value ? 'grabbing' : 'grab',
  };
});

// Computed minimum scale that ensures image covers the circle
const minCoverScale = computed(() => {
  if (!imageNaturalSize.value.width || !imageNaturalSize.value.height)
    return 0.1;
  const containerSize = 192;
  const scaleX = containerSize / imageNaturalSize.value.width;
  const scaleY = containerSize / imageNaturalSize.value.height;
  return Math.max(scaleX, scaleY);
});

function triggerAvatarUpload() {
  if (fileInput.value) fileInput.value.click();
}

function handleAvatarChange(event) {
  const file = event.target.files?.[0];
  if (file && file.type.startsWith('image/')) {
    // Store the original file
    pendingFile.value = file;

    // Reset pan/zoom state
    scale.value = 1;
    offsetX.value = 0;
    offsetY.value = 0;

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImageSrc.value = e.target.result;
      showPreviewModal.value = true;
    };
    reader.readAsDataURL(file);
  }
  if (event.target) event.target.value = '';
}

// Handle image load to get natural dimensions
function onImageLoad(event) {
  const img = event.target;
  imageNaturalSize.value = {
    width: img.naturalWidth,
    height: img.naturalHeight,
  };

  // Set initial scale to exactly cover the circle (minimum zoom)
  // This ensures image fills circle at zoom=0
  scale.value = minCoverScale.value;

  // Reset offset
  offsetX.value = 0;
  offsetY.value = 0;
}

// --- Drag Handlers ---
function startDrag(event) {
  event.preventDefault();
  isDragging.value = true;
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  dragStart.value = { x: clientX - offsetX.value, y: clientY - offsetY.value };
}

// Clamp offset to prevent image from moving outside the visible circle
function clampOffset(newOffsetX, newOffsetY) {
  const containerSize = 192; // w-48 h-48
  const scaledWidth = imageNaturalSize.value.width * scale.value;
  const scaledHeight = imageNaturalSize.value.height * scale.value;

  // Calculate max allowed offset (image edge can't go past circle edge)
  const maxOffsetX = Math.max(0, (scaledWidth - containerSize) / 2);
  const maxOffsetY = Math.max(0, (scaledHeight - containerSize) / 2);

  return {
    x: Math.max(-maxOffsetX, Math.min(maxOffsetX, newOffsetX)),
    y: Math.max(-maxOffsetY, Math.min(maxOffsetY, newOffsetY)),
  };
}

function onDrag(event) {
  if (!isDragging.value) return;
  event.preventDefault();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;

  const newOffsetX = clientX - dragStart.value.x;
  const newOffsetY = clientY - dragStart.value.y;

  const clamped = clampOffset(newOffsetX, newOffsetY);
  offsetX.value = clamped.x;
  offsetY.value = clamped.y;
}

function endDrag() {
  isDragging.value = false;
}

// --- Zoom Handler (Wheel) ---
function onWheel(event) {
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.05 : 0.05;
  const newScale = Math.max(
    minCoverScale.value,
    Math.min(3, scale.value + delta),
  );
  scale.value = newScale;

  // Re-clamp offset after zoom change
  const clamped = clampOffset(offsetX.value, offsetY.value);
  offsetX.value = clamped.x;
  offsetY.value = clamped.y;
}

// --- Zoom Slider Handler ---
function onZoomSlider(event) {
  scale.value = Math.max(minCoverScale.value, parseFloat(event.target.value));

  // Re-clamp offset after zoom change
  const clamped = clampOffset(offsetX.value, offsetY.value);
  offsetX.value = clamped.x;
  offsetY.value = clamped.y;
}
// Konfirmasi dan kirim file asli (dengan semua metadata)
// NOTE: Tidak menggunakan canvas, kirim file asli. Backend akan handle cropping.
function confirmAndSaveImage() {
  if (!pendingFile.value) return;

  const file = pendingFile.value;
  const reader = new FileReader();

  reader.onloadend = () => {
    // Ambil data base64 (bagian setelah koma)
    const base64data = reader.result.split(',')[1];
    const mimeType = file.type;

    // Buat transform data untuk display
    const transformData = {
      scale: scale.value,
      offsetX: offsetX.value,
      offsetY: offsetY.value,
    };

    // Emit data base64/mimeType dan File asli (bukan blob dari canvas)
    emit('update:avatar', {
      base64: base64data,
      mimeType: mimeType,
      transform: transformData,
    });
    emit('update:avatarFile', file); // Kirim file asli!
    closePreviewModal();
  };

  reader.readAsDataURL(file);
}

function closePreviewModal() {
  showPreviewModal.value = false;
  previewImageSrc.value = null;
  pendingFile.value = null;
  // Reset pan/zoom
  scale.value = 1;
  offsetX.value = 0;
  offsetY.value = 0;
}

function removeAvatar() {
  showDeleteAvatarModal.value = true;
}

function confirmDeleteAvatar() {
  emit('update:avatar', null);
  emit('update:avatarFile', null);
  showDeleteAvatarModal.value = false;
}

function cancelDeleteAvatar() {
  showDeleteAvatarModal.value = false;
}
// Global mouse/touch event listeners for drag
useEventListener(window, 'mousemove', onDrag);
useEventListener(window, 'mouseup', endDrag);
useEventListener(window, 'touchmove', onDrag, { passive: false });
useEventListener(window, 'touchend', endDrag);

// onUnmounted is handled by useEventListener automatically
</script>

<template>
  <section class="flex flex-row items-center space-x-4">
    <div
      class="relative flex-shrink-0 transition-all duration-300 rounded-full"
      :class="{ 'ring-2 ring-offset-2 ring-[var(--color-primary)] dark:ring-offset-neutral-800': isDirty }"
    >
      <UserAvatar
        :avatar-url="displayAvatarSrc"
        :initials="userInitials"
        :size="96"
        :avatar-transform="props.avatarTransform"
      />
    </div>
    <div class="flex flex-col space-y-2">
      <button @click="triggerAvatarUpload" class="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-xl hover:bg-[var(--color-primary-fixed-dim)] transition-colors font-medium text-sm">
        Ubah Avatar
      </button>
      <button v-if="props.hasExistingAvatar || displayAvatarSrc" @click="removeAvatar" class="px-4 py-2 bg-[var(--color-error)] text-[var(--color-on-error)] rounded-xl hover:bg-[var(--color-error-container)] transition-colors font-medium text-sm">
        Hapus Avatar
      </button>
      <input type="file" ref="fileInput" @change="handleAvatarChange" class="hidden" accept="image/*">
    </div>
  </section>

  <!-- Modal Preview dengan Pan/Zoom -->
  <TransitionRoot :show="showPreviewModal" as="template">
    <Dialog as="div" class="relative z-[60]" @close="closePreviewModal">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/60" @click="closePreviewModal"></div>
      </TransitionChild>
      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="relative bg-[var(--color-surface-container-high)] rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <!-- Content -->
              <div class="relative p-6 flex flex-col">
                <DialogTitle as="h3" class="text-xl font-bold text-[var(--color-on-background)] mb-4 text-center">Upload Foto Profil</DialogTitle>
                
                <!-- Crop Area with Pan/Zoom -->
                <div class="flex flex-col items-center mb-4">
                  <!-- Container for both background and circle -->
                  <div class="relative">
                    <!-- Background Image (behind circle, only visible while dragging) -->
                    <div 
                      class="absolute inset-0 overflow-visible pointer-events-none transition-opacity duration-200"
                      :class="isDragging ? 'opacity-100' : 'opacity-0'"
                      style="z-index: 0;"
                    >
                      <div class="relative w-48 h-48 flex items-center justify-center">
                        <img 
                          v-if="previewImageSrc" 
                          :src="previewImageSrc" 
                          alt="Background" 
                          class="absolute max-w-none select-none opacity-30"
                          :style="imageTransformStyle"
                        >
                      </div>
                    </div>
                    
                    <!-- Circular Crop Container -->
                    <div 
                      ref="containerRef"
                      class="relative w-48 h-48 rounded-full overflow-hidden border-4 border-[var(--color-primary)] bg-transparent shadow-lg"
                      style="z-index: 1;"
                      @wheel="onWheel"
                      @mousedown="startDrag"
                      @touchstart="startDrag"
                    >
                      <img 
                        v-if="previewImageSrc" 
                        ref="imageRef"
                        :src="previewImageSrc" 
                        alt="Preview" 
                        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-none select-none"
                        :style="imageTransformStyle"
                        @load="onImageLoad"
                        draggable="false"
                      >
                    </div>
                  </div>
                  
                  <!-- Zoom Slider -->
                  <div class="flex items-center gap-3 mt-4 w-full max-w-[200px]">
                    <span class="material-symbols-outlined text-[var(--color-on-surface-variant)] text-lg">zoom_out</span>
                    <input 
                      type="range" 
                      :min="minCoverScale" 
                      max="3" 
                      step="0.01" 
                      :value="scale"
                      @input="onZoomSlider"
                      class="flex-1 h-2 bg-[var(--color-surface-container)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                    >
                    <span class="material-symbols-outlined text-[var(--color-on-surface-variant)] text-lg">zoom_in</span>
                  </div>
                </div>
                
                <div class="flex justify-end space-x-3 mt-2">
                  <button @click="closePreviewModal" class="px-4 py-2 text-sm font-medium text-[var(--color-on-surface)] bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] rounded-xl transition-colors">
                    Batal
                  </button>
                  <button @click="confirmAndSaveImage" class="px-4 py-2 text-sm font-medium text-[var(--color-on-primary)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] rounded-xl transition-colors">
                    Gunakan Gambar Ini
                  </button>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>

  <!-- Modal Hapus Avatar -->
  <TransitionRoot :show="showDeleteAvatarModal" as="template">
    <Dialog as="div" class="relative z-[70]" @close="cancelDeleteAvatar">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/60" />
      </TransitionChild>
      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-sm rounded-2xl bg-[var(--color-surface-container-high)] p-6 text-left shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-bold leading-6 text-[var(--color-on-background)]">
                Hapus Foto Profil?
              </DialogTitle>
              <DialogDescription class="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                Apakah Anda yakin ingin menghapus foto profil Anda? Perubahan akan diterapkan setelah Anda menyimpan profil.
              </DialogDescription>
              <div class="mt-4 flex justify-end space-x-3">
                <button type="button" class="inline-flex justify-center rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 text-sm font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] focus:outline-none" @click="cancelDeleteAvatar">
                  Batal
                </button>
                <button type="button" class="inline-flex justify-center rounded-xl border border-transparent bg-[var(--color-error)] px-4 py-2 text-sm font-medium text-[var(--color-on-error)] hover:bg-[var(--color-error-container)] focus:outline-none" @click="confirmDeleteAvatar">
                  Hapus
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<style scoped>
/* Custom range slider styling */
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
</style>
