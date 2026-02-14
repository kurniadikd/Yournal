<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';

interface Log {
  activity_type: string;
  timestamp: string;
  ip_address?: string;
  city?: string;
  country_name?: string;
  device_model?: string;
  risk_score?: number;
  [key: string]: any;
}

interface DeviceInfo {
  type?: string;
  model?: string;
  os?: string;
  browser?: string;
}

interface LocationInfo {
  city?: string;
  country?: string;
}

interface Session {
  id: string;
  device_info?: DeviceInfo;
  user_agent?: string;
  ip_address?: string;
  location_info?: LocationInfo;
  last_active: string;
  created: string;
}

interface User {
  id?: number | string;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  password?: string;
  account_type?: string;
  is_active?: boolean;
  is_superuser?: boolean;
  premium_expires_at?: string | null;
  logs?: Log[];
  sessions?: Session[];
  [key: string]: any;
}

const props = defineProps<{
  isOpen: boolean;
  user: User | null;
  isLoading: boolean;
  isSaving: boolean;
  isEditMode: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', payload: User): void;
}>();

const isViewOnly = ref(true);
const internalUser = ref<User | null>(null);
const originalUserSnapshot = ref<User | null>(null);

watch(
  () => props.user,
  (newUser) => {
    if (newUser) {
      internalUser.value = JSON.parse(JSON.stringify(newUser)); // Deep copy
      originalUserSnapshot.value = JSON.parse(JSON.stringify(newUser));
      isViewOnly.value = props.isEditMode; // Set view/edit mode based on prop
    } else {
      internalUser.value = null;
      originalUserSnapshot.value = null;
    }
  },
  { immediate: true },
);

watch(
  () => internalUser.value?.account_type,
  (newVal) => {
    if (internalUser.value && !isViewOnly.value) {
      if (newVal === 'Admin') {
        internalUser.value.is_superuser = true;
      } else {
        internalUser.value.is_superuser = false;
      }
    }
  },
);

const getStatusClass = (status: string) => {
  if (status === 'Aktif')
    return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border border-green-200 dark:border-green-800';
  if (status === 'Diblokir')
    return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-800';
  if (status.includes('Dihapus') || status === 'Nonaktif')
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600';
  return 'bg-gray-100 text-gray-800';
};

const getDetailedStatusLabel = (user: User | null) => {
  if (!user) return '';
  if (user.is_active) return 'Aktif';

  if (user.logs && user.logs.length > 0) {
    const statusLog = user.logs.find((log) =>
      [
        'Account Deleted',
        'Account Deleted (Admin)',
        'Account Blocked',
      ].includes(log.activity_type),
    );

    if (statusLog) {
      if (statusLog.activity_type === 'Account Deleted')
        return 'Dihapus (User)';
      if (statusLog.activity_type === 'Account Deleted (Admin)')
        return 'Dihapus (Admin)';
      if (statusLog.activity_type === 'Account Blocked') return 'Diblokir';
    }
  }

  return 'Nonaktif';
};

const formatLogDate = (dateString: string) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const getRiskClass = (score: number | undefined) => {
  if (score === undefined || score === null) return 'text-gray-500';
  if (score >= 80) return 'text-red-600 font-bold';
  if (score >= 50) return 'text-orange-500 font-semibold';
  return 'text-green-600';
};

const enableEditMode = () => {
  isViewOnly.value = false;
};

const handleCancel = () => {
  if (!props.isEditMode) {
    closeModal();
  } else {
    internalUser.value = originalUserSnapshot.value ? JSON.parse(JSON.stringify(originalUserSnapshot.value)) : null;
    isViewOnly.value = true;
  }
};

const handleSubmit = () => {
  if (!internalUser.value) return;
  const payload = { ...internalUser.value };
  if (!payload.password) delete payload.password;

  if (payload.premium_expires_at) {
    payload.premium_expires_at = new Date(
      payload.premium_expires_at,
    ).toISOString();
  } else {
    payload.premium_expires_at = null;
  }

  if (payload.account_type === 'Admin') {
    payload.is_superuser = true;
    payload.is_active = true;
  } else {
    payload.is_superuser = false;
  }

  delete payload.logs;

  emit('save', payload);
};

const closeModal = () => {
  emit('close');
};
</script>

