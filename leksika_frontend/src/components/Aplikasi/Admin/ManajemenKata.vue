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
        <h1 v-if="!isAiModeActive" class="text-xl font-bold text-[var(--color-on-background)]">{{
          $t('admin.manage_word') }}</h1>
        <div v-else class="flex items-center justify-center gap-2 text-xl font-bold text-[var(--color-tertiary)]">
          <LoadingSpinner size="sm" color="tertiary" />
          <span>{{ $t('admin.ai_completion_active') }}</span>
        </div>
      </div>
      <div class="w-10"></div>
    </header>

    <div class="flex flex-col gap-4 mb-4">
      <!-- Row 1: Language selector and Search -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div class="flex items-center flex-shrink-0">
          <label for="target-language-select"
            class="mr-2 font-medium text-[var(--color-on-surface-variant)] flex-shrink-0">{{ $t('language') }}:</label>
          <select id="target-language-select" v-model="selectedTargetCode"
            class="p-2 rounded-xl bg-[var(--color-surface-container-high)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition text-[var(--color-on-background)] min-w-[100px]"
            :disabled="isAiModeActive">
            <option v-if="!allLanguages.length" disabled value="">Memuat...</option>
            <option v-for="lang in allLanguages" :key="lang.lang_code" :value="lang.lang_code">
              {{ lang.name }}
            </option>
          </select>
        </div>

        <div class="relative flex-grow">
          <span
            class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-outline)] pointer-events-none">search</span>
          <input id="search-input" type="text" v-model="searchQuery" :placeholder="$t('admin.search_word_placeholder')"
            class="p-2 pl-10 w-full rounded-xl bg-[var(--color-surface-container-high)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition text-[var(--color-on-background)]"
            :disabled="isAiModeActive" @focus="isSearchFocused = true" @blur="isSearchFocused = false" />
        </div>
      </div>

      <!-- Row 2: Action Buttons -->
      <div class="flex items-center gap-2 flex-wrap">


        <button @click="isAiModeActive ? stopAiMode() : openAiCompletionOptionsModal()"
          :disabled="isAddingNewRow || !words || words.count === 0" :class="[
            isAiModeActive
              ? 'bg-[var(--color-error)] hover:bg-[var(--color-error-container)] focus:ring-[var(--color-error)]'
              : 'bg-[var(--color-tertiary)] hover:bg-[var(--color-tertiary-fixed-dim)] focus:ring-[var(--color-tertiary)]',
            'flex items-center justify-center gap-2 px-4 py-2 text-[var(--color-on-tertiary)] font-medium rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          ]" :title="isAiModeActive ? $t('admin.stop_ai') : $t('admin.ai_options_title')">
          <span class="material-symbols-outlined text-base">{{ isAiModeActive ? 'stop_circle' : 'auto_awesome' }}</span>
          <span class="hidden sm:inline">{{ isAiModeActive ? $t('admin.stop_ai') : $t('admin.ai_completer') }}</span>
        </button>

        <button @click="startAddNew" :disabled="isAiModeActive"
          class="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium rounded-xl hover:bg-[var(--color-primary-fixed-dim)] shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          <span class="material-symbols-outlined text-base">add</span>
          <span class="hidden sm:inline">{{ $t('admin.create_new') }}</span>
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-12 flex-grow flex items-center justify-center">
      <div class="flex flex-col items-center gap-3">
        <LoadingSpinner size="xl" color="outline" />
        <p class="text-[var(--color-on-surface-variant)]">
          Memuat data kata untuk '{{ selectedTargetCode }}'{{ searchQuery ? ` (filter: "${searchQuery}")` : '' }}...
        </p>
      </div>
    </div>
    <div v-else-if="isError"
      class="text-center py-12 flex-grow flex items-center justify-center bg-[var(--color-error-container)] rounded-2xl p-4">
      <p class="text-[var(--color-on-error-container)]">{{ $t('admin.error_load_data') }}</p>
    </div>
    <div v-else-if="!words || !words.results || words.results.length === 0"
      class="text-center py-12 bg-[var(--color-surface-container)] rounded-2xl shadow-sm flex-grow flex items-center justify-center">
      <div>
        <span class="material-symbols-outlined text-5xl text-[var(--color-outline)]">dictionary</span>
        <p class="mt-2 font-semibold text-[var(--color-on-surface-variant)]">
          {{ searchQuery ? $t('admin.no_word_found', { query: searchQuery }) : $t('admin.no_word_data', {
            lang:
              selectedTargetCode
          }) }}.
        </p>
        <p v-if="!searchQuery" class="text-sm text-[var(--color-on-surface-variant)]">{{ $t('admin.click_create_hint')
        }}</p>
      </div>
    </div>

    <div v-else class="flex-grow flex flex-col overflow-hidden">
      <main class="flex-1 bg-[var(--color-surface-container)] rounded-2xl overflow-hidden flex flex-col min-w-0">
        <div class="overflow-x-auto flex-1">
          <table class="w-full text-left min-w-[1700px]">
            <thead class="sticky top-0 bg-[var(--color-surface-container-high)] z-10">
              <tr>
                <th @click="setSort('id')"
                  class="p-4 font-semibold text-[var(--color-on-surface)] w-16 cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors">
                  <div class="flex items-center gap-1">ID <span v-if="sortKey === 'id'"
                      class="material-symbols-outlined text-sm">{{ sortOrder === 'asc' ? 'arrow_upward' :
                        'arrow_downward' }}</span></div>
                </th>
                <th @click="setSort('base')"
                  class="p-4 font-semibold text-[var(--color-on-surface)] cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors"
                  style="min-width: 200px;">
                  <div class="flex items-center gap-1">Base <span v-if="sortKey === 'base'"
                      class="material-symbols-outlined text-sm">{{ sortOrder === 'asc' ? 'arrow_upward' :
                        'arrow_downward' }}</span></div>
                </th>
                <th @click="setSort('accented')"
                  class="p-4 font-semibold text-[var(--color-on-surface)] cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors"
                  style="min-width: 200px;">
                  <div class="flex items-center gap-1">Accented <span v-if="sortKey === 'accented'"
                      class="material-symbols-outlined text-sm">{{ sortOrder === 'asc' ? 'arrow_upward' :
                        'arrow_downward' }}</span></div>
                </th>
                <th @click="setSort('pos')"
                  class="p-4 font-semibold text-[var(--color-on-surface)] cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors w-24">
                  <div class="flex items-center gap-1">POS <span v-if="sortKey === 'pos'"
                      class="material-symbols-outlined text-sm">{{ sortOrder === 'asc' ? 'arrow_upward' :
                        'arrow_downward' }}</span></div>
                </th>
                <th class="p-4 font-semibold text-[var(--color-on-surface)]" style="min-width: 200px;">{{
                  $t('admin.attributes') }}</th>
                <th @click="setSort('level')"
                  class="p-4 font-semibold text-[var(--color-on-surface)] cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors w-20">
                  <div class="flex items-center gap-1">Level <span v-if="sortKey === 'level'"
                      class="material-symbols-outlined text-sm">{{ sortOrder === 'asc' ? 'arrow_upward' :
                        'arrow_downward' }}</span></div>
                </th>
                <th @click="setSort('rank')"
                  class="p-4 font-semibold text-[var(--color-on-surface)] cursor-pointer hover:bg(--color-surface-container-highest)] transition-colors w-20">
                  <div class="flex items-center gap-1">Rank <span v-if="sortKey === 'rank'"
                      class="material-symbols-outlined text-sm">{{ sortOrder === 'asc' ? 'arrow_upward' :
                        'arrow_downward' }}</span></div>
                </th>
                <th class="p-4 font-semibold text-[var(--color-on-surface)]" style="min-width: 450px;">{{
                  $t('definitions') }}</th>
                <th class="p-4 font-semibold text-[var(--color-on-surface)]" style="min-width: 450px;">{{
                  $t('translations') }}</th>
                <th class="p-4 font-semibold text-[var(--color-on-surface)] text-right w-32">{{ $t('action') }}</th>
              </tr>
            </thead>
            <tbody class="bg-[var(--color-surface-container)]">

              <template v-if="isAddingNewRow">
                <tr class="bg-[var(--color-tertiary-container)]">
                  <td class="p-4 font-mono text-sm text-[var(--color-on-tertiary-container)] align-top"><span
                      class="material-symbols-outlined text-[var(--color-tertiary)]">add_circle</span></td>
                  <td class="p-2 text-sm align-top"><input type="text" v-model="newWordData.base"
                      placeholder="Base Form..."
                      class="w-full bg-[var(--color-surface-container)] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      required></td>
                  <td class="p-2 text-sm align-top"><input type="text" v-model="newWordData.accented"
                      placeholder="Accented Form..."
                      class="w-full bg-[var(--color-surface-container)] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                  </td>
                  <td class="p-2 text-sm align-top">
                    <select v-model="newWordData.pos"
                      class="w-full bg-[var(--color-surface-container)] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-on-background)]">
                      <option disabled value="">Pilih POS...</option>
                      <option v-for="pos in posChoices" :key="pos.value" :value="pos.value">
                        {{ $t('pos_' + pos.value.toLowerCase()) }}
                      </option>
                    </select>
                  </td>
                  <td class="p-2 text-sm align-top text-[var(--color-outline)] italic">(kosong)</td>
                  <td class="p-2 text-sm align-top"><input type="text" v-model="newWordData.level"
                      placeholder="Level..."
                      class="w-full bg-[var(--color-surface-container)] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                  </td>
                  <td class="p-2 text-sm align-top"><input type="number" v-model.number="newWordData.rank"
                      placeholder="Rank..."
                      class="w-full bg-[var(--color-surface-container)] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                  </td>
                  <td class="p-2 text-sm align-top text-[var(--color-outline)] italic">(kosong)</td>
                  <td class="p-2 text-sm align-top text-[var(--color-outline)] italic">(kosong)</td>
                  <td class="p-4 text-right align-top">
                    <div class="flex items-center justify-end gap-2">
                      <button @click="saveNewWord" :title="$t('save')"
                        class="text-[var(--color-outline)] hover:text-[var(--color-primary)] transition-colors"><span
                          class="material-symbols-outlined">save</span></button>
                      <button @click="cancelAddNew" :title="$t('cancel')"
                        class="text-[var(--color-outline)] hover:text-[var(--color-error)] transition-colors"><span
                          class="material-symbols-outlined">close</span></button>
                    </div>
                  </td>
                </tr>
              </template>

              <template v-for="item in words.results" :key="item.id">
                <tr class="last:border-b-0 hover:bg-[var(--color-surface-container-high)] transition-colors" :class="{
                  'bg-[var(--color-surface-container-high)]': editingWordId === item.id,
                  'bg-[var(--color-tertiary-container)] animate-pulse': processingWordId === item.id,
                  'opacity-50 pointer-events-none': isAiModeActive && processingWordId !== item.id,
                }">
                  <td class="p-4 font-mono text-sm align-top text-[var(--color-outline)] transition-opacity"
                    :class="{ 'opacity-60': item.disabled }">{{ item.id }}</td>

                  <td v-if="editingWordId === item.id" class="p-2 text-sm align-top"><input type="text"
                      v-model="editingWord.base"
                      class="w-full p-2 rounded-lg bg-[var(--color-surface-container)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      required></td>
                  <td v-else class="p-2 text-sm align-top font-medium transition-opacity"
                    :class="{ 'opacity-60': item.disabled }">
                    <div class="p-2 leading-relaxed text-[var(--color-on-background)]">{{ item.base }}</div>
                  </td>

                  <td v-if="editingWordId === item.id" class="p-2 text-sm align-top"><input type="text"
                      v-model="editingWord.accented"
                      class="w-full p-2 rounded-lg bg-[var(--color-surface-container)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                  </td>
                  <td v-else class="p-2 text-sm align-top transition-opacity" :class="{ 'opacity-60': item.disabled }">
                    <div class="p-2 leading-relaxed text-[var(--color-on-background)]">{{ item.accented }}</div>
                  </td>

                  <td v-if="editingWordId === item.id" class="p-2 text-sm align-top">
                    <select v-model="editingWord.pos"
                      class="w-full p-2 rounded-lg bg-[var(--color-surface-container)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                      <option disabled value="">Pilih POS...</option>
                      <option v-for="pos in posChoices" :key="pos.value" :value="pos.value">
                        {{ $t('pos_' + pos.value.toLowerCase()) }}
                      </option>
                    </select>
                  </td>
                  <td v-else class="p-2 text-sm align-top lowercase transition-opacity"
                    :class="{ 'opacity-60': item.disabled }">
                    <div class="p-2 leading-relaxed text-[var(--color-on-background)]">{{ item.pos ? $t('pos_' +
                      item.pos.toLowerCase()) : '-' }}</div>
                  </td>

                  <td class="p-4 text-sm align-top transition-opacity" :class="{ 'opacity-60': item.disabled }">
                    <div class="flex flex-wrap gap-1">
                      <span v-for="attr in item.grammar_attributes" :key="`gattr-${attr.id}`"
                        class="px-2 py-0.5 text-xs font-medium bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200 rounded-full">
                        {{ attr.feature_value.value }}
                      </span>
                      <span v-for="tag in item.tags" :key="`tag-${tag.id}`"
                        class="px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 rounded-full">
                        {{ tag.name_en }}
                      </span>
                      <span
                        v-if="(!item.grammar_attributes || item.grammar_attributes.length === 0) && (!item.tags || item.tags.length === 0)"
                        class="text-xs text-[var(--color-outline)] italic">
                        (kosong)
                      </span>
                    </div>
                  </td>

                  <td v-if="editingWordId === item.id" class="p-2 text-sm align-top"><input type="text"
                      v-model="editingWord.level"
                      class="w-full p-2 rounded-lg bg-[var(--color-surface-container)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                  </td>
                  <td v-else class="p-2 text-sm align-top transition-opacity" :class="{ 'opacity-60': item.disabled }">
                    <div class="p-2 leading-relaxed text-[var(--color-on-background)]">{{ item.level || '-' }}</div>
                  </td>

                  <td v-if="editingWordId === item.id" class="p-2 text-sm align-top"><input type="number"
                      v-model.number="editingWord.rank"
                      class="w-full p-2 rounded-lg bg-[var(--color-surface-container)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                  </td>
                  <td v-else class="p-2 text-sm align-top transition-opacity" :class="{ 'opacity-60': item.disabled }">
                    <div class="p-2 leading-relaxed text-[var(--color-on-background)]">{{ item.rank || '-' }}</div>
                  </td>

                  <td class="p-4 text-sm align-top transition-opacity" :class="{ 'opacity-60': item.disabled }">
                    <div class="flex flex-wrap gap-2 items-center">
                      <div
                        @click.stop="editingWordId !== item.id ? (currentWordForDefinitions = cloneDeep(item), showDefinitionsModal = true) : null"
                        :class="{ 'cursor-pointer group': editingWordId !== item.id }">
                        <div v-if="item._groupedDefinitions && item._groupedDefinitions.length > 0"
                          class="flex flex-wrap gap-2">
                          <div v-for="({ count, code, flagHtml }) in item._groupedDefinitions" :key="code"
                            class="inline-flex items-center px-2 py-1 text-xs font-medium bg-[var(--color-surface-bright)] group-hover:bg-[var(--color-secondary-container)] group-hover:text-[var(--color-on-secondary-container)] rounded-full text-[var(--color-on-surface)] shadow-sm transition-colors">
                            <span class="w-4 h-4 mr-1.5 flex-shrink-0 rounded-full overflow-hidden"
                              v-html="flagHtml"></span>
                            {{ code.toUpperCase() }}: {{ count }}
                          </div>
                        </div>
                        <span v-else
                          class="text-xs text-[var(--color-outline)] italic group-hover:text-[var(--color-secondary)]">(kosong)</span>
                      </div>

                      <button v-if="editingWordId === item.id"
                        @click.stop="showDefinitionsModal = true; currentWordForDefinitions = editingWord;"
                        class="flex items-center gap-1 text-xs bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] font-medium py-1 px-2 rounded-full hover:bg-[var(--color-secondary)] hover:text-[var(--color-on-secondary)] transition-colors shadow-sm">
                        <span class="material-symbols-outlined text-sm">book</span> Edit Definisi
                      </button>
                    </div>
                  </td>

                  <td class="p-4 text-sm align-top transition-opacity" :class="{ 'opacity-60': item.disabled }">
                    <div class="flex flex-wrap gap-2 items-center">
                      <div
                        @click.stop="editingWordId !== item.id ? (currentWordForTranslations = cloneDeep(item), showTranslationsModal = true) : null"
                        :class="{ 'cursor-pointer group': editingWordId !== item.id }">
                        <div v-if="item._groupedTranslations && item._groupedTranslations.length > 0"
                          class="flex flex-wrap gap-2">
                          <div v-for="({ count, code, flagHtml }) in item._groupedTranslations" :key="code"
                            class="inline-flex items-center px-2 py-1 text-xs font-medium bg-[var(--color-surface-bright)] group-hover:bg-[var(--color-primary-container)] group-hover:text-[var(--color-on-primary-container)] rounded-full text-[var(--color-on-surface)] shadow-sm transition-colors">
                            <span class="w-4 h-4 mr-1.5 flex-shrink-0 rounded-full overflow-hidden"
                              v-html="flagHtml"></span>
                            {{ code.toUpperCase() }}: {{ count }}
                          </div>
                        </div>
                        <span v-else
                          class="text-xs text-[var(--color-outline)] italic group-hover:text-[var(--color-primary)]">(kosong)</span>
                      </div>

                      <button v-if="editingWordId === item.id"
                        @click.stop="showTranslationsModal = true; currentWordForTranslations = editingWord;"
                        class="flex items-center gap-1 text-xs bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-1 px-2 rounded-full hover:bg-[var(--color-primary-fixed-dim)] transition-colors shadow-sm">
                        <span class="material-symbols-outlined text-sm">translate</span> Edit Terjemahan
                      </button>
                    </div>
                  </td>

                  <td class="p-4 text-right align-top">
                    <div v-if="processingWordId === item.id"
                      class="flex items-center justify-end gap-2 text-[var(--color-tertiary)]">
                      <span class="material-symbols-outlined animate-spin">sync</span>
                      <span class="text-sm font-medium">Memproses...</span>
                    </div>
                    <div v-else class="flex items-center justify-end gap-2">
                      <template v-if="editingWordId === item.id">
                        <button @click.stop="saveEdit()" title="Simpan"
                          class="text-[var(--color-primary)] hover:text-[var(--color-primary-fixed-dim)] transition-colors"><span
                            class="material-symbols-outlined">save</span></button>
                        <button @click.stop="cancelEdit" title="Batal"
                          class="text-[var(--color-outline)] hover:text-[var(--color-error)] transition-colors"><span
                            class="material-symbols-outlined">close</span></button>
                      </template>
                      <template v-else>
                        <button @click.stop="startEdit(item)" :disabled="isAiModeActive"
                          class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-on-surface)] hover:bg-[var(--color-primary-container)] hover:text-[var(--color-on-primary-container)] transition-colors disabled:opacity-50"
                          title="Edit"><span class="material-symbols-outlined">edit</span></button>

                        <button @click.stop="toggleWordStatus(item)" :disabled="isAiModeActive"
                          class="flex items-center justify-center w-8 h-8 rounded-full transition-colors disabled:opacity-50"
                          :class="[
                            !item.disabled
                              ? 'text-[var(--color-on-surface)] hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)]'
                              : 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)]'
                          ]" :title="item.disabled ? 'Aktifkan' : 'Nonaktifkan'">
                          <span class="material-symbols-outlined">visibility_off</span>
                        </button>
                      </template>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </main>
    </div>

    <nav v-if="totalPages > 1" class="p-4 bg-[var(--color-surface-container)] flex justify-between items-center gap-4"
      :class="{ 'pointer-events-none opacity-50': isAiModeActive }">
      <div class="flex items-center gap-2">
        <button @click="handlePageClick(1)" :disabled="currentPage <= 1"
          class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-on-surface)] enabled:hover:bg-[var(--color-surface-container-high)] transition-colors disabled:opacity-50"
          title="Halaman Pertama"><span class="material-symbols-outlined text-lg">first_page</span></button>
        <button @click="handlePageClick(currentPage - 1)" :disabled="currentPage <= 1"
          class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-on-surface)] enabled:hover:bg-[var(--color-surface-container-high)] transition-colors disabled:opacity-50"
          title="Halaman Sebelumnya"><span class="material-symbols-outlined text-lg">chevron_left</span></button>
      </div>
      <div ref="scrollContainer" class="flex justify-start items-center gap-2 overflow-x-auto scrollbar-hide px-2"
        style="white-space: nowrap;">
        <template v-for="(page, index) in visiblePageRange" :key="index">
          <button v-if="typeof page === 'number'" :data-page="page" @click="handlePageClick(page)"
            :aria-current="page === currentPage ? 'page' : null"
            :class="['inline-block px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap', page === currentPage ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-md' : 'text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]']">
            {{ page }}
          </button>
        </template>
      </div>
      <div class="flex items-center gap-2">
        <button @click="handlePageClick(currentPage + 1)" :disabled="currentPage >= totalPages"
          class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-on-surface)] enabled:hover:bg-[var(--color-surface-container-high)] transition-colors disabled:opacity-50"
          title="Halaman Selanjutnya"><span class="material-symbols-outlined text-lg">chevron_right</span></button>
        <button @click="handlePageClick(totalPages)" :disabled="currentPage >= totalPages"
          class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-on-surface)] enabled:hover:bg-[var(--color-surface-container-high)] transition-colors disabled:opacity-50"
          title="Halaman Terakhir"><span class="material-symbols-outlined text-lg">last_page</span></button>
      </div>
    </nav>

    <EditTerjemahanKata v-if="showTranslationsModal" :modelValue="showTranslationsModal"
      :word="currentWordForTranslations" @update:modelValue="showTranslationsModal = $event"
      @close="showTranslationsModal = false" @translations-saved="handleTranslationsSaved" />

    <EditDefinisiKata v-if="showDefinitionsModal" :modelValue="showDefinitionsModal" :word="currentWordForDefinitions"
      @update:modelValue="showDefinitionsModal = $event" @close="showDefinitionsModal = false"
      @definitions-saved="handleDefinitionsSaved" />

    <TransitionRoot appear :show="showAiCompletionOptionsModal" as="template">
      <Dialog as="div" @close="showAiCompletionOptionsModal = false" class="relative z-50">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black/50" />
        </TransitionChild>
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel
              class="mx-4 w-full max-w-md rounded-4xl bg-[var(--color-surface-container-high)] p-6 shadow-2xl flex flex-col max-h-[90vh]">

              <div class="relative flex-shrink-0 flex items-center justify-center mb-6">
                <h2 class="text-2xl font-bold text-[var(--color-on-background)]">Opsi Pelengkapan AI</h2>
                <button @click="showAiCompletionOptionsModal = false"
                  class="absolute right-0 top-0 p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors"
                  aria-label="Tutup">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
              <hr class="my-4 border-[var(--color-outline-variant)] flex-shrink-0" />

              <div class="flex-1 overflow-y-auto space-y-6 px-1 pt-1 pb-2">
                <div class="flex items-center justify-between">
                  <label for="aiTranslateToggle" class="text-sm font-medium text-[var(--color-on-background)]">Lengkapi
                    Terjemahan AI</label>
                  <div class="md-switch group relative inline-flex items-center"
                    :class="{ 'selected': aiCompleteTranslations }"
                    @click="aiCompleteTranslations = !aiCompleteTranslations" role="switch"
                    :aria-checked="aiCompleteTranslations" aria-labelledby="aiTranslateToggle-label" tabindex="0"
                    @keydown.space.prevent="aiCompleteTranslations = !aiCompleteTranslations"
                    @keydown.enter.prevent="aiCompleteTranslations = !aiCompleteTranslations">
                    <div
                      class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out cursor-pointer relative"
                      :class="[
                        aiCompleteTranslations
                          ? 'bg-[var(--color-primary)] border-[var(--color-primary)] group-hover:bg-[var(--color-primary-fixed-dim)]'
                          : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)] group-hover:bg-[var(--color-surface-container-high)] group-hover:border-[var(--color-outline)]'
                      ]">
                      <div class="handle-container absolute top-0 left-0 h-full w-full pointer-events-none">
                        <div
                          class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] shadow-sm"
                          :class="[
                            aiCompleteTranslations
                              ? 'h-[24px] w-[24px] bg-[var(--color-on-primary)] left-[calc(100%-24px-4px)]'
                              : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px] group-hover:bg-[var(--color-on-surface-variant)]',
                            'group-active:h-[28px] group-active:w-[28px]',
                            aiCompleteTranslations ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                          ]">
                          <svg v-if="aiCompleteTranslations" xmlns="http://www.w3.org/2000/svg" height="16"
                            viewBox="0 -960 960 960" width="16" class="fill-[var(--color-primary)] opacity-100">
                            <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
                          </svg>
                          <svg v-if="!aiCompleteTranslations" xmlns="http://www.w3.org/2000/svg" height="16"
                            viewBox="0 -960 960 960" width="16"
                            class="fill-[var(--color-surface-container-highest)] opacity-100">
                            <path
                              d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-between">
                  <label id="aiDefineToggle-label"
                    class="text-sm font-medium text-[var(--color-on-background)]">Lengkapi
                    Definisi AI</label>
                  <div class="md-switch group relative inline-flex items-center"
                    :class="{ 'selected': aiCompleteDefinitions }"
                    @click="aiCompleteDefinitions = !aiCompleteDefinitions" role="switch"
                    :aria-checked="aiCompleteDefinitions" aria-labelledby="aiDefineToggle-label" tabindex="0"
                    @keydown.space.prevent="aiCompleteDefinitions = !aiCompleteDefinitions"
                    @keydown.enter.prevent="aiCompleteDefinitions = !aiCompleteDefinitions">
                    <div
                      class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out cursor-pointer relative"
                      :class="[
                        aiCompleteDefinitions
                          ? 'bg-[var(--color-secondary)] border-[var(--color-secondary)] group-hover:bg-[var(--color-secondary-fixed-dim)]'
                          : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)] group-hover:bg-[var(--color-surface-container-high)] group-hover:border-[var(--color-outline)]'
                      ]">
                      <div class="handle-container absolute top-0 left-0 h-full w-full pointer-events-none">
                        <div
                          class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] shadow-sm"
                          :class="[
                            aiCompleteDefinitions
                              ? 'h-[24px] w-[24px] bg-[var(--color-on-secondary)] left-[calc(100%-24px-4px)]'
                              : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px] group-hover:bg-[var(--color-on-surface-variant)]',
                            'group-active:h-[28px] group-active:w-[28px]',
                            aiCompleteDefinitions ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                          ]">
                          <svg v-if="aiCompleteDefinitions" xmlns="http://www.w3.org/2000/svg" height="16"
                            viewBox="0 -960 960 960" width="16" class="fill-[var(--color-secondary)] opacity-100">
                            <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
                          </svg>
                          <svg v-if="!aiCompleteDefinitions" xmlns="http://www.w3.org/2000/svg" height="16"
                            viewBox="0 -960 960 960" width="16"
                            class="fill-[var(--color-surface-container-highest)] opacity-100">
                            <path
                              d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="selectedTargetCode === 'en'" class="flex items-center justify-between">
                  <div>
                    <label id="aiMorphologyToggle-label"
                      class="text-sm font-medium text-[var(--color-on-background)]">Lengkapi Morfologi</label>
                    <p class="text-xs text-[var(--color-outline)]">Generate wordforms (verb, noun, adjective)</p>
                  </div>
                  <div class="md-switch group relative inline-flex items-center"
                    :class="{ 'selected': aiCompleteMorphology }" @click="aiCompleteMorphology = !aiCompleteMorphology"
                    role="switch" :aria-checked="aiCompleteMorphology" aria-labelledby="aiMorphologyToggle-label"
                    tabindex="0" @keydown.space.prevent="aiCompleteMorphology = !aiCompleteMorphology"
                    @keydown.enter.prevent="aiCompleteMorphology = !aiCompleteMorphology">
                    <div
                      class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out cursor-pointer relative"
                      :class="[
                        aiCompleteMorphology
                          ? 'bg-[var(--color-tertiary)] border-[var(--color-tertiary)] group-hover:bg-[var(--color-tertiary-fixed-dim)]'
                          : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)] group-hover:bg-[var(--color-surface-container-high)] group-hover:border-[var(--color-outline)]'
                      ]">
                      <div class="handle-container absolute top-0 left-0 h-full w-full pointer-events-none">
                        <div
                          class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] shadow-sm"
                          :class="[
                            aiCompleteMorphology
                              ? 'h-[24px] w-[24px] bg-[var(--color-on-tertiary)] left-[calc(100%-24px-4px)]'
                              : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px] group-hover:bg-[var(--color-on-surface-variant)]',
                            'group-active:h-[28px] group-active:w-[28px]',
                            aiCompleteMorphology ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                          ]">
                          <svg v-if="aiCompleteMorphology" xmlns="http://www.w3.org/2000/svg" height="16"
                            viewBox="0 -960 960 960" width="16" class="fill-[var(--color-tertiary)] opacity-100">
                            <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
                          </svg>
                          <svg v-if="!aiCompleteMorphology" xmlns="http://www.w3.org/2000/svg" height="16"
                            viewBox="0 -960 960 960" width="16"
                            class="fill-[var(--color-surface-container-highest)] opacity-100">
                            <path
                              d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="appSettings"
                  class="flex items-center justify-between pt-4 border-t border-[var(--color-outline-variant)]">
                  <label id="aiScraperToggle-label"
                    class="text-sm font-medium text-[var(--color-on-background)]">Aktifkan
                    Scraper/Fetch Data</label>
                  <div class="md-switch group relative inline-flex items-center"
                    :class="{ 'selected': aiScraperEnabled }" @click="aiScraperEnabled = !aiScraperEnabled"
                    role="switch" :aria-checked="aiScraperEnabled" aria-labelledby="aiScraperToggle-label" tabindex="0"
                    @keydown.space.prevent="aiScraperEnabled = !aiScraperEnabled"
                    @keydown.enter.prevent="aiScraperEnabled = !aiScraperEnabled">
                    <div
                      class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out cursor-pointer relative"
                      :class="[
                        aiScraperEnabled
                          ? 'bg-[var(--color-tertiary)] border-[var(--color-tertiary)] group-hover:bg-[var(--color-tertiary-fixed-dim)]'
                          : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)] group-hover:bg-[var(--color-surface-container-high)] group-hover:border-[var(--color-outline)]'
                      ]">
                      <div class="handle-container absolute top-0 left-0 h-full w-full pointer-events-none">
                        <div
                          class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] shadow-sm"
                          :class="[
                            aiScraperEnabled
                              ? 'h-[24px] w-[24px] bg-[var(--color-on-tertiary)] left-[calc(100%-24px-4px)]'
                              : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px] group-hover:bg-[var(--color-on-surface-variant)]',
                            'group-active:h-[28px] group-active:w-[28px]',
                            aiScraperEnabled ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                          ]">
                          <svg v-if="aiScraperEnabled" xmlns="http://www.w3.org/2000/svg" height="16"
                            viewBox="0 -960 960 960" width="16" class="fill-[var(--color-tertiary)] opacity-100">
                            <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
                          </svg>
                          <svg v-if="!aiScraperEnabled" xmlns="http://www.w3.org/2000/svg" height="16"
                            viewBox="0 -960 960 960" width="16"
                            class="fill-[var(--color-surface-container-highest)] opacity-100">
                            <path
                              d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p v-else class="text-sm text-[var(--color-on-surface-variant)] italic">Memuat pengaturan scraper...</p>

                <div
                  class="mt-6 pt-6 border-t border-[var(--color-outline-variant)] flex-shrink-0 flex justify-end space-x-2">
                  <button type="button" @click="showAiCompletionOptionsModal = false"
                    class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)]">Batal</button>
                  <button type="button" @click="startAiCompletionProcess"
                    :disabled="!aiCompleteTranslations && !aiCompleteDefinitions"
                    class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] text-[var(--color-on-primary)] transition-colors">Mulai
                    Otomasi</button>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>


  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  watch,
  reactive,
  nextTick,
  shallowRef,
  triggerRef,
  defineAsyncComponent,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { useDebounceFn } from '@vueuse/core';
