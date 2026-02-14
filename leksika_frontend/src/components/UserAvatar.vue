<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';

const props = defineProps({
  avatarUrl: {
    type: String,
    default: null,
  },
  initials: {
    type: String,
    default: '',
  },
  size: {
    type: Number,
    default: 96,
  },
  avatarTransform: {
    type: Object as () => { scale?: number; offsetX?: number; offsetY?: number } | null,
    default: null,
  },
});

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

// Computed property to determine the display avatar source
const displayAvatarSrc = computed(() => {
  // 1. KASUS 1: Mode Tabel (User punya foto)
  // Jika ada URL dari props, gunakan itu.
  if (props.avatarUrl && props.avatarUrl.trim() !== '') {
    return props.avatarUrl.split('#')[0];
  }

  // 2. [PERBAIKAN UTAMA] KASUS 2: Mode Tabel (User tidak punya foto)
  // Jika 'avatarUrl' kosong TAPI 'initials' ada, itu berarti kita sedang me-render
  // baris tabel pengguna lain yang tidak punya foto.
  // Kita harus me-return NULL agar template beralih ke tampilan teks (inisial).
  // JANGAN lanjut ke langkah 3 (fallback admin).
  if (props.initials && props.initials.trim() !== '') {
    return null;
  }

  // 3. KASUS 3: Mode Header/Sidebar (Komponen dipanggil tanpa props)
  // Fallback ke data pengguna yang sedang login (Admin/Diri Sendiri).
  if (
    user.value?.profile?.avatar_base64 &&
    user.value?.profile?.avatar_mimetype
  ) {
    const existingAvatarBase64 = user.value.profile.avatar_base64;
    const base64Data = existingAvatarBase64.split('#')[0];
    return `data:${user.value.profile.avatar_mimetype};base64,${base64Data}`;
  }

  return null;
});

// Computed property to get transform from props or user profile
const displayTransform = computed(() => {
  // Priority 1: Use props (explicitly passed transform)
  if (props.avatarTransform) return props.avatarTransform;

  // If in table mode (avatarUrl or initials provided), DON'T fallback to logged-in user's profile
  // This prevents other users' avatars from using admin's transform
  if (props.avatarUrl || props.initials) {
    return null;
  }

  // Header/Sidebar mode: use logged-in user's profile transform
  if (user.value?.profile?.avatar_transform)
    return user.value.profile.avatar_transform;
  return null;
});

// Computed style for TRANSFORMED avatars (custom pan/zoom)
const transformedStyle = computed(() => {
  const transform = displayTransform.value;
  if (!transform || !transform.scale) return null;

  const PREVIEW_CONTAINER_SIZE = 192;
  const sizeRatio = props.size / PREVIEW_CONTAINER_SIZE;

  const scale = (transform.scale || 1) * sizeRatio;
  const offsetX = (transform.offsetX || 0) * sizeRatio;
  const offsetY = (transform.offsetY || 0) * sizeRatio;

  return {
    transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
  };
});

// Check if this is a transformed avatar
const isTransformed = computed(() => {
  const transform = displayTransform.value;
  return transform && transform.scale;
});

// Computed class for image - completely different classes for legacy vs transformed
const imageClass = computed(() => {
  if (displayTransform.value) {
    // Transformed avatar: position for custom pan/zoom
    return 'absolute top-1/2 left-1/2 max-w-none pointer-events-none select-none';
  }
  // Legacy avatar: fill container with object-cover
  return 'absolute inset-0 w-full h-full object-cover pointer-events-none select-none';
});

// Computed property to determine the display initials
const displayInitials = computed(() => {
  // 1. Prioritas 1: Gunakan inisial dari props (untuk tabel)
  if (props.initials && props.initials.trim() !== '') {
    return props.initials;
  }

  // 2. Prioritas 2: Fallback ke inisial user login (untuk header/sidebar)
  if (!user.value) return '??';
  const firstName = user.value.first_name || '';
  const lastName = user.value.last_name || '';

  // Safety check jika nama admin kosong
  if (!firstName && !lastName) {
    return user.value.username?.charAt(0)?.toUpperCase() || '??';
  }

  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
});
</script>

<template>
  <div
    class="relative flex-shrink-0 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] flex items-center justify-center font-bold overflow-hidden"
    :style="{ width: `${props.size}px`, height: `${props.size}px` }"
  >
    <!-- TRANSFORMED: Avatar with custom pan/zoom (has transform data) -->
    <img
      v-if="displayAvatarSrc && isTransformed"
      :src="displayAvatarSrc"
      alt="Avatar"
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-none pointer-events-none select-none"
      :style="transformedStyle"
    >
    <!-- LEGACY: Avatar without transform data (object-cover fill) -->
    <img
      v-else-if="displayAvatarSrc"
      :src="displayAvatarSrc"
      alt="Avatar"
      class="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
    >
    <!-- FALLBACK: No avatar, show initials -->
    <span
      v-else
      class="font-lexend-custom select-none"
      :style="{ fontSize: `${props.size * 0.4}px` }"
    >
      {{ displayInitials }}
    </span>
  </div> 
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@500&display=swap');

.font-lexend-custom {
  font-family: 'Lexend', sans-serif;
}
</style>
