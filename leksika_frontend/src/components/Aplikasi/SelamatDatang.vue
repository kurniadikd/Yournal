<template>
  <div v-if="showOnboarding" class="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 overflow-y-auto hide-scrollbar bg-black/50 backdrop-blur-sm">
    
    <div class="flex flex-col items-center mb-8">
        <img 
            src="/Leksika_icon.svg" 
            alt="Ikon Leksika" 
            class="h-16 w-16 mb-4 flex-shrink-0"
            onerror="this.onerror=null; this.src='https://placehold.co/64x64/F472B6/FFFFFF?text=L'"
        />
        <img 
            src="/leksika-logo.svg" 
            alt="Logo Utama Leksika" 
            class="h-8 w-auto flex-shrink-0 dark:invert"
            onerror="this.onerror=null; this.src='https://placehold.co/120x32/F472B6/FFFFFF?text=LEKSIKA'"
        />
    </div>
    
    <div class="relative mx-auto w-full max-w-sm rounded-4xl bg-[var(--color-surface-container-high)] p-6 shadow-2xl flex-shrink-0">
      
      <transition name="fade" mode="out-in">
        <div :key="step">

          <div v-if="step === 1">
            <h2 class="text-2xl font-bold text-center text-[var(--color-on-background)]">Selamat Datang!</h2>
            <p class="text-center text-sm text-[var(--color-on-surface-variant)] mt-2 mb-6">Untuk memulai, pilih bahasa yang Anda gunakan.</p>
            <Listbox v-model="profileData.native_language">
              <div class="relative">
                <ListboxButton class="relative w-full cursor-default rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] py-3 pl-4 pr-10 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] transition-colors">
                  <span v-if="!profileData.native_language" class="text-[var(--color-outline)]">Pilih bahasa...</span>
                  <span v-else class="block truncate text-[var(--color-on-surface)]">{{ profileData.native_language }}</span>
                  <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[var(--color-outline)]" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                  </span>
                </ListboxButton>
                <ListboxOptions class="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-[var(--color-surface-container-high)] py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                  <ListboxOption v-for="lang in languageStore.opsiBahasa" :key="lang.kodeBahasa" :value="lang.nama" as="template" v-slot="{ active, selected }">
                    <li :class="['relative cursor-default select-none py-2 pl-4 pr-4 text-[var(--color-on-background)]', active ? 'bg-[var(--color-surface-container)]' : '']">
                      <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ lang.nama }}</span>
                    </li>
                  </ListboxOption>
                </ListboxOptions>
              </div>
            </Listbox>
          </div>

          <div v-if="step === 2">
              <h2 class="text-2xl font-bold text-center text-[var(--color-on-background)]">Persetujuan Anda</h2>
              <div class="flex justify-center mb-2">
                <span class="material-symbols-outlined text-[var(--color-primary)] leading-none" style="font-size: 10rem;">
                  contract
                </span>
              </div>
              <p class="text-base text-[var(--color-on-surface-variant)] mb-4 text-justify">
                  Untuk menghadirkan pengalaman, pelayanan, dan keamanan pengguna, kami mewajibkan pengguna untuk melengkapi data diri. Dengan klik Lanjut, Anda setuju dengan ketentuan kami.
              </p>
          </div>

          <div v-if="step === 3">
            <h2 class="text-2xl font-bold text-center text-[var(--color-on-background)]">Kapan tanggal lahirmu?</h2>
            <p class="text-center text-sm text-[var(--color-on-surface-variant)] mt-2 mb-6">Informasi ini membantu kami menyajikan konten yang sesuai.</p>
            <input type="date" id="birth_date" v-model="profileData.birth_date" :max="today" class="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors duration-300 text-[var(--color-on-surface)] bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]">
            <p v-if="calculatedAge" class="text-center text-sm text-[var(--color-on-surface-variant)] mt-2">Usia Anda: {{ calculatedAge }} tahun</p>
          </div>

          <div v-if="step === 4">
            <h2 class="text-2xl font-bold text-center text-[var(--color-on-background)]">Darimana asalmu?</h2>
            <p class="text-center text-sm text-[var(--color-on-surface-variant)] mt-2 mb-6">Pilih negara tempat Anda tinggal saat ini.</p>
            <Combobox v-model="profileData.location">
               <div class="relative">
                 <div class="relative w-full cursor-default overflow-hidden rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] text-left focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--color-primary)] transition-colors">
                   <ComboboxInput
                     class="w-full border-none bg-transparent py-3 pl-4 pr-10 text-sm leading-5 text-[var(--color-on-background)] focus:ring-0"
                     :displayValue="(country) => country"
                     @change="countryQuery = $event.target.value"
                     placeholder="Ketik nama negara..."
                   />
                   <ComboboxButton class="absolute inset-y-0 right-0 flex items-center pr-2">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[var(--color-outline)]" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                   </ComboboxButton>
                 </div>
                 <TransitionRoot leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0" @after-leave="countryQuery = ''">
                   <ComboboxOptions class="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-[var(--color-surface-container-high)] py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                     <div v-if="filteredCountries.length === 0 && countryQuery !== ''" class="relative cursor-default select-none py-2 px-4 text-[var(--color-on-surface-variant)]">
                       Negara tidak ditemukan.
                     </div>
                     <ComboboxOption v-for="country in filteredCountries" :key="country.cca2" :value="country.name.common" as="template" v-slot="{ active, selected }">
                       <li :class="['relative cursor-default select-none py-2 pl-4 pr-4 text-[var(--color-on-background)]', active ? 'bg-[var(--color-surface-container)]' : '']">
                         <div class="flex items-center">
                           <img :src="`https://flagcdn.com/w20/${country.cca2.toLowerCase()}.png`" :alt="`Bendera ${country.name.common}`" class="h-4 mr-3 shrink-0 rounded-sm" width="20" />
                           <span :class="['block truncate', selected ? 'font-semibold' : 'font-normal']">
                             {{ country.name.common }}
                           </span>
                         </div>
                       </li>
                     </ComboboxOption>
                   </ComboboxOptions>
                 </TransitionRoot>
               </div>
             </Combobox>
          </div>

          <div v-if="step === 5">
            <h2 class="text-2xl font-bold text-center text-[var(--color-on-background)]">Apa Minat Anda?</h2>
            <p class="text-center text-sm text-[var(--color-on-surface-variant)] mt-2 mb-6">Pilih beberapa topik untuk personalisasi konten belajar.</p>
            <div class="flex flex-wrap gap-2 justify-center">
              <button v-for="interest in availableInterests" :key="interest" @click="toggleInterest(interest)" :class="['px-4 py-2 rounded-full font-medium transition-colors text-sm', { 'bg-[var(--color-primary)] text-[var(--color-on-primary)]': profileData.interests.includes(interest), 'bg-[var(--color-surface-container)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]': !profileData.interests.includes(interest) }]">
                {{ interest }}
              </button>
            </div>
          </div>

          <div v-if="step === 6">
            <h2 class="text-2xl font-bold text-center text-[var(--color-on-background)]">Atur Avatar Anda</h2>
            <p class="text-center text-sm text-[var(--color-on-surface-variant)] mt-2 mb-6">Ini opsional, Anda bisa mengaturnya nanti.</p>
            
            <div class="flex flex-col items-center space-y-4">
              <div class="relative w-40 h-40 flex-shrink-0 rounded-full">
                <img v-if="avatarPreview" :src="avatarPreview" alt="Avatar" class="w-40 h-40 rounded-full object-cover">
                <div v-else class="w-40 h-40 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] flex items-center justify-center text-6xl font-bold">
                  <span class="font-lexend">{{ userInitials }}</span>
                </div>
              </div>
              
              <div class="flex flex-col items-center space-y-2">
                <button @click="triggerAvatarUpload" class="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-xl hover:bg-[var(--color-primary-fixed-dim)] transition-colors font-medium text-sm">
                  {{ avatarPreview ? 'Ubah Foto' : 'Tambah Foto' }}
                </button>
                <input type="file" ref="fileInput" @change="handleAvatarChange" class="hidden" accept="image/*">
              </div>
            </div>
          </div>

        </div>
      </transition>

      <div class="mt-8 flex items-center" :class="[step > 1 ? 'justify-between' : 'justify-end']">
        <button v-if="step > 1" @click="prevStep" class="px-5 py-2 rounded-xl font-semibold text-[var(--color-on-surface)] bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] transition-colors border border-[var(--color-outline-variant)]">
          Kembali
        </button>
        <button v-if="step < 6" @click="nextStep" :disabled="!isStepValid" class="px-5 py-2 rounded-xl font-semibold text-[var(--color-on-primary)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          Lanjut
        </button>
        <button v-if="step === 6" @click="finishOnboarding" :disabled="isSaving" class="px-5 py-2 rounded-xl font-semibold text-[var(--color-on-primary)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] disabled:opacity-50 flex items-center">
          <span v-if="isSaving" class="material-symbols-outlined animate-spin mr-2">sync</span>
          Selesai
        </button>
      </div>
      

    </div>

    <div class="fixed bottom-0 left-0 w-full h-1.5">
        <div class="bg-[var(--color-primary)] h-1.5 transition-all duration-500 ease-out" :style="{ width: progressBarWidth }"></div>
    </div>
  </div>

  <TransitionRoot :show="showCropperModal" as="template">
      <Dialog as="div" class="relative z-[110]" @close="closeCropperModal">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black/60" @click="closeCropperModal"></div>
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
              <DialogPanel class="relative bg-[var(--color-surface-container-high)] rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col">
                <DialogTitle as="h3" class="text-xl font-bold text-[var(--color-on-background)] mb-4">Potong Gambar</DialogTitle>
                <div class="h-64">
                  <Cropper ref="cropperRef" class="w-full h-full" :src="imageToCrop" :stencil-props="{ aspectRatio: 1/1 }"/>
                </div>
                <div class="flex justify-end space-x-3 mt-6">
                  <button @click="closeCropperModal" class="px-4 py-2 text-sm font-medium text-[var(--color-on-surface)] bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] rounded-xl transition-colors border border-[var(--color-outline-variant)]">Batal</button>
                  <button @click="cropAndSaveImage" class="px-4 py-2 text-sm font-medium text-[var(--color-on-primary)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] rounded-xl transition-colors">Potong & Simpan</button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useLanguageStore } from '@/stores/language';