import { useLanguageStore } from '@/stores/language';
import { cloneDeep } from 'lodash-es';
import { api } from '@/utils/api';
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
} from '@headlessui/vue';

// --- INTERFACES ---

interface Language {
  kodeBahasa: string;
  lang_code?: string;
  name?: string;
}

interface GrammarAttribute {
  id: number;
  feature_value: {
    value: string;
  };
}

interface Tag {
  id: number;
  name_en: string;
}

interface WordDefinition {
  id: number;
  definition: string;
  language_code?: string;
}

interface WordTranslation {
  id: number;
  translation: string;
  language_code?: string;
}

interface DefinitionGroup {
  code: string;
  count: number;
  flagHtml?: string;
}

interface TranslationGroup {
  code: string;
  count: number;
  flagHtml?: string;
}

interface ExtendedWord {
  id: number;
  base: string;
  accented?: string;
  pos?: string;
  level?: string;
  rank?: number | null;
  disabled?: boolean;
  grammar_attributes?: GrammarAttribute[];
  tags?: Tag[];
  definitions?: WordDefinition[];
  translations?: WordTranslation[];
  _groupedDefinitions?: DefinitionGroup[];
  _groupedTranslations?: TranslationGroup[];
  [key: string]: any;
}

interface SearchResult {
  results: ExtendedWord[];
  count: number;
  pos_choices?: Array<{ value: string; display: string }>;
  available_grammar_features?: Array<any>;
}

