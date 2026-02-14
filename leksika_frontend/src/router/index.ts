// src/router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import Home from '../components/Home.vue';
// Imports below are now lazy-loaded in routes
// import Aplikasi from '../components/Aplikasi/Aplikasi.vue'
// import Masuk from '../components/Masuk.vue'
// import TentangKami from '../components/TentangKami.vue'
// ... etc

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/app',
    name: 'Aplikasi',
    component: () => import('../components/Aplikasi/Aplikasi.vue'),
  },
  {
    path: '/about',
    name: 'TentangKami',
    component: () => import('../components/TentangKami.vue'),
  },
  {
    path: '/terms',
    name: 'Terms',
    component: () => import('../components/Terms.vue'),
  },
  {
    path: '/privacy',
    name: 'Privacy',
    component: () => import('../components/Privacy.vue'),
  },
  {
    path: '/cookies',
    name: 'CookiePolicy',
    component: () => import('../components/CookiePolicy.vue'),
  },
  {
    path: '/attribution',
    name: 'Attribution',
    component: () => import('../components/Attribution.vue'),
  },
  {
    path: '/contact',
    name: 'Kontak',
    component: () => import('../components/Kontak.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../components/Aplikasi/Auth.vue'),
    props: { isPage: true, initialView: 'masuk' },
  },
  {
    path: '/signup',
    name: 'Signup',
    component: () => import('../components/Aplikasi/Auth.vue'),
    props: { isPage: true, initialView: 'daftar' },
  },

  {
    path: '/faq',
    name: 'FAQ',
    component: () => import('../components/FAQ.vue'),
  },
  {
    path: '/articles',
    name: 'ArtikelList',
    component: () => import('../components/Artikel.vue'),
  },
  {
    path: '/article/:slug',
    name: 'ArtikelDetail',
    component: () => import('../components/Artikel.vue'),
  },
  // 404 catch-all route - must be last
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../components/NotFound.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // If there's a saved position (e.g., from browser back button), use it
    if (savedPosition) {
      return savedPosition;
    }
    // Otherwise, scroll to top
    return { top: 0, behavior: 'smooth' };
  },
});

export default router;
