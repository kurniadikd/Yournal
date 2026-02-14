<script setup lang="ts">
/**
 * AdBanner.vue - Komponen untuk menampilkan iklan Google AdSense
 *
 * Penggunaan:
 * <AdBanner ad-slot="1234567890" />
 * <AdBanner ad-slot="1234567890" ad-format="horizontal" />
 */
import { onMounted, ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

const props = defineProps({
  // Ad Unit Slot ID dari AdSense (wajib)
  adSlot: {
    type: String,
    required: true,
  },
  // Format iklan: 'auto', 'horizontal', 'vertical', 'rectangle'
  adFormat: {
    type: String,
    default: 'auto',
  },
  // Responsif penuh
  fullWidthResponsive: {
    type: Boolean,
    default: true,
  },
});

const authStore = useAuthStore();
const adLoaded = ref(false);

// Publisher ID dari environment variable
const AD_CLIENT =
  import.meta.env.VITE_ADSENSE_CLIENT || 'ca-pub-4715321008791142';

// Cek apakah user adalah premium
const isPremium = computed(() => {
  const user = authStore.user;
  if (!user) return false;
  return (
    user.profile?.account_type === 'PREMIUM' ||
    user.profile?.account_status === 'Premium'
  );
});

// Sembunyikan iklan untuk admin dan premium user
const shouldHideAds = computed(() => authStore.isAdmin || isPremium.value);

onMounted(() => {
  // Jangan tampilkan iklan untuk admin atau premium
  if (shouldHideAds.value) {
    return;
  }

  try {
    // Push ad request ke AdSense
    ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    adLoaded.value = true;
  } catch (e) {
    console.warn('AdSense failed to load:', e);
  }
});
</script>

<template>
  <!-- Sembunyikan iklan untuk admin dan premium -->
  <div v-if="!shouldHideAds" class="ad-container">
    <ins class="adsbygoogle"
         style="display: block;"
         :data-ad-client="AD_CLIENT"
         :data-ad-slot="adSlot"
         :data-ad-format="adFormat"
         :data-full-width-responsive="fullWidthResponsive">
    </ins>
  </div>
</template>

<style scoped>
.ad-container {
  width: 100%;
  overflow: hidden;
  text-align: center;
  min-height: 50px;
}

/* Placeholder style saat iklan belum load */
.ad-container:empty::before {
  content: '';
  display: block;
  background: var(--color-surface-container);
  border-radius: 8px;
  min-height: 90px;
}
</style>
