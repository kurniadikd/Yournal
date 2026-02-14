import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createHead } from '@vueuse/head';
import App from './App.vue';
import './assets/main.css';
import router from './router';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import i18n from './i18n';
import { MotionPlugin } from '@vueuse/motion';

declare global {
  interface Window {
    materialKolor: any;
  }
}

// --- FUNGSI UTAMA ASINKRON ---

async function initializeApp() {
  // 1. TUNGGU LIBRARY EKSTERNAL SIAP (Dihapus: WASM di-handle oleh theme store secara asinkron)

  // 2. BUAT INSTANCE UTAMA
  const app = createApp(App);
  const head = createHead();

  // 3. INISIALISASI PINIA (Daftarkan Plugin ke instance Pinia)
  const pinia = createPinia();
  pinia.use(piniaPluginPersistedstate);

  // 4. DAFTARKAN SEMUA PLUGIN ke Aplikasi Vue
  app.use(router);
  app.use(pinia);
  app.use(head);
  app.use(i18n);
  app.use(MotionPlugin);

  // 5. MOUNT APLIKASI
  app.mount('#app');

  console.log('Aplikasi Vue berhasil dimuat dan dipasang ke #app.');
}

// Panggil fungsi inisialisasi utama
initializeApp();
