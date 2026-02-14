<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Header from './Header.vue';
import Footer from './Footer.vue';

const router = useRouter();
const content = ref('');
const loading = ref(true);
const error = ref(null);

// Get base URL from environment, strip /api/ suffix to get server base
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const serverBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');

onMounted(async () => {
  try {
    // Use server base URL for static files
    const response = await fetch(
      `${serverBaseUrl}/media/app/cookies/Cookie_Policy.html`,
    );
    if (!response.ok) throw new Error('Failed to load Cookie Policy');
    const html = await response.text();
    // Extract only the body content, removing html/head/style tags
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    content.value = bodyMatch ? bodyMatch[1] : html;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});

const goBack = () => {
  router.back();
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[var(--color-background)]">
    <!-- Header -->
    <Header />

    <!-- Main Content -->
    <main class="flex-grow container mx-auto px-4 py-8 max-w-4xl">
      <!-- Back Button -->
      <button 
        @click="goBack"
        class="mb-6 flex items-center gap-2 text-[var(--color-primary)] hover:text-[var(--color-primary-fixed-dim)] transition-colors"
      >
        <span class="material-symbols-outlined">arrow_back</span>
        <span>{{ $t('back') || 'Kembali' }}</span>
      </button>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-20">
        <span class="material-symbols-outlined text-5xl text-[var(--color-primary)] animate-spin">progress_activity</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-20">
        <span class="material-symbols-outlined text-6xl text-[var(--color-error)] mb-4">error</span>
        <p class="text-[var(--color-on-surface-variant)]">{{ error }}</p>
        <button 
          @click="router.push('/')"
          class="mt-4 px-6 py-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full"
        >
          {{ $t('go_home') || 'Kembali ke Beranda' }}
        </button>
      </div>

      <!-- Cookie Policy Content -->
      <div 
        v-else 
        class="policy-content bg-[var(--color-surface-container)] rounded-2xl p-6 md:p-8 shadow-lg"
        v-html="content"
      ></div>
    </main>

    <!-- Footer -->
    <Footer />
  </div>
</template>

<style scoped>
.policy-content :deep(h1) {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 0.5rem;
}

.policy-content :deep(h2) {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-primary);
  margin-top: 2rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--color-outline-variant);
}

.policy-content :deep(h3) {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-on-background);
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

.policy-content :deep(p) {
  color: var(--color-on-surface-variant);
  line-height: 1.7;
  margin-bottom: 1rem;
}

.policy-content :deep(ul),
.policy-content :deep(ol) {
  padding-left: 1.5rem;
  margin-bottom: 1rem;
  color: var(--color-on-surface-variant);
}

.policy-content :deep(li) {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.policy-content :deep(a) {
  color: var(--color-primary);
  text-decoration: underline;
}

.policy-content :deep(a:hover) {
  color: var(--color-primary-fixed-dim);
}

.policy-content :deep(.highlight) {
  background: var(--color-primary-container);
  padding: 1rem;
  border-left: 4px solid var(--color-primary);
  margin: 1rem 0;
  border-radius: 4px;
}

.policy-content :deep(.highlight p) {
  color: var(--color-on-primary-container);
  margin-bottom: 0.5rem;
}

.policy-content :deep(.toc) {
  background: var(--color-surface-container-high);
  padding: 1.5rem;
  border-radius: 8px;
  margin: 2rem 0;
}

.policy-content :deep(.toc ol) {
  columns: 2;
}

.policy-content :deep(.toc li) {
  margin-bottom: 0.3rem;
  font-size: 0.9rem;
}

.policy-content :deep(.last-updated) {
  color: var(--color-on-surface-variant);
  font-size: 0.9rem;
  margin-bottom: 2rem;
}

/* Override inline styles from HTML */
.policy-content :deep(body) {
  all: unset;
}

.policy-content :deep(style) {
  display: none;
}

@media (max-width: 640px) {
  .policy-content :deep(.toc ol) {
    columns: 1;
  }
}
</style>
