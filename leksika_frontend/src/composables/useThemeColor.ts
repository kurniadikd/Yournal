import { computed, type Ref } from 'vue';
import { useSettingsStore } from '@/stores/settings';

/**
 * Composable untuk mendapatkan nilai warna reaktif dari matriks tema.
 * @param y - Indeks kecerahan warna (0-4).
 * @returns {import('vue').ComputedRef<string>} Warna heksadesimal yang reaktif.
 */
export function useThemeColor(y: Ref<number> | number) {
  const settings = useSettingsStore();

  return computed(() => {
    // Pastikan matriks tersedia sebelum diakses
    // if (!settings.activeThemeMatrix) return '';

    // Tentukan indeks x (0 untuk terang, 1 untuk gelap)
    // const x = settings.effectiveColorMode === 'light' ? 0 : 1;

    // Ambil nilai y dari ref jika ada, atau gunakan langsung
    const yValue = typeof y === 'object' ? (y as Ref<number>).value : y;

    // KEMBALIKAN WARNA DARI STORE
    // FIXME: activeThemeMatrix dan effectiveColorMode tidak ditemukan di store settings yang sekarang.
    // Sementara kita return string kosong unuk menghindari error build.
    return '';
    // return settings.activeThemeMatrix[x][yValue];
  });
}
