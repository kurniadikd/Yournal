// src/composables/useUsers.ts
// Native Vue implementation (no TanStack Query)

import { api } from '@/utils/api';
import { ref, watch, type Ref } from 'vue';

// --- API Functions ---

/**
 * Fetch paginated and sorted users for the admin panel.
 */
export const fetchUsersAPI = async (
  page: number,
  ordering?: string | null,
  search?: string
) => {
  const params: any = { page };
  if (ordering) {
    params.ordering = ordering;
  }
  if (search) {
    params.search = search;
  }
  const { data } = await api.get('/admin/users/', { params });
  return data;
};

/**
 * Create a new user.
 */
export const createUserAPI = async (userData: any) => {
  const { data } = await api.post('/admin/users/', userData);
  return data;
};

/**
 * Update an existing user.
 */
export const updateUserAPI = async ({ id, ...userData }: { id: number | string; [key: string]: any }) => {
  const { data } = await api.patch(`/admin/users/${id}/`, userData);
  return data;
};

/**
 * Delete a user.
 */
export const deleteUserAPI = async (id: number | string) => {
  await api.delete(`/admin/users/${id}/`);
};

// --- Vue Composables ---

export interface UseUsersReturn {
  data: Ref<any>;
  isLoading: Ref<boolean>;
  isFetching: Ref<boolean>;
  error: Ref<Error | null>;
  isError: Ref<boolean>;
  refetch: () => Promise<void>;
}

/**
 * Composable to fetch users with pagination and sorting.
 */
export function useUsers(
  currentPage: Ref<number>,
  ordering: Ref<string | null>,
  searchQuery: Ref<string>
): UseUsersReturn {
  const data = ref<any>(null);
  const isFetching = ref(false); // Used as isLoading too
  const error = ref<Error | null>(null);
  const isError = ref(false);

  const fetchData = async () => {
    isFetching.value = true;
    error.value = null;
    isError.value = false;

    try {
      data.value = await fetchUsersAPI(
        currentPage.value,
        ordering.value,
        searchQuery.value
      );
    } catch (err) {
      error.value = err as Error;
      isError.value = true;
      console.error('Failed to fetch users:', err);
    } finally {
      isFetching.value = false;
    }
  };

  watch([currentPage, ordering, searchQuery], fetchData, { immediate: true });

  return {
    data,
    isLoading: isFetching,
    isFetching,
    error,
    isError,
    refetch: fetchData,
  };
}

export interface MutationOptions {
  onSuccess?: (data?: any) => void;
  onError?: (error: any) => void;
  onSettled?: () => void;
}

export interface UseUserMutationReturn {
  mutate: (variables: any, options?: MutationOptions) => Promise<any>;
  isPending: Ref<boolean>;
  error: Ref<Error | null>;
}

/**
 * Composable for user mutations (create, update, delete).
 */
export function useUserMutation(
  currentPage: Ref<number>,
  onSuccessGlobal?: () => void
): UseUserMutationReturn {
  const isPending = ref(false);
  const error = ref<Error | null>(null);

  const mutate = async (variables: any, options?: MutationOptions) => {
    isPending.value = true;
    error.value = null;

    try {
      const { id, ...userData } = variables;
      let result: any;

      if (id) {
        // Distinguish delete from update
        if (Object.keys(userData).length === 0) {
          await deleteUserAPI(id);
          result = { deleted: true };
        } else {
          result = await updateUserAPI(variables);
        }
      } else {
        result = await createUserAPI(variables);
      }

      if (onSuccessGlobal) {
        onSuccessGlobal();
      }
      if (options?.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (err: any) {
      error.value = err;
      console.error(
        'User mutation failed:',
        err.response?.data || err.message,
      );
      if (options?.onError) {
        options.onError(err);
      }
      throw err;
    } finally {
      isPending.value = false;
      if (options?.onSettled) {
        options.onSettled();
      }
    }
  };

  return {
    mutate,
    isPending,
    error,
  };
}
