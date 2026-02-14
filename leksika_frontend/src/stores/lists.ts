import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
import { api } from '@/utils/api';

// Interface definitions
export interface ListItem {
  id: string;
  type: string;
  lang_pair?: string;
  title?: string;
  content?: string;
  anchor_sentences?: any[];
  added_at?: string;
  [key: string]: any;
}

export interface UserList {
  id: number;
  name: string;
  icon: string | null;
  special: boolean;
  hidden: boolean;
  items: ListItem[];
}

export const useListsStore = defineStore('lists', {
  state: () => ({
    userLists: [] as UserList[],
    itemsInLists: {} as Record<string, ListItem[]>,
    // DIHAPUS: State isInitialized tidak lagi diperlukan
  }),
  getters: {
    // Generic check for item existence in list by ID and Type
    isItemInList: (state) => (itemId: string | number, listName: string, itemType?: string) => {
      if (!listName) return false;
      const key = listName.toLowerCase();
      // Check if item exists in the list
      return state.itemsInLists[key]?.some(
        (item) => {
           // Basic ID check
           const idMatch = item.id === String(itemId);
           if (!idMatch) return false;
           
           // If itemType is provided, strictly check type if available in stored item
           // If stored item has no type (legacy), fallback to ID match only
           if (itemType && item.type) {
             // Handle legacy mismatch: narrative vs sentence
             // Narasi and Sentence types share ID space (SentenceGroup), so treat them as equivalent for existence check
             if ((itemType === 'narasi' && item.type === 'sentence') || 
                 (itemType === 'sentence' && item.type === 'narasi')) {
                 return true;
             }
             return item.type === itemType;
           }
           return true; 
        }
      );
    },
    isFavorite: (state) => (sentenceId: string | number) => {
      // 'favorit' key might need safe access if not initialized
      return state.itemsInLists['favorit']?.some(
        (item) => item.id === String(sentenceId),
      ) || false;
    },
    getFolders: (state) => {
      // Filter out hidden lists and 'Dilaporkan' (which is special and hidden)
      // 'Riwayat' is now not hidden, but should still be excluded from general folders for adding items
      return state.userLists.filter(
        (list) => !list.hidden && list.name.toLowerCase() !== 'dilaporkan',
      );
    },
  },
  actions: {
    async initializeLists() {
      const authStore = useAuthStore();
      const userId = authStore.user?.id; // Use userId instead of username
      if (!userId) return;

      try {
        // Call the new compound API endpoint
        const response = await api.get(`/users/${userId}/list/`); // Changed endpoint
        const fetchedLists: any[] = response.data;

        const newItemsInLists: Record<string, ListItem[]> = {};
        const newUserLists: UserList[] = [];

        fetchedLists.forEach((list) => {
          const key = list.name.toLowerCase();
          newUserLists.push({
            id: list.id,
            name: list.name,
            icon: list.icon,
            special: list.special || false,
            hidden: list.hidden || false,
            items: list.items || [], // Now contains full item details
          });
          // itemsInLists will now store the full item objects, not just IDs
          newItemsInLists[key] = list.items || [];
        });

        this.itemsInLists = newItemsInLists;
        this.userLists = newUserLists;
        console.log(
          '✅ Daftar tersinkronisasi dari backend (dengan detail item).',
        );
      } catch (error) {
        console.error('🔥 Gagal menyinkronkan daftar dari Django:', error);
      }
    },
    // ... sisa actions tidak berubah ...
    /**
     * Tambah item ke list dengan metadata
     * @param {Object} params
     * @param {string|number} params.itemId - ID item
     * @param {string} params.itemType - Tipe item: 'word' | 'sentence' | 'materi'
     * @param {string} params.langPair - Pasangan bahasa: 'id-en', 'id-jp', etc.
     * @param {string} params.listName - Nama list/folder
     */
    async addToList({ itemId, itemType = 'unknown', langPair = '', listName, title, content, anchor_sentences }: any) {
      const authStore = useAuthStore();
      if (!authStore.isLoggedIn) return;

      try {
        const idAsString = String(itemId);
        await api.post(`/users/list/${listName}/add-item/`, {
          item: {
            id: idAsString,
            type: itemType,
            lang_pair: langPair,
            added_at: new Date().toISOString(),
            title,
            content,
            anchor_sentences,
          },
        });

        const key = listName.toLowerCase();
        if (!this.itemsInLists[key]) {
          this.itemsInLists[key] = [];
        }
        
        // Only add if not already present
        if (!this.itemsInLists[key].some((item) => item.id === idAsString)) {
          // Tambah item sementara ke state lokal, akan di-sync ulang nanti
          this.itemsInLists[key].push({
            id: idAsString,
            type: itemType,
            lang_pair: langPair,
            title: title || `Item ${idAsString.substring(0, 8)}`,
            content,
            anchor_sentences,
          });
        }

        // Update userLists juga
        const list = this.userLists.find((l) => l.name.toLowerCase() === key);
        if (list && !list.items.some((item) => item.id === idAsString)) {
          list.items.unshift({
            id: idAsString,
            type: itemType,
            lang_pair: langPair,
            title: title || `Item ${idAsString.substring(0, 8)}`,
            content,
            anchor_sentences,
          });
        }
      } catch (error) {
        console.error('🔥 Gagal menambahkan ke daftar:', error);
        throw error;
      }
    },

    async removeFromList({ itemId, listName }: { itemId: string | number; listName: string }) {
      const authStore = useAuthStore();
      if (!authStore.isLoggedIn) return;

      try {
        // Bisa pakai format lama (item_id) karena backend support keduanya
        await api.post(`/users/list/${listName}/remove-item/`, {
          item_id: String(itemId),
        });

        const key = listName.toLowerCase();
        const strItemId = String(itemId);

        // Filter out the item by its ID
        this.itemsInLists[key] =
          this.itemsInLists[key]?.filter((item) => item.id !== strItemId) || [];

        // Update userLists juga
        const list = this.userLists.find((l) => l.name.toLowerCase() === key);
        if (list) {
          list.items = list.items.filter((item) => item.id !== strItemId);
        }
      } catch (error) {
        console.error('🔥 Gagal menghapus dari daftar:', error);
        throw error;
      }
    },
    /**
     * Toggle status favorit untuk sebuah item
     * @param {string|number} itemId - ID item
     * @param {string} itemType - Tipe item: 'word' | 'sentence' | 'materi'
     * @param {string} langPair - Pasangan bahasa: 'id-en', etc.
     */
    toggleFavorite(itemId: string | number, itemType = 'unknown', langPair = '') {
      const listName = 'Favorit';
      if (this.isFavorite(itemId)) {
        this.removeFromList({ itemId, listName });
      } else {
        this.addToList({ itemId, itemType, langPair, listName });
      }
    },
    async addList({ name, icon, isSystem = false }: { name: string; icon: string | null; isSystem?: boolean }) {
      const authStore = useAuthStore();
      const username = authStore.user?.username;
      if (!username) throw new Error('Pengguna belum login.');

      const RESERVED_LIST_NAMES = ['Favorit', 'Riwayat', 'Dilaporkan'];
      if (!isSystem && RESERVED_LIST_NAMES.includes(name)) {
        throw new Error(`Nama daftar '${name}' tidak diizinkan.`);
      }

      try {
        const response = await api.post(`/users/list/`, { name, icon });
        const newList = response.data;
        this.userLists.push({
          id: newList.id,
          name: newList.name,
          icon: newList.icon,
          special: false,
          hidden: false,
          items: newList.items,
        });
        this.itemsInLists[newList.name.toLowerCase()] = newList.items || [];
      } catch (error) {
        console.error('🔥 Gagal membuat daftar baru:', error);
        throw error;
      }
    },
    /**
     * Tambah item ke riwayat
     * @param {string|number} itemId - ID item
     * @param {string} itemType - Tipe item
     * @param {string} langPair - Pasangan bahasa
     */
    async addToHistory(itemId: string | number, itemType = 'unknown', langPair = '') {
      const historyList = this.userLists.find(
        (list) => list.name.toLowerCase() === 'riwayat',
      );
      if (!historyList) {
        console.warn("Daftar 'Riwayat' tidak ditemukan.");
        return;
      }
      // Use the existing addToList action
      await this.addToList({
        itemId,
        itemType,
        langPair,
        listName: historyList.name,
      });
    },
    async fetchDetailsForItems(listId: number) {
      // Now takes listId
      const list = this.userLists.find((l) => l.id === listId);
      if (list) {
        return list.items; // Return the already fetched detailed items
      }
      return [];
    },

    async updateList({ listId, name, icon }: { listId: number; name?: string; icon?: string }) {
      const authStore = useAuthStore();
      if (!authStore.isLoggedIn) return;

      try {
        const payload: any = {};
        if (name) payload.name = name;
        if (icon) payload.icon = icon;

        const response = await api.patch(`/users/list/${listId}/`, payload);
        const updatedList = response.data;

        // Update local state
        const index = this.userLists.findIndex((l) => l.id === listId);
        if (index !== -1) {
          // Preserve items while updating metadata
          this.userLists[index] = {
            ...this.userLists[index],
            ...updatedList,
            items: this.userLists[index].items,
          };

          // Re-key itemsInLists if name changed
          const oldName = this.userLists[index].name.toLowerCase();
          const newName = updatedList.name.toLowerCase();

          if (oldName !== newName && this.itemsInLists[oldName]) {
            this.itemsInLists[newName] = this.itemsInLists[oldName];
            delete this.itemsInLists[oldName];
          }
        }
        console.log(`✅ Daftar '${name}' berhasil diupdate.`);
      } catch (error) {
        console.error('🔥 Gagal mengupdate daftar:', error);
        throw error;
      }
    },

    async deleteList(listId: number) {
      const authStore = useAuthStore();
      const username = authStore.user?.username;
      if (!username) throw new Error('Pengguna belum login.');

      const listToDelete = this.userLists.find((list) => list.id === listId);
      if (!listToDelete) {
        throw new Error('Daftar tidak ditemukan.');
      }

      // Prevent deletion of "Favorit" and "Dilaporkan"
      if (
        listToDelete.special ||
        ['favorit', 'riwayat', 'dilaporkan'].includes(
          listToDelete.name.toLowerCase(),
        )
      ) {
        throw new Error(`Daftar '${listToDelete.name}' tidak dapat dihapus.`);
      }

      try {
        await api.delete(`/users/list/${listToDelete.id}/`);
        this.userLists = this.userLists.filter((list) => list.id !== listId);
        delete this.itemsInLists[listToDelete.name.toLowerCase()];
        console.log(`✅ Daftar '${listToDelete.name}' berhasil dihapus.`);
      } catch (error) {
        console.error('🔥 Gagal menghapus daftar:', error);
        throw error;
      }
    },
  },
});
