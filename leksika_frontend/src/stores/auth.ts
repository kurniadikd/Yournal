// src/stores/auth.js

import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { useOnline } from '@vueuse/core';
import { useUIStore } from './ui';
import { useSettingsStore } from './settings';
import { useThemeStore } from './themes';

export const useAuthStore = defineStore(
  'auth',
  () => {
    const uiStore = useUIStore();

    // --- STATE ---
    interface UserProfile {
        avatar_base64?: string;
        [key: string]: any;
    }
    interface User {
        id: number;
        username?: string;
        is_staff?: boolean;
        is_superuser?: boolean;
        profile?: UserProfile;
        [key: string]: any;
    }

    const user = ref<User | null>(null);
    const token = ref(null);
    const showOnboarding = ref(false);

    // --- GETTERS ---
    const isLoggedIn = computed(() => !!token.value && !!user.value);
    const isAdmin = computed(
      () => user.value?.is_staff || user.value?.is_superuser,
    );

    // --- OFFLINE SYNC STATE ---
    const syncQueue = ref([]);

    // --- HELPERS (Obfuscation) ---
    // Sederhana: Base64 + Salt 'LEKSIKA_SECRET'
    // Tujuannya bukan keamanan tingkat militer, tapi mencegah manipulasi kasual di localStorage
    const SALT = 'LEKSIKA_SECURE_SYNC_V1';

    function obfuscate(data) {
      try {
        const json = JSON.stringify(data);
        return btoa(unescape(encodeURIComponent(json + '||' + SALT)));
      } catch (e) {
        console.error('Obfuscation failed', e);
        return null;
      }
    }

    function deobfuscate(str) {
      try {
        const decoded = decodeURIComponent(escape(atob(str)));
        if (!decoded.endsWith('||' + SALT)) return null; // Invalid salt
        const json = decoded.replace('||' + SALT, '');
        return JSON.parse(json);
      } catch (e) {
        console.error('Deobfuscation failed', e);
        return null;
      }
    }

    // --- ACTIONS (Sync) ---
    function addToSyncQueue(payload, type = 'lesson_completion') {
      const item = {
        id: crypto.randomUUID(),
        type,
        data: obfuscate(payload),
        timestamp: Date.now(),
      };
      syncQueue.value.push(item);
      console.log(
        `[OfflineSync] Item queued. Total: ${syncQueue.value.length}`,
      );

      // Coba sync langsung jika online
      if (isOnline.value) {
        processSyncQueue();
      }
    }

    async function processSyncQueue() {
      if (syncQueue.value.length === 0) return;
      if (!isOnline.value) {
        console.log('[OfflineSync] Offline, skipping sync.');
        return;
      }

      console.log(
        `[OfflineSync] Processing ${syncQueue.value.length} items...`,
      );
      const { api } = await import('@/utils/api');

      // Proses antrean satu per satu
      // Kita clone antrean agar aman saat loop
      const queueSnapshot = [...syncQueue.value];
      const remainingQueue = [];

      for (const item of queueSnapshot) {
        try {
          const payload = deobfuscate(item.data);
          if (!payload) {
            console.error('[OfflineSync] Corrupt data, discarding:', item.id);
            continue; // Discard invalid data
          }

          if (item.type === 'lesson_completion') {
            // Struktur payload diharapkan: { activity_type, materi_id, payload: { answers, score, ... } }
            // Kita harus sesuaikan endpointnya. Materi pakai PATCH /.../learn/lesson/:id/
            // Tapi logic backend patch membutuhkan URL spesifik user/bahasa.
            // Kita akan simpan URL tujuan di payload saat addToSyncQueue biar gampang

            if (payload.url && payload.body) {
              await api.patch(payload.url, payload.body);
            } else {
              console.warn('[OfflineSync] Invalid payload structure', payload);
            }
          }

          console.log('[OfflineSync] Synced item:', item.id);
        } catch (err) {
          console.error('[OfflineSync] Failed to sync item:', item.id, err);
          // Jika error network/server 500, simpan kembali. Jika 400 (Bad Request), buang.
          if (
            err.response &&
            (err.response.status >= 500 ||
              err.response.status === 429 ||
              err.code === 'ERR_NETWORK')
          ) {
            remainingQueue.push(item);
          } else {
            console.warn(
              '[OfflineSync] Item discarded due to client error:',
              item.id,
            );
          }
        }
      }

      syncQueue.value = remainingQueue;
      // Update user profile jika ada progress baru (opsional, tapi bagus untuk refresh XP/Level)
      if (remainingQueue.length === 0 && user.value?.id) {
        fetchUserProfile(user.value.id);
      }
    }

    // --- REACTIVE ONLINE STATUS ---
    const isOnline = useOnline();

    // Watch untuk status online dengan VueUse (otomatis cleanup)
    watch(isOnline, (online) => {
      if (online) {
        console.log('[OfflineSync] Back online! processing queue...');
        processSyncQueue();
      }
    });

    // --- ACTIONS (Auth) ---
    function setAuth(authData) {
      user.value = authData.user;
      if (authData.token) {
        token.value = authData.token;
      }
      const settingsStore = useSettingsStore();
      settingsStore.fetchUserSettings();
      checkProfileCompleteness();

      // === CLARITY INTEGRATION ===
      // Identify user and set telemetry tags in Clarity analytics
      import('@/utils/telemetry').then(
        ({ clarityIdentify, claritySetTag, claritySetAllTelemetry }) => {
          if (authData.user?.id) {
            clarityIdentify(
              String(authData.user.id),
              authData.user.username || null,
            );
            // Set custom tags
            if (authData.user.is_staff || authData.user.is_superuser) {
              claritySetTag('user_role', 'admin');
            } else {
              claritySetTag('user_role', 'member');
            }
            // Send all telemetry data (GPU, network, screen, etc.) to Clarity
            claritySetAllTelemetry();
          }
        },
      );

      // Pemicu Sync saat login
      setTimeout(() => processSyncQueue(), 2000);
    }

    function logout() {
      user.value = null;
      token.value = null;
      showOnboarding.value = false;
      uiStore.setIsOnboardingActive(false);

      // Reset semua pengaturan ke default
      const settingsStore = useSettingsStore();
      settingsStore.resetToDefaults();

      // Re-generate tema dengan warna default
      const themeStore = useThemeStore() as any;
      themeStore.generateThemeFromSeed('#AC0087', 'vibrant');

      console.log('User logged out, settings reset to defaults.');

      // Redirect ke halaman utama (/) setelah logout
      import('@/router').then(({ default: router }) => {
        router.push('/');
      });
    }

    function setShowOnboarding(value: boolean) {
      showOnboarding.value = value;
      uiStore.setIsOnboardingActive(value);
    }

    function checkProfileCompleteness() {
      showOnboarding.value = false;
      uiStore.setIsOnboardingActive(false);
    }

    async function updateProfile(userId: number, payload: any) {
      const { api } = await import('@/utils/api');

      let formData;

      // Jika payload sudah berupa FormData (seperti dari Akun.vue), gunakan langsung.
      if (payload instanceof FormData) {
        formData = payload;
      } else {
        // Jika payload berupa Object biasa, konversi ke FormData.
        formData = new FormData();
        for (const key in payload) {
          if (Object.prototype.hasOwnProperty.call(payload, key)) {
            const value = payload[key];

            // [PERBAIKAN] Menghapus prefix "form." agar sesuai dengan Backend Rust yang baru
            if (value instanceof File) {
              formData.append(key, value, value.name);
            } else if (Array.isArray(value)) {
              // Backend Rust mengharapkan JSON string untuk array (seperti 'interests')
              // atau array sederhana. Untuk keamanan, kita stringify array kompleks.
              formData.append(key, JSON.stringify(value));
            } else if (typeof value === 'object' && value !== null) {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, value);
            }
          }
        }
      }

      try {
        const response = await api.patch(`/users/${userId}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const updatedUser = response.data;

        // --- LOGIKA PEMBARUAN INSTAN AVATAR (CACHE BUSTING) ---
        if (updatedUser.profile && updatedUser.profile.avatar_base64) {
          const timestamp = new Date().getTime();
          updatedUser.profile.avatar_base64 = `${updatedUser.profile.avatar_base64}#${timestamp}`;
        }
        // --------------------------------------------------------

        user.value = updatedUser;
        checkProfileCompleteness();
        return updatedUser;
      } catch (error) {
        console.error('Gagal menyimpan profil:', error);
        throw error;
      }
    }

    async function fetchUserProfile(userId: number) {
      if (!isLoggedIn.value || !userId) return;
      const { api } = await import('@/utils/api');
      try {
        const response = await api.get(`/users/${userId}/`);
        const fetchedUser = response.data;

        // Cache-busting
        if (fetchedUser.profile && fetchedUser.profile.avatar_base64) {
          const timestamp = new Date().getTime();
          fetchedUser.profile.avatar_base64 = `${fetchedUser.profile.avatar_base64}#${timestamp}`;
        }

        user.value = fetchedUser;
        checkProfileCompleteness();
        return response.data;
      } catch (error: any) {
        console.error('Failed to fetch user profile:', error);
        if (error.response && [401, 403].includes(error.response.status)) {
          logout();
        }
        throw error;
      }
    }

    watch(
      user,
      () => {
        checkProfileCompleteness();
      },
      { deep: true },
    );

    return {
      user,
      token,
      showOnboarding,
      isLoggedIn,
      isAdmin,
      setAuth,
      logout,
      updateProfile,
      fetchUserProfile,
      setShowOnboarding,
      syncQueue,
      addToSyncQueue,
      processSyncQueue,
      deobfuscate, // [NEW] Export for reading local progress in guest mode
    };
  },
  {
    persist: {
      storage: localStorage,
      paths: ['user', 'token', 'syncQueue'],
      afterRestore: (ctx) => {
        // Re-identify user in Clarity after state restoration (page reload)
        if (ctx.store.user?.id) {
           import('@/utils/telemetry').then(
            ({ clarityIdentify, claritySetTag, claritySetAllTelemetry }) => {
              const user = ctx.store.user;
               clarityIdentify(String(user.id), user.username || null);
               
               if (user.is_staff || user.is_superuser) {
                 claritySetTag('user_role', 'admin');
               } else {
                 claritySetTag('user_role', 'member');
               }
               claritySetAllTelemetry();
            }
          );
        }
      }
    } as any,
  },
);
