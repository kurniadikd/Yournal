<template>
  <div
    class="px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 bg-[var(--color-surface-container)] min-h-screen rounded-3xl w-full h-full flex flex-col">

    <header class="flex items-center mb-6 flex-shrink-0">
      <button @click="emit('back')"
        class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] transition-colors"
        aria-label="Kembali" :disabled="isAiModeActive">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div class="flex-grow text-center">
        <h1 v-if="!isAiModeActive && !isAiNarrativeModeActive"
          class="text-xl font-bold text-[var(--color-on-background)]">{{ $t('admin.manage_sentence') }}</h1>
        <div v-else class="flex items-center justify-center gap-2 text-xl font-bold text-[var(--color-tertiary)]">
          <span class="material-symbols-outlined animate-spin">sync</span>
          <span>{{ isAiNarrativeModeActive ? $t('admin.processing_narrative') : $t('admin.ai_completion_active')
          }}</span>
        </div>
      </div>
      <button @click="showJsonModal = true"
        class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] hover:bg-[var(--color-surface-container-highest)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :title="$t('admin.import_from_json')" :disabled="isAiModeActive">
        <span class="material-symbols-outlined">file_json</span>
      </button>
    </header>

    <div class="flex items-center justify-end gap-4 mb-4">
      <button @click="startAiCompletionMode"
        :disabled="isAiModeActive || isAddingNewRow || allIncompleteRowsCount === 0" :class="[
          isAiModeActive
            ? 'bg-[var(--color-error)] hover:bg-[var(--color-error-container)] focus:ring-[var(--color-error)]'
            : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] focus:ring-[var(--color-primary)]',
          'flex items-center gap-2 text-[var(--color-on-primary)] font-medium py-2 px-4 rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed'
        ]">
        <span class="material-symbols-outlined text-base">{{ isAiModeActive ? 'stop_circle' : 'magic_button' }}</span>
        <span>{{ $t('admin.complete_all_ai', { count: allIncompleteRowsCount }) }}</span>
      </button>
      <button @click="toggleAiNarrativeMode" :disabled="isAiModeActive || isAddingNewRow" :class="[
        isAiNarrativeModeActive
          ? 'bg-[var(--color-error)] hover:bg-[var(--color-error-container)] focus:ring-[var(--color-error)]'
          : 'bg-[var(--color-tertiary)] hover:bg-[var(--color-tertiary-fixed-dim)] focus:ring-[var(--color-tertiary)]',
        'flex items-center gap-2 text-[var(--color-on-tertiary)] font-medium py-2 px-4 rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed'
      ]">
        <span class="material-symbols-outlined text-base">{{ isAiNarrativeModeActive ? 'stop_circle' : 'auto_stories'
        }}</span>
        <span>{{ isAiNarrativeModeActive ? $t('admin.stop_ai') : $t('admin.generate_ai_narrative') }}</span>
      </button>
      <button @click="startAddNew" :disabled="isAddingNewRow || isAiModeActive"
        class="flex items-center gap-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 px-4 rounded-xl hover:bg-[var(--color-primary-fixed-dim)] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] dark:focus:ring-offset-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed">
        <span class="material-symbols-outlined text-base">add</span>
        <span>{{ $t('admin.new_group') }}</span>
      </button>
    </div>

    <div v-if="isError"
      class="bg-[var(--color-error-container)] border border-[var(--color-error)] text-[var(--color-on-error-container)] px-4 py-3 rounded-2xl mb-4"
      role="alert">
      <strong class="font-bold">{{ $t('error_occurred') }}: </strong>
      <span class="block sm:inline">{{ error.message }}</span>
    </div>

    <div v-if="isLoading" class="text-center py-12 flex-grow flex items-center justify-center">
      <div class="flex flex-col items-center gap-3">
        <LoadingSpinner size="xl" color="outline" />
        <p class="text-[var(--color-on-surface-variant)]">{{ $t('loading_data') }}</p>
      </div>
    </div>

    <div v-else-if="!sentencesData || sentencesData.results.length === 0"
      class="text-center py-12 bg-[var(--color-surface-container)] rounded-2xl border border-[var(--color-outline-variant)] shadow-sm flex-grow flex items-center justify-center">
      <div>
        <span class="material-symbols-outlined text-5xl text-[var(--color-outline)]">article</span>
        <p class="mt-2 font-semibold text-[var(--color-on-surface-variant)]">{{ $t('admin.no_sentence_data') }}</p>
      </div>
    </div>

    <div v-else class="flex-grow flex flex-col overflow-hidden">
      <main class="flex-1 bg-[var(--color-surface-container)] rounded-2xl overflow-hidden flex flex-col">
        <div class="overflow-x-auto flex-1">
          <table class="w-full text-left" style="min-width: 1000px;">
            <thead class="sticky top-0 bg-[var(--color-surface-container-high)] z-10">
              <tr>
                <th @click="setSort('id')"
                  class="p-4 font-semibold text-[var(--color-on-surface)] w-16 cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors">
                  <div class="flex items-center gap-1">
                    <span>ID</span>
                    <span v-if="sortKey === 'id'" class="material-symbols-outlined text-sm">{{ sortOrder === 'asc' ?
                      'arrow_upward' : 'arrow_downward' }}</span>
                  </div>
                </th>
                <th v-for="lang in availableLanguages" :key="lang.kodeBahasa"
                  @click="setSort(`sentences__${lang.kodeBahasa}`)"
                  class="p-4 font-semibold text-[var(--color-on-surface)] cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors"
                  style="min-width: 300px;">
                  <div class="flex items-center gap-1">
                    <span>{{ lang.nama }}</span>
                    <span v-if="sortKey === `sentences__${lang.kodeBahasa}`"
                      class="material-symbols-outlined text-sm">{{ sortOrder === 'asc' ? 'arrow_upward' :
                        'arrow_downward' }}</span>
                  </div>
                </th>
                <th @click="setSort('has_narrative')"
                  class="p-4 font-semibold text-[var(--color-on-surface)] w-48 cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors">
                  <div class="flex items-center gap-1">
                    <span>{{ $t('type_narasi') }}</span>
                    <span v-if="sortKey === 'has_narrative'" class="material-symbols-outlined text-sm">{{ sortOrder ===
                      'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                  </div>
                </th>
                <th class="p-4 font-semibold text-[var(--color-on-surface)] text-right w-32">{{ $t('action') }}</th>
              </tr>
            </thead>
            <tbody class="bg-[var(--color-surface-container)]">
              <tr v-if="isAddingNewRow"
                class="border-b border-[var(--color-outline-variant)] bg-[var(--color-tertiary-container)]">
                <td class="p-2 font-mono text-sm text-[var(--color-on-tertiary-container)] align-top">
                  <span class="material-symbols-outlined text-[var(--color-primary)]">add_circle</span>
                </td>
                <td v-for="lang in availableLanguages" :key="lang.kodeBahasa" class="p-1 text-sm align-top">
                  <textarea v-model="newSentenceData.sentences[lang.kodeBahasa]" @input="autoResize" rows="1"
                    class="w-full bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-lg p-1 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition text-sm leading-tight resize-none overflow-hidden text-[var(--color-on-surface)]"></textarea>
                </td>
                <td class="p-2 text-right align-top">
                  <div class="flex items-center justify-end gap-2">
                    <button @click="saveNewSentence"
                      class="text-[var(--color-on-background)] hover:text-[var(--color-primary)] transition-colors"
                      :title="$t('save')">
                      <span class="material-symbols-outlined">save</span>
                    </button>
                    <button @click="cancelAddNew"
                      class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-on-background)] hover:text-[var(--color-error)] transition-colors"
                      :title="$t('cancel')">
                      <span class="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-for="group in displayRows" :key="group.id" :data-row-id="group.id"
                class="border-b border-[var(--color-outline-variant)] last:border-b-0 transition-colors" :class="{
                  'bg-[var(--color-primary-container)]': isAiModeActive && aiQueue.some(item => item.id === group.id),
                  'bg-[var(--color-surface-container-high)]': editingRows[group.id],
                  'bg-[var(--color-tertiary-container)] animate-pulse': processingId === group.id,
                  'opacity-50 pointer-events-none': (isAiModeActive && !aiQueue.some(item => item.id === group.id) && processingId !== group.id) || (isAiNarrativeModeActive && processingId !== group.id),
                }">
                <td class="p-2 font-mono text-sm align-top text-[var(--color-outline)] transition-opacity"
                  :class="{ 'opacity-60': !group.is_active }">
                  <div class="flex items-center gap-2">
                    <span v-if="isCompleting[group.id]"
                      class="material-symbols-outlined text-[var(--color-primary)] animate-spin">sync</span>
                    <span v-else>{{ group.id }}</span>
                  </div>
                </td>
                <td v-for="lang in availableLanguages" :key="lang.kodeBahasa"
                  class="p-1 text-sm align-top transition-opacity" :class="{ 'opacity-60': !group.is_active }">
                  <div class="p-2 leading-relaxed" :class="{ 'text-[var(--color-on-background)]': group.is_active }">
                    {{ findSentence(group, lang.kodeBahasa) }}
                  </div>
                </td>
                <!-- Narrative Title Cell -->
                <td class="p-2 text-sm align-top transition-opacity" :class="{ 'opacity-60': !group.is_active }">
                  <div v-if="group.has_narrative" class="p-2">
                    <span class="text-[var(--color-primary)] font-medium">{{ group.narrative_title || 'Narasi' }}</span>
                  </div>
                  <div v-else class="p-2 text-[var(--color-outline)]">---</div>
                </td>
                <td class="p-2 text-right align-top">
                  <div class="flex items-center justify-end gap-2">
                    <button @click="copyToClipboard(group)"
                      class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-on-surface)] hover:bg-[var(--color-primary-container)] hover:text-[var(--color-on-primary-container)] transition-colors"
                      :title="$t('admin.copy_json')">
                      <span class="material-symbols-outlined text-base">content_copy</span>
                    </button>
                    <button @click="openEditModal(group.id)" :disabled="isAddingNewRow || isAiModeActive"
                      class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-on-surface)] hover:bg-[var(--color-primary-container)] hover:text-[var(--color-on-primary-container)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      :title="$t('admin.edit_sentence')">
                      <span class="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button
                      @click="group.is_active ? deactivateMutation.mutate(group.id) : activateMutation.mutate(group.id)"
                      :disabled="deactivateMutation.isPending.value || activateMutation.isPending.value"
                      class="flex items-center justify-center w-8 h-8 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      :class="[
                        group.is_active
                          ? 'text-[var(--color-on-surface)] hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)]'
                          : 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)]'
                      ]" :title="group.is_active ? $t('deactivate') : $t('activate')">
                      <span class="material-symbols-outlined"
                        :class="{ 'animate-spin': deactivateMutation.isPending.value || activateMutation.isPending.value }">
                        {{ (deactivateMutation.isPending.value || activateMutation.isPending.value) ? 'sync' :
                          'visibility_off' }}
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <nav v-if="totalPages > 1"
          class="p-4 bg-[var(--color-surface-container)] flex justify-between items-center gap-4"
          :class="{ 'pointer-events-none opacity-50': isAiModeActive || isAiNarrativeModeActive }">
          <div class="flex items-center gap-2">
            <button @click="handlePageClick(1)" :disabled="currentPage <= 1"
              class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-on-surface)] enabled:hover:bg-[var(--color-surface-container-high)] transition-colors disabled:opacity-50"
              :title="$t('admin.first_page')">
              <span class="material-symbols-outlined text-lg">first_page</span>
            </button>

            <button @click="handlePageClick(currentPage - 1)" :disabled="currentPage <= 1"
              class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-on-surface)] enabled:hover:bg-[var(--color-surface-container-high)] transition-colors disabled:opacity-50"
              :title="$t('admin.prev_page')">
              <span class="material-symbols-outlined text-lg">chevron_left</span>
            </button>
          </div>

          <div ref="scrollContainer" class="flex justify-start items-center gap-2 overflow-x-auto scrollbar-hide px-2"
            style="white-space: nowrap;">
            <button v-for="page in visiblePageRange" :key="page" :data-page="page" @click="handlePageClick(page)"
              :aria-current="page === currentPage ? 'page' : null" :class="['inline-block px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                page === currentPage
                  ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-md'
                  : 'text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]'
              ]">
              {{ page }}
            </button>
          </div>

          <div class="flex items-center gap-2">
            <button @click="handlePageClick(currentPage + 1)" :disabled="currentPage >= totalPages"
              class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-on-surface)] enabled:hover:bg-[var(--color-surface-container-high)] transition-colors disabled:opacity-50"
              :title="$t('admin.next_page')">
              <span class="material-symbols-outlined text-lg">chevron_right</span>
            </button>

            <button @click="handlePageClick(totalPages)" :disabled="currentPage >= totalPages"
              class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-on-surface)] enabled:hover:bg-[var(--color-surface-container-high)] transition-colors disabled:opacity-50"
              :title="$t('admin.last_page')">
              <span class="material-symbols-outlined text-lg">last_page</span>
            </button>
          </div>
        </nav>
      </main>
    </div>

    <TransitionRoot :show="showJsonModal" as="template">
      <Dialog as="div" @close="showJsonModal = false" class="relative z-50">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-300 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black/50" />
        </TransitionChild>

        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-300 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel
              class="w-full max-w-xl mx-4 rounded-4xl bg-[var(--color-surface-container-high)] p-6 shadow-2xl">
              <div class="relative flex items-center justify-center mb-6">
                <h2 class="text-2xl font-bold text-[var(--color-on-background)]">{{ $t('admin.import_title') }}</h2>
                <button @click="showJsonModal = false"
                  class="absolute right-0 top-0 p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
              <hr class="my-4 border-[var(--color-outline-variant)]" />
              <p class="text-sm text-[var(--color-on-surface-variant)] mb-4">
                Tempelkan array JSON dari objek kalimat.
                <button @click="showJsonInfoModal = true"
                  class="text-[var(--color-primary)] hover:text-[var(--color-primary-fixed-dim)] hover:underline font-medium transition-colors">
                  Lihat formatnya
                </button>.
              </p>
              <textarea v-model="jsonInput"
                class="w-full h-48 p-2 border border-[var(--color-outline-variant)] rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm font-mono"></textarea>
              <p v-if="jsonError" class="mt-2 text-sm text-[var(--color-error)]">{{ jsonError }}</p>
              <div class="mt-6 flex justify-end space-x-2">
                <button @click="showJsonModal = false"
                  class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-high)]">{{
                    $t('cancel') }}</button>
                <button @click="processJsonInput"
                  class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] text-[var(--color-on-primary)] transition-colors">{{
                    $t('admin.import_button') }}</button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <TransitionRoot :show="isConfirmCancelDialogOpen" as="template">
      <Dialog @close="isConfirmCancelDialogOpen = false" class="relative z-60">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black/60" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel
              class="w-full max-w-sm transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-center align-middle shadow-xl transition-all">
              <div
                class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-error-container)]">
                <span class="material-symbols-outlined text-4xl text-[var(--color-on-error-container)]">warning</span>
              </div>
              <DialogTitle as="h3" class="mt-4 text-2xl font-bold text-[var(--color-on-background)]">{{
                $t('admin.cancel_confirm_title') }}
              </DialogTitle>
              <p class="mt-2 text-sm text-[var(--color-on-surface-variant)]">{{ $t('admin.cancel_confirm_button_desc')
                || 'Anda memiliki perubahan yang belum disimpan. Apakah Anda yakin ingin membatalkan?' }}</p>
              <div class="mt-6 grid grid-cols-2 gap-3">
                <button type="button" @click="isConfirmCancelDialogOpen = false"
                  class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]">{{
                    $t('no') }}</button>
                <button @click="confirmCancelEdit"
                  class="w-full rounded-xl bg-[var(--color-error)] px-4 py-2 font-semibold text-[var(--color-on-error)] transition-colors hover:bg-[var(--color-error-container)]">{{
                    $t('admin.cancel_confirm_button') }}</button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>


    <TransitionRoot :show="showAiModal" as="template">
      <Dialog as="div" @close="stopAiMode" class="relative z-50">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black/50" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
              enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
              leave-to="opacity-0 scale-95">
              <DialogPanel
                class="w-full max-w-2xl transform overflow-hidden rounded-4xl bg-[var(--color-surface-container-high)] p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle as="h3" class="text-2xl font-bold leading-6 text-[var(--color-on-background)]">
                  {{ isAiNarrativeModeActive ? 'Proses Generate Narasi AI' : 'Proses Pelengkapan AI Otomatis' }}
                </DialogTitle>
                <div class="mt-4 space-y-4">
                  <div>
                    <div class="flex justify-between text-sm font-medium text-[var(--color-on-surface-variant)]">
                      <span>{{ $t('admin.scan_page') }}</span>
                      <span>{{ aiScanProgress.current }} / {{ aiScanProgress.total }}</span>
                    </div>
                    <div class="w-full bg-[var(--color-outline-variant)] rounded-full h-2.5 mt-1">
                      <div class="bg-[var(--color-primary)] h-2.5 rounded-full"
                        :style="{ width: aiScanProgress.total > 0 ? `${(aiScanProgress.current / aiScanProgress.total) * 100}%` : '0%' }">
                      </div>
                    </div>
                  </div>
                  <div>
                    <div class="flex justify-between text-sm font-medium text-[var(--color-on-surface-variant)]">
                      <span>{{ $t('admin.process_sentence') }}</span>
                      <span>{{ aiProcessProgress.current }} / {{ aiProcessProgress.total }}</span>
                    </div>
                    <div class="w-full bg-[var(--color-outline-variant)] rounded-full h-2.5 mt-1">
                      <div class="bg-[var(--color-tertiary)] h-2.5 rounded-full"
                        :style="{ width: aiProcessProgress.total > 0 ? `${(aiProcessProgress.current / aiProcessProgress.total) * 100}%` : '0%' }">
                      </div>
                    </div>
                  </div>

                  <div
                    class="max-h-64 overflow-y-auto rounded-lg border border-[var(--color-outline-variant)] p-2 space-y-2 bg-[var(--color-surface-container)]">
                    <div v-if="aiQueue.length === 0 && isScanningComplete"
                      class="text-center text-[var(--color-on-surface-variant)] py-4">
                      {{ $t('admin.no_incomplete_found') }}
                    </div>
                    <div v-for="task in aiQueue" :key="task.id"
                      class="flex items-center justify-between p-2 rounded-md bg-[var(--color-surface-container)]">
                      <span class="font-mono text-sm text-[var(--color-on-surface-variant)]">ID: {{ task.id }}</span>
                      <div class="flex items-center gap-2">
                        <span v-if="task.status === 'queued'" class="text-xs font-medium text-[var(--color-outline)]">{{
                          $t('admin.queued') }}</span>
                        <span v-if="task.status === 'processing'"
                          class="material-symbols-outlined text-[var(--color-primary)] animate-spin text-lg">sync</span>
                        <span v-if="task.status === 'completed'"
                          class="material-symbols-outlined text-[var(--color-tertiary)] text-lg">check_circle</span>
                        <span v-if="task.status === 'failed'"
                          class="material-symbols-outlined text-[var(--color-error)] text-lg">error</span>
                      </div>
                    </div>
                    <div v-if="!isScanningComplete"
                      class="text-center text-[var(--color-outline)] py-2 text-sm animate-pulse">
                      {{ $t('admin.scanning') }}
                    </div>
                  </div>
                </div>

                <div class="mt-6 flex justify-end">
                  <button type="button"
                    class="inline-flex justify-center rounded-xl border border-[var(--color-error)] bg-[var(--color-error-container)] px-4 py-2 text-sm font-medium text-[var(--color-on-error-container)] hover:bg-[var(--color-error)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-800"
                    @click="stopAiMode">
                    {{ (isScanningComplete && aiProcessProgress.current >= aiProcessProgress.total) ? $t('close') :
                      $t('admin.stop_process') }}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

    <TransitionRoot appear :show="isCopySuccessModalOpen" as="template">
      <Dialog as="div" @close="isCopySuccessModalOpen = false" class="relative z-50">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black/50" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-300 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel
              class="modal-box w-full max-w-xs rounded-4xl bg-[var(--color-surface-container-high)] p-6 shadow-2xl text-center">
              <div class="flex flex-col items-center justify-center">
                <span class="material-symbols-outlined text-[var(--color-tertiary)] text-4xl mb-2">check_circle</span>
                <p class="text-lg font-semibold text-[var(--color-on-background)]">{{ $t('copied') }}</p>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <EditKalimat v-model="isEditModalOpen" :sentenceId="selectedEditId" @close="handleEditSuccess"
      @open-narasi-editor="openNarasiFromEdit" />

    <ManajemenNarasi v-if="isNarasiModalOpen" :groupId="selectedNarasiGroupId" :isOpen="isNarasiModalOpen"
      @close="isNarasiModalOpen = false" @back="isNarasiModalOpen = false" />

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, computed, onMounted, watch } from 'vue';
import { useSentencesStore } from '@/stores/sentences';
import { useLanguageStore } from '@/stores/language';
import { api } from '@/utils/api';
import { isFormDirty } from '@/utils/dirtyForm';
import {
  useAdminSentences,
  useSentenceMutation,
  useDeactivateMutation,
  useActivateMutation,
  fetchAdminSentences,
} from '@/composables/useSentences';
import EditKalimat from './EditKalimat.vue';
import ManajemenNarasi from './ManajemenNarasi.vue';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';
import { useI18n } from 'vue-i18n';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import { useClipboard } from '@vueuse/core';

