<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// Impor komponen
import Disimpan from '@/components/Aplikasi/Profil/Disimpan.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import Referral from '@/components/Aplikasi/Profil/Referral.vue';

const authStore = useAuthStore();
const uiStore = useUIStore();
const router = useRouter();

const { user } = storeToRefs(authStore);

const formattedJoinDate = computed(() => {
  if (!user.value?.date_joined) return '';
  const date = new Date(user.value.date_joined);
  return date.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
});

// --- LOGIKA TIPE AKUN (Menggunakan warna solid seperti ManajemenPengguna.vue) ---
const badgeAkun = computed(() => {
  if (!user.value) return null;

  // 1. Cek Admin (Tersier Solid)
  if (
    user.value.is_superuser ||
    user.value.profile?.account_status === 'Admin'
  ) {
    return {
      text: t('administrator'),
      icon: 'shield_person',
      classes: 'bg-[var(--color-tertiary)] text-[var(--color-on-tertiary)]',
    };
  }

  // 2. Cek Premium (Sekunder Solid)
  if (
    user.value.profile?.account_status === 'Premium' ||
    user.value.profile?.account_type === 'PREMIUM'
  ) {
    return {
      text: t('premium_account'),
      icon: 'crown',
      classes: 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)]',
    };
  }

  // 3. Default: Gratis (Primer Solid)
  // Cek gender untuk icon
  const gender = user.value.profile?.gender; // Asumsi field gender ada di profile
  let icon = 'person'; // Default (Laki-laki atau tidak diketahui)

  if (gender === 'F' || gender === 'Female' || gender === 'Perempuan') {
    icon = 'person_2';
  }

  return {
    text: t('free_account'),
    icon: icon,
    classes: 'bg-[var(--color-primary)] text-[var(--color-on-primary)]',
  };
});

// Logika untuk komponen aktif
const activeComponent = computed(() => {
  if (uiStore.activeProfileView === 'referral') {
    return Referral;
  }
  if (uiStore.activeProfileView === 'disimpan') {
    return Disimpan;
  }
  return null;
});

const navigateToDisimpan = () => {
  uiStore.setActiveProfileView('disimpan');
};

// --- STREAK LOGIC ---

