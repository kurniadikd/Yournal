<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import axios from 'axios';
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from '@headlessui/vue';
import { useDebounceFn } from '@vueuse/core';

// Impor validator dan formatter
import { validateEmail } from '@/utils/validemail'; // <-- Impor Validator
import { validatePhoneNumber } from '@/utils/validphonenumber'; // <-- Impor Validator
import { formatEmailInput, formatNumberOnlyInput } from '@/utils/formatters';

const props = defineProps({
  initialData: { type: Object, required: true },
  formData: { type: Object, required: true },
  isEmailDirty: { type: Boolean, default: false },
  isPhoneDirty: { type: Boolean, default: false },
});

const emit = defineEmits(['update:formData']);

// State UI
const countries = ref([]);
const countryCodeQuery = ref('');
const emailTouched = ref(false);
const phoneNumberTouched = ref(false);
const localSelectedCountry = ref(null);
const localPhoneNumberOnly = ref('');
const isAddingEmail = ref(false);
const isAddingPhoneNumber = ref(false);

// State Validasi
const emailValidation = ref({ status: true, message: '' });
// Gunakan status awal `true` agar validasi tidak menghalangi simpan jika field belum disentuh/diisi
const phoneNumberValidation = ref({ status: true, message: '' });

// Computed untuk mengontrol tombol hapus
const canDeleteEmail = computed(() => !!props.formData.phone_number);
const canDeletePhoneNumber = computed(() => !!props.formData.email);

// Fungsi untuk menghapus email atau nomor telepon
function removeEmail() {
  emit('update:formData', { ...props.formData, email: '' });
  isAddingEmail.value = false;
  emailTouched.value = false;
  emailValidation.value = { status: true, message: '' }; // Reset validasi
}

function removePhone() {
  emit('update:formData', { ...props.formData, phone_number: '' });
  isAddingPhoneNumber.value = false;
  phoneNumberTouched.value = false;
  phoneNumberValidation.value = { status: true, message: '' }; // Reset validasi
}

// Watcher utama untuk sinkronisasi dan validasi
watch(
  () => props.formData,
  (newData) => {
    // Logika menampilkan input (tombol "Tambah...")
    if (newData.email || props.initialData.email) {
      isAddingEmail.value = true;
    }
    if (newData.phone_number || props.initialData.phone_number) {
      isAddingPhoneNumber.value = true;
    }

    // 1. VALIDASI EMAIL: Selalu validasi email jika sedang ditampilkan/diisi
    if (isAddingEmail.value) {
      emailValidation.value = validateEmail(newData.email);
    } else {
      emailValidation.value = { status: true, message: '' };
    }

    // 2. LOGIKA KODE NEGARA & VALIDASI TELEPON: Memisahkan nomor telepon dari data induk
    if (countries.value.length > 0 && isAddingPhoneNumber.value) {
      const fullNumber = newData.phone_number || '';
      let foundCountry = countries.value
        .filter((c) => fullNumber.startsWith(c.dial_code))
        .sort((a, b) => b.dial_code.length - a.dial_code.length)[0];

      let numberOnly = '';
      if (foundCountry) {
        numberOnly = fullNumber.substring(foundCountry.dial_code.length);
      } else {
        // Default ke Indonesia jika tidak ditemukan, atau ambil yang pertama
        foundCountry =
          countries.value.find((c) => c.dial_code === '+62') ||
          countries.value[0];
        numberOnly = fullNumber;
      }

      localSelectedCountry.value = foundCountry;
      localPhoneNumberOnly.value = numberOnly;

      // VALIDASI NOMOR TELEPON: Menggunakan numberOnly (tanpa kode negara)
      phoneNumberValidation.value = validatePhoneNumber(numberOnly);
    } else {
      // Jika input telepon tidak ditampilkan, anggap valid
      phoneNumberValidation.value = { status: true, message: '' };
    }
  },
  { immediate: true, deep: true },
);

