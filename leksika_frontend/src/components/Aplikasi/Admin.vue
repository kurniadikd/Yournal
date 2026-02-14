<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

// Impor Sub-Komponen Admin
import ManajemenPengguna from './Admin/ManajemenPengguna.vue';
import ManajemenModul from './Admin/ManajemenModul.vue';
import ManajemenKalimat from './Admin/ManajemenKalimat.vue';
import ManajemenKata from './Admin/ManajemenKata.vue';
import ManajemenBackup from './Admin/ManajemenBackup.vue';
import AturUmpanBalik from './Admin/UmpanBalik.vue';
import ManajemenBahasa from './Admin/ManajemenBahasa.vue';
import ManajemenAI from './Admin/ManajemenAI.vue';
import ManajemenPengaturanAplikasi from './Admin/ManajemenPengaturanAplikasi.vue';
import AdminPanel from './Admin/AdminPanel.vue';
import Endpoint from './Admin/Endpoint.vue'; // [BARU] Import komponen Endpoint
import ManajemenArtikel from './Admin/ManajemenArtikel.vue';
import ManajemenNarasi from './Admin/ManajemenNarasi.vue'; // [BARU]
import ManajemenFAQ from './Admin/ManajemenFAQ.vue';
import ManajemenEmail from './Admin/ManajemenEmail.vue'; // [BARU] Manajemen Email

const authStore = useAuthStore();
const router = useRouter();

const activePanel = ref('dashboard');

onMounted(() => {
  if (!authStore.isAdmin) {
    router.push('/');
  }
});
</script>