import { storeToRefs } from 'pinia';
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/vue';
import axios from 'axios';
import { Cropper } from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';

const authStore = useAuthStore();
const languageStore = useLanguageStore();
const { showOnboarding, user } = storeToRefs(authStore);

const TOTAL_STEPS = 6;
const step = ref(1);
const isSaving = ref(false);
const countries = ref<any[]>([]); // Atau buat interface Country
const today = new Date().toISOString().split('T')[0];
const isContractIconFilled = ref(false);

interface ProfileData {
  native_language: string;
  birth_date: string;
  location: string;
  interests: string[];
  avatar: File | null;
}

const profileData = reactive<ProfileData>({
  native_language: '',
  birth_date: '',
  location: '',
  interests: [],
  avatar: null,
});

const availableInterests = [
  'Olahraga',
  'Travel',
  'Bisnis',
  'Teknologi',
  'Seni',
  'Musik',
  'Film',
  'Makanan',
  'Sains',
  'Sejarah',
];

// --- Location/Country Search ---
const countryQuery = ref('');
const filteredCountries = computed(() =>
  countryQuery.value === ''
    ? countries.value
    : countries.value.filter((country) =>
        country.name.common
          .toLowerCase()
          .replace(/\s+/g, '')
          .includes(countryQuery.value.toLowerCase().replace(/\s+/g, '')),
      ),
);

