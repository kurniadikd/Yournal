<script setup lang="ts">
import { ref, onMounted, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { useIntersectionObserver } from '@vueuse/core';
import { useUIStore } from '@/stores/ui';
import { useSEO } from '@/composables/useSEO';
import Header from './Header.vue';
import Footer from './Footer.vue';
import DeveloperAvatar from './DeveloperAvatar.vue';

// SEO Meta Tags
useSEO({
  title: 'Tentang Kami',
  description:
    'Pelajari tentang Leksika, platform pembelajaran bahasa yang membantu Anda mempelajari kosakata dan tata bahasa dengan metode yang efektif.',
  url: 'https://leksika.id/about',
});

const router = useRouter();
const uiStore = useUIStore();

// Animation visibility states
const heroVisible = ref(false);
const missionVisible = ref(false);
const valuesVisible = ref(false);
const ctaVisible = ref(false);

// Refs for intersection observer
const heroRef = ref<HTMLElement | null>(null);
const missionRef = ref<HTMLElement | null>(null);
const valuesRef = ref<HTMLElement | null>(null);
const ctaRef = ref<HTMLElement | null>(null);

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

  // Start hero animation immediately
  setTimeout(() => {
    heroVisible.value = true;
  }, 100);

  setupSectionObserver(missionRef, missionVisible);
  setupSectionObserver(valuesRef, valuesVisible);
  setupSectionObserver(ctaRef, ctaVisible);
});
// onUnmounted removed

// Core values
const coreValues = [
  {
    icon: 'lightbulb',
    titleKey: 'about_value1_title',
    descKey: 'about_value1_desc',
  },
  {
    icon: 'groups',
    titleKey: 'about_value2_title',
    descKey: 'about_value2_desc',
  },
  {
    icon: 'trending_up',
    titleKey: 'about_value3_title',
    descKey: 'about_value3_desc',
  },
  {
    icon: 'favorite',
    titleKey: 'about_value4_title',
    descKey: 'about_value4_desc',
  },
];

const goBack = () => {
  router.push('/');
};