interface SentenceGroup {
  id: number | string;
  is_active: boolean;
  sentences: Record<string, string>;
  has_narrative: boolean;
  narrative_title?: string;
  [key: string]: any;
}

interface AiQueueItem extends SentenceGroup {
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const sentencesStore = useSentencesStore();
const languageStore = useLanguageStore();
const { t } = useI18n();

const currentPage = ref(1);
const editingRows = reactive<Record<number | string, { sentences: Record<string, string> }>>({});
const initialEditingRows = reactive<Record<number | string, Record<string, string>>>({}); // Untuk melacak data awal saat edit
const isConfirmCancelDialogOpen = ref(false);
const rowToCancelId = ref<number | string | null>(null);
const isCompleting = reactive<Record<number | string, boolean>>({});
const processingId = ref<number | string | null>(null);

const isEditModalOpen = ref(false);
const selectedEditId = ref<number | string | null>(null);

const openEditModal = (id: number | string) => {
  selectedEditId.value = id;
  isEditModalOpen.value = true;
};

const handleEditSuccess = () => {
  refetch();
  // Optional: Show success notification if needed
};

const isNarasiModalOpen = ref(false);
const selectedNarasiGroupId = ref<number | string | null>(null);

const openNarasiFromEdit = (groupId: number | string) => {
  selectedNarasiGroupId.value = groupId;
  isNarasiModalOpen.value = true;
};

const isAddingNewRow = ref(false);
const newSentenceData = reactive<{ sentences: Record<string, string> }>({ sentences: {} });

const showJsonModal = ref(false);
const showJsonInfoModal = ref(false);
const jsonInput = ref('');
const jsonError = ref<string | null>(null);

const isCopySuccessModalOpen = ref(false);
const scrollContainer = ref<HTMLElement | null>(null);
const showCopySuccessModal = () => {
  isCopySuccessModalOpen.value = true;
  setTimeout(() => {
    isCopySuccessModalOpen.value = false;
  }, 1000);
};

const sortKey = ref('id');
// PERUBAHAN 4: Mengganti default sortOrder ke 'asc' agar sama dengan ManajemenKata.vue
const sortOrder = ref<'asc' | 'desc'>('asc');

// --- STATE BARU UNTUK FITUR AI OTOMATIS PENUH ---
const isAiModeActive = ref(false);
const isAiNarrativeModeActive = ref(false);

const showAiModal = ref(false);
const isScanningComplete = ref(false);

const aiScanProgress = reactive({ current: 0, total: 0 });
const aiProcessProgress = reactive({ current: 0, total: 0 });
const aiQueue = ref<AiQueueItem[]>([]);
const currentAiIndex = ref(0);
const allIncompleteRowsCount = ref(0);

function scrollToActivePage(page: number) {
  nextTick(() => {
    const container = scrollContainer.value;
    if (!container) return;
    const activeBtn = container.querySelector(`button[data-page="${page}"]`) as HTMLElement;
    if (!activeBtn) return;
    const containerRect = container.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    const scrollOffset =
      btnRect.left -
      containerRect.left -
      containerRect.width / 2 +
      btnRect.width / 2;
    container.scrollBy({ left: scrollOffset, behavior: 'auto' });
  });
}

const ordering = computed(() => {
  if (!sortKey.value) return null;
  return (sortOrder.value === 'desc' ? '-' : '') + sortKey.value;
});

const {
  data: sentencesData,
  isLoading,
  isError,
  error,
  refetch,
} = useAdminSentences(currentPage, ordering);
const sentenceMutation = useSentenceMutation(currentPage);
const deactivateMutation = useDeactivateMutation(currentPage);
const activateMutation = useActivateMutation(currentPage);

sentenceMutation.onError = (err) =>
  console.error('Gagal menyimpan kalimat:', err);

deactivateMutation.onSuccess = (_, deactivatedId) => {
  sentencesStore.setDeactivatedSentence(deactivatedId);
};
deactivateMutation.onError = (err) =>
  console.error('Gagal menonaktifkan kalimat:', err);

activateMutation.onSuccess = (_, activatedId) => {
  sentencesStore.setActivatedSentence(activatedId);
};
activateMutation.onError = (err) =>
  console.error('Gagal mengaktifkan kalimat:', err);

const availableLanguages = computed(() => {
  // Use opsiBahasa directly to include ALL languages (even inactive ones)
  return languageStore.opsiBahasa || [];
});

const isRowIncomplete = (group: SentenceGroup) => {
  return availableLanguages.value.some(
    (lang) =>
      !group.sentences[lang.kodeBahasa] ||
      group.sentences[lang.kodeBahasa].trim() === '',
  );
};

const displayRows = computed(() => {
  return sentencesData.value?.results || [];
});

const totalPages = computed(() => {
  if (!sentencesData.value || sentencesData.value.count === 0) return 1;
  return Math.ceil(sentencesData.value.count / 10);
});

const fetchInitialData = async () => {
  try {
    await languageStore.fetchAdminLanguages();

    const firstPageData = await fetchAdminSentences(1, ordering.value);
    allIncompleteRowsCount.value = firstPageData.incomplete_count || 0;
  } catch (err) {
    console.error('Gagal mengambil hitungan kalimat tidak lengkap:', err);
    allIncompleteRowsCount.value = 0;
  }
};

onMounted(() => {
  fetchInitialData();
  setTimeout(() => {
    scrollToActivePage(currentPage.value);
  }, 50);
});

watch(currentPage, (p) => {
  setTimeout(() => {
    scrollToActivePage(p);
  }, 50);
});

const visiblePageRange = computed(() => {
  const total = totalPages.value || 1;
  return Array.from({ length: total }, (_, i) => i + 1);
});

function setSort(key: string) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
}

