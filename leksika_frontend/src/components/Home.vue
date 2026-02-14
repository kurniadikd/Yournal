<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, type Ref } from 'vue';
import { useUIStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { useLanguageStore } from '@/stores/language';
import { useIntersectionObserver } from '@vueuse/core';
import { useSEO, getOrganizationSchema } from '@/composables/useSEO';

import { useRouter } from 'vue-router';
import Header from './Header.vue';
import Footer from './Footer.vue';

// import CookieBanner from './CookieBanner.vue';

// SEO Meta Tags
useSEO({
  title: null, // Will use default "Leksika - Platform Pembelajaran Bahasa"
  description: null, // Will use default from locales if requested, otherwise keeps the one from useSEO
  url: 'https://leksika.id/',
  jsonLd: getOrganizationSchema(),
});

const uiStore = useUIStore();
const authStore = useAuthStore();
const languageStore = useLanguageStore();
const router = useRouter();
import { api } from '@/utils/api';

// Computed: User's source language code
const userLang = computed(() => languageStore.selectedAsal?.kodeBahasa || 'id');

const articles = ref<any[]>([]);
const isArticlesLoading = ref(false);

// Scroll animation refs
const heroRef = ref<HTMLElement | null>(null);
const overviewRef = ref<HTMLElement | null>(null);
const blogRef = ref<HTMLElement | null>(null);
const faqRef = ref<HTMLElement | null>(null);
const ctaRef = ref<HTMLElement | null>(null);

// Animation visibility states
const heroVisible = ref(false);
const overviewVisible = ref(false);
const blogVisible = ref(false);
const faqVisible = ref(false);
const ctaVisible = ref(false);
const scrollContainer = ref<HTMLElement | null>(null);

const scrollCarousel = (direction: 'left' | 'right') => {
  if (!scrollContainer.value) return;
  const scrollAmount = 400; // Approx card width + gap
  const targetScroll = scrollContainer.value.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
  scrollContainer.value.scrollTo({
    left: targetScroll,
    behavior: 'smooth'
  });
};

// Intersection Observer for scroll animations

// Helper untuk setup observer sekali jalan (once)
const setupSectionObserver = (targetRef: Ref<HTMLElement | null>, visibleRef: Ref<boolean>) => {
  const { stop } = useIntersectionObserver(
    targetRef,
    ([{ isIntersecting }]) => {
      if (isIntersecting) {
        visibleRef.value = true;
        stop();
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -50px 0px' },
  );
};

onMounted(() => {
  uiStore.toggleSidebar(false);

  // Fetch data from API
  fetchArticles();
  fetchTopFaqs();

  // Start hero animation immediately
  setTimeout(() => {
    heroVisible.value = true;
  }, 100);

  // Setup observers
  setupSectionObserver(overviewRef, overviewVisible);
  setupSectionObserver(blogRef, blogVisible);
  setupSectionObserver(faqRef, faqVisible);
  setupSectionObserver(ctaRef, ctaVisible);
});
// onUnmounted observer disconnect removed (handled by VueUse)

// Featured sections for main features (PRIMARY color - Hero section)
const featuredSections = [
  {
    icon: 'book_3',
    titleKey: 'context_title',
    descriptionKey: 'context_desc',
    tab: 'konteks',
  },
  {
    icon: 'translate',
    titleKey: 'translator_title',
    descriptionKey: 'translator_desc',
    tab: 'penerjemah',
  },
  {
    icon: 'cognition_2',
    titleKey: 'learn_title',
    descriptionKey: 'learn_desc',
    tab: 'pelajari',
  },
];

// Overview/Why Leksika section (SECONDARY color)
const overviewItems = [
  {
    icon: 'neurology',
    titleKey: 'overview_ai_title',
    descriptionKey: 'overview_ai_desc',
  },
  {
    icon: 'menu_book',
    titleKey: 'overview_context_title',
    descriptionKey: 'overview_context_desc',
  },
  {
    icon: 'diversity_3',
    titleKey: 'overview_multilang_title',
    descriptionKey: 'overview_multilang_desc',
  },
  {
    icon: 'speed',
    titleKey: 'overview_fast_title',
    descriptionKey: 'overview_fast_desc',
  },
];

// FAQ section - fetch from API
const faqItems = ref([]);
const isFaqLoading = ref(false);

const fetchTopFaqs = async () => {
  isFaqLoading.value = true;
  try {
    const res = await api.get('/faq/top', { params: { lang: userLang.value } });
    faqItems.value = (res.data || []).map((item) => ({
      ...item,
      isOpen: false,
    }));
  } catch (e) {
    console.error('Failed to fetch top FAQs:', e);
  } finally {
    isFaqLoading.value = false;
  }
};

const toggleFaq = (index) => {
  faqItems.value[index].isOpen = !faqItems.value[index].isOpen;
};

// Blog section (PRIMARY color - same as Hero)
const blogPosts = [
  {
    titleKey: 'blog_post1_title',
    excerptKey: 'blog_post1_excerpt',
    icon: 'lightbulb',
  },
  {
    titleKey: 'blog_post2_title',
    excerptKey: 'blog_post2_excerpt',
    icon: 'psychology',
  },
  {
    titleKey: 'blog_post3_title',
    excerptKey: 'blog_post3_excerpt',
    icon: 'rocket_launch',
  },
];

const handleFeatureClick = (tabName) => {
  uiStore.setActiveTab(tabName);
  router.push('/app');
};

const fetchArticles = async () => {
  isArticlesLoading.value = true;
  try {
    const res = await api.get('/articles', {
      params: { lang: userLang.value },
    });
    // Sort by newest and take top 6
    articles.value = res.data.slice(0, 6);
  } catch (e) {
    console.error('Failed to fetch home articles', e);
  } finally {
    isArticlesLoading.value = false;
  }
};

// Watch for language changes and refetch content
watch(userLang, () => {
  fetchArticles();
  fetchTopFaqs();
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[var(--color-background)]">
    <!-- Header -->
    <Header />

    <!-- Main Content -->
    <main class="flex-grow">
      <!-- Hero Section -->
      <section ref="heroRef"
        class="container mx-auto p-8 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[80vh]">
        <!-- Animated Logo -->
        <img src="/Leksika_icon.svg" alt="Leksika Logo" class="w-32 h-32 mb-8 relative z-10 transition-all duration-700"
          :class="heroVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'" loading="lazy" />

        <!-- Animated Title -->
        <h2
          class="text-5xl font-extrabold mb-4 text-[var(--color-on-background)] relative z-10 transition-all duration-700 delay-100"
          :class="heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'">
          <i18n-t keypath="explore_world" tag="span">
            <template #appName>
              <span class="leksika-gradient">Leksika</span>
            </template>
          </i18n-t>
        </h2>

        <!-- Animated Description -->
        <p class="text-xl text-[var(--color-on-surface-variant)] mb-10 max-w-2xl relative z-10 transition-all duration-700 delay-200"
          :class="heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'">
          {{ $t('explore_desc') }}
        </p>


        <!-- Animated Featured Sections -->
        <div
          class="mt-16 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-8 xl:gap-12 w-full max-w-4xl relative z-10">
          <div v-for="(section, index) in featuredSections" :key="index" @click="handleFeatureClick(section.tab)"
            class="p-6 rounded-3xl bg-[var(--color-primary-container)] flex flex-col items-center transition-all duration-300 hover:scale-105 hover:bg-[var(--color-primary)] cursor-pointer group"
            :class="heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'"
            :style="{ transitionDelay: `${400 + index * 100}ms` }">
            <span
              class="material-symbols-outlined text-5xl text-[var(--color-on-primary-container)] mb-4 group-hover:text-[var(--color-on-primary)] transition-colors">{{
                section.icon }}</span>
            <h3
              class="text-2xl font-semibold mb-2 text-[var(--color-on-primary-container)] group-hover:text-[var(--color-on-primary)] transition-colors">
              {{ $t(section.titleKey) }}</h3>
            <p
              class="text-[var(--color-on-primary-container)]/80 text-center mb-8 group-hover:text-[var(--color-on-primary)]/90 transition-colors">
              {{ $t(section.descriptionKey) }}</p>

            <!-- Flat CTA Button -->
            <div
              class="mt-auto px-6 py-2 rounded-full bg-[var(--color-on-primary-container)]/10 text-[var(--color-on-primary-container)] group-hover:bg-[var(--color-on-primary)]/20 group-hover:text-[var(--color-on-primary)] font-bold flex items-center gap-2 transition-all">
              <span>{{ $t('open') }}</span>
              <span class="material-symbols-outlined text-lg">arrow_forward</span>
            </div>
          </div>
        </div>

        <!-- Scroll indicator -->
        <div class="absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-700 delay-700"
          :class="heroVisible ? 'opacity-100' : 'opacity-0'">
          <span class="material-symbols-outlined text-3xl text-[var(--color-on-surface-variant)] animate-bounce">
            keyboard_arrow_down
          </span>
        </div>
      </section>

      <!-- Overview Section: Why Leksika (SECONDARY theme) -->
      <section ref="overviewRef" class="py-20 bg-[var(--color-surface-container-low)]">
        <div class="container mx-auto px-8">
          <!-- Animated Header -->
          <h2 class="text-4xl font-bold text-center mb-4 text-[var(--color-secondary)] transition-all duration-700"
            :class="overviewVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'">
            {{ $t('overview_title') }}
          </h2>
          <p class="text-lg text-center text-[var(--color-on-surface-variant)] mb-12 max-w-3xl mx-auto transition-all duration-700 delay-100"
            :class="overviewVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'">
            {{ $t('overview_subtitle') }}
          </p>

          <!-- Animated Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div v-for="(item, index) in overviewItems" :key="index"
              class="p-6 rounded-2xl bg-[var(--color-surface-container)] text-center transition-all duration-500 hover:-translate-y-2 border border-[var(--color-secondary)]/20"
              :class="overviewVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'"
              :style="{ transitionDelay: `${200 + index * 100}ms` }">
              <div
                class="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-secondary-container)] flex items-center justify-center">
                <span class="material-symbols-outlined text-3xl text-[var(--color-secondary)]">{{ item.icon }}</span>
              </div>
              <h3 class="text-xl font-semibold mb-2 text-[var(--color-on-surface)]">{{ $t(item.titleKey) }}</h3>
              <p class="text-[var(--color-on-surface-variant)] text-sm">{{ $t(item.descriptionKey) }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Blog Section (PRIMARY theme) -->
      <section ref="blogRef" class="py-20 bg-[var(--color-surface-container)]">
        <div class="container mx-auto px-8">
          <!-- Animated Header -->
          <h2 class="text-4xl font-bold text-center mb-4 text-[var(--color-primary)] transition-all duration-700"
            :class="blogVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'">
            {{ $t('blog_title') }}
          </h2>
          <p class="text-lg text-center text-[var(--color-on-surface-variant)] mb-12 max-w-3xl mx-auto transition-all duration-700 delay-100"
            :class="blogVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'">
            {{ $t('blog_subtitle') }}
          </p>
        </div>

        <!-- Animated Blog Carousel (Full Width) -->
        <div v-if="articles.length > 0" class="w-full relative group/carousel mb-10">

          <!-- Navigation Buttons -->
          <button @click="scrollCarousel('left')"
            class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 w-12 h-12 rounded-full bg-[var(--color-surface)] shadow-lg border border-[var(--color-outline-variant)] text-[var(--color-primary)] flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:scale-110 disabled:opacity-50 hidden md:flex"
            aria-label="Previous articles">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>

          <button @click="scrollCarousel('right')"
            class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 w-12 h-12 rounded-full bg-[var(--color-surface)] shadow-lg border border-[var(--color-outline-variant)] text-[var(--color-primary)] flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:scale-110 disabled:opacity-50 hidden md:flex"
            aria-label="Next articles">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>

          <!-- Carousel Container -->
          <div ref="scrollContainer"
            class="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 pb-12 pt-4">
            <article v-for="(post, index) in articles" :key="post.id"
              class="min-w-[300px] md:min-w-[380px] snap-center rounded-2xl bg-[var(--color-surface-container-high)] overflow-hidden transition-all duration-500 hover:-translate-y-2 cursor-pointer group border border-[var(--color-primary)]/20 shadow-sm hover:shadow-md flex flex-col"
              :class="blogVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'"
              :style="{ transitionDelay: `${200 + index * 100}ms` }" @click="router.push(`/article/${post.slug}`)">
              <div
                class="h-48 relative flex items-center justify-center bg-[var(--color-primary-container)] overflow-hidden shrink-0">
                <img v-if="post.featured_image" :src="post.featured_image"
                  class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <span v-else
                  class="material-symbols-outlined text-6xl text-[var(--color-primary)] transition-transform duration-300 group-hover:scale-110">article</span>
                <div v-if="post.is_pinned"
                  class="absolute top-3 left-3 bg-[var(--color-tertiary)] text-[var(--color-on-tertiary)] px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                  <span class="material-symbols-outlined" style="font-size: 14px !important;">keep</span> {{
                  $t('pinned') }}
                </div>
              </div>
              <div class="p-6 flex flex-col flex-grow">
                <h3
                  class="text-xl font-bold mb-3 text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-2 leading-tight min-h-[3.5rem]">
                  {{ post.title || $t('untitled') }}</h3>
                <p class="text-[var(--color-on-surface-variant)] text-sm line-clamp-3 mb-4 flex-grow">{{ post.excerpt
                  ||
                  $t('no_excerpt') }}</p>

                <div class="flex items-center justify-between mt-auto">
                  <span class="text-xs text-[var(--color-outline)] font-medium">
                    {{ new Date(post.published_at).toLocaleDateString(userLang, {
                      year: 'numeric', month: 'short',
                      day:
                        'numeric'
                    }) }}
                  </span>
                  <span class="inline-flex items-center text-[var(--color-primary)] text-sm font-bold">
                    {{ $t('blog_read_more') || 'Baca' }}
                    <span
                      class="material-symbols-outlined ml-1 text-lg transition-transform duration-300 group-hover:translate-x-1">arrow_forward</span>
                  </span>
                </div>
              </div>
            </article>
          </div>
        </div>

        <div class="container mx-auto px-8">
          <div v-if="!isArticlesLoading && articles.length === 0" class="text-center py-10 text-[var(--color-outline)]">
            <p>{{ $t('no_articles_yet') }}</p>
          </div>

          <div v-if="articles.length > 0" class="mt-10 text-center">
            <button @click="router.push({ path: '/articles', query: { from: 'home' } })"
              class="px-6 py-3 rounded-full border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-bold hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)] transition-all">
              {{ $t('view_more_articles') }}
            </button>
          </div>
        </div>
      </section>

      <!-- FAQ Section (TERTIARY theme) -->
      <section ref="faqRef" class="py-20 bg-[var(--color-surface-container-high)]">
        <div class="container mx-auto px-8">
          <!-- Animated Header -->
          <h2 class="text-4xl font-bold text-center mb-4 text-[var(--color-tertiary)] transition-all duration-700"
            :class="faqVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'">
            {{ $t('faq_title') }}
          </h2>
          <p class="text-lg text-center text-[var(--color-on-surface-variant)] mb-12 max-w-3xl mx-auto transition-all duration-700 delay-100"
            :class="faqVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'">
            {{ $t('faq_subtitle') }}
          </p>

          <!-- Animated FAQ Items -->
          <div v-if="isFaqLoading" class="max-w-3xl mx-auto flex justify-center py-8">
            <span class="material-symbols-outlined text-4xl text-[var(--color-tertiary)] animate-spin">sync</span>
          </div>
          <div v-else-if="faqItems.length === 0" class="max-w-3xl mx-auto text-center py-8">
            <p class="text-[var(--color-on-surface-variant)]">{{ $t('no_faq_yet') }}</p>
          </div>
          <div v-else class="max-w-3xl mx-auto space-y-4">
            <div v-for="(faq, index) in faqItems" :key="faq.id"
              class="rounded-2xl bg-[var(--color-surface-container)] overflow-hidden transition-all duration-500 border border-[var(--color-tertiary)]/30"
              :class="faqVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'"
              :style="{ transitionDelay: `${200 + index * 100}ms` }">
              <button @click="toggleFaq(index)"
                class="w-full p-6 flex items-center justify-between text-left hover:bg-[var(--color-surface-container-highest)] transition-colors">
                <span class="text-lg font-medium text-[var(--color-on-surface)]">{{ faq.question }}</span>
                <span
                  class="material-symbols-outlined text-[var(--color-tertiary)] text-2xl transition-transform duration-300"
                  :class="{ 'rotate-180': faq.isOpen }">expand_more</span>
              </button>
              <div class="overflow-hidden transition-all duration-300"
                :style="{ maxHeight: faq.isOpen ? '500px' : '0' }">
                <p class="p-6 pt-0 text-[var(--color-on-surface-variant)]">{{ faq.answer }}</p>
              </div>
            </div>
          </div>

          <!-- View Full FAQ Button -->
          <div class="mt-10 text-center transition-all duration-700 delay-300"
            :class="faqVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'">
            <button @click="router.push('/faq')"
              class="px-6 py-3 rounded-full border-2 border-[var(--color-tertiary)] text-[var(--color-tertiary)] font-bold hover:bg-[var(--color-tertiary)] hover:text-[var(--color-on-tertiary)] transition-all">
              {{ $t('view_full_faq') }}
            </button>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section ref="ctaRef" class="py-20 bg-[var(--color-primary-container)] overflow-hidden relative">
        <!-- Animated background circles -->
        <div
          class="absolute top-0 left-0 w-64 h-64 bg-[var(--color-on-primary-container)]/5 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-1000"
          :class="ctaVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'"></div>
        <div
          class="absolute bottom-0 right-0 w-96 h-96 bg-[var(--color-on-primary-container)]/5 rounded-full translate-x-1/2 translate-y-1/2 transition-all duration-1000 delay-200"
          :class="ctaVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'"></div>

        <!-- Duotone Logo Decoration -->
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1018.2 1201" fill="currentColor"
          class="absolute right-8 top-1/2 -translate-y-1/2 w-48 h-48 text-[var(--color-on-primary-container)] opacity-20 pointer-events-none transition-all duration-1000 delay-300"
          :class="ctaVisible ? 'opacity-20 scale-100' : 'opacity-0 scale-75'">
          <path
            d="M1149,619.7q0,247.5,0,495.2c-.2,85.4-39.6,125.4-124.4,125.4q-384.9.5-769.8,0c-82.9-.1-123.8-40.1-123.9-121.7-.1-249.7.5-499.4.1-749.1-.1-50.2,16.5-89.5,63.2-112.2,8-4,18.2-11.2,26.9-3.4,7.1,6.4,1.6,15.6-.9,23.4-11.9,37.6-12.6,76.2-12.5,115.2q.6,343.3.5,686.6c.1,68.7,14.9,83.8,82.2,83.8H989.5c67.4,0,81.9-15,82.1-83.8.1-30.5,0-61,0-91.5-.1-55.1-.1-55.2-53.3-55.2q-235,0-470.2,0c-70.7-.1-84.3-13.9-84.3-85.7q.1-362.1.5-724.1c.1-68.5,14.5-82.9,82.9-83q262.2-.1,524.4.1c60,.1,76.7,16.7,76.8,76.5q.4,251.7.1,503.5Z"
            transform="translate(-130.9 -39.5)" />
        </svg>

        <div class="container mx-auto px-8 text-center relative z-10">
          <h2 class="text-4xl font-bold mb-4 text-[var(--color-on-primary-container)] transition-all duration-700"
            :class="ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'">
            {{ $t('cta_title') }}
          </h2>
          <p class="text-lg text-[var(--color-on-primary-container)] mb-8 max-w-2xl mx-auto transition-all duration-700 delay-100"
            :class="ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'">
            {{ $t('cta_subtitle') }}
          </p>
          <button @click="authStore.isLoggedIn ? router.push('/app') : router.push('/login')"
            class="px-8 py-4 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-bold text-lg transition-all duration-500 delay-200 hover:scale-105"
            :class="ctaVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-90'">
            {{ $t('cta_button') }}
          </button>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <Footer />
    <!-- <CookieBanner /> -->
  </div>
</template>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Smooth bounce animation for scroll indicator */
@keyframes bounce {

  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateY(0);
  }

  40% {
    transform: translateY(-10px);
  }

  60% {
    transform: translateY(-5px);
  }
}

.animate-bounce {
  animation: bounce 2s infinite;
}

/* Animated pink gradient for Leksika text */
.leksika-gradient {
  background: linear-gradient(90deg,
      var(--color-leksika-gradient-1) 0%,
      var(--color-leksika-gradient-2) 25%,
      var(--color-leksika-gradient-3) 50%,
      var(--color-leksika-gradient-2) 75%,
      var(--color-leksika-gradient-1) 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-shift 3s ease-in-out infinite;
}

@keyframes gradient-shift {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}
</style>