interface AppSettings {
  is_scraper_enabled: boolean;
  [key: string]: any;
}

// --- STATE INITIALIZATION ---

const emit = defineEmits<{
  (e: 'back'): void;
}>();
const { t } = useI18n();

// OPTIMIZED: Use shallowRef for large lists to avoid deep reactivity overhead
const words = shallowRef<SearchResult>({ results: [], count: 0 });
const isLoading = ref(false);
const isError = ref(false);


// [ADMIN] Pastikan store memuat semua bahasa
onMounted(async () => {
  await languageStore.fetchAdminLanguages();
});

import LoadingSpinner from '@/components/LoadingSpinner.vue';

// OPTIMIZED: Async Imports for heavy edit modals
const EditTerjemahanKata = defineAsyncComponent(
  () => import('../Konteks/EditTerjemahanKata.vue'),
);
const EditDefinisiKata = defineAsyncComponent(
  () => import('../Konteks/EditDefinisiKata.vue'),
);


// Helper for displayFlag (Memoized logic inside fetchPageData essentially)
const getFlagHtml = (code: string) => {
  if (!code) return '';
  const url = languageStore.getFlagUrlByCode(code);
  if (url) {
    return `<img src="${url}" alt="Bendera ${code}" class="w-full h-full object-contain" onerror="this.style.display='none'" />`;
  }
  return '';
};

