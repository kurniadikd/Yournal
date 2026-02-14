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
        <span>Back</span>
      </button>

      <!-- Attribution Content (Comprehensive English) -->
      <div class="bg-[var(--color-surface-container)] rounded-xl p-8 shadow-sm text-[var(--color-on-surface)] font-mono text-sm leading-relaxed">
        
        <p class="mb-6 font-bold">Attribution & Third Party Notices</p>
        
        <p class="mb-8">
          Leksika is built using the following open-source software and assets. 
          We are deeply grateful to the community for their contributions.
        </p>

        <div class="space-y-8">
          <!-- Assets -->
          <div>
            <strong class="block mb-2 text-[var(--color-primary)] uppercase tracking-wider">Visual Assets & Data</strong>
            <ul class="list-disc pl-4 space-y-1">
              <li v-for="item in assets" :key="item.name">
                {{ item.name }} - {{ item.description }} ({{ item.license }}) 
                <a :href="item.url" target="_blank" rel="noopener noreferrer" class="ml-2 text-[var(--color-primary)] hover:underline opacity-60">[{{ item.url }}]</a>
              </li>
            </ul>
          </div>

          <!-- Frontend Core -->
          <div>
            <strong class="block mb-2 text-[var(--color-primary)] uppercase tracking-wider">Frontend Core</strong>
            <ul class="list-disc pl-4 space-y-1">
              <li v-for="item in frontendCore" :key="item.name">
                {{ item.name }} - {{ item.description }} ({{ item.license }})
                <a :href="item.url" target="_blank" rel="noopener noreferrer" class="ml-2 text-[var(--color-primary)] hover:underline opacity-60">[{{ item.url }}]</a>
              </li>
            </ul>
          </div>

          <!-- Frontend Libraries -->
          <div>
            <strong class="block mb-2 text-[var(--color-primary)] uppercase tracking-wider">Frontend Libraries</strong>
            <ul class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 list-disc pl-4">
              <li v-for="item in frontendLibs" :key="item.name">
                {{ item.name }} ({{ item.license }})
                <a :href="item.url" target="_blank" rel="noopener noreferrer" class="ml-2 text-[var(--color-primary)] hover:underline opacity-60">[{{ item.url }}]</a>
              </li>
            </ul>
          </div>

          <!-- Backend Core -->
          <div>
            <strong class="block mb-2 text-[var(--color-primary)] uppercase tracking-wider">Backend Core</strong>
            <ul class="list-disc pl-4 space-y-1">
              <li v-for="item in backendCore" :key="item.name">
                {{ item.name }} - {{ item.description }} ({{ item.license }})
                <a :href="item.url" target="_blank" rel="noopener noreferrer" class="ml-2 text-[var(--color-primary)] hover:underline opacity-60">[{{ item.url }}]</a>
              </li>
            </ul>
          </div>

          <!-- Backend Libraries -->
          <div>
            <strong class="block mb-2 text-[var(--color-primary)] uppercase tracking-wider">Backend Libraries</strong>
            <ul class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 list-disc pl-4">
              <li v-for="item in backendLibs" :key="item.name">
                {{ item.name }} ({{ item.license }})
                <a :href="item.url" target="_blank" rel="noopener noreferrer" class="ml-2 text-[var(--color-primary)] hover:underline opacity-60">[{{ item.url }}]</a>
              </li>
            </ul>
          </div>
        </div>
          
        <div class="mt-12 pt-6 border-t border-[var(--color-outline-variant)] text-xs text-[var(--color-on-surface-variant)] leading-normal">
           *All trademarks and copyrights belong to their respective owners. Leksika is not affiliated with these projects other than being a user of their technology.*
        </div>
      </div>
    </main>

    <!-- Footer -->
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import Header from './Header.vue';
import Footer from './Footer.vue';

const router = useRouter();

const goBack = () => {
  router.back();
};

const assets = [
  {
    name: 'Wiktionary',
    description: 'Factual language data reference (lemmas & morphology only)',
    license: 'Public Domain Facts',
    url: 'https://www.wiktionary.org/',
  },
  {
    name: 'Material Symbols',
    description: 'Icon system',
    license: 'Apache 2.0',
    url: 'https://fonts.google.com/icons',
  },
  {
    name: 'Noto Color Emoji',
    description: 'Emoji font pack',
    license: 'OFL',
    url: 'https://fonts.google.com/noto/specimen/Noto+Color+Emoji',
  },
];

const frontendCore = [
  {
    name: 'Vue.js',
    description: 'The Progressive JavaScript Framework',
    license: 'MIT',
    url: 'https://vuejs.org/',
  },
  {
    name: 'Vite',
    description: 'Frontend build tool',
    license: 'MIT',
    url: 'https://vitejs.dev/',
  },
  {
    name: 'Pinia',
    description: 'State management',
    license: 'MIT',
    url: 'https://pinia.vuejs.org/',
  },
  {
    name: 'Vue Router',
    description: 'Navigation',
    license: 'MIT',
    url: 'https://router.vuejs.org/',
  },
  {
    name: 'Tailwind CSS',
    description: 'Utility-first CSS framework',
    license: 'MIT',
    url: 'https://tailwindcss.com/',
  },
];