// --- Avatar Cropper Logic ---
const showCropperModal = ref(false);
const imageToCrop = ref<string | null>(null);
const cropperRef = ref<any>(null); // Type 'any' karena library cropper mungkin kompleks
const fileInput = ref<HTMLInputElement | null>(null);

function triggerAvatarUpload() {
  if (fileInput.value) fileInput.value.click();
}

function handleAvatarChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imageToCrop.value = e.target?.result as string;
      showCropperModal.value = true;
    };
    reader.readAsDataURL(file);
  }
  if (target) target.value = '';
}

function cropAndSaveImage() {
  if (!cropperRef.value) return;
  const { canvas } = cropperRef.value.getResult();
  if (canvas) {
    canvas.toBlob(
      (blob: Blob | null) => {
        if (!blob) return;
        const imageFile = new File([blob], 'avatar.webp', {
          type: 'image/webp',
        });
        profileData.avatar = imageFile; // Directly update profileData
        closeCropperModal();
      },
      'image/webp',
      0.85,
    );
  }
}

function closeCropperModal() {
  showCropperModal.value = false;
  imageToCrop.value = null;
}

// --- Computed Properties ---
const progressBarWidth = computed(() => `${(step.value / TOTAL_STEPS) * 100}%`);
const userInitials = computed(
  () =>
    user.value?.first_name?.charAt(0).toUpperCase() +
      user.value?.last_name?.charAt(0).toUpperCase() || 'U',
);
const avatarPreview = computed(() =>
  profileData.avatar ? URL.createObjectURL(profileData.avatar) : null,
);