const streakData = ref<string[]>([]);
const weekDays = computed(() => {
  const days = [];
  const today = new Date();
  // 7 hari terakhir (termasuk hari ini)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    // const dateStr = d.toISOString().split('T')[0]; // [OLD] UTC
    // [FIX] Gunakan Local Date untuk konsistensi dengan Backend yang sudah disesuaikan offsetnya
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayVal = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayVal}`;

    const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' }); // Sen, Sel, ...
    const dateLabel = d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    }); // 10 Jan

    days.push({
      date: dateStr,
      label: dayName.replace('.', ''), // Hilangkan titik jika ada
      dateLabel: dateLabel,
      isActive: streakData.value.includes(dateStr),
    });
  }
  return days;
});

const fetchStreak = async () => {
  try {
    // Hitung offset timezone user dalam menit (negatif dr getTimezoneOffset)
    // Contoh: WIB (UTC+7) -> getTimezoneOffset = -420 -> kita kirim 420
    const timezoneOffset = -new Date().getTimezoneOffset();

    const response = await axios.get('/learn/progres/streak/', {
      params: {
        timezone_offset: timezoneOffset,
      },
    });
    streakData.value = response.data.active_dates || [];
  } catch (e) {
    console.error('Gagal memuat streak:', e);
  }
};

onMounted(async () => {
  if (user.value) {
    await fetchStreak();
  }
});

const handleLogout = async () => {
  await authStore.logout();
  router.push('/');
};
</script>

<template>
    <div v-if="user" class="space-y-6 max-w-4xl mx-auto">
        
        <div v-if="uiStore.activeProfileView === 'utama'" class="space-y-6">
            <div class="bg-[var(--color-surface-container-high)] rounded-3xl p-6">
                <div class="flex items-start gap-x-5">
                    <UserAvatar :size="96" />
                    <div class="flex-grow">
                        <h1 class="text-2xl md:text-3xl font-bold text-[var(--color-on-background)]">
                            {{ user.first_name }} {{ user.last_name }}
                        </h1>
                        
                        <p class="text-md text-[var(--color-on-surface-variant)] mt-1">
                            @{{ user.username }}
                        </p>

                        <div v-if="badgeAkun" class="mt-3">
                            <span :class="badgeAkun.classes" class="px-2 py-0.5 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full">
                                <span class="material-symbols-outlined text-xs">{{ badgeAkun.icon }}</span>
                                {{ badgeAkun.text }}
                            </span>
                        </div>

                        <p v-if="formattedJoinDate" class="text-sm text-[var(--color-outline)] mt-3 flex items-center gap-x-1.5">
                            <span class="material-symbols-outlined text-base">calendar_today</span>
                            <span>{{ $t('joined_at', { date: formattedJoinDate }) }}</span>
                        </p>
                    </div>
                </div>
            </div>
            <!-- Streak Section -->
            <div class="bg-[var(--color-surface-container-high)] rounded-3xl p-6">
                <div class="flex items-center gap-3 mb-4">
                    <span class="material-symbols-outlined text-[var(--color-primary)]">local_fire_department</span>
                    <h3 class="text-lg font-bold text-[var(--color-on-background)]">{{ $t('weekly_activity') }}</h3>
                </div>
                
                <div class="flex justify-between items-center">
                    <div 
                        v-for="(day, index) in weekDays" 
                        :key="index" 
                        class="flex flex-col items-center gap-2"
                    >
                        <div 
                            class="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-all duration-300"
                            :class="[
                                day.isActive 
                                    ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] scale-110 shadow-lg' 
                                    : 'bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)]'
                            ]"
                        >
                            <span v-if="day.isActive" class="material-symbols-outlined text-sm md:text-base font-bold">check</span>
                            <span v-else class="text-xs md:text-sm font-medium">{{ day.label }}</span>
                        </div>
                        <span class="text-[10px] md:text-xs text-[var(--color-on-surface-variant)]">{{ day.dateLabel }}</span>
                    </div>
                </div>
            </div>

            <!-- Card Navigasi ke Disimpan -->
            <div 
                @click="navigateToDisimpan" 
                class="bg-[var(--color-surface-container-high)] rounded-3xl p-5 cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors group"
            >
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-2xl text-[var(--color-primary)] group-hover:scale-110 transition-transform">bookmarks</span>
                        <div>
                            <h3 class="text-lg font-bold text-[var(--color-on-background)]">{{ $t('bookmarks') }}</h3>
                        </div>
                    </div>
                    <span class="material-symbols-outlined text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all">chevron_right</span>
                </div>
            </div>

            <!-- Card Navigasi ke Referral -->
            <div 
                @click="uiStore.setActiveProfileView('referral')" 
                class="bg-[var(--color-surface-container-high)] rounded-3xl p-5 cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors group"
            >
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-2xl text-[var(--color-primary)] group-hover:scale-110 transition-transform">group_add</span>
                        <div>
                            <h3 class="text-lg font-bold text-[var(--color-on-background)]">{{ $t('referral') }}</h3>
                        </div>
                    </div>
                    <span class="material-symbols-outlined text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all">chevron_right</span>
                </div>
            </div>
        </div>

        <div v-else>
            <Transition name="fade" mode="out-in">
                <KeepAlive>
                    <component :is="activeComponent" />
                </KeepAlive>
            </Transition>
        </div>
    </div>

    <div v-else class="text-center p-8 rounded-3xl bg-[var(--color-surface-container-high)] max-w-4xl mx-auto">
        <span class="material-symbols-outlined text-5xl text-[var(--color-primary)]">
            login
        </span>
        <h2 class="mt-4 text-xl font-bold text-[var(--on-background)]">{{ $t('not_logged_in_title') }}</h2>
        <p class="mt-2 text-base text-[var(--color-on-surface-variant)]">
            {{ $t('not_logged_in_desc') }}
        </p>
        <div class="mt-6">
            <button @click="router.push('/login')" class="px-6 py-3 bg-[var(--color-primary)] text-[var(--color-on-primary)] font-bold rounded-full hover:bg-[var(--color-primary-fixed-dim)] transition-colors">
                {{ $t('login_or_register') }}
            </button>
        </div>
    </div>
</template>

<style scoped>
/* Tidak ada perubahan style */
</style>