// LOGIKA KODE NEGARA: Menggabungkan nomor telepon dan mengirim ke induk
const emitPhoneNumberUpdate = useDebounceFn(() => {
  const dialCode = localSelectedCountry.value?.dial_code || '';
  // Hapus spasi dari nomor telepon sebelum digabungkan
  const cleanNumberOnly = localPhoneNumberOnly.value.replace(/\s/g, '');
  const fullNumber = cleanNumberOnly ? `${dialCode}${cleanNumberOnly}` : '';

  // Pastikan hanya memperbarui jika nilainya benar-benar berbeda untuk menghindari loop
  if (fullNumber !== props.formData.phone_number) {
    emit('update:formData', { ...props.formData, phone_number: fullNumber });
  }
}, 300);

watch([localSelectedCountry, localPhoneNumberOnly], () => {
  emitPhoneNumberUpdate();
});

// Mengambil data negara saat komponen dimuat
onMounted(async () => {
  try {
    const response = await axios.get(
      'https://restcountries.com/v3.1/all?fields=name,cca2,idd',
    );
    countries.value = response.data
      .map((c) => {
        const root = c.idd?.root ?? '';
        const suffix = Array.isArray(c.idd?.suffixes)
          ? c.idd.suffixes[0] || ''
          : '';
        const dial = root ? `${root}${suffix}` : '';
        return {
          name: c.name?.common ?? 'Unknown',
          dial_code: dial,
          iso: (c.cca2 || '').toLowerCase(),
        };
      })
      .filter((c) => c.dial_code)
      .sort((a, b) => a.name.localeCompare(b.name));

    // Panggil watch secara manual setelah countries dimuat untuk inisialisasi awal
    watch(
      () => props.formData.phone_number,
      () => {},
      { immediate: true },
    );
  } catch (error) {
    console.error('Gagal mengambil data negara:', error);
  }
});

// Mengekspos status validasi keseluruhan bagian ini ke induk
const isSectionValid = computed(() => {
  // Jika tidak ada kontak yang ditambahkan, anggap tidak valid (Asumsi: minimal 1 kontak wajib)
  if (!props.formData.email && !props.formData.phone_number) {
    return false;
  }
  // Jika ada, kedua kontak yang diisi harus valid
  return emailValidation.value.status && phoneNumberValidation.value.status;
});
defineExpose({ isSectionValid });

// Computed untuk fungsionalitas pencarian di dropdown negara
const filteredCountryCodes = computed(() => {
  if (!countryCodeQuery.value) return countries.value;
  const q = countryCodeQuery.value.trim().toLowerCase();
  return countries.value.filter(
    (country) =>
      country.name.toLowerCase().includes(q) || country.dial_code.includes(q),
  );
});
</script>

