<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, useId } from 'vue';
import axios from 'axios';
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from '@headlessui/vue';
import { useEventListener, useDebounceFn } from '@vueuse/core';
import { validateName, validateUsername } from '@/utils/validname';
import { formatUsernameInput, formatNameOnBlur } from '@/utils/formatters';

// State UI untuk negara
const countries = ref([]);
const countryQuery = ref('');
const listboxButtonRef = ref(null);
const listboxOptionsStyle = ref({});

// Fungsi untuk menghitung dan mengatur posisi ListboxOptions
const updateListboxOptionsPosition = () => {
  // listboxButtonRef sekarang menunjuk ke ListboxButton
  if (!listboxButtonRef.value) return;

  // PERBAIKAN: Mengakses elemen DOM yang benar (.$el digunakan untuk komponen Vue kustom/Headless UI)
  const buttonElement = listboxButtonRef.value.$el || listboxButtonRef.value;

  // Pastikan kita punya elemen DOM sebelum memanggil getBoundingClientRect
  if (!buttonElement || !buttonElement.getBoundingClientRect) return;

  const buttonRect = buttonElement.getBoundingClientRect();

  listboxOptionsStyle.value = {
    position: 'fixed', // Menggunakan fixed agar tidak terpotong oleh overflow parent
    // Menempel rapat (top: button.bottom)
    top: `${buttonRect.bottom}px`,
    left: `${buttonRect.left}px`,
    width: `${buttonRect.width}px`,
    zIndex: 9999, // Z-index sangat tinggi untuk menghindari tertutup modal/elemen lain
  };
};

// Pastikan posisi diupdate saat komponen dimuat
onMounted(() => {
  nextTick(updateListboxOptionsPosition);
});

// Watcher untuk ListboxButtonRef (diperlukan untuk kasus ref diakses setelah render awal)
watch(listboxButtonRef, (newVal) => {
  if (newVal) {
    nextTick(updateListboxOptionsPosition);
  }
});

const debouncedUpdateListboxOptionsPosition = useDebounceFn(
  updateListboxOptionsPosition,
  100,
);

// Pastikan posisi diupdate saat ukuran jendela berubah (responsif)
useEventListener(window, 'resize', debouncedUpdateListboxOptionsPosition);

// Bersihkan event listener saat komponen dihancurkan
import { onUnmounted } from 'vue';
// useEventListener handles cleanup automatically

// Computed untuk fungsionalitas pencarian di dropdown negara
const filteredCountries = computed(() => {
  if (!countryQuery.value) return countries.value;
  const q = countryQuery.value.trim().toLowerCase();
  return countries.value.filter((country) =>
    country.name.toLowerCase().includes(q),
  );
});