const autoResize = (event: Event) => {
  const textarea = event.target as HTMLTextAreaElement;
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
};

const { copy } = useClipboard({ legacy: true });

const copyToClipboard = (group: SentenceGroup) => {
  const dataToCopy = JSON.stringify(
    {
      id: group.id,
      sentences: group.sentences,
    },
    null,
    2,
  );

  copy(dataToCopy);
  showCopySuccessModal();
};

const startEdit = async (sentenceGroup: SentenceGroup) => {
  if (!editingRows[sentenceGroup.id]) {
    // Simpan kondisi awal untuk perbandingan dirty check
    initialEditingRows[sentenceGroup.id] = JSON.parse(
      JSON.stringify(sentenceGroup.sentences),
    );

    editingRows[sentenceGroup.id] = reactive({
      sentences: JSON.parse(JSON.stringify(sentenceGroup.sentences)),
    });

    await nextTick();
    document
      .querySelectorAll(`tr[data-row-id='${sentenceGroup.id}'] textarea`)
      .forEach((textarea) => {
        autoResize({ target: textarea } as unknown as Event); // simple cast for reuse
      });
  }
};

const cancelEdit = (id: number | string) => {
  const isDirty = isFormDirty(
    initialEditingRows[id],
    editingRows[id].sentences,
  );
  if (isDirty) {
    rowToCancelId.value = id;
    isConfirmCancelDialogOpen.value = true;
  } else {
    // Jika tidak ada perubahan, langsung batalkan
    delete editingRows[id];
    delete initialEditingRows[id];
  }
};