// Helper to process data once (memoization) to avoid running functions in v-for
const processWordData = (word: ExtendedWord) => {
  // Pre-calculate definition groups
  const defGroups = word.definitions
    ? groupDefinitionsByLang(word.definitions)
    : [];
  word._groupedDefinitions = defGroups.map((g) => ({
    ...g,
    flagHtml: getFlagHtml(g.code),
  }));

  // Pre-calculate translation groups
  const transGroups = word.translations
    ? groupTranslationsByLang(word.translations)
    : [];
  word._groupedTranslations = transGroups.map((g) => ({
    ...g,
    flagHtml: getFlagHtml(g.code),
  }));

  return word;
};

async function fetchPageData(
  page = 1,
  targetLangCode: string,
  currentOrdering: string | null = null,
  currentSearchQuery: string | null = null,
) {
  isLoading.value = true;
  isError.value = false;

  try {
    const params: any = {
      page: page,
      ordering: currentOrdering,
      lang_code: targetLangCode,
    };
    if (currentSearchQuery) {
      params.q = currentSearchQuery;
    }
    const res = await api.get('/admin/words/', { params });

    // OPTIMIZED: Process data once before assigning to state
    if (res.data && res.data.results) {
      res.data.results = res.data.results.map((word: any) => processWordData(word));
    }

    words.value = res.data;
  } catch (e: any) {
    console.error(
      'Gagal mengambil data kata admin:',
      e.response ? e.response.data : e.message,
    );
    isError.value = true;
  } finally {
    isLoading.value = false;
  }
}

