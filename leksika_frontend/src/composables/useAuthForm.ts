import { ref, watch, computed, onMounted } from 'vue';
import { api } from '@/utils/api';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
// [BARU] Import telemetry
import { getDeviceTelemetry } from '@/utils/telemetry';
// [BARU] Import VueUse
import { useDebounceFn, watchDebounced } from '@vueuse/core';

// --- STATE BERSAMA (SHARED STATE) ---
const isLoginMode = ref(true);
const turnstileToken = ref('');
const checkAvailabilityLoading = ref(false);

// --- FUNGSI BERSAMA (SHARED FUNCTION) ---
const _toggleSharedMode = () => {
  isLoginMode.value = !isLoginMode.value;
  turnstileToken.value = ''; // Selalu reset token saat mode berganti
};

// --- KONSTANTA ---
const turnstileSiteKey = '0x4AAAAAABrHDfl4RjXlj9E1';
const temporaryEmailDomains = [
  'mailinator.com',
  '10minutemail.com',
  'guerrillamail.com',
];

// --- COMPOSABLE UTAMA ---
export function useAuthForm({ emit }: { emit?: any } = {}) {
  const authStore = useAuthStore();
  const registerSuccess = ref(false);

  // --- STATE LOKAL ---
  const loginSuccess = ref(false);
  const loginForm = ref({ identifier: '', password: '' });
  const loginError = ref('');
  const loginLoading = ref(false);

  // State 2FA
  const is2FARequired = ref(false);
  const twoFactorCode = ref('');
  const twoFactorError = ref('');
  const twoFactorLoading = ref(false);

  const registerForm = ref({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone_number: '',
    password: '',
    password_confirm: '',
    referral_code: '',
  });
  const registerError = ref('');
  const registerLoading = ref(false);
  const isRegisterWithEmail = ref(true);

  // State untuk password reset
  const passwordResetLoading = ref(false);
  const passwordResetError = ref('');
  const passwordResetSuccess = ref('');

  // State untuk konfirmasi reset password
  const confirmResetLoading = ref(false);
  const confirmResetError = ref('');
  const confirmResetSuccess = ref('');

  // --- STATE VALIDASI ---
  const firstNameTouched = ref(false);
  const firstNameValid = ref({ status: true, message: '' });
  const lastNameTouched = ref(false);
  const lastNameValid = ref({ status: true, message: '' });
  const usernameTouched = ref(false);
  const usernameValid = ref({ status: true, message: '' });
  const emailTouched = ref(false);
  const emailValid = ref({ status: true, message: '' });
  const phoneNumberTouched = ref(false);
  const phoneNumberValid = ref({ status: true, message: '' });
  const passwordTouched = ref(false);
  const passwordValid = ref({ status: true, message: '' });
  const passwordConfirmTouched = ref(false);
  const passwordConfirmValid = ref({ status: true, message: '' });
  const identifierTouched = ref(false); // Dipindah ke dalam scope fungsi agar reaktif per instance

  // --- STATE DATA NEGARA ---
  const countries = ref([]);
  const selectedCountryCode = ref(null);
  const countryCodeQuery = ref('');

  // --- COMPUTED & WATCHERS ---
  const filteredCountryCodes = computed(() => {
    const q = countryCodeQuery.value.trim().toLowerCase();
    if (!q) return countries.value;
    return countries.value.filter(
      (country) =>
        country.name.toLowerCase().includes(q) || country.dial_code.includes(q),
    );
  });

  const isRegisterFormValid = computed(() => {
    // Kumpulkan semua kondisi validasi di sini
    const isFirstNameValid = registerForm.value.first_name.trim() !== '';
    const isLastNameValid = registerForm.value.last_name.trim() !== '';

    const usernameRegex = /^[a-z0-9_]{5,}$/;
    const isUsernameValidCheck =
      usernameRegex.test(registerForm.value.username) &&
      usernameValid.value.status;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isContactValid = isRegisterWithEmail.value
      ? registerForm.value.email.trim() !== '' &&
        emailRegex.test(registerForm.value.email) &&
        !isTemporaryEmail(registerForm.value.email) &&
        emailValid.value.status
      : registerForm.value.phone_number.trim() !== '' &&
        phoneNumberValid.value.status;

    const isPasswordValidCheck =
      registerForm.value.password.length >= 8 &&
      registerForm.value.password === registerForm.value.password_confirm;

    const isTurnstileValid = !!turnstileToken.value;

    return (
      isFirstNameValid &&
      isLastNameValid &&
      isUsernameValidCheck &&
      isContactValid &&
      isPasswordValidCheck &&
      isTurnstileValid
    );
  });

  watch(isRegisterWithEmail, () => {
    emailTouched.value = false;
    emailValid.value = { status: true, message: '' };
    phoneNumberTouched.value = false;
    phoneNumberValid.value = { status: true, message: '' };
  });

  // Watcher untuk validasi real-time dengan debounce
  const checkAvailability = async (field: string, value: string) => {
    if (!value || checkAvailabilityLoading.value) return;

    checkAvailabilityLoading.value = true;
    const url = `/check-availability/?field=${field}&value=${value}`;

    try {
      const response = await api.get(url);
      if (!response.data.is_available) {
        if (field === 'username')
          usernameValid.value = {
            status: false,
            message: 'Nama pengguna sudah terdaftar.',
          };
        if (field === 'email')
          emailValid.value = {
            status: false,
            message: 'Email sudah terdaftar.',
          };
        if (field === 'phone_number')
          phoneNumberValid.value = {
            status: false,
            message: 'Nomor telepon sudah terdaftar.',
          };
      }
    } catch (error) {
      console.error(`Gagal memeriksa ketersediaan ${field}:`, error);
    } finally {
      checkAvailabilityLoading.value = false;
    }
  };

  // --- WATCH DEBOUNCED ---

  // Watcher untuk email
  watchDebounced(
    () => registerForm.value.email,
    (newValue) => {
      if (!newValue || !emailTouched.value) return;
      emailValid.value = { status: true, message: 'Memeriksa...' }; // Tampilkan pesan loading

      validateEmail();
      if (emailValid.value.status) {
        checkAvailability('email', newValue);
      }
    },
    { debounce: 500 },
  ); // debounce 500ms

  // Watcher untuk nomor telepon
  watchDebounced(
    () => registerForm.value.phone_number,
    (newValue) => {
      if (!newValue || !phoneNumberTouched.value) return;
      phoneNumberValid.value = { status: true, message: 'Memeriksa...' };

      validatePhoneNumber();
      if (phoneNumberValid.value.status) {
        checkAvailability('phone_number', newValue);
      }
    },
    { debounce: 500 },
  );

  // Watcher untuk nama pengguna
  watchDebounced(
    () => registerForm.value.username,
    (newValue) => {
      if (!newValue || !usernameTouched.value) return;
      usernameValid.value = { status: true, message: 'Memeriksa...' };

      validateUsername();
      if (usernameValid.value.status) {
        checkAvailability('username', newValue);
      }
    },
    { debounce: 500 },
  );

  // --- FUNGSI VALIDASI ---
  const isTemporaryEmail = (email: string) => {
    if (!email) return false;
    const domain = email.split('@')[1];
    return temporaryEmailDomains.includes(domain);
  };

  const validateFirstName = () => {
    firstNameTouched.value = true;
    const value = registerForm.value.first_name.trim();
    if (!value) {
      firstNameValid.value = {
        status: false,
        message: 'Nama depan tidak boleh kosong.',
      };
    } else {
      firstNameValid.value = { status: true, message: '' };
    }
  };

  const resetAllForms = () => {
    // Reset form login
    loginForm.value = { identifier: '', password: '' };
    loginError.value = '';

    // Reset form register
    registerForm.value = {
      first_name: '',
      last_name: '',
      username: '',
      email: '',
      phone_number: '',
      password: '',
      password_confirm: '',
      referral_code: '',
    };
    registerError.value = '';

    // Reset semua status 'touched'
    firstNameTouched.value = false;
    lastNameTouched.value = false;
    usernameTouched.value = false;
    emailTouched.value = false;
    phoneNumberTouched.value = false;
    passwordTouched.value = false;
    passwordConfirmTouched.value = false;
    identifierTouched.value = false;

    // Reset semua hasil validasi
    firstNameValid.value = { status: true, message: '' };
    lastNameValid.value = { status: true, message: '' };
    usernameValid.value = { status: true, message: '' };
    emailValid.value = { status: true, message: '' };
    phoneNumberValid.value = { status: true, message: '' };
    passwordValid.value = { status: true, message: '' };
    passwordConfirmValid.value = { status: true, message: '' };
  };

  const validateLastName = () => {
    lastNameTouched.value = true;
    const value = registerForm.value.last_name.trim();
    if (!value) {
      lastNameValid.value = {
        status: false,
        message: 'Nama belakang tidak boleh kosong.',
      };
    } else {
      lastNameValid.value = { status: true, message: '' };
    }
  };

  const validateUsername = () => {
    usernameTouched.value = true;
    const value = registerForm.value.username;
    const usernameRegex = /^[a-z0-9_]+$/;
    if (value.length < 5) {
      usernameValid.value = {
        status: false,
        message: 'Nama pengguna minimal 5 karakter.',
      };
    } else if (!usernameRegex.test(value)) {
      usernameValid.value = {
        status: false,
        message: 'Hanya huruf kecil, angka, dan _.',
      };
    } else {
      // Atur status valid sampai pengecekan backend
      usernameValid.value = { status: true, message: '' };
    }
  };

  const validateEmail = (emailValue?: string) => {
    // TERIMA value sebagai argumen
    emailTouched.value = true;
    const value = emailValue
      ? emailValue.trim()
      : registerForm.value.email.trim(); // Gunakan argumen jika ada
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      emailValid.value = {
        status: false,
        message: 'Email tidak boleh kosong.',
      };
    } else if (!emailRegex.test(value)) {
      emailValid.value = {
        status: false,
        message: 'Format email tidak valid.',
      };
    } else if (isTemporaryEmail(value)) {
      emailValid.value = {
        status: false,
        message: 'Email sementara tidak diizinkan.',
      };
    } else {
      emailValid.value = { status: true, message: '' };
    }
    return emailValid.value;
  };

  const validatePhoneNumber = (phoneValue?: string) => {
    // TERIMA value sebagai argumen
    phoneNumberTouched.value = true;
    const value = phoneValue
      ? phoneValue.trim()
      : registerForm.value.phone_number.trim(); // Gunakan argumen jika ada
    if (!value) {
      phoneNumberValid.value = {
        status: false,
        message: 'Nomor telepon tidak boleh kosong.',
      };
    } else {
      phoneNumberValid.value = { status: true, message: '' };
    }
    return phoneNumberValid.value;
  };

  const validatePassword = (passwordValue?: string) => {
    // TERIMA value sebagai argumen
    passwordTouched.value = true;
    const value = passwordValue || registerForm.value.password; // Gunakan argumen jika ada
    if (value.length < 8) {
      passwordValid.value = {
        status: false,
        message: 'Kata sandi minimal 8 karakter.',
      };
    } else {
      passwordValid.value = { status: true, message: '' };
    }
    if (passwordConfirmTouched.value) {
      validatePasswordConfirm();
    }
    return passwordValid.value;
  };

  const validatePasswordConfirm = () => {
    passwordConfirmTouched.value = true;
    const password = registerForm.value.password;
    const confirm = registerForm.value.password_confirm;
    if (!confirm && password)
      passwordConfirmValid.value = {
        status: false,
        message: 'Konfirmasi kata sandi tidak boleh kosong.',
      };
    else if (password !== confirm)
      passwordConfirmValid.value = {
        status: false,
        message: 'Kata sandi tidak cocok.',
      };
    else passwordConfirmValid.value = { status: true, message: '' };
  };

  const validateAllFields = () => {
    validateFirstName();
    validateLastName();
    validateUsername();
    if (isRegisterWithEmail.value) validateEmail();
    else validatePhoneNumber();
    validatePassword();
    validatePasswordConfirm();
    return !(
      !firstNameValid.value.status ||
      !lastNameValid.value.status ||
      !usernameValid.value.status ||
      !passwordValid.value.status ||
      !passwordConfirmValid.value.status ||
      (isRegisterWithEmail.value && !emailValid.value.status) ||
      (!isRegisterWithEmail.value && !phoneNumberValid.value.status)
    );
  };

  // --- FUNGSI UTAMA ---
  const resetValidationStates = () => {
    firstNameTouched.value = false;
    firstNameValid.value = { status: true, message: '' };
    lastNameTouched.value = false;
    lastNameValid.value = { status: true, message: '' };
    usernameTouched.value = false;
    usernameValid.value = { status: true, message: '' };
    emailTouched.value = false;
    emailValid.value = { status: true, message: '' };
    phoneNumberTouched.value = false;
    phoneNumberValid.value = { status: true, message: '' };
    passwordTouched.value = false;
    passwordValid.value = { status: true, message: '' };
    passwordConfirmTouched.value = false;
    passwordConfirmValid.value = { status: true, message: '' };
  };

  const toggleMode = () => {
    _toggleSharedMode();
    resetAllForms();
  };

  const handle2FAVerification = async () => {
    twoFactorLoading.value = true;
    twoFactorError.value = '';

    try {
      const response = await api.post('/users/login/2fa/verify/', {
        identifier: loginForm.value.identifier, // Perbaiki struktur payload agar sesuai
        token: twoFactorCode.value,
      });

      authStore.setAuth(response.data);
      loginSuccess.value = true;
      is2FARequired.value = false;
    } catch (error: any) {
      twoFactorError.value = error.response?.data?.error || 'Kode tidak valid.';
    } finally {
      twoFactorLoading.value = false;
    }
  };

  const handleLogin = async () => {
    loginLoading.value = true;
    loginError.value = '';
    identifierTouched.value = true;
    passwordTouched.value = true;
    is2FARequired.value = false;

    const identifier = loginForm.value.identifier.trim();
    const password = loginForm.value.password.trim();

    if (!identifier || !password) {
      loginError.value = 'Kredensial dan kata sandi harus diisi.';
      loginLoading.value = false;
      return;
    }

    try {
      // [BARU] Ambil data telemetri sebelum login
      const deviceData = await getDeviceTelemetry();

      console.log('Mengirim payload login:', {
        form: { identifier: identifier, password: password },
      });

      const response = await api.post('/users/login/', {
        form: {
          identifier: identifier,
          password: password,
        },
        device_info: deviceData, // [BARU] Kirim data device
      });

      // PERIKSA RESPON DARI BACKEND
      if (response.data.two_factor_required) {
        is2FARequired.value = true;
        loginError.value = 'Mohon masukkan kode verifikasi 2-Faktor.';
      } else {
        authStore.setAuth(response.data);
        loginSuccess.value = true;
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        loginError.value = error.response.data.message;
      } else {
        loginError.value = 'Terjadi kesalahan. Silakan coba lagi.';
      }
    } finally {
      loginLoading.value = false;
    }
  };

  const handleRegister = async () => {
    registerLoading.value = true;
    registerError.value = '';

    if (!validateAllFields()) {
      registerError.value = 'Mohon periksa kembali semua bidang isian.';
      registerLoading.value = false;
      return;
    }
    if (!turnstileToken.value) {
      registerError.value = 'Mohon selesaikan verifikasi captcha.';
      registerLoading.value = false;
      return;
    }
    if (
      !emailValid.value.status ||
      !phoneNumberValid.value.status ||
      !usernameValid.value.status
    ) {
      registerError.value = 'Mohon perbaiki kesalahan di formulir.';
      registerLoading.value = false;
      return;
    }

    try {
      // [BARU] Ambil data telemetri sebelum register
      const deviceData = await getDeviceTelemetry();

      const phoneFull = !isRegisterWithEmail.value
        ? `${selectedCountryCode.value?.dial_code ?? ''}${registerForm.value.phone_number}`
        : '';
      const payload: any = {
        first_name: registerForm.value.first_name,
        last_name: registerForm.value.last_name,
        username: registerForm.value.username,
        password: registerForm.value.password,
        password_confirm: registerForm.value.password_confirm,
        email: isRegisterWithEmail.value ? registerForm.value.email : undefined,
        phone_number: phoneFull || undefined,
        referral_code: registerForm.value.referral_code || undefined,
        'cf-turnstile-response': turnstileToken.value,
        device_info: deviceData, // [BARU] Kirim data device
      };
      await api.post('/register/', payload);
      registerSuccess.value = true;
    } catch (error: any) {
      const errors = error.response?.data;
      if (errors) {
        const firstErrorKey = Object.keys(errors)[0];
        const errorMessage = Array.isArray(errors[firstErrorKey])
          ? errors[firstErrorKey][0]
          : errors[firstErrorKey];
        registerError.value = errorMessage;
      } else {
        registerError.value = 'Terjadi kesalahan saat pendaftaran.';
      }
    } finally {
      // Delay kosmetik, bisa dihapus jika tidak perlu
      await new Promise((resolve) => setTimeout(resolve, 5000));
      registerLoading.value = false;
    }
  };

  const handlePasswordReset = async (identifier: string) => {
    if (!identifier) {
      passwordResetError.value = 'Kolom ini tidak boleh kosong.';
      return;
    }

    passwordResetLoading.value = true;
    passwordResetError.value = '';
    passwordResetSuccess.value = '';

    try {
      const response = await api.post('/users/password-reset/', {
        email: identifier,
      });
      passwordResetSuccess.value = response.data.message;
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        passwordResetError.value = error.response.data.error;
      } else {
        passwordResetError.value =
          'Terjadi kesalahan. Silakan coba lagi nanti.';
      }
    } finally {
      passwordResetLoading.value = false;
    }
  };

  const handleConfirmReset = async (payload: any) => {
    confirmResetLoading.value = true;
    confirmResetError.value = '';
    confirmResetSuccess.value = '';

    try {
      // [BARU] Opsional: Kirim telemetry saat reset password jika diperlukan
      // const deviceData = await getDeviceTelemetry();
      // payload.device_info = deviceData;

      const response = await api.post('/users/password-reset/', payload);
      confirmResetSuccess.value = response.data.message;
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        confirmResetError.value = error.response.data.error;
      } else {
        confirmResetError.value = 'Terjadi kesalahan. Silakan coba lagi nanti.';
      }
    } finally {
      confirmResetLoading.value = false;
    }
  };

  const handleConfirmResetVerifyCode = async (email: string, code: string) => {
    // Placeholder for missing function if needed,
    // but we have handleVerifyCode below which seems to be the one intended used in previous snippet?
    // No, previous snippet had `handleVerifyCode` separate.
  };

  const handleVerifyCode = async (email: string, code: string) => {
    passwordResetLoading.value = true;
    passwordResetError.value = '';
    // Perlu mendefinisikan codeVerifiedSuccess jika ingin dipakai,
    // tapi di snippet sebelumnya tidak ada di return, jadi saya biarkan internal logic
    // codeVerifiedSuccess.value = false;

    try {
      const response = await api.post('/users/password-reset/', {
        email,
        code,
      });
      passwordResetSuccess.value = response.data.message;
      // codeVerifiedSuccess.value = true;
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        passwordResetError.value = error.response.data.error;
      } else {
        passwordResetError.value =
          'Terjadi kesalahan saat memverifikasi kode. Silakan coba lagi nanti.';
      }
    } finally {
      passwordResetLoading.value = false;
    }
  };

  onMounted(async () => {
    try {
      const response = await axios.get(
        'https://restcountries.com/v3.1/all?fields=name,cca2,idd',
      );

      const countryData = response.data
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

      countries.value = countryData;
      selectedCountryCode.value =
        countryData.find((c) => c.dial_code === '+62') ||
        countryData[0] ||
        null;
    } catch (error) {
      console.error('Gagal mengambil data negara:', error);
      countries.value = [];
      selectedCountryCode.value = null;
    }
  });

  return {
    isLoginMode,
    toggleMode,
    turnstileToken,
    isRegisterFormValid,
    loginSuccess,
    loginForm,
    loginError,
    loginLoading,
    registerForm,
    is2FARequired,
    twoFactorCode,
    twoFactorError,
    twoFactorLoading,
    handle2FAVerification,
    registerError,
    registerLoading,
    isRegisterWithEmail,
    firstNameTouched,
    firstNameValid,
    lastNameTouched,
    lastNameValid,
    usernameTouched,
    usernameValid,
    emailTouched,
    emailValid,
    phoneNumberTouched,
    phoneNumberValid,
    passwordTouched,
    passwordValid,
    passwordConfirmTouched,
    passwordConfirmValid,
    countries,
    turnstileSiteKey,
    selectedCountryCode,
    countryCodeQuery,
    filteredCountryCodes,
    handleLogin,
    registerSuccess,
    handleRegister,
    validateFirstName,
    validateLastName,
    validateUsername,
    validateEmail,
    validatePhoneNumber,
    validatePassword,
    validatePasswordConfirm,
    identifierTouched,
    resetAllForms,
    passwordResetLoading,
    passwordResetError,
    passwordResetSuccess,
    handlePasswordReset,
    confirmResetLoading,
    confirmResetError,
    confirmResetSuccess,
    handleConfirmReset,
  };
}