const confirmCancelEdit = () => {
  if (rowToCancelId.value) {
    delete editingRows[rowToCancelId.value];
    delete initialEditingRows[rowToCancelId.value];
  }
  isConfirmCancelDialogOpen.value = false;
  rowToCancelId.value = null;
};

const saveEdit = async (id: number | string, payloadOverride: any = null) => {
  const payload = payloadOverride
    ? payloadOverride
    : { sentences: editingRows[id].sentences };
  try {
    await sentenceMutation.mutateAsync({ id, payload });
    // Hanya keluar dari mode edit jika TIDAK dipanggil oleh AI queue
    if (!payloadOverride) {
      delete editingRows[id];
      delete initialEditingRows[id];
    }
  } catch (err) {
    console.error('Gagal menyimpan perubahan untuk baris:', id, err);
    // Melemparkan error kembali agar AI queue bisa menanganinya
    throw err;
  }
};

const startAddNew = () => {
  newSentenceData.sentences = availableLanguages.value.reduce((acc, lang) => {
    acc[lang.kodeBahasa] = '';
    return acc;
  }, {} as Record<string, string>);
  isAddingNewRow.value = true;
};
const cancelAddNew = () => {
  isAddingNewRow.value = false;
  newSentenceData.sentences = {};
};
const saveNewSentence = () => {
  const payload = { sentences: newSentenceData.sentences };
  sentenceMutation.mutate({ id: null, payload });
};