<template>
  <section class="space-y-4 select-auto">
    
    <div>
      <label for="email" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Email</label>
      <div v-if="isAddingEmail" class="relative">
        <input
            type="email"
            id="email"
            :value="formData.email"
            @input="$emit('update:formData', { ...formData, email: formatEmailInput($event) })"
            @blur="emailTouched = true"
            placeholder="Masukkan alamat email Anda"
            class="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors duration-300 text-[var(--color-on-surface)]"
            :class="[
              { 'pr-10': formData.email },
              { 'ring-2 ring-[var(--color-error)]': emailTouched && !emailValidation.status },
              isEmailDirty ? 'bg-[var(--color-surface-container-highest)] border-[var(--color-primary)]' : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]'
            ]"
        />
        <button
          v-if="formData.email"
          @click="removeEmail"
          :disabled="!canDeleteEmail"
          class="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--color-outline)] hover:text-[var(--color-error)] disabled:text-[var(--color-outline-variant)] disabled:hover:text-[var(--color-outline-variant)] disabled:cursor-not-allowed"
          aria-label="Hapus Email"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>
        </button>
        <p v-if="emailTouched && !emailValidation.status" class="mt-1 text-xs text-[var(--color-error)] font-medium">{{ emailValidation.message }}</p>
      </div>
      <button v-else @click="isAddingEmail = true" class="w-full p-3 border-2 border-dashed border-[var(--color-outline-variant)] rounded-2xl text-[var(--color-outline)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors text-left">
        + Tambah Email
      </button>
    </div>

    <div>
      <label for="phone" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Nomor Telepon</label>
      <div v-if="isAddingPhoneNumber">
        <div class="flex gap-2 items-start">
          <div class="relative w-32">
            <Listbox v-model="localSelectedCountry">
              <div class="relative">
                <ListboxButton
                  class="relative w-full cursor-default rounded-2xl border py-3 px-3 text-left focus:outline-none focus-visible:ring-2 transition-colors duration-300 text-[var(--color-on-surface)]"
                  :class="isPhoneDirty ? 'bg-[var(--color-surface-container-highest)] border-[var(--color-primary)]' : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]'"
                >
                  <span class="block truncate">{{ localSelectedCountry?.dial_code ?? '—' }}</span>
                </ListboxButton>
                <transition leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions class="absolute mt-1 max-h-60 w-72 overflow-auto rounded-md bg-[var(--color-surface-container)] py-1 text-base shadow-lg ring-1 ring-[var(--color-outline)] focus:outline-none sm:text-sm z-20">
                        <div class="p-2 sticky top-0 bg-[var(--color-surface-container)] z-10">
                            <input type="text" v-model="countryCodeQuery" placeholder="Cari negara..." class="w-full rounded-md border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)] shadow-sm px-2 py-1" />
                        </div>
                        <div v-if="!filteredCountryCodes.length" class="px-3 py-2 text-[var(--color-on-surface-variant)]">Tidak ada hasil.</div>
                        <ListboxOption v-for="country in filteredCountryCodes" :key="country.iso + country.dial_code" :value="country" as="template" v-slot="{ active, selected }">
                            <li :class="[ 'relative cursor-default select-none py-2 pr-4 pl-4', active ? 'bg-[var(--color-surface-container-low)]' : '' ]">
                                <div class="flex items-center">
                                    <img :src="`https://flagcdn.com/w20/${country.iso.toLowerCase()}.png`" :alt="`Bendera ${country.name}`" class="h-4 mr-3 shrink-0 rounded-sm" width="20" />
                                    <span :class="[ selected ? 'font-semibold' : 'font-normal', 'block truncate text-[var(--color-on-surface)]' ]">{{ country.name }} ({{ country.dial_code }})</span>
                                </div>
                            </li>
                        </ListboxOption>
                    </ListboxOptions>
                </transition>
              </div>
            </Listbox>
          </div>
          <div class="relative flex-1">
              <input
                  type="tel"
                  id="phone"
                  :value="localPhoneNumberOnly"
                  @input="localPhoneNumberOnly = formatNumberOnlyInput($event)"
                  @blur="phoneNumberTouched = true"
                  placeholder="Masukkan nomor telepon Anda"
                  class="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors duration-300 text-[var(--color-on-surface)]"
                  :class="[
                      { 'pr-10': formData.phone_number },
                      { 'ring-2 ring-[var(--color-error)]': phoneNumberTouched && !phoneNumberValidation.status },
                      isPhoneDirty ? 'bg-[var(--color-surface-container-highest)] border-[var(--color-primary)]' : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]'
                  ]"
              />
              <button
                v-if="formData.phone_number"
                @click="removePhone"
                :disabled="!canDeletePhoneNumber"
                class="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--color-outline)] hover:text-[var(--color-error)] disabled:text-[var(--color-outline-variant)] disabled:hover:text-[var(--color-outline-variant)] disabled:cursor-not-allowed"
                aria-label="Hapus Nomor Telepon"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>
              </button>
              <p v-if="phoneNumberTouched && !phoneNumberValidation.status" class="mt-1 text-xs text-[var(--color-error)] font-medium">{{ phoneNumberValidation.message }}</p>
          </div>
        </div>
      </div>
      <button v-else-if="false" @click="isAddingPhoneNumber = true" class="w-full p-3 border-2 border-dashed border-[var(--color-outline-variant)] rounded-2xl text-[var(--color-outline)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors text-left">
        + Tambah Nomor Telepon
      </button>
      
      <p v-if="!isSectionValid && !formData.email && !formData.phone_number" class="mt-2 text-xs text-[var(--color-error)] font-medium">
        Minimal satu kontak (Email atau Nomor Telepon) harus diisi.
      </p>
    </div>
  </section>
</template>