const calculatedAge = computed(() => {
  if (!profileData.birth_date) return null;
  const birthDate = new Date(profileData.birth_date);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age > 0 ? age : null;
});

const isStep1Valid = computed(() => !!profileData.native_language);
const isStep2Valid = computed(() => true); // Consent step is always valid
const isStep3Valid = computed(() => {
  if (!profileData.birth_date) return false;
  const birthDate = new Date(profileData.birth_date);
  // Cek apakah tanggal valid
  if (isNaN(birthDate.getTime())) return false;

  const today = new Date();
  if (birthDate > today) return false; // Prevent future dates

  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 3;
});
const isStep4Valid = computed(() => !!profileData.location);
const isStep5Valid = computed(() => profileData.interests.length > 0);

const isStepValid = computed(() => {
  switch (step.value) {
    case 1:
      return isStep1Valid.value;
    case 2:
      return isStep2Valid.value;
    case 3:
      return isStep3Valid.value;
    case 4:
      return isStep4Valid.value;
    case 5:
      return isStep5Valid.value;
    default:
      return true; // Step 6 is optional
  }
});

// --- Watchers ---
watch(showOnboarding, (newValue) => {
  if (newValue) {
    step.value = 1;
    // Reset data
    profileData.native_language = user.value?.native_language || '';
    profileData.birth_date = user.value?.birth_date || '';
    profileData.location = user.value?.location || '';
    profileData.interests = user.value?.interests || [];
    profileData.avatar = null;
    imageToCrop.value = null;
  }
});

// --- Methods ---
onMounted(async () => {
  try {
    const response = await axios.get(
      'https://restcountries.com/v3.1/all?fields=name,cca2',
    );
    countries.value = response.data.sort((a: any, b: any) =>
      a.name.common.localeCompare(b.name.common),
    );
  } catch (error) {
    console.error('Gagal mengambil data negara:', error);
  }
});

const nextStep = () => {
  if (isStepValid.value && step.value < TOTAL_STEPS) {
    step.value++;
  }
};

const prevStep = () => {
  if (step.value > 1) {
    step.value--;
  }
};

const toggleInterest = (interest: string) => {
  const index = profileData.interests.indexOf(interest);
  if (index > -1) {
    profileData.interests.splice(index, 1);
  } else {
    profileData.interests.push(interest);
  }
};

const finishOnboarding = async () => {
  isSaving.value = true;
  const payload = new FormData();

  if (profileData.native_language)
    payload.append('form.native_language', profileData.native_language);
  if (profileData.birth_date)
    payload.append('form.birth_date', profileData.birth_date);
  if (profileData.location)
    payload.append('form.location', profileData.location);
  if (profileData.interests.length > 0)
    payload.append('form.interests', JSON.stringify(profileData.interests));
  if (profileData.avatar) payload.append('avatar', profileData.avatar);

  try {
    await authStore.updateProfile(payload);
    authStore.setShowOnboarding(false);
  } catch (error) {
    console.error('Gagal menyimpan data onboarding:', error);
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@500&display=swap');

.font-lexend {
  font-family: 'Lexend', sans-serif;
}
.rounded-4xl {
  border-radius: 2rem;
}
.hide-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