const goToPage = (newPage: number) => {
  if (newPage > 0 && newPage <= totalPages.value) {
    currentPage.value = newPage;
  }
};

const handlePageClick = async (page: number) => {
  goToPage(page);
  await nextTick();
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  scrollToActivePage(page);
};

const findSentence = (sentenceGroup: SentenceGroup, langCode: string) => {
  if (
    !sentenceGroup ||
    typeof sentenceGroup.sentences !== 'object' ||
    !sentenceGroup.sentences
  ) {
    return '---';
  }
  return sentenceGroup.sentences[langCode] || '---';
};

const completeSentences = async (id: number | string) => {
  // Fungsi ini sekarang hanya untuk pelengkapan manual per baris
  if (isCompleting[id] || !editingRows[id]) return;

  isCompleting[id] = true;
  try {
    // Panggil endpoint PATCH dengan action 'ai_preview'
    const response = await api.patch(`/admin/sentences/groups/${id}/`, {
      action: 'ai_preview',
    });

    const completedData = response.data;

    if (completedData && completedData.sentences) {
      const newSentences = completedData.sentences;
      for (const langCode in newSentences) {
        if (Object.prototype.hasOwnProperty.call(newSentences, langCode)) {
          // Hanya perbarui jika kolom di UI masih kosong atau hanya berisi spasi
          if (
            !editingRows[id].sentences[langCode] ||
            editingRows[id].sentences[langCode].trim() === ''
          ) {
            editingRows[id].sentences[langCode] = newSentences[langCode];
          }
        }
      }
    }
    await nextTick();
    document
      .querySelectorAll(`tr[data-row-id='${id}'] textarea`)
      .forEach((textarea) => autoResize({ target: textarea } as unknown as Event));
  } catch (err: any) {
    console.error(
      `Gagal melengkapi kalimat untuk ID ${id}:`,
      err.response?.data || err.message,
    );
    // Mungkin tambahkan notifikasi error untuk user di sini
  } finally {
    isCompleting[id] = false;
  }
};

