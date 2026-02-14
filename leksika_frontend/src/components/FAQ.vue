<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import Header from './Header.vue';
import Footer from './Footer.vue';
import { useUIStore } from '@/stores/ui';
import { useLanguageStore } from '@/stores/language';
import { api } from '@/utils/api';
import LoadingSpinner from './LoadingSpinner.vue';
import { useSEO, getFAQSchema } from '@/composables/useSEO';

const uiStore = useUIStore();
const languageStore = useLanguageStore();

// State
const faqs = ref<any[]>([]);
const isLoading = ref(false);
const error = ref(null);

// Current language
const currentLang = computed(
  () => languageStore.selectedAsal?.kodeBahasa || 'id',
);

// Fetch FAQs from API
const fetchFaqs = async () => {
  isLoading.value = true;
  try {
    const res = await api.get(`/faq?lang=${currentLang.value}`);
    faqs.value = (res.data || []).map((faq) => ({
      ...faq,
      isOpen: false,
    }));
    // Update SEO with FAQ schema after data loads
    updateSEO();
  } catch (err) {
    console.error('Failed to fetch FAQs:', err);
    error.value = 'Gagal memuat FAQ';
  } finally {
    isLoading.value = false;
  }
};

// SEO Meta Tags
const updateSEO = () => {
  const faqSchema =
    faqs.value.length > 0 ? getFAQSchema(faqs.value) : undefined;
  useSEO({
    title: 'FAQ',
    description:
      'Temukan jawaban untuk pertanyaan yang sering diajukan tentang Leksika, platform pembelajaran bahasa.',
    url: 'https://leksika.id/faq',
    jsonLd: faqSchema,
  });
};

// Initial call (will be updated after data loads)
useSEO({
  title: 'FAQ',
  description:
    'Temukan jawaban untuk pertanyaan yang sering diajukan tentang Leksika, platform pembelajaran bahasa.',
  url: 'https://leksika.id/faq',
});

onMounted(() => {
  fetchFaqs();
});

const toggleFaq = (index) => {
  faqs.value[index].isOpen = !faqs.value[index].isOpen;
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[var(--color-background)]">
    <Header />

    <main class="flex-grow py-20">
      <div class="container mx-auto px-8">
        <div class="text-center mb-16">
          <h1 class="text-4xl font-bold mb-4 text-[var(--color-primary)]">
            {{ $t('faq_title') }}
          </h1>
          <p class="text-xl text-[var(--color-on-surface-variant)] max-w-2xl mx-auto">
            {{ $t('faq_subtitle') }}
          </p>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="flex justify-center py-12">
          <LoadingSpinner size="xl" />
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="max-w-3xl mx-auto text-center py-12">
          <span class="material-symbols-outlined text-6xl text-[var(--color-error)] mb-4">error</span>
          <p class="text-[var(--color-on-surface-variant)]">{{ error }}</p>
          <button @click="fetchFaqs" class="mt-4 px-6 py-2 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-semibold">
            Coba Lagi
          </button>
        </div>

        <!-- Empty State -->
        <div v-else-if="faqs.length === 0" class="max-w-3xl mx-auto text-center py-12">
          <span class="material-symbols-outlined text-6xl text-[var(--color-outline-variant)] mb-4">quiz</span>
          <p class="text-[var(--color-on-surface-variant)]">Belum ada FAQ tersedia.</p>
        </div>

        <!-- FAQ List -->
        <div v-else class="max-w-3xl mx-auto space-y-4">
          <div
            v-for="(faq, index) in faqs"
            :key="faq.id"
            class="rounded-2xl bg-[var(--color-surface-container)] overflow-hidden transition-all duration-300 border border-[var(--color-outline-variant)] hover:border-[var(--color-primary)] hover:shadow-md"
          >
            <button
              @click="toggleFaq(index)"
              class="w-full p-6 flex items-center justify-between text-left hover:bg-[var(--color-surface-container-highest)] transition-colors"
            >
              <span class="text-lg font-medium text-[var(--color-on-surface)]">
                {{ faq.question }}
              </span>
              <span 
                class="material-symbols-outlined text-[var(--color-primary)] text-2xl transition-transform duration-300"
                :class="{ 'rotate-180': faq.isOpen }"
              >
                expand_more
              </span>
            </button>
            <div
              class="overflow-hidden transition-all duration-300"
              :style="{ maxHeight: faq.isOpen ? '500px' : '0' }"
            >
              <p class="p-6 pt-0 text-[var(--color-on-surface-variant)] leading-relaxed">
                {{ faq.answer }}
              </p>
            </div>
          </div>
        </div>

        <div class="mt-16 text-center">
          <p class="text-[var(--color-on-surface-variant)] mb-4">
            {{ $t('faq_not_found_msg', 'Tidak menemukan jawaban yang Anda cari?') }}
          </p>
          <a
            href="mailto:support@leksika.id" 
            class="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] font-semibold hover:bg-[var(--color-secondary)] hover:text-[var(--color-on-secondary)] transition-all duration-300"
          >
            {{ $t('contact_support', 'Hubungi Dukungan') }}
          </a>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <Footer />
  </div>
</template>