async function createWordData(payload: any) {
  const res = await api.patch('/admin/words/', payload);
  return res.data;
}

async function updateWordData(id: number | string, payload: any) {
  const res = await api.patch(`/admin/words/${id}/`, payload);
  return res.data;
}

const languageStore = useLanguageStore();
const allLanguages = computed(() => languageStore.allLanguages);
const targetLanguages = computed(() =>
  languageStore.opsiBahasa.filter(
    (lang) => lang.kodeBahasa !== selectedTargetCode.value,
  ),
);

const selectedTargetCode = ref('');
const currentPage = ref(1);
const sortKey = ref('id');
const sortOrder = ref<'asc' | 'desc'>('desc');
const ordering = computed(() =>
  sortKey.value
    ? (sortOrder.value === 'desc' ? '-' : '') + sortKey.value
    : null,
);
const searchQuery = ref('');
const isSearchFocused = ref(false);

const scrollContainer = ref<HTMLElement | null>(null);

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

const totalPages = computed(() =>
  words.value ? Math.ceil(words.value.count / 10) || 1 : 1,
);

// State Mode AI (Mode Pelengkapan Otomatis Lama)
const isAiCompletingAll = ref(false);
const processingWordId = ref<number | null>(null);
const isAiModeActive = computed(() => isAiCompletingAll.value);

