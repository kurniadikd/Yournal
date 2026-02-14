<script setup lang="ts">
import { computed } from 'vue';
import { useListsStore } from '@/stores/lists';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';
import ItemCard from '@/components/ItemCard.vue';
import EmptyState from '@/components/EmptyState.vue';

const props = defineProps({
  listId: {
    type: String,
    required: true,
  },
});

const listsStore = useListsStore();
const { user } = storeToRefs(useAuthStore());

// Ambil item-item dari list yang sesuai
const listItems = computed(() => {
  return listsStore.itemsInLists[props.listId];
});

// Anda mungkin perlu membuat `fetchItemsDetails` di store Anda
// atau pastikan data item lengkap sudah tersedia
// Misalnya, jika `listItems` hanya berisi ID, Anda perlu memuat data lengkapnya
// dari API.
// Untuk demonstrasi ini, kita asumsikan item-item sudah tersedia atau bisa diambil.

const isListEmpty = computed(() => {
  return !listItems.value || listItems.value.length === 0;
});
</script>

<template>
  <div>
    <div v-if="!isListEmpty" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ItemCard 
        v-for="item in listItems"
        :key="item.id"
        :item="item"
      />
    </div>
    <div v-else>
      <EmptyState
        title="Daftar ini masih kosong"
        message="Simpan kata atau kalimat ke dalam daftar ini untuk mulai belajar."
        icon="folder_off"
      />
    </div>
  </div>
</template>

<style scoped>
/* Tambahkan gaya khusus jika diperlukan */
</style>