const frontendLibs = [
  { name: 'Vue I18n', license: 'MIT', url: 'https://vue-i18n.intlify.dev/' },
  { name: 'VueUse', license: 'MIT', url: 'https://vueuse.org/' },
  { name: 'Headless UI', license: 'MIT', url: 'https://headlessui.com/' },
  { name: 'TipTap Editor', license: 'MIT', url: 'https://tiptap.dev/' },
  { name: 'Mermaid.js', license: 'MIT', url: 'https://mermaid.js.org/' },
  {
    name: 'Google GenAI SDK',
    license: 'Apache 2.0',
    url: 'https://github.com/google/generative-ai-js',
  },
  {
    name: 'TanStack Vue Query',
    license: 'MIT',
    url: 'https://tanstack.com/query/latest',
  },
  { name: 'Axios', license: 'MIT', url: 'https://axios-http.com/' },
  { name: 'Zod', license: 'MIT', url: 'https://zod.dev/' },
  {
    name: 'VeeValidate',
    license: 'MIT',
    url: 'https://vee-validate.logaretm.com/',
  },
  {
    name: 'FingerprintJS',
    license: 'MIT',
    url: 'https://github.com/fingerprintjs/fingerprintjs',
  },
  {
    name: 'Cropperjs',
    license: 'MIT',
    url: 'https://github.com/fengyuanchen/cropperjs',
  },
  {
    name: 'Vue Draggable',
    license: 'MIT',
    url: 'https://github.com/SortableJS/Vue.Draggable',
  },
  { name: 'Lodash', license: 'MIT', url: 'https://lodash.com/' },
  {
    name: 'Cyrillic to Translit',
    license: 'MIT',
    url: 'https://github.com/greybax/cyrillic-to-translit-js',
  },
  {
    name: 'QR Code Vue',
    license: 'MIT',
    url: 'https://scopewu.github.io/qrcode.vue/',
  },
  {
    name: 'Vue Virtual Scroller',
    license: 'MIT',
    url: 'https://github.com/Akryum/vue-virtual-scroller',
  },
  {
    name: 'MaterialKolor',
    license: 'Apache 2.0',
    url: 'https://github.com/jordond/MaterialKolor',
  },
  { name: 'PostCSS', license: 'MIT', url: 'https://postcss.org/' },
  {
    name: 'Autoprefixer',
    license: 'MIT',
    url: 'https://github.com/postcss/autoprefixer',
  },
];

const backendCore = [
  {
    name: 'Rust',
    description: 'System programming language',
    license: 'MIT/Apache 2.0',
    url: 'https://www.rust-lang.org/',
  },
  {
    name: 'Actix Web',
    description: 'Web framework',
    license: 'MIT/Apache 2.0',
    url: 'https://actix.rs/',
  },
  {
    name: 'SQLx',
    description: 'SQL toolkit',
    license: 'MIT/Apache 2.0',
    url: 'https://github.com/launchbadge/sqlx',
  },
  {
    name: 'Tokio',
    description: 'Asynchronous runtime',
    license: 'MIT',
    url: 'https://tokio.rs/',
  },
];

const backendLibs = [
  { name: 'Serde', license: 'MIT/Apache 2.0', url: 'https://serde.rs/' },
  {
    name: 'Serde JSON',
    license: 'MIT/Apache 2.0',
    url: 'https://github.com/serde-rs/json',
  },
  {
    name: 'Anyhow',
    license: 'MIT/Apache 2.0',
    url: 'https://github.com/dtolnay/anyhow',
  },
  {
    name: 'Thiserror',
    license: 'MIT/Apache 2.0',
    url: 'https://github.com/dtolnay/thiserror',
  },
  {
    name: 'Chrono',
    license: 'MIT/Apache 2.0',
    url: 'https://github.com/chronotope/chrono',
  },
  {
    name: 'UUID',
    license: 'Apache 2.0/MIT',
    url: 'https://github.com/uuid-rs/uuid',
  },
  {
    name: 'Futures',
    license: 'MIT/Apache 2.0',
    url: 'https://rust-lang.github.io/futures-rs/',
  },
  {
    name: 'Reqwest',
    license: 'MIT/Apache 2.0',
    url: 'https://github.com/seanmonstar/reqwest',
  },
  {
    name: 'Argon2',
    license: 'MIT/Apache 2.0',
    url: 'https://github.com/RustCrypto/password-hashes',
  },
  {
    name: 'PBKDF2',
    license: 'MIT/Apache 2.0',
    url: 'https://github.com/RustCrypto/password-hashes',
  },
  {
    name: 'Sha2',
    license: 'MIT/Apache 2.0',
    url: 'https://github.com/RustCrypto/hashes',
  },
  { name: 'Lettre', license: 'MIT', url: 'https://lettre.rs/' },
  {
    name: 'Utoipa',
    license: 'Apache 2.0/MIT',
    url: 'https://github.com/juhaku/utoipa',
  },
  {
    name: 'Scraper',
    license: 'MIT',
    url: 'https://github.com/causal-agent/scraper',
  },
  { name: 'Image', license: 'MIT', url: 'https://github.com/image-rs/image' },
  {
    name: 'Hound',
    license: 'Apache 2.0',
    url: 'https://github.com/ruuda/hound',
  },
  {
    name: 'Redis',
    license: 'MIT',
    url: 'https://github.com/redis-rs/redis-rs',
  },
  {
    name: 'Deadpool',
    license: 'MIT',
    url: 'https://github.com/bike-barn/deadpool',
  },
  {
    name: 'User Agent Parser',
    license: 'Apache 2.0',
    url: 'https://github.com/ua-parser/uap-rs',
  },
  {
    name: 'Colored',
    license: 'MPL 2.0',
    url: 'https://github.com/mackwic/colored',
  },
  {
    name: 'Clap',
    license: 'MIT/Apache 2.0',
    url: 'https://github.com/clap-rs/clap',
  },
  { name: 'Dotenvy', license: 'MIT', url: 'https://github.com/allan2/dotenvy' },
];
</script>
