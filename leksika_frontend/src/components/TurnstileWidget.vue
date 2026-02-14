<script setup lang="ts">
/**
 * TurnstileWidget.vue
 * Menampilkan widget Cloudflare Turnstile ASLI yang terlihat.
 * Widget ini terhubung langsung ke session.js untuk validasi.
 *
 * [DEV BYPASS] Di mode development (import.meta.env.DEV), VueTurnstile
 * TIDAK akan diimport sama sekali, sehingga script Cloudflare tidak dimuat.
 */
import { ref, watch, onMounted, defineAsyncComponent, markRaw } from 'vue';
import { useSession } from '@/utils/session';

// [DEV BYPASS] Check if running in development mode
const isDev = import.meta.env.DEV;

// [DEV BYPASS] Only load VueTurnstile component in production
// Using defineAsyncComponent to prevent ANY loading of the script in dev
const VueTurnstile = isDev
  ? null
  : markRaw(defineAsyncComponent(() => import('vue-turnstile')));

// Props untuk customisasi
const props = defineProps({
  // Theme: 'light', 'dark', atau 'auto'
  theme: {
    type: String as () => 'auto' | 'light' | 'dark',
    default: 'auto',
  },
  // Size: 'normal' atau 'compact'
  size: {
    type: String as () => 'normal' | 'compact',
    default: 'normal',
  },
});

// Site Key dari environment
const siteKey = ref(import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY);

// Widget ref untuk reset
const widgetRef = ref<any>(null); // Type as any because vue-turnstile types might be missing

// Token state
const token = ref('');

// Session
const { validateSessionWithTurnstile, bypassValidationForDev } = useSession();

// [DEV BYPASS] Auto-bypass in development mode
onMounted(() => {
  if (isDev) {
    console.log('[DEV] Turnstile widget bypassed - auto-validating session.');
    bypassValidationForDev();
  }
});

// Ketika token didapat, kirim ke session untuk validasi
watch(token, (newToken) => {
  if (newToken && !isDev) {
    validateSessionWithTurnstile(newToken);
  }
});

// Handler untuk reset
const onExpire = () => {
  token.value = '';
  if (widgetRef.value) {
    widgetRef.value.reset();
  }
};

const onError = () => {
  token.value = '';
  setTimeout(() => {
    if (widgetRef.value) {
      widgetRef.value.reset();
    }
  }, 3000);
};

// Expose reset untuk parent
const reset = () => {
  if (widgetRef.value) {
    token.value = '';
    widgetRef.value.reset();
  }
};

defineExpose({ reset });
</script>

<template>
  <div class="turnstile-widget">
    <!-- [DEV BYPASS] Show dev badge instead of actual widget -->
    <div v-if="isDev" class="dev-bypass-badge">
      <span class="material-symbols-outlined icon">logo_dev</span>
      <span class="text">Dev Mode</span>
    </div>
    
    <!-- Widget Turnstile ASLI dari Cloudflare (Production only) -->
    <component
      v-else-if="VueTurnstile"
      :is="VueTurnstile"
      ref="widgetRef"
      :site-key="siteKey"
      v-model="token"
      :theme="theme"
      :size="size"
      appearance="always"
      @expired="onExpire"
      @error="onError"
    />
  </div>
</template>

<style scoped>
.turnstile-widget {
  display: inline-flex;
  justify-content: center;
}

/* Dev bypass badge styling */
.dev-bypass-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: transparent;
  border: 1.5px solid var(--color-primary);
  border-radius: 12px;
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.dev-bypass-badge .icon {
  font-size: 20px;
}
</style>