const processJsonInput = async () => {
  jsonError.value = null;
  if (!jsonInput.value.trim()) {
    jsonError.value = t('admin.error_input_empty');
    return;
  }
  try {
    const importedData = JSON.parse(jsonInput.value);
    if (!Array.isArray(importedData)) {
      jsonError.value = t('admin.error_json_array');
      return;
    }

    for (const item of importedData) {
      if (!item.sentences || typeof item.sentences !== 'object') {
        jsonError.value = t('admin.error_json_property', { prop: 'sentences' });
        return;
      }
      const payload = { sentences: item.sentences };
      const id = item.id !== undefined && item.id !== null ? item.id : null;
      await sentenceMutation.mutateAsync({ id, payload });
    }

    showJsonModal.value = false;
    jsonInput.value = '';
  } catch (e: any) {
    jsonError.value = `${t('admin.error_process_json')}: ${e.message}`;
  }
};

// --- FUNGSI-FUNGSI BARU UNTUK AI OTOMATIS PENUH ---
const startAiCompletionMode = () => {
  isAiModeActive.value = true;
  isScanningComplete.value = false;
  aiQueue.value = [];
  currentAiIndex.value = 0;
  aiScanProgress.current = 0;
  aiScanProgress.total = totalPages.value;
  aiProcessProgress.current = 0;
  aiProcessProgress.total = 0;

  showAiModal.value = true;

  scanForAllIncomplete();
  processAiQueue();
};

