// stores/keyboard.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useStorage, useEventListener } from '@vueuse/core';

export const useKeyboardStore = defineStore('keyboard', () => {
  // --- STATE ---
  // Menggunakan useStorage untuk persistence otomatis
  const position = useStorage<{ x: number; y: number }>('leksika-keyboard-position', { x: 0, y: 0 });
  const width = ref<number | null>(null);
  const isDragging = ref<boolean>(false);

  // State internal untuk proses drag
  const dragStartCoords = ref<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPosition = ref<{ x: number; y: number }>({ x: 0, y: 0 });
  let dragTargetElement: HTMLElement | null = null;

  // Cleanup functions untuk event listeners
  let cleanupMouseMove: (() => void) | null = null;
  let cleanupMouseUp: (() => void) | null = null;
  let cleanupTouchMove: (() => void) | null = null;
  let cleanupTouchEnd: (() => void) | null = null;

  // --- UTILITIES ---
  const getEventCoords = (event: MouseEvent | TouchEvent | any) => {
    return (event as TouchEvent).touches ? (event as TouchEvent).touches[0] : (event as MouseEvent);
  };

  const clampPosition = (x: number, y: number) => {
    if (!dragTargetElement) return { x, y };
    const { innerWidth, innerHeight } = window;
    const { offsetWidth, offsetHeight } = dragTargetElement;
    const minX = 0;
    const maxX = innerWidth - offsetWidth;
    const minY = 0;
    const maxY = innerHeight - offsetHeight;
    return {
      x: Math.max(minX, Math.min(x, maxX)),
      y: Math.max(minY, Math.min(y, maxY)),
    };
  };

  // --- ACTIONS ---
  const handleDragMove = (event: Event) => {
    if (!isDragging.value) return;

    // Mencegah scroll di perangkat mobile
    if (event.cancelable && (event as TouchEvent).touches) {
      event.preventDefault();
    }

    const coords = getEventCoords(event);
    const deltaX = coords.clientX - dragStartCoords.value.x;
    const deltaY = coords.clientY - dragStartCoords.value.y;

    // Langsung perbarui state reaktif, biarkan Vue yang mengurus DOM
    position.value = {
      x: initialPosition.value.x + deltaX,
      y: initialPosition.value.y + deltaY,
    };
  };

  const cleanupDragListeners = () => {
    cleanupMouseMove?.();
    cleanupMouseUp?.();
    cleanupTouchMove?.();
    cleanupTouchEnd?.();
    cleanupMouseMove = null;
    cleanupMouseUp = null;
    cleanupTouchMove = null;
    cleanupTouchEnd = null;
  };

  const handleDragEnd = () => {
    if (!isDragging.value) return;
    isDragging.value = false;

    // Batasi posisi akhir di dalam layar (useStorage otomatis simpan)
    position.value = clampPosition(position.value.x, position.value.y);

    // Hapus transisi dan listener
    if (dragTargetElement) {
      dragTargetElement.style.transition = 'transform 0.3s ease-out';
    }
    cleanupDragListeners();
  };

  const handleDragStart = (event: MouseEvent | TouchEvent, el: HTMLElement | null) => {
    if (!el) return;
    dragTargetElement = el;
    isDragging.value = true;

    // Hapus transisi agar gerakan terasa instan
    dragTargetElement.style.transition = 'none';

    const coords = getEventCoords(event);
    dragStartCoords.value = { x: coords.clientX, y: coords.clientY };
    initialPosition.value = { ...position.value };

    // Tambahkan listener dengan useEventListener untuk auto-cleanup
    cleanupMouseMove = useEventListener(window, 'mousemove', handleDragMove);
    cleanupMouseUp = useEventListener(window, 'mouseup', handleDragEnd);
    cleanupTouchMove = useEventListener(window, 'touchmove', handleDragMove, {
      passive: false,
    });
    cleanupTouchEnd = useEventListener(window, 'touchend', handleDragEnd);
  };

  // loadPosition tidak lagi diperlukan karena useStorage otomatis load
  const loadPosition = () => {
    // useStorage sudah otomatis load dari localStorage
    // Fungsi ini dipertahankan untuk backward compatibility
  };

  const setWidth = (newWidth: number) => {
    if (newWidth > 0) {
      width.value = newWidth;
    }
  };

  return {
    position,
    width,
    isDragging,
    loadPosition,
    setWidth,
    handleDragStart,
  };
});