// Mengambil data negara saat komponen dimuat
onMounted(async () => {
  try {
    const response = await axios.get(
      'https://restcountries.com/v3.1/all?fields=name,cca2',
    );
    countries.value = response.data
      .map((c) => ({
        name: c.name?.common ?? 'Unknown',
        iso: (c.cca2 || '').toLowerCase(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Gagal mengambil data negara:', error);
  }
});

// --- DUMMY FORMATTER UNTUK KAPITALISASI OTOMATIS SAAT INPUT ---
const formatNameOnInput = (event) => {
  let value = event.target.value.replace(/[^a-zA-Z\s']/g, '');
  return value.replace(/(?:^|\s)\S/g, (txt) => txt.toUpperCase());
};

const { initialData, formData } = defineProps({
  initialData: { type: Object, required: true },
  formData: { type: Object, required: true },
});

const emit = defineEmits(['update:formData']);

const id = useId();

// 2. State lokal untuk menampung hasil validasi
const usernameValidation = ref({ status: true, message: '' });
const first_nameValidation = ref({ status: true, message: '' });
const last_nameValidation = ref({ status: true, message: '' });

// State untuk UI (menampilkan error setelah interaksi pertama)
const usernameTouched = ref(false);
const first_nameTouched = ref(false);
const last_nameTouched = ref(false);

// Pengecekan 'dirty' per-field, menggunakan isFormDirty dari utils dirtyForm
const isUsernameDirty = computed(
  () =>
    initialData && formData.username !== initialData.username,
);
const is_first_nameDirty = computed(
  () =>
    initialData &&
    formData.first_name !== initialData.first_name,
);
const is_last_nameDirty = computed(
  () =>
    initialData &&
    formData.last_name !== initialData.last_name,
);
const isBirthDateDirty = computed(
  () =>
    initialData &&
    formData.birth_date !== initialData.birth_date,
);
const isLocationDirty = computed(
  () =>
    initialData && formData.location !== initialData.location,
);
const isGenderDirty = computed(
  () => initialData && formData.gender !== initialData.gender,
);

// Pengecekan 'dirty' untuk seluruh bagian form
const isFormSectionDirty = computed(
  () =>
    isUsernameDirty.value ||
    is_first_nameDirty.value ||
    is_last_nameDirty.value ||
    isBirthDateDirty.value ||
    isLocationDirty.value ||
    isGenderDirty.value,
);

// 3. Gunakan 'watch' untuk menjalankan validasi HANYA jika field kotor atau kosong
watch(
  () => formData.username,
  (newValue) => {
    if (isUsernameDirty.value || newValue === '') {
      usernameValidation.value = validateUsername(newValue);
    } else {
      usernameValidation.value = { status: true, message: '' };
    }
  },
  { immediate: true },
);

watch(
  () => formData.first_name,
  (newValue) => {
    if (is_first_nameDirty.value || newValue === '') {
      // Gunakan konfigurasi default Anda
      first_nameValidation.value = validateName(newValue, {
        min: 4,
        max: 10,
        fieldName: 'Nama depan',
      });
    } else {
      first_nameValidation.value = { status: true, message: '' };
    }
  },
  { immediate: true },
);

watch(
  () => formData.last_name,
  (newValue) => {
    if (is_last_nameDirty.value || newValue === '') {
      // Gunakan konfigurasi default Anda
      last_nameValidation.value = validateName(newValue, {
        min: 1,
        max: 10,
        fieldName: 'Nama belakang',
      });
    } else {
      last_nameValidation.value = { status: true, message: '' };
    }
  },
  { immediate: true },
);

// 4. Mengekspos status validasi keseluruhan bagian ini ke induk
const isSectionValid = computed(() => {
  // Jika tidak ada perubahan, anggap valid. Jika ada perubahan, semua field yang diubah harus valid.
  if (!isFormSectionDirty.value) {
    return true;
  }

  // Periksa validasi secara ketat
  const isUsernameValid =
    !isUsernameDirty.value || usernameValidation.value.status;
  const isFirstNameValid =
    !is_first_nameDirty.value || first_nameValidation.value.status;
  const isLastNameValid =
    !is_last_nameDirty.value || last_nameValidation.value.status;

  // Kita tetap harus memastikan field yang *wajib* (username, nama depan, nama belakang) tidak boleh kosong
  // jika mereka berubah dari data awal. Validator sudah menangani kekosongan ini.

  return (
    usernameValidation.value.status &&
    first_nameValidation.value.status &&
    last_nameValidation.value.status
  );
});

defineExpose({ isSectionValid, isFormSectionDirty });
</script>

<template>
  <section class="space-y-4 select-auto">
    
    <div>
      <label :for="`${id}-username`" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Username</label>
      <div class="relative flex items-center">
        <span
          class="absolute left-0 top-0 bottom-0 flex items-center pl-3 text-[var(--color-on-surface)]"
          :class="{
            'text-[var(--color-on-surface)]': !isUsernameDirty,
            'text-[var(--color-primary)]': isUsernameDirty
          }"
        >@</span>
        <input
          type="text"
          :id="`${id}-username`"
          :value="formData.username"
          @input="$emit('update:formData', { ...formData, username: formatUsernameInput($event) })"
          @blur="usernameTouched = true"
          class="w-full p-3 pl-[1.5rem] border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors duration-300 text-[var(--color-on-surface)]"
          :class="{
            'ring-2 ring-[var(--color-error)]': usernameTouched && !usernameValidation.status,
            'bg-[var(--color-surface-container-highest)] border-[var(--color-primary)]': isUsernameDirty,
            'border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]': !isUsernameDirty,
          }"
        >
      </div>
      <p v-if="usernameTouched && !usernameValidation.status" class="mt-1 text-xs text-[var(--color-error)] font-medium">
        {{ usernameValidation.message }}
      </p>
    </div>
    
    <div class="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
      <div class="flex-1">
        <label :for="`${id}-first_name`" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Nama Depan</label>
        <input
          type="text"
          :id="`${id}-first_name`"
          :value="formData.first_name"
          @input="$emit('update:formData', { ...formData, first_name: formatNameOnInput($event) })"
          @blur="first_nameTouched = true; $emit('update:formData', { ...formData, first_name: formatNameOnBlur($event) })"
          class="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors duration-300 text-[var(--color-on-surface)]"
          :class="{
            'ring-2 ring-[var(--color-error)]': first_nameTouched && !first_nameValidation.status,
            'bg-[var(--color-surface-container-highest)] border-[var(--color-primary)]': is_first_nameDirty,
            'border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]': !is_first_nameDirty,
          }"
        >
        <p v-if="first_nameTouched && !first_nameValidation.status" class="mt-1 text-xs text-[var(--color-error)] font-medium">
          {{ first_nameValidation.message }}
        </p>
      </div>

      <div class="flex-1">
        <label :for="`${id}-last_name`" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Nama Belakang</label>
        <input
          type="text"
          :id="`${id}-last_name`"
          :value="formData.last_name"
          @input="$emit('update:formData', { ...formData, last_name: formatNameOnInput($event) })"
          @blur="last_nameTouched = true; $emit('update:formData', { ...formData, last_name: formatNameOnBlur($event) })"
          class="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors duration-300 text-[var(--color-on-surface)]"
          :class="{
            'ring-2 ring-[var(--color-error)]': last_nameTouched && !last_nameValidation.status,
            'bg-[var(--color-surface-container-highest)] border-[var(--color-primary)]': is_last_nameDirty,
            'border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]': !is_last_nameDirty,
          }"
        >
         <p v-if="last_nameTouched && !last_nameValidation.status" class="mt-1 text-xs text-[var(--color-error)] font-medium">
           {{ last_nameValidation.message }}
         </p>
      </div>
    </div>
    <div class="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
      <div class="flex-1">
        <label :for="`${id}-birthDate`" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Tanggal Lahir</label>
        <input
          type="date"
          :id="`${id}-birthDate`"
          :value="formData.birth_date"
          @input="$emit('update:formData', { ...formData, birth_date: $event.target.value })"
          class="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors duration-300 text-[var(--color-on-surface)]"
          :class="{
            'bg-[var(--color-surface-container-highest)] border-[var(--color-primary)]': isBirthDateDirty,
            'border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]': !isBirthDateDirty,
          }"
        >
      </div>

      <div class="flex-1">
        <label :for="`${id}-location`" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Lokasi</label>
        <Listbox
          :modelValue="formData.location"
          @update:modelValue="$emit('update:formData', { ...formData, location: $event })"
        >
          <div class="relative mt-1">
            <ListboxButton
              :id="`${id}-location`"
              ref="listboxButtonRef" 
              @click="nextTick(updateListboxOptionsPosition)"
              class="relative w-full cursor-default rounded-2xl border py-3 pl-3 pr-10 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] transition-colors duration-300 text-[var(--color-on-surface)]"
              :class="{
                'bg-[var(--color-surface-container-highest)] border-[var(--color-primary)]': isLocationDirty,
                'border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]': !isLocationDirty,
              }"
            >
              <span class="block truncate">{{ formData.location || 'Pilih Negara' }}</span> 
              <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5 text-[var(--color-on-surface-variant)]" aria-hidden="true">
                  <path fill-rule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.25 9.25a.75.75 0 011.1 1.02L10 15.148l2.7-2.908a.75.75 0 011.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.55-.24z" clip-rule="evenodd" />
                </svg>
              </span>
            </ListboxButton>
            <transition leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <Teleport to="body">
                <ListboxOptions
                  :style="listboxOptionsStyle"
                  class="max-h-60 overflow-auto rounded-md bg-[var(--color-surface-container)] py-1 text-base shadow-lg ring-1 ring-[var(--color-outline)] focus:outline-none sm:text-sm transform-gpu">
                  <div class="p-2 sticky top-0 bg-[var(--color-surface-container)] z-10">
                    <input type="text" v-model="countryQuery" placeholder="Cari negara..." class="w-full rounded-md border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)] shadow-sm px-2 py-1" />
                  </div>
                  <div v-if="!filteredCountries.length" class="px-3 py-2 text-[var(--color-on-surface-variant)]" tabindex="-1">Tidak ada hasil.</div>
                  <ListboxOption v-for="country in filteredCountries" :key="country.iso" :value="country.name" as="template" v-slot="{ active, selected }">
                    <li :class="[ 'relative cursor-default select-none py-2 pr-4 pl-4', active ? 'bg-[var(--color-surface-container-low)]' : '' ]">
                      <div class="flex items-center">
                        <img :src="`https://flagcdn.com/w20/${country.iso.toLowerCase()}.png`" :alt="`Bendera ${country.name}`" class="h-4 mr-3 shrink-0 rounded-sm" width="20" />
                        <span :class="[ selected ? 'font-semibold' : 'font-normal', 'block truncate text-[var(--color-on-surface)]' ]">{{ country.name }}</span>
                      </div>
                    </li>
                  </ListboxOption>
                </ListboxOptions>
              </Teleport>
            </transition>
          </div>
        </Listbox>
      </div>
    </div>
    <div>
      <label :for="`${id}-gender`" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Jenis Kelamin</label>
      <select
        :id="`${id}-gender`"
        :value="formData.gender"
        @change="$emit('update:formData', { ...formData, gender: $event.target.value })"
        class="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors duration-300 text-[var(--color-on-surface)]"
        :class="{
          'bg-[var(--color-surface-container-highest)] border-[var(--color-primary)]': isGenderDirty,
          'border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]': !isGenderDirty,
        }"
      >
        <option value="" disabled selected>Pilih Jenis Kelamin</option>
        <option value="MALE">Laki-laki</option>
        <option value="FEMALE">Perempuan</option>
        <option value="PREFER_NOT-TO-SAY">Tidak Ingin Memberi Tahu</option>
      </select>
    </div>
  </section>
</template>