// State UI
const isAddingNewRow = ref(false);
const newWordData = ref<ExtendedWord | null>(null);
const editingWordId = ref<number | null>(null);
const editingWord = reactive<ExtendedWord>({} as ExtendedWord);
const originalWord = ref<ExtendedWord | null>(null);

// State Modal Edit
const showTranslationsModal = ref(false);
const currentWordForTranslations = ref<Partial<ExtendedWord>>({});
const showDefinitionsModal = ref(false);
const currentWordForDefinitions = ref<Partial<ExtendedWord>>({});

// State for AI Completion Options Modal
const showAiCompletionOptionsModal = ref(false);
const aiCompleteTranslations = ref(false);
const aiCompleteDefinitions = ref(false);
const aiCompleteMorphology = ref(false);
const aiScraperEnabled = ref(false);
const appSettings = ref<AppSettings | null>(null);

const fetchAppSettings = async () => {
  try {
    const response = await api.get('/admin/app-settings/');
    appSettings.value = response.data;
  } catch (err) {
    console.error('Gagal mengambil pengaturan aplikasi:', err);
  }
};

const updateAppSettings = async (payload: Partial<AppSettings>) => {
  try {
    const response = await api.patch('/admin/app-settings/', payload);
    appSettings.value = response.data;
  } catch (err) {
    console.error('Gagal memperbarui pengaturan aplikasi:', err);
    if (appSettings.value && payload.is_scraper_enabled !== undefined) {
      appSettings.value.is_scraper_enabled = !payload.is_scraper_enabled;
    }
  }
};

// Logika AI
const isWordTranslationIncomplete = (word: ExtendedWord) => {
  if (!targetLanguages.value.length) return false;
  const targetLangCodes = targetLanguages.value.map((l) => l.kodeBahasa);
  const translatedLangCodes = new Set(
    word.translations?.map((t) => t.language_code) || [],
  );
  return targetLangCodes.some((code) => !translatedLangCodes.has(code));
};

const isWordDefinitionIncomplete = (word: ExtendedWord) => {
  return !word.definitions || word.definitions.length === 0;
};

const isWordMorphologyIncomplete = (word: ExtendedWord) => {
  // Check if word allows morphology generation
  const supportedPOS = ['verb', 'noun', 'adjective', 'adverb'];
  if (!word.pos || !supportedPOS.includes(word.pos.toLowerCase())) return false;

  // Always return true for supported POS to let backend ensure all forms are generated
  // This fixes issue where having 1 form caused the system to skip generating the rest
  return true;
};