<template>
  <div>
    <div v-if="activePanel === 'dashboard'" class="max-w-4xl mx-auto">
      
      <div class="bg-[var(--color-surface-container-high)] p-6 rounded-2xl mb-6">
        <div>
          <h2 class="text-xl font-semibold text-[var(--color-on-background)]">Database System</h2>
        </div>
        <button
          @click="activePanel = 'admin_panel'"
          class="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 rounded-lg hover:bg-[var(--color-primary-fixed-dim)] transition-colors mt-4"
        >
          Buka Admin Panel
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <div class="bg-[var(--color-surface-container-high)] p-6 rounded-2xl">
          <h2 class="text-xl font-semibold text-[var(--color-on-background)]">Manajemen Pengguna</h2>
          <div class="flex flex-col space-y-2 mt-4">
            <button @click="activePanel = 'pengguna'" class="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 rounded-lg hover:bg-[var(--color-primary-fixed-dim)] transition-colors">
              Daftar Pengguna
            </button>
            <button @click="activePanel = 'email'" class="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 rounded-lg hover:bg-[var(--color-primary-fixed-dim)] transition-colors">
              Manajemen Email
            </button>
          </div>
        </div>
        
        <div class="bg-[var(--color-surface-container-high)] p-6 rounded-2xl">
          <h2 class="text-xl font-semibold text-[var(--color-on-background)]">Manajemen Konten</h2>
          <div class="flex flex-col space-y-2 mt-4">
            <button @click="activePanel = 'modul'" class="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 rounded-lg hover:bg-[var(--color-primary-fixed-dim)] transition-colors">Manajemen Modul</button>
            <button @click="activePanel = 'artikel'" class="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 rounded-lg hover:bg-[var(--color-primary-fixed-dim)] transition-colors">Manajemen Artikel</button>
            <button @click="activePanel = 'narasi'" class="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 rounded-lg hover:bg-[var(--color-primary-fixed-dim)] transition-colors">Manajemen Narasi</button>
            <button @click="activePanel = 'kalimat'" class="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 rounded-lg hover:bg-[var(--color-primary-fixed-dim)] transition-colors">Manajemen Kalimat</button>
            <button @click="activePanel = 'kata'" class="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 rounded-lg hover:bg-[var(--color-primary-fixed-dim)] transition-colors">Manajemen Kata</button>
            <button @click="activePanel = 'faq'" class="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 rounded-lg hover:bg-[var(--color-primary-fixed-dim)] transition-colors">Manajemen FAQ</button>
          </div>
        </div>
        
        <div class="bg-[var(--color-surface-container-high)] p-6 rounded-2xl">
          <h2 class="text-xl font-semibold text-[var(--color-on-background)]">Manajemen Aplikasi</h2>
          <div class="flex flex-col space-y-2 mt-4">
            <button @click="activePanel = 'bahasa'" class="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 rounded-lg hover:bg-[var(--color-primary-fixed-dim)] transition-colors">Manajemen Bahasa</button>
            <button @click="activePanel = 'umpanbalik'" class="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 rounded-lg hover:bg-[var(--color-primary-fixed-dim)] transition-colors">Umpan Balik Pengguna</button>
            <button @click="activePanel = 'ai_monitor'" class="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 rounded-lg hover:bg-[var(--color-primary-fixed-dim)] transition-colors">Manajemen AI</button>
            
            <button @click="activePanel = 'endpoint'" class="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 rounded-lg hover:bg-[var(--color-primary-fixed-dim)] transition-colors">
                Manajemen System Endpoints
            </button>

            <button @click="activePanel = 'backup'" class="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 rounded-lg hover:bg-[var(--color-primary-fixed-dim)] transition-colors">Manajemen Backup</button>
            <button @click="activePanel = 'pengaturan_aplikasi'" class="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 rounded-lg hover:bg-[var(--color-primary-fixed-dim)] transition-colors">Pengaturan Global</button>
          </div>
        </div>

      </div>
    </div>
    
    <div v-else-if="activePanel === 'pengguna'" class="h-full flex flex-col"><ManajemenPengguna @back="activePanel = 'dashboard'" /></div>
    <div v-else-if="activePanel === 'modul'" class="h-full flex flex-col"><ManajemenModul @back="activePanel = 'dashboard'" /></div>
    <div v-else-if="activePanel === 'artikel'" class="h-full flex flex-col"><ManajemenArtikel @back="activePanel = 'dashboard'" /></div>
    <div v-else-if="activePanel === 'narasi'" class="h-full flex flex-col"><ManajemenNarasi @back="activePanel = 'dashboard'" /></div>
    <div v-else-if="activePanel === 'kalimat'" class="h-full flex flex-col"><ManajemenKalimat @back="activePanel = 'dashboard'" /></div>
    <div v-else-if="activePanel === 'kata'" class="h-full flex flex-col"><ManajemenKata @back="activePanel = 'dashboard'" /></div>
    <div v-else-if="activePanel === 'faq'" class="h-full flex flex-col"><ManajemenFAQ @back="activePanel = 'dashboard'" /></div>
    <div v-else-if="activePanel === 'backup'" class="h-full flex flex-col"><ManajemenBackup @back="activePanel = 'dashboard'" /></div>
    <div v-else-if="activePanel === 'umpanbalik'" class="h-full flex flex-col"><AturUmpanBalik @back="activePanel = 'dashboard'" /></div>
    <div v-else-if="activePanel === 'bahasa'" class="h-full flex flex-col"><ManajemenBahasa @back="activePanel = 'dashboard'" /></div>
    <div v-else-if="activePanel === 'ai_monitor'" class="h-full flex flex-col"><ManajemenAI @back="activePanel = 'dashboard'" /></div>
    
    <div v-else-if="activePanel === 'endpoint'" class="h-full flex flex-col"><Endpoint @back="activePanel = 'dashboard'" /></div>
    <div v-else-if="activePanel === 'email'" class="h-full flex flex-col"><ManajemenEmail @back="activePanel = 'dashboard'" /></div>
    
    <div v-else-if="activePanel === 'pengaturan_aplikasi'" class="h-full flex flex-col"><ManajemenPengaturanAplikasi @back="activePanel = 'dashboard'" /></div>

    <div v-else-if="activePanel === 'admin_panel'" class="fixed inset-0 z-[9999] bg-[var(--color-surface)] flex flex-col animate-in fade-in duration-200">
        <AdminPanel @close="activePanel = 'dashboard'" />
    </div>

  </div>
</template>