<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-50">
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/50" />
      </TransitionChild>
      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-[var(--color-surface-container-high)] p-6 text-left align-middle shadow-xl transition-all">
              
              <div v-if="isLoading" class="flex flex-col items-center justify-center py-12">
                  <span class="material-symbols-outlined animate-spin text-4xl text-[var(--color-primary)]">sync</span>
                  <p class="mt-2 text-sm text-[var(--color-on-surface-variant)]">Memuat detail & log aktivitas...</p>
              </div>

              <div v-else-if="internalUser">
                  <DialogTitle as="h3" class="text-lg font-medium leading-6 text-[var(--color-on-background)] flex justify-between items-center">
                      <div class="flex items-center gap-3">
                          <span>{{ isEditMode ? (isViewOnly ? 'Detail Pengguna' : 'Edit Pengguna') : 'Tambah Pengguna Baru' }}</span>
                          <span v-if="isViewOnly" :class="getStatusClass(getDetailedStatusLabel(internalUser))" class="text-xs px-2 py-1 rounded-full font-bold">
                              {{ getDetailedStatusLabel(internalUser) }}
                          </span>
                      </div>
                      <span v-if="isViewOnly && internalUser?.logs?.length > 0" class="text-xs bg-[var(--color-surface-container-highest)] px-2 py-1 rounded-md text-[var(--color-on-surface-variant)]">
                          {{ internalUser.logs.length }} Log Terakhir
                      </span>
                  </DialogTitle>

                  <form @submit.prevent="handleSubmit" class="mt-4">
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <input v-model="internalUser.username" :disabled="isViewOnly" type="text" placeholder="Username" class="sm:col-span-2 w-full p-2 border rounded-xl bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-70 disabled:cursor-not-allowed">
                          <input v-model="internalUser.first_name" :disabled="isViewOnly" type="text" placeholder="Nama Depan" class="w-full p-2 border rounded-xl bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-70 disabled:cursor-not-allowed">
                          <input v-model="internalUser.last_name" :disabled="isViewOnly" type="text" placeholder="Nama Belakang" class="w-full p-2 border rounded-xl bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-70 disabled:cursor-not-allowed">
                          <input v-model="internalUser.email" :disabled="isViewOnly" type="email" placeholder="Email" class="sm:col-span-2 w-full p-2 border rounded-xl bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-70 disabled:cursor-not-allowed">
                          <input v-model="internalUser.phone_number" :disabled="isViewOnly" type="text" placeholder="Nomor Telepon" class="sm:col-span-2 w-full p-2 border rounded-xl bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-70 disabled:cursor-not-allowed">
                          
                          <input v-if="!isViewOnly" v-model="internalUser.password" type="password" placeholder="Password (biarkan kosong jika tidak diubah)" class="sm:col-span-2 w-full p-2 border rounded-xl bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-primary)]">
                          
                          <div class="sm:col-span-2 grid grid-cols-2 gap-4 items-center">
                              <select v-model="internalUser.account_type" :disabled="isViewOnly" class="w-full p-2 border rounded-xl bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-70 disabled:cursor-not-allowed">
                                  <option>Gratis</option>
                                  <option>Premium</option>
                                  <option>Admin</option>
                              </select>
                              <div class="flex items-center justify-center">
                                  <input v-model="internalUser.is_active" :disabled="isViewOnly" id="is_active_modal" type="checkbox" class="h-4 w-4 text-[var(--color-primary)] border-[var(--color-outline-variant)] rounded focus:ring-[var(--color-primary)] disabled:opacity-70 disabled:cursor-not-allowed">
                                  <label for="is_active_modal" class="ml-2 block text-sm text-[var(--color-on-surface)]">Aktif</label>
                              </div>
                          </div>
                          <div class="sm:col-span-2">
                              <label class="block text-sm text-[var(--color-on-surface-variant)] mb-1">Premium Berakhir Pada</label>
                              <input v-model="internalUser.premium_expires_at" :disabled="isViewOnly" type="datetime-local" class="w-full p-2 border rounded-xl bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-70 disabled:cursor-not-allowed">
                          </div>
                      </div>

                      <div v-if="isViewOnly && internalUser.sessions && internalUser.sessions.length > 0" class="mt-6 border-t border-[var(--color-outline-variant)] pt-4">
                          <h4 class="text-md font-semibold text-[var(--color-on-background)] mb-3 flex items-center gap-2">
                              <span class="material-symbols-outlined text-sm">devices</span> Sesi Perangkat Aktif
                          </h4>
                          <div class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]">
                              <table class="w-full text-left text-xs">
                                  <thead class="bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]">
                                      <tr>
                                          <th class="p-2 font-medium">Perangkat</th>
                                          <th class="p-2 font-medium">IP / Lokasi</th>
                                          <th class="p-2 font-medium">Terakhir Aktif</th>
                                          <th class="p-2 font-medium">Login Awal</th>
                                      </tr>
                                  </thead>
                                  <tbody class="divide-y divide-[var(--color-outline-variant)]">
                                      <tr v-for="session in internalUser.sessions" :key="session.id" class="hover:bg-[var(--color-surface-container-high)] transition-colors">
                                          <td class="p-2">
                                              <div class="flex items-center gap-2">
                                                  <span class="material-symbols-outlined text-lg text-[var(--color-primary)]">
                                                      {{ (session.device_info?.type === 'mobile' || session.user_agent?.toLowerCase().includes('mobile')) ? 'smartphone' : 'computer' }}
                                                  </span>
                                                  <div class="flex flex-col">
                                                      <span class="font-medium text-[var(--color-on-surface)]">
                                                          {{ session.device_info?.model || 'Unknown Device' }}
                                                      </span>
                                                      <span class="text-[10px] text-[var(--color-on-surface-variant)] opacity-80 truncate max-w-[150px]" :title="session.user_agent">
                                                          {{ session.device_info?.os || '' }} {{ session.device_info?.browser || '' }}
                                                      </span>
                                                  </div>
                                              </div>
                                          </td>
                                          <td class="p-2 text-[var(--color-on-surface-variant)]">
                                              <div class="flex flex-col">
                                                  <span class="font-mono text-[10px] opacity-80">{{ session.ip_address || 'N/A' }}</span>
                                                  <span v-if="session.location_info">{{ session.location_info.city || '' }}, {{ session.location_info.country || '' }}</span>
                                              </div>
                                          </td>
                                          <td class="p-2 text-[var(--color-on-surface)]">
                                              {{ formatLogDate(session.last_active) }}
                                          </td>
                                          <td class="p-2 text-[var(--color-on-surface-variant)]">
                                              {{ formatLogDate(session.created) }}
                                          </td>
                                      </tr>
                                  </tbody>
                              </table>
                          </div>
                      </div>

                      <div v-if="isViewOnly && internalUser.logs && internalUser.logs.length > 0" class="mt-6 border-t border-[var(--color-outline-variant)] pt-4">
                          <h4 class="text-md font-semibold text-[var(--color-on-background)] mb-3 flex items-center gap-2">
                              <span class="material-symbols-outlined text-sm">history</span> Riwayat Sesi Terakhir
                          </h4>
                          <div class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]">
                              <table class="w-full text-left text-xs">
                                  <thead class="bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]">
                                      <tr>
                                          <th class="p-2 font-medium">Waktu</th>
                                          <th class="p-2 font-medium">Aktivitas</th>
                                          <th class="p-2 font-medium">IP / Lokasi</th>
                                          <th class="p-2 font-medium">Perangkat</th>
                                          <th class="p-2 font-medium text-right">Skor Risiko</th>
                                      </tr>
                                  </thead>
                                  <tbody class="divide-y divide-[var(--color-outline-variant)]">
                                      <tr v-for="(log, idx) in internalUser.logs" :key="idx" class="hover:bg-[var(--color-surface-container-high)] transition-colors">
                                          <td class="p-2 whitespace-nowrap text-[var(--color-on-surface)]">{{ formatLogDate(log.timestamp) }}</td>
                                          <td class="p-2 font-medium" :class="log.activity_type.includes('Failed') || log.activity_type.includes('Blocked') ? 'text-[var(--color-error)]' : 'text-[var(--color-primary)]'">
                                              {{ log.activity_type }}
                                          </td>
                                          <td class="p-2 text-[var(--color-on-surface-variant)]">
                                              <div class="flex flex-col">
                                                  <span class="font-mono text-[10px] opacity-80">{{ log.ip_address || 'N/A' }}</span>
                                                  <span>{{ log.city || '-' }}, {{ log.country_name || '-' }}</span>
                                              </div>
                                          </td>
                                          <td class="p-2 text-[var(--color-on-surface)] truncate max-w-[120px]" :title="log.device_model">
                                              {{ log.device_model || 'Unknown Device' }}
                                          </td>
                                          <td class="p-2 text-right font-mono font-bold" :class="getRiskClass(log.risk_score)">
                                              {{ log.risk_score || 0 }}
                                          </td>
                                      </tr>
                                  </tbody>
                              </table>
                          </div>
                      </div>
                      <div v-else-if="isViewOnly" class="mt-6 border-t border-[var(--color-outline-variant)] pt-4 text-center text-sm text-[var(--color-on-surface-variant)] italic">
                          Belum ada riwayat aktivitas yang terekam.
                      </div>

                      <div class="mt-6 flex justify-end space-x-2">
                          <template v-if="isViewOnly">
                              <button @click="closeModal" type="button" class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-high)]">Tutup</button>
                              <button @click="enableEditMode" type="button" class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-fixed-dim)]">Edit</button>
                          </template>
                          <template v-else>
                              <button @click="handleCancel" type="button" class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-high)]">Batal</button>
                              <button type="submit" :disabled="isSaving" class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] text-[var(--color-on-primary)] transition-colors">{{ isSaving ? 'Menyimpan...' : 'Simpan' }}</button>
                          </template>
                      </div>
                  </form>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