const scanForAllIncomplete = async () => {
  for (let page = 1; page <= totalPages.value; page++) {
    if (!isAiModeActive.value) break;
    aiScanProgress.current = page;
    try {
      const pageData = await fetchAdminSentences(page, ordering.value);
      const incompleteOnPage = (pageData.results || []).filter(isRowIncomplete);
      for (const row of incompleteOnPage) {
        if (!aiQueue.value.some((item) => item.id === row.id)) {
          aiQueue.value.push({ ...row, status: 'queued' });
        }
      }
      aiProcessProgress.total = aiQueue.value.length;
    } catch (err) {
      console.error(`Gagal memindai halaman ${page}:`, err);
    }
  }
  if (isAiModeActive.value) {
    isScanningComplete.value = true;
  }
};

const processAiQueue = async () => {
  while (isAiModeActive.value) {
    if (currentAiIndex.value < aiQueue.value.length) {
      const task = aiQueue.value[currentAiIndex.value];
      task.status = 'processing';

      try {
        // 1. Dapatkan pratinjau dari AI
        const previewResponse = await api.patch(
          `/admin/sentences/groups/${task.id}/`,
          { action: 'ai_preview' },
        );

        // 2. Gabungkan hasil AI ke data yang ada (hanya isi yang kosong)
        const finalSentences = { ...task.sentences };
        const aiSentences = previewResponse.data.sentences;
        for (const langCode in aiSentences) {
          if (Object.prototype.hasOwnProperty.call(aiSentences, langCode)) {
            if (
              !finalSentences[langCode] ||
              finalSentences[langCode].trim() === ''
            ) {
              finalSentences[langCode] = aiSentences[langCode];
            }
          }
        }

        // 3. Siapkan payload untuk disimpan dengan data yang sudah digabung
        const payloadToSave = { sentences: finalSentences };

        // 4. Simpan perubahan ke database (memanggil fungsi saveEdit yang sudah ada)
        await saveEdit(task.id, payloadToSave);
        task.status = 'completed';
      } catch (err: any) {
        console.error(
          `Gagal memproses tugas ${task.id}:`,
          err.response?.data || err.message,
        );
        task.status = 'failed';
      } finally {
        aiProcessProgress.current++;
        currentAiIndex.value++;
      }
    } else if (isScanningComplete.value) {
      break;
    } else {
      await new Promise((res) => setTimeout(res, 300));
    }
  }
};