async function startAiCompletionProcess() {
  console.log('Memulai proses AI Completion...');
  if (!selectedTargetCode.value || !words.value || words.value.count === 0)
    return;
  if (
    !aiCompleteTranslations.value &&
    !aiCompleteDefinitions.value &&
    !aiCompleteMorphology.value
  ) {
    alert(
      t('admin.ai_select_option'),
    );
    return;
  }

  showAiCompletionOptionsModal.value = false;
  isAiCompletingAll.value = true;
  processingWordId.value = null;

  await updateAppSettings({ is_scraper_enabled: aiScraperEnabled.value });

  const startPage = currentPage.value;

  try {
    for (let page = startPage; page <= totalPages.value; page++) {
      if (!isAiCompletingAll.value) break;

      if (page !== startPage) {
        await goToPage(page);
      }

      for (const wordToProcess of words.value.results) {
        if (!isAiCompletingAll.value) break;

        const hasIncompleteTranslation =
          aiCompleteTranslations.value &&
          isWordTranslationIncomplete(wordToProcess);
        const hasIncompleteDefinition =
          aiCompleteDefinitions.value &&
          isWordDefinitionIncomplete(wordToProcess);
        const hasIncompleteMorphology =
          aiCompleteMorphology.value &&
          isWordMorphologyIncomplete(wordToProcess);

        if (
          wordToProcess.disabled ||
          (!hasIncompleteTranslation &&
            !hasIncompleteDefinition &&
            !hasIncompleteMorphology)
        ) {
          continue;
        }

        processingWordId.value = wordToProcess.id;

        let shouldProcessDefinition = hasIncompleteDefinition;
        let shouldProcessTranslation = hasIncompleteTranslation;

        // Process Definition
        if (aiCompleteDefinitions.value && shouldProcessDefinition) {
          let successDefine = false;
          let retriesDefine = 0;
          const MAX_DEFINE_RETRIES = 3;

          while (
            !successDefine &&
            isAiCompletingAll.value &&
            retriesDefine < MAX_DEFINE_RETRIES
          ) {
            try {
              const previewResponse = await api.patch(
                `/admin/words/${wordToProcess.id}/`,
                { action: 'ai_define' },
              );
              const previewDefinitions = previewResponse.data;

              if (previewDefinitions && previewDefinitions.length > 0) {
                const saveResponse = await api.patch(
                  `/admin/words/${wordToProcess.id}/`,
                  { definitions: previewDefinitions },
                );
                const wordIndex = words.value.results.findIndex(
                  (w) => w.id === saveResponse.data.id,
                );
                if (wordIndex !== -1) {
                  const processed = processWordData(saveResponse.data);
                  words.value.results[wordIndex] = processed;
                  Object.assign(wordToProcess, processed);
                  triggerRef(words); // Trigger update for shallowRef
                }
                successDefine = true;
              } else {
                console.warn(
                  `AI Definisi tidak menghasilkan definisi untuk kata ID ${wordToProcess.id}.`,
                );
                successDefine = true;
              }
            } catch (err) {
              retriesDefine++;
              console.error(`Gagal memproses definisi...`, err);
              if (
                isAiCompletingAll.value &&
                retriesDefine < MAX_DEFINE_RETRIES
              ) {
                await new Promise((res) => setTimeout(res, 5000));
              } else {
                break;
              }
            }
          }
        }

        // Process Translation
        if (
          isAiCompletingAll.value &&
          aiCompleteTranslations.value &&
          shouldProcessTranslation
        ) {
          if (isWordTranslationIncomplete(wordToProcess)) {
            let success = false;
            while (!success && isAiCompletingAll.value) {
              try {
                const response = await api.patch(
                  `/admin/words/${wordToProcess.id}/`,
                  { action: 'ai_complete' },
                );
                const wordIndex = words.value.results.findIndex(
                  (w) => w.id === response.data.id,
                );
                if (wordIndex !== -1) {
                  const processed = processWordData(response.data);
                  words.value.results[wordIndex] = processed;
                  Object.assign(wordToProcess, processed);
                  triggerRef(words); // Trigger update for shallowRef
                }
                success = true;
              } catch (err) {
                console.error(`Gagal memproses terjemahan...`, err);
                if (isAiCompletingAll.value) {
                  await new Promise((res) => setTimeout(res, 5000));
                } else {
                  break;
                }
              }
            }
          }
        }

        // Process Morphology (English only)
        if (
          isAiCompletingAll.value &&
          aiCompleteMorphology.value &&
          hasIncompleteMorphology
        ) {
          try {
            const response = await api.patch(
              `/admin/words/${wordToProcess.id}/`,
              { action: 'generate_morphology' },
            );
            const wordIndex = words.value.results.findIndex(
              (w) => w.id === response.data.id,
            );
            if (wordIndex !== -1) {
              const processed = processWordData(response.data);
              words.value.results[wordIndex] = processed;
              Object.assign(wordToProcess, processed);
              triggerRef(words);
            }
          } catch (err) {
            console.error(
              `Gagal memproses morfologi untuk kata ID ${wordToProcess.id}:`,
              err,
            );
          }
        }

        // --- DELAY 1 DETIK DI SINI ---
        if (isAiCompletingAll.value) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        processingWordId.value = null;

        if (!isAiCompletingAll.value) break;
      }
      if (!isAiCompletingAll.value) break;
    }

    if (isAiCompletingAll.value) {
      alert('Proses pelengkapan AI selesai.');
    }
  } catch (error) {
    console.error('Terjadi error tak terduga pada mode pelengkapan AI:', error);
    alert('Proses AI dihentikan karena error. Lihat konsol untuk detail.');
  } finally {
    stopAiMode();
  }
}

function stopAiMode() {
  isAiCompletingAll.value = false;
  processingWordId.value = null;
  goToPage(currentPage.value, true);
  console.log('Proses AI telah dihentikan.');
}

function openAiCompletionOptionsModal() {
  aiCompleteTranslations.value = true;
  aiCompleteDefinitions.value = true;
  aiCompleteMorphology.value = selectedTargetCode.value === 'en'; // Default on for English
  aiScraperEnabled.value = appSettings.value?.is_scraper_enabled || false;
  showAiCompletionOptionsModal.value = true;
}

const posChoices = computed(() => words.value?.pos_choices || []);

onMounted(async () => {
  if (!languageStore.allLanguages.length) await languageStore.init();
  await fetchAppSettings();
  if (languageStore.selectedTarget?.kodeBahasa) {
    selectedTargetCode.value = languageStore.selectedTarget.kodeBahasa;
  } else if (allLanguages.value.length > 0) {
    selectedTargetCode.value = allLanguages.value[0].lang_code;
  }

  setTimeout(() => {
    scrollToActivePage(currentPage.value);
  }, 50);
});

const debouncedSearch = useDebounceFn(() => {
  goToPage(1, true);
}, 300);

watch(searchQuery, debouncedSearch);

watch(
  [selectedTargetCode, ordering],
  () => {
    if (selectedTargetCode.value) {
      goToPage(1, true);
      editingWordId.value = null;
      const lang = allLanguages.value.find(
        (l) => l.lang_code === selectedTargetCode.value,
      );
      if (lang) languageStore.setLanguages(languageStore.bahasaAsal, lang.name);
    }
  },
  { immediate: true },
);

const visiblePageRange = computed(() => {
  const total = totalPages.value || 1;
  return Array.from({ length: total }, (_, i) => i + 1);
});