const goToApp = () => {
  router.push('/app');
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[var(--color-background)]">
    <!-- Header -->
    <Header />

    <!-- Main Content -->
    <main class="flex-grow">
      <!-- Hero Section -->
      <section 
        ref="heroRef"
        class="container mx-auto px-8 py-20 flex flex-col items-center justify-center text-center relative overflow-hidden"
      >
        <!-- Decorative background elements -->
        <div 
          class="absolute top-20 left-10 w-72 h-72 bg-[var(--color-primary)]/5 rounded-full blur-3xl transition-all duration-1000"
          :class="heroVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'"
        ></div>
        <div 
          class="absolute bottom-10 right-10 w-96 h-96 bg-[var(--color-secondary)]/5 rounded-full blur-3xl transition-all duration-1000 delay-200"
          :class="heroVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'"
        ></div>

        <!-- Icon -->
        <div 
          class="w-24 h-24 mb-8 rounded-full bg-[var(--color-primary-container)] flex items-center justify-center transition-all duration-700 relative z-10"
          :class="heroVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 1018.2 1201" 
            fill="currentColor"
            class="w-14 h-14 text-[var(--color-on-primary-container)]"
          >
            <path d="M1149,619.7q0,247.5,0,495.2c-.2,85.4-39.6,125.4-124.4,125.4q-384.9.5-769.8,0c-82.9-.1-123.8-40.1-123.9-121.7-.1-249.7.5-499.4.1-749.1-.1-50.2,16.5-89.5,63.2-112.2,8-4,18.2-11.2,26.9-3.4,7.1,6.4,1.6,15.6-.9,23.4-11.9,37.6-12.6,76.2-12.5,115.2q.6,343.3.5,686.6c.1,68.7,14.9,83.8,82.2,83.8H989.5c67.4,0,81.9-15,82.1-83.8.1-30.5,0-61,0-91.5-.1-55.1-.1-55.2-53.3-55.2q-235,0-470.2,0c-70.7-.1-84.3-13.9-84.3-85.7q.1-362.1.5-724.1c.1-68.5,14.5-82.9,82.9-83q262.2-.1,524.4.1c60,.1,76.7,16.7,76.8,76.5q.4,251.7.1,503.5Z" transform="translate(-130.9 -39.5)"/>
          </svg>
        </div>
        
        <!-- Title -->
        <h1 
          class="text-5xl md:text-6xl font-extrabold mb-6 text-[var(--color-on-background)] relative z-10 transition-all duration-700 delay-100"
          :class="heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          {{ $t('about_hero_title') }}
        </h1>
        
        <!-- Subtitle -->
        <p 
          class="text-xl text-[var(--color-on-surface-variant)] mb-8 max-w-3xl relative z-10 transition-all duration-700 delay-200"
          :class="heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          {{ $t('about_hero_subtitle') }}
        </p>

      </section>

      <!-- Mission Section -->
      <section 
        ref="missionRef"
        class="py-20 bg-[var(--color-surface-container-low)]"
      >
        <div class="container mx-auto px-8">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <!-- Mission Text -->
            <div 
              class="transition-all duration-700"
              :class="missionVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'"
            >
              <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] text-sm font-medium mb-6">
                <span class="material-symbols-outlined text-lg">target</span>
                {{ $t('about_mission_label') }}
              </span>
              <h2 class="text-4xl font-bold mb-6 text-[var(--color-on-background)]">
                {{ $t('about_mission_title') }}
              </h2>
              <p class="text-lg text-[var(--color-on-surface-variant)] leading-relaxed mb-6">
                {{ $t('about_mission_text1') }}
              </p>
              <p class="text-lg text-[var(--color-on-surface-variant)] leading-relaxed">
                {{ $t('about_mission_text2') }}
              </p>
            </div>

            <!-- Vision Card -->
            <div 
              class="rounded-3xl bg-[var(--color-primary-container)] p-8 transition-all duration-700 delay-200"
              :class="missionVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'"
            >
              <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-[var(--color-on-primary-container)] text-sm font-medium mb-6">
                <span class="material-symbols-outlined text-lg">visibility</span>
                {{ $t('about_vision_label') }}
              </span>
              <h3 class="text-2xl font-bold mb-4 text-[var(--color-on-primary-container)]">
                {{ $t('about_vision_title') }}
              </h3>
              <p class="text-[var(--color-on-primary-container)]/80 leading-relaxed">
                {{ $t('about_vision_text') }}
              </p>
            </div>
          </div>
        </div>
      </section>



      <!-- Values Section -->
      <section 
        ref="valuesRef"
        class="py-20 bg-[var(--color-surface-container-low)]"
      >
        <div class="container mx-auto px-8">
          <h2 
            class="text-4xl font-bold text-center mb-4 text-[var(--color-on-background)] transition-all duration-700"
            :class="valuesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
          >
            {{ $t('about_values_title') }}
          </h2>
          <p 
            class="text-lg text-center text-[var(--color-on-surface-variant)] mb-12 max-w-2xl mx-auto transition-all duration-700 delay-100"
            :class="valuesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
          >
            {{ $t('about_values_subtitle') }}
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div
              v-for="(value, index) in coreValues"
              :key="index"
              class="p-6 rounded-2xl bg-[var(--color-surface-container)] text-center hover:-translate-y-2 transition-all duration-500 group"
              :class="valuesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'"
              :style="{ transitionDelay: `${200 + index * 100}ms` }"
            >
              <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-primary-container)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-3xl text-[var(--color-on-primary-container)]">{{ value.icon }}</span>
              </div>
              <h3 class="text-lg font-semibold mb-2 text-[var(--color-on-background)]">{{ $t(value.titleKey) }}</h3>
              <p class="text-sm text-[var(--color-on-surface-variant)]">{{ $t(value.descKey) }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Developer Section -->
      <section class="py-16 bg-[var(--color-secondary-container)]">
        <div class="container mx-auto px-8 text-center">
          <div 
            class="developer-avatar mx-auto mb-6 w-32 h-32 rounded-full overflow-hidden transition-all duration-500 hover:scale-105"
            :class="valuesVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'"
          >
            <DeveloperAvatar />
          </div>
          <h3 
            class="text-xl font-semibold text-[var(--color-on-secondary-container)] mb-2 transition-all duration-700"
            :class="valuesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
          >
            {{ $t('about_developer_name') || 'Kurniadi' }}
          </h3>
          <p 
            class="text-[var(--color-on-secondary-container)] transition-all duration-700 delay-100"
            :class="valuesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
          >
            {{ $t('about_developer_role') || 'Creator & Developer' }}
          </p>
          <p 
            class="mt-6 text-lg text-[var(--color-on-secondary-container)] max-w-3xl mx-auto italic leading-relaxed transition-all duration-700 delay-200"
            :class="valuesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
          >
            {{ $t('about_developer_message') }}
          </p>
        </div>
      </section>

      <!-- CTA Section -->
      <section 
        ref="ctaRef"
        class="py-20 bg-[var(--color-primary-container)] overflow-hidden relative"
      >
        <!-- Decorative background -->
        <div 
          class="absolute top-0 left-0 w-64 h-64 bg-[var(--color-on-primary-container)]/5 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-1000"
          :class="ctaVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'"
        ></div>
        <div 
          class="absolute bottom-0 right-0 w-96 h-96 bg-[var(--color-on-primary-container)]/5 rounded-full translate-x-1/2 translate-y-1/2 transition-all duration-1000 delay-200"
          :class="ctaVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'"
        ></div>

        <div class="container mx-auto px-8 text-center relative z-10">
          <h2 
            class="text-4xl font-bold mb-4 text-[var(--color-on-primary-container)] transition-all duration-700"
            :class="ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
          >
            {{ $t('about_cta_title') }}
          </h2>
          <p 
            class="text-lg text-[var(--color-on-primary-container)]/80 mb-8 max-w-2xl mx-auto transition-all duration-700 delay-100"
            :class="ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
          >
            {{ $t('about_cta_subtitle') }}
          </p>
          <div 
            class="flex flex-wrap justify-center gap-4 transition-all duration-700 delay-200"
            :class="ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
          >
            <button
              @click="goToApp"
              class="px-8 py-4 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-bold text-lg hover:scale-105 transition-all duration-300"
            >
              {{ $t('about_cta_button_primary') }}
            </button>
            <button
              @click="goBack"
              class="px-8 py-4 rounded-full bg-white/20 text-[var(--color-on-primary-container)] font-bold text-lg hover:bg-white/30 hover:scale-105 transition-all duration-300"
            >
              {{ $t('about_cta_button_secondary') }}
            </button>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <Footer />


  </div>
</template>

<style scoped>
/* Smooth animations */

/* Developer avatar color adaptation */
.developer-avatar {
  background-color: var(--color-secondary);
  position: relative;
}
</style>