const toggleAiNarrativeMode = async () => {
  if (isAiNarrativeModeActive.value) {
    stopAiMode();
    return;
  }

  isAiNarrativeModeActive.value = true;
  processingId.value = null; // Reset processing ID

  const startPage = currentPage.value;

  try {
    for (let page = startPage; page <= totalPages.value; page++) {
      if (!isAiNarrativeModeActive.value) break;

      if (page !== startPage) {
        await goToPage(page);
      }

      // Re-fetch data for the current page to ensure we have the latest state
      // (goToPage already does this, but we access sentencesData.value.results)

      const rows = sentencesData.value?.results || [];

      for (const row of rows) {
        if (!isAiNarrativeModeActive.value) break;

        if (!row.has_narrative) {
          processingId.value = row.id;
          try {
            const response = await api.patch(`/admin/sentence-groups/${row.id}/narrative`, {
              action: 'generate_base',
              ai_config: {
                paragraph_count: 5,
                paragraph_length: 'Medium',
                proficiency_level: 'Intermediate',
                theme: '',
                generate_image: false
              }
            });

            // ROBUST UPDATE: Update the local data directly to ensure UI reactivity
            row.has_narrative = true;

            // Extract title
            if (response.data && response.data.contents) {
              const contents = response.data.contents;
              // Determine base language same as backend if possible, or just grab first available
              const title = contents['id']?.title || contents['en']?.title || (Object.values(contents)[0] as any)?.title;
              if (title) {
                row.narrative_title = title;
              }
            }
          } finally {
            // Delay for rate limiting & visual feedback
            if (isAiNarrativeModeActive.value) {
              await new Promise((res) => setTimeout(res, 500));
            }
            processingId.value = null;
          }
        }
      }

      if (!isAiNarrativeModeActive.value) break;
    }

    if (isAiNarrativeModeActive.value) {
      alert('Proses Generate Narasi AI Selesai!');
    }

  } catch (error) {
    console.error("Error during AI Narrative generation:", error);
    if (isAiNarrativeModeActive.value) {
      alert("Terjadi kesalahan proses AI.");
    }
  } finally {
    stopAiMode();
  }
};

const stopAiMode = () => {
  isAiModeActive.value = false;
  isAiNarrativeModeActive.value = false;
  showAiModal.value = false;
  processingId.value = null;
  refetch();
  // Re-fetch incomplete count
  fetchInitialData();
};
</script>

<style lang="postcss" scoped>
@reference "tailwindcss";

.modal-box {
  @apply rounded-3xl bg-white dark:bg-neutral-800 p-6 shadow-2xl;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
  height: 6px;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