// --- Fungsi Grouping (Pure functions used by helper) ---
function groupTranslationsByLang(translations: WordTranslation[]): TranslationGroup[] {
  if (!translations) return [];
  const groups = translations.reduce((acc, t) => {
    const code = t.language_code || '';
    if (code) acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return Object.entries(groups).map(([code, count]) => ({ code, count, flagHtml: '' }));
}

function groupDefinitionsByLang(definitions: WordDefinition[]): DefinitionGroup[] {
  if (!definitions) return [];
  const groups = definitions.reduce((acc, d) => {
    const code = d.language_code || '';
    if (code) acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return Object.entries(groups).map(([code, count]) => ({ code, count, flagHtml: '' }));
}

function setSort(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
}



// Helper default object
const defaultNewWord = () => ({
  id: 0, // Placeholder
  base: '',
  accented: '',
  pos: '',
  level: '',
  rank: null,
  translations: [],
  definitions: [],
});

// --- CRUD Functions ---
function startAddNew() {
  newWordData.value = defaultNewWord();
  isAddingNewRow.value = true;
}

function cancelAddNew() {
  isAddingNewRow.value = false;
  newWordData.value = null;
}

async function saveNewWord() {
  if (!newWordData.value?.base) return;
  try {
    await createWordData({
      ...newWordData.value,
      language: selectedTargetCode.value,
    });
    cancelAddNew();
    goToPage(currentPage.value, true);
  } catch (e) {
    console.error('Gagal menyimpan kata:', e);
  }
}

function startEdit(item) {
  editingWordId.value = item.id;
  originalWord.value = cloneDeep(item);
  const wordWithLang = {
    ...cloneDeep(item),
    language_code: selectedTargetCode.value,
  };
  Object.assign(editingWord, wordWithLang);

  currentWordForTranslations.value = cloneDeep(item);
  currentWordForDefinitions.value = cloneDeep(item);
}

function cancelEdit() {
  editingWordId.value = null;
  originalWord.value = null;
  currentWordForTranslations.value = {};
  currentWordForDefinitions.value = {};
}

async function saveEdit() {
  if (!editingWord.base) return;
  try {
    const updatedWordFromServer = await updateWordData(editingWord.id, {
      ...editingWord,
      language: selectedTargetCode.value,
    });
    if (updatedWordFromServer && words.value && words.value.results) {
      const wordIndex = words.value.results.findIndex(
        (w) => w.id === updatedWordFromServer.id,
      );
      if (wordIndex !== -1) {
        words.value.results[wordIndex] = processWordData(updatedWordFromServer);
        triggerRef(words); // Trigger update for shallowRef
      }
    }
    cancelEdit();
  } catch (e) {
    console.error('Gagal menyimpan kata:', e);
  }
}


async function handleTranslationsSaved(payloadWord: any, options: { stayOpen?: boolean } = {}) {
  if (!payloadWord || !payloadWord.id) {
    if (!options.stayOpen) showTranslationsModal.value = false;
    return;
  }
  try {
    const trulyUpdatedWord = payloadWord;
    if (editingWordId.value === trulyUpdatedWord.id) {
      Object.assign(editingWord, trulyUpdatedWord);
      currentWordForTranslations.value = cloneDeep(trulyUpdatedWord);
      currentWordForDefinitions.value = cloneDeep(trulyUpdatedWord);
    }
    const wordIndex = words.value.results.findIndex(
      (w) => w.id === trulyUpdatedWord.id,
    );
    if (wordIndex !== -1) {
      words.value.results[wordIndex] = processWordData(trulyUpdatedWord);
      triggerRef(words); // Trigger update for shallowRef
    }
  } catch (error) {
    console.error("Gagal memproses data 'translations-saved':", error);
    if (!options.stayOpen) showTranslationsModal.value = false;
  }
}

async function handleDefinitionsSaved(payloadWord: any, options: { stayOpen?: boolean } = {}) {
  if (!payloadWord || !payloadWord.id) {
    if (!options.stayOpen) showDefinitionsModal.value = false;
    return;
  }
  try {
    const trulyUpdatedWord = payloadWord;
    if (editingWordId.value === trulyUpdatedWord.id) {
      Object.assign(editingWord, trulyUpdatedWord);
      currentWordForTranslations.value = cloneDeep(trulyUpdatedWord);
      currentWordForDefinitions.value = cloneDeep(trulyUpdatedWord);
    }
    const wordIndex = words.value.results.findIndex(
      (w) => w.id === trulyUpdatedWord.id,
    );
    if (wordIndex !== -1) {
      words.value.results[wordIndex] = processWordData(trulyUpdatedWord);
      triggerRef(words); // Trigger update for shallowRef
    }

    await goToPage(currentPage.value, true);

    if (!options.stayOpen) showDefinitionsModal.value = false;
  } catch (error) {
    console.error("Gagal memproses data 'definitions-saved':", error);
    if (!options.stayOpen) showDefinitionsModal.value = false;
  }
}

async function toggleWordStatus(word: any) {
  const action = word.disabled ? 'mengaktifkan' : 'menonaktifkan';
  try {
    const newStatus = !word.disabled;
    const updatedWordFromServer = await updateWordData(word.id, {
      disabled: newStatus,
    });

    if (updatedWordFromServer && words.value && words.value.results) {
      const wordIndex = words.value.results.findIndex(
        (w) => w.id === updatedWordFromServer.id,
      );
      if (wordIndex !== -1) {
        words.value.results[wordIndex] = processWordData(updatedWordFromServer);
        triggerRef(words); // Trigger update for shallowRef
      }
    }
  } catch (e) {
    console.error(`Gagal ${action} kata:`, e);
  }
}

const checkIfWordNeedsAiProcessing = (word: any) => {
  // Hanya proses jika enabled di modal dan kondisi terpenuhi
  if (aiCompleteTranslations.value && isWordTranslationIncomplete(word)) return true;
  if (aiCompleteDefinitions.value && isWordDefinitionIncomplete(word)) return true;
  if (aiCompleteMorphology.value && isWordMorphologyIncomplete(word)) return true;
  return false;
};

const completeAttributesWithAi = async (word: any) => {
  try {
    // 1. Construct AI request payload dynamically
    const tasks: string[] = [];
    if (aiCompleteTranslations.value && isWordTranslationIncomplete(word)) tasks.push('translations');
    if (aiCompleteDefinitions.value && isWordDefinitionIncomplete(word)) tasks.push('definitions');
    if (aiCompleteMorphology.value && isWordMorphologyIncomplete(word)) tasks.push('morphology');

    if (tasks.length === 0) return; // Nothing to do

    // 2. Call AI endpoint (NEW Unified Endpoint)
    await api.post(`/admin/words/${word.id}/ai-complete/`, {
      tasks: tasks,
      target_languages: targetLanguages.value.map(l => l.kodeBahasa) // Context for translations
    });

    // 3. Re-fetch word data properly to update UI
    const updatedWordRes = await api.get(`/admin/words/${word.id}/`);

    // 4. Update local state
    if (updatedWordRes.data && words.value.results) {
      const index = words.value.results.findIndex(w => w.id === word.id);
      if (index !== -1) {
        words.value.results[index] = processWordData(updatedWordRes.data);
        triggerRef(words);
      }
    }

  } catch (error) {
    console.error(`Gagal melengkapi atribut untuk kata ${word.base}:`, error);
  }
};

async function goToPage(page: number, force = false) {
  if (!selectedTargetCode.value || page < 1) return;
  if (totalPages.value > 0 && page > totalPages.value) return;
  if (page === currentPage.value && !force) return;

  currentPage.value = page;
  try {
    await fetchPageData(
      page,
      selectedTargetCode.value,
      ordering.value,
      searchQuery.value,
    );
  } catch (error) {
    console.error(`Gagal memuat halaman ${page}:`, error);
  }
}

async function handlePageClick(page: number) {
  await goToPage(page);
  await nextTick();
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  if (typeof page === 'number') scrollToActivePage(page);
}

watch(currentPage, (p) => {
  setTimeout(() => {
    scrollToActivePage(p);
  }, 50);
});

</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
  height: 6px;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
