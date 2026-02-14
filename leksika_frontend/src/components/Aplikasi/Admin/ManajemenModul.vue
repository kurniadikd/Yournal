<template>
  <Transition :name="materiAktif ? 'zoom-in' : 'zoom-out'" mode="out-in">
    <ManajemenMateri v-if="materiAktif" key="materi-view" :materi="materiAktif" :is-saving="isSaving" :error="error"
      :is-public-view="isReadOnly" :module-id="activeModuleId" :ai-context="currentAiContext"
      :can-toggle-preview="!isPublicView" :is-active="materiAktif.is_active !== false"
      :has-prev-material="hasPrevMaterial" :has-next-material="hasNextMaterial" @back="handleBackFromMateri"
      @request-global-save="handleGlobalSave" @update:materi="updateMateriInState" @toggle-preview="togglePreviewMode"
      @toggle-active="handleToggleMateriActive" @navigate-prev="navigateToPrevMaterial"
      @navigate-next="navigateToNextMaterial" />

    <div v-else key="module-view" class="flex flex-col h-full pb-20">
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />

      <header class="relative flex items-center justify-between mb-6 flex-shrink-0 min-h-[40px]">
        <div class="z-10">
          <button @click="handleBack"
            class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] transition-colors">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
        </div>

        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 class="text-xl font-bold text-[var(--color-on-background)] text-center px-12 pointer-events-auto">
            {{ isReadOnly ? 'Daftar Modul' : `Atur Modul untuk ${languagePair.toUpperCase()}` }}
          </h1>
        </div>

        <div class="flex items-center space-x-2 z-10">
          <button v-if="!isPublicView" @click="togglePreviewMode"
            :class="isPreviewMode ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]' : 'bg-[var(--color-surface)] text-[var(--color-on-surface-variant)]'"
            class="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[var(--color-surface-container-low)] transition-colors"
            :title="isPreviewMode ? 'Keluar Pratinjau' : 'Pratinjau Mode Siswa'">
            <span class="material-symbols-outlined">{{ isPreviewMode ? 'preview_off' : 'preview' }}</span>
          </button>

          <template v-if="!isReadOnly">
            <button @click="openImportJsonModal()"
              class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] transition-colors"
              title="Impor/Edit dari JSON">
              <span class="material-symbols-outlined">file_upload</span>
            </button>
            <button v-if="isDirty" @click="simpanModul"
              class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] text-[var(--color-on-primary)] transition-colors"
              title="Simpan" :disabled="isSaving || isLoading">
              <span v-if="!isSaving && !isLoading" class="material-symbols-outlined">save</span>
              <span v-else class="material-symbols-outlined animate-spin">sync</span>
            </button>
            <div v-else-if="isSaving || isLoading"
              class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary-container)] text-[var(--color-on-primary)] cursor-not-allowed"
              title="Menyimpan...">
              <span class="material-symbols-outlined animate-spin">sync</span>
            </div>
          </template>
        </div>
      </header>

      <div v-if="!isReadOnly" class="mb-6 bg-[var(--color-surface-container-high)] p-4 rounded-2xl">
        <div class="flex justify-between items-center mb-3">
          <div class="flex items-center gap-2">
            <h2 class="text-md font-semibold text-[var(--color-secondary)]">Pilih Relasi Bahasa</h2>
            <button @click="isSummaryExpanded = !isSummaryExpanded"
              class="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)] transition-colors"
              :title="isSummaryExpanded ? 'Sembunyikan Daftar' : 'Tampilkan Daftar'">
              <span class="material-symbols-outlined text-lg transition-transform duration-300"
                :class="{ 'rotate-180': isSummaryExpanded }">expand_more</span>
            </button>
          </div>
          <div v-show="isSummaryExpanded" class="flex items-center space-x-2">
            <button @click="setSort('source')"
              class="flex items-center space-x-1 px-2 py-1 text-xs rounded-md transition-colors"
              :class="sortKey === 'source' ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'">
              <span>Asal</span>
              <span v-if="sortKey === 'source'" class="material-symbols-outlined !text-sm">
                {{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
              </span>
            </button>
            <button @click="setSort('target')"
              class="flex items-center space-x-1 px-2 py-1 text-xs rounded-md transition-colors"
              :class="sortKey === 'target' ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'">
              <span>Target</span>
              <span v-if="sortKey === 'target'" class="material-symbols-outlined !text-sm">
                {{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
              </span>
            </button>
            <button @click="setSort('modules')"
              class="flex items-center space-x-1 px-2 py-1 text-xs rounded-md transition-colors"
              :class="sortKey === 'modules' ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'">
              <span>Modul</span>
              <span v-if="sortKey === 'modules'" class="material-symbols-outlined !text-sm">
                {{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
              </span>
            </button>
          </div>
        </div>

        <Transition enter-active-class="transition-all duration-300 ease-out"
          leave-active-class="transition-all duration-200 ease-in" enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-[15rem]" leave-from-class="opacity-100 max-h-[15rem]"
          leave-to-class="opacity-0 max-h-0">
          <div v-if="isSummaryExpanded" class="overflow-hidden">
            <div v-if="isLoading && !languagePairSummary.length"
              class="text-center text-sm text-[var(--color-outline)] py-4">
              Memuat ringkasan...
            </div>
            <div v-else-if="comprehensiveSummary.length > 0" class="max-h-60 overflow-y-auto pr-2">
              <div class="space-y-2">
                <div v-for="summary in comprehensiveSummary" :key="summary.language_pair"
                  @click="selectLanguagePair(summary.language_pair)"
                  class="flex items-center p-3 rounded-lg cursor-pointer transition-colors" :class="{
                    'bg-[var(--color-primary-container)]': summary.language_pair === languagePair,
                    'hover:bg-[var(--color-surface-container-low)]': summary.language_pair !== languagePair
                  }">
                  <div class="flex items-center flex-1">
                    <img :src="summary.source.bendera" class="w-6 h-auto rounded-sm " :alt="summary.source.nama" />
                    <span class="material-symbols-outlined mx-2"
                      :class="summary.language_pair === languagePair ? 'text-[var(--color-on-primary-container)]' : 'text-[var(--color-outline)]'">arrow_right_alt</span>
                    <img :src="summary.target.bendera" class="w-6 h-auto rounded-sm " :alt="summary.target.nama" />
                    <span class="ml-4 font-medium text-sm"
                      :class="summary.language_pair === languagePair ? 'text-[var(--color-on-primary-container)]' : 'text-[var(--color-on-background)]'">
                      {{ summary.source.nama }} ke {{ summary.target.nama }}
                    </span>
                    <span class="ml-2 font-mono text-xs"
                      :class="summary.language_pair === languagePair ? 'text-[var(--color-on-primary-container)]/70' : 'text-[var(--color-outline)]'">({{
                        summary.language_pair }})</span>
                  </div>
                  <div class="flex items-center">
                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold" :class="summary.module_count > 0
                      ? 'bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]'
                      : 'bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]'">
                      {{ summary.module_count }} Modul
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center text-sm text-[var(--color-outline)] py-4">
              Tidak ada data ringkasan bahasa.
            </div>
          </div>
        </Transition>
      </div>

      <div v-if="error"
        class="bg-[var(--color-error-container)] border-[var(--color-error)] text-[var(--color-on-error-container)] px-4 py-3 rounded-2xl mb-4"
        role="alert">
        <strong class="font-bold">Terjadi Kesalahan: </strong>
        <span class="block sm:inline">{{ error }}</span>
      </div>

      <div v-if="isLoading" class="text-center py-12 flex-grow flex items-center justify-center">
        <div class="flex flex-col items-center gap-3">
          <LoadingSpinner size="xl" color="outline" />
          <p class="text-[var(--color-outline)]">Memuat data...</p>
        </div>
      </div>

      <div v-else-if="!moduls || moduls.length === 0"
        class="text-center py-12 bg-[var(--color-surface-container-high)] rounded-2xl border border-[var(--color-outline-variant)]  flex-grow flex items-center justify-center">
        <div>
          <p class="text-[var(--color-on-surface-variant)]">Tidak ada modul yang ditemukan.</p>
          <div v-if="!isReadOnly" class="flex justify-center">
            <button @click="tambahModul"
              class="mt-4 px-5 py-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full font-semibold hover:bg-[var(--color-primary-fixed-dim)] transition-colors flex items-center space-x-2">
              <span class="material-symbols-outlined text-base">add</span>
              <span>Buat Modul Baru</span>
            </button>
          </div>
        </div>
      </div>

      <div v-else class="flex-grow overflow-y-auto" ref="scrollContainer">
        <TransitionGroup tag="div" class="space-y-6" appear enter-active-class="transition duration-500 ease-out"
          enter-from-class="opacity-0 translate-y-8" enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-300 ease-in" leave-from-class="opacity-100"
          leave-to-class="opacity-0 -translate-y-8">
          <div v-for="(modul) in getFilteredModuls" :key="modul.temp_id"
            :class="['bg-[var(--color-surface-container-high)] rounded-2xl !overflow-hidden no-scrollbar transition-all duration-300', modul.isRingkas ? 'p-0' : 'p-3']"
            style="overflow: hidden !important;">

            <div
              class="relative w-full h-[300px] bg-[var(--color-on-tertiary)] dark:bg-[var(--color-primary)] rounded-xl group !overflow-hidden no-scrollbar transition-all duration-300 cursor-pointer transform-gpu will-change-transform"
              :style="imageContainerStyle" :class="{ 'mb-6': !modul.isRingkas }"
              @click="modul.isRingkas = !modul.isRingkas">
              <button @click.stop="modul.isRingkas = !modul.isRingkas"
                class="absolute top-4 right-4 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-on-surface)]/30 text-[var(--color-on-primary)] hover:bg-[var(--color-on-surface)]/50 transition-all duration-300 ease-in-out group-hover:scale-125"
                :title="modul.isRingkas ? 'Tampilkan Detail' : 'Sembunyikan Detail'">
                <span class="material-symbols-outlined transition-transform duration-500"
                  :class="{ 'rotate-180': modul.isRingkas }">
                  expand_less
                </span>
              </button>

              <div
                class="w-full h-full flex items-center justify-center p-4 transition-all no-scrollbar overflow-hidden"
                :class="{
                  'cursor-grab': modul.isIconEditing && !isDragging && !isReadOnly,
                  'cursor-grabbing': modul.isIconEditing && isDragging && activeDragModul?.temp_id === modul.temp_id && !isReadOnly,
                  'scale-105 ': isDragging && activeDragModul?.temp_id === modul.temp_id
                }" @mousedown="!isReadOnly && handleMouseDown($event, modul)"
                @touchstart="!isReadOnly && handleTouchStart($event, modul)">
                <div v-if="modul.icon_svg"
                  class="w-full h-full bg-[var(--color-primary)] dark:bg-[var(--color-on-tertiary)] transition-transform duration-500 pointer-events-none transform-gpu will-change-transform"
                  :style="{
                    transform: `scale(${modul.icon_settings.scale}) translateX(${modul.icon_settings.translateX}%) translateY(${modul.icon_settings.translateY}%)`,
                    maskImage: `url('${modul.icon_data_uri || getSvgDataUri(modul.icon_svg)}')`,
                    webkitMaskImage: `url('${modul.icon_data_uri || getSvgDataUri(modul.icon_svg)}')`,
                    maskSize: 'contain',
                    webkitMaskSize: 'contain',
                    maskPosition: 'center',
                    webkitMaskPosition: 'center',
                    maskRepeat: 'no-repeat',
                    webkitMaskRepeat: 'no-repeat'
                  }"></div>
                <span v-else
                  class="material-symbols-outlined text-6xl text-[var(--color-on-secondary)] pointer-events-none">
                  category
                </span>
              </div>

              <div class="absolute bottom-0 left-0 right-0 h-16  transition-opacity"
                :style="{ opacity: blurOverlayOpacity }">
              </div>

              <div v-if="modul.isRingkas" class="absolute bottom-0 left-0 w-full p-4 ">
                <h2 class="text-2xl font-bold text-[var(--color-on-surface)] tracking-tight">
                  <span class="bg-[var(--color-on-primary)] px-2 rounded">{{ modul.title?.[targetLang] || `Judul Target`
                    }}</span>
                  <span v-if="modul.is_active === false"
                    class="ml-2 text-sm font-semibold bg-[var(--color-error)] text-[var(--color-on-error)] px-2 py-0.5 rounded">NONAKTIF</span>
                </h2>
                <h3 class="text-xl  text-[var(--color-primary)] mt-1">
                  <span class="bg-[var(--color-on-primary)] px-2 rounded">{{ modul.title?.[sourceLang] || `Judul Asal`
                    }}</span>
                </h3>
              </div>

              <div v-if="modul.isIconEditing && !modul.isRingkas && !isReadOnly"
                class="absolute inset-x-0 bottom-0 bg-black/50 backdrop-blur-sm p-3 rounded-b-xl">
                <div
                  class="grid grid-cols-[auto,1fr,auto] gap-x-2 gap-y-1 items-center text-[var(--color-on-primary)] text-xs">
                  <span class="material-symbols-outlined !text-base">aspect_ratio</span>
                  <input type="range" v-model.number="modul.icon_settings.scale" min="0.1" max="2" step="0.05"
                    class="w-full h-1 bg-[var(--color-on-primary)]/30 rounded-lg appearance-none cursor-pointer range-sm">
                  <span class="font-mono w-10 text-right">{{ modul.icon_settings.scale.toFixed(2) }}</span>

                  <span class="material-symbols-outlined !text-base">open_in_full</span>
                  <input type="range" v-model.number="modul.icon_settings.translateX" min="-50" max="50" step="1"
                    class="w-full h-1 bg-[var(--color-on-primary)]/30 rounded-lg appearance-none cursor-pointer range-sm">
                  <span class="font-mono w-10 text-right">{{ modul.icon_settings.translateX }}%</span>

                  <span class="material-symbols-outlined !text-base -rotate-90">open_in_full</span>
                  <input type="range" v-model.number="modul.icon_settings.translateY" min="-50" max="50" step="1"
                    class="w-full h-1 bg-[var(--color-on-primary)]/30 rounded-lg appearance-none cursor-pointer range-sm">
                  <span class="font-mono w-10 text-right">{{ modul.icon_settings.translateY }}%</span>
                </div>
              </div>

              <div v-if="!modul.isRingkas && !isReadOnly"
                class="absolute bottom-4 right-4 flex items-center space-x-2 transition-opacity duration-300">
                <button v-if="modul.icon_svg" @click.stop="modul.isIconEditing = !modul.isIconEditing"
                  class="p-2 rounded-full bg-[var(--color-on-surface)]/60 text-[var(--color-on-primary)] hover:bg-[var(--color-on-surface)]/80  flex items-center justify-center"
                  :title="modul.isIconEditing ? 'Selesai Edit' : 'Edit Ikon'">
                  <span class="material-symbols-outlined">{{ modul.isIconEditing ? 'done' : 'tune' }}</span>
                </button>
                <label class="cursor-pointer" title="Unggah SVG">
                  <div
                    class="p-2 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)]  flex items-center justify-center">
                    <span class="material-symbols-outlined">add_photo_alternate</span>
                  </div>
                  <input type="file" @change="handleSvgUpload($event, modul)" accept=".svg,image/svg+xml"
                    class="hidden" />
                </label>
              </div>
            </div>

            <div v-if="!modul.isRingkas">

              <div v-if="!isReadOnly" class="flex justify-end items-center mb-4 gap-2">
                <div v-if="modul.code"
                  class="text-xs font-mono text-[var(--color-primary)] px-3 py-1.5 rounded-full border border-[var(--color-primary)]">
                  {{ modul.code }}
                </div>
                <button @click="openImportJsonModal(modul)"
                  class="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-surface)] hover:bg-[var(--color-surface-container-low)] text-[var(--color-outline)] hover:text-[var(--color-primary)] transition-colors border border-[var(--color-outline-variant)]"
                  title="Lihat/Salin/Edit JSON Modul">
                  <span class="material-symbols-outlined text-lg">file_json</span>
                </button>
                <button @click="toggleModulActive(modul)"
                  class="flex items-center justify-center w-8 h-8 rounded-full transition-colors border" :class="[
                    modul.is_active !== false
                      ? 'bg-[var(--color-surface)] hover:bg-[var(--color-error-container)] text-[var(--color-outline)] hover:text-[var(--color-error)] border-[var(--color-outline-variant)]'
                      : 'bg-[var(--color-primary-container)] hover:bg-[var(--color-primary)] text-[var(--color-on-primary-container)] hover:text-[var(--color-on-primary)] border-[var(--color-primary)]'
                  ]"
                  :title="modul.is_active !== false ? 'Nonaktifkan Modul (Sembunyikan dari Publik)' : 'Aktifkan Modul (Tampilkan ke Publik)'">
                  <span class="material-symbols-outlined text-lg">visibility_off</span>
                </button>
                <button @click="hapusModul(modul)"
                  class="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-surface)] hover:bg-[var(--color-error-container)] text-[var(--color-outline)] hover:text-[var(--color-error)] transition-colors border border-[var(--color-outline-variant)] hover:border-[var(--color-error)]"
                  title="Hapus Modul">
                  <span class="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>

              <div class="flex justify-between items-start mb-6" :class="{ 'mt-4': isReadOnly }">
                <div class="flex-grow space-y-2">
                  <div>
                    <textarea v-model="modul.title[targetLang]" v-auto-resize :readonly="isReadOnly"
                      class="text-3xl font-black text-[var(--color-on-background)] bg-transparent border-none focus:outline-none w-full resize-none overflow-hidden placeholder-[var(--color-outline-variant)] tracking-tight leading-tight block"
                      :class="{ 'placeholder-transparent': isReadOnly }" style="height: auto; field-sizing: content;"
                      rows="1" :placeholder="`Judul Modul (${targetLang.toUpperCase()})`"></textarea>
                  </div>
                  <div>
                    <textarea v-if="modul.title" v-model="modul.title[sourceLang]" v-auto-resize :readonly="isReadOnly"
                      class="text-2xl font-medium text-[var(--color-on-surface-variant)] bg-transparent border-none focus:outline-none w-full resize-none overflow-hidden placeholder-[var(--color-outline-variant)] block"
                      :class="{ 'placeholder-transparent': isReadOnly }" style="height: auto; field-sizing: content;"
                      rows="1" :placeholder="`Judul Modul (${sourceLang.toUpperCase()})`"></textarea>
                  </div>
                </div>
              </div>

              <div class="mt-6">
                <div class="flex justify-between items-center mb-2">
                  <h3 class="text-lg font-semibold text-[var(--color-secondary)]">Deskripsi</h3>
                  <div class="flex items-center space-x-2">
                    <button @click="modul.isDescriptionExpanded = !modul.isDescriptionExpanded"
                      class="flex items-center space-x-2 rounded-full bg-[var(--color-surface-container)] px-3 py-1 hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] transition-colors"
                      :title="modul.isDescriptionExpanded ? 'Sembunyikan Deskripsi' : 'Tampilkan Deskripsi'">
                      <span class="material-symbols-outlined text-base">{{ modul.isDescriptionExpanded ? 'expand_less' :
                        'expand_more' }}</span>
                    </button>
                    <div v-if="!isReadOnly"
                      class="flex items-center gap-2 border-l border-[var(--color-outline-variant)] pl-2">
                      <button @click="toggleDescTarget(modul)"
                        :class="['w-8 h-8 flex items-center justify-center rounded-full text-[10px] font-bold transition-all  border', modul.showTargetDesc ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]' : 'bg-[var(--color-surface)] text-[var(--color-outline)] border-[var(--color-outline-variant)] hover:border-[var(--color-outline)]']">{{
                          targetLang.toUpperCase() }}</button>
                      <button @click="toggleDescSource(modul)"
                        :class="['w-8 h-8 flex items-center justify-center rounded-full text-[10px] font-bold transition-all  border', modul.showSourceDesc ? 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)] border-[var(--color-secondary)]' : 'bg-[var(--color-surface)] text-[var(--color-outline)] border-[var(--color-outline-variant)] hover:border-[var(--color-outline)]']">{{
                          sourceLang.toUpperCase() }}</button>
                    </div>
                  </div>
                </div>
                <Transition appear enter-active-class="transition-all duration-300 ease-in-out"
                  leave-active-class="transition-all duration-200 ease-in-out" enter-from-class="opacity-0 max-h-0"
                  enter-to-class="opacity-100 max-h-screen" leave-from-class="opacity-100 max-h-screen"
                  leave-to-class="opacity-0 max-h-0">
                  <div v-if="modul.isDescriptionExpanded" class="overflow-hidden">
                    <div class="p-4 rounded-xl bg-[var(--color-surface-container)] transition-all"
                      :class="{ 'focus-within:ring-2 focus-within:ring-[var(--color-primary)]': !isReadOnly }">
                      <textarea v-if="modul.showTargetDesc" v-model="modul.description[targetLang]" v-auto-resize
                        :readonly="isReadOnly"
                        class="w-full bg-transparent focus:outline-none resize-none overflow-hidden text-md text-[var(--color-on-surface)]"
                        :class="{ 'placeholder-transparent': isReadOnly }" rows="2"
                        :placeholder="`Deskripsi modul (${targetLang.toUpperCase()})...`"></textarea>
                      <div v-if="modul.showTargetDesc && modul.showSourceDesc"
                        class="border-t border-[var(--color-outline-variant)] mt-3 pt-3 -mx-4 px-4"></div>
                      <textarea v-if="modul.showSourceDesc" v-model="modul.description[sourceLang]" v-auto-resize
                        :readonly="isReadOnly"
                        class="w-full bg-transparent focus:outline-none resize-none overflow-hidden text-base text-[var(--color-on-surface-variant)] mt-1"
                        :class="{ 'placeholder-transparent': isReadOnly }" rows="2"
                        :placeholder="`Deskripsi modul (${sourceLang.toUpperCase()})...`"></textarea>
                    </div>
                  </div>
                </Transition>
              </div>

              <div class="mt-6">
                <div class="flex justify-between items-center mb-2">
                  <h3 class="text-lg font-semibold text-[var(--color-secondary)]">Tujuan Pembelajaran</h3>
                  <button @click="modul.isObjectivesExpanded = !modul.isObjectivesExpanded"
                    class="flex items-center space-x-2 rounded-full bg-[var(--color-surface-container)] px-3 py-1 hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] transition-colors"
                    :title="modul.isObjectivesExpanded ? 'Sembunyikan Tujuan' : 'Tampilkan Tujuan'">
                    <span class="material-symbols-outlined text-base">{{ modul.isObjectivesExpanded ? 'expand_less' :
                      'expand_more' }}</span>
                  </button>
                </div>
                <Transition appear enter-active-class="transition-all duration-300 ease-in-out"
                  leave-active-class="transition-all duration-200 ease-in-out" enter-from-class="opacity-0 max-h-0"
                  enter-to-class="opacity-100 max-h-screen" leave-from-class="opacity-100 max-h-screen"
                  leave-to-class="opacity-0 max-h-0">
                  <div v-if="modul.isObjectivesExpanded" class="overflow-hidden">
                    <div class="p-4 rounded-xl bg-[var(--color-surface-container)] transition-all"
                      :class="{ 'focus-within:ring-2 focus-within:ring-[var(--color-secondary)]': !isReadOnly }">
                      <textarea v-if="modul.showTargetDesc" v-model="modul.learning_objectives[targetLang]"
                        v-auto-resize :readonly="isReadOnly"
                        class="w-full bg-transparent focus:outline-none resize-none overflow-hidden text-md text-[var(--color-on-surface)]"
                        :class="{ 'placeholder-transparent': isReadOnly }" rows="2"
                        :placeholder="`Tujuan pembelajaran (${targetLang.toUpperCase()})...`"></textarea>
                      <div v-if="modul.showTargetDesc && modul.showSourceDesc"
                        class="border-t border-[var(--color-outline-variant)] mt-3 pt-3 -mx-4 px-4"></div>
                      <textarea v-if="modul.showSourceDesc" v-model="modul.learning_objectives[sourceLang]"
                        v-auto-resize :readonly="isReadOnly"
                        class="w-full bg-transparent focus:outline-none resize-none overflow-hidden text-base text-[var(--color-on-surface-variant)] mt-1"
                        :class="{ 'placeholder-transparent': isReadOnly }" rows="2"
                        :placeholder="`Learning objectives (${sourceLang.toUpperCase()})...`"></textarea>
                    </div>
                  </div>
                </Transition>
              </div>

              <div class="mt-8">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="text-lg font-semibold text-[var(--color-secondary)]">Bab</h3>
                  <div class="flex items-center space-x-2">
                    <button v-if="modul.chapters.length > 0"
                      @click="modul.isChaptersExpanded = !modul.isChaptersExpanded"
                      class="flex items-center space-x-2 rounded-full bg-[var(--color-surface-container)] px-3 h-8 hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] transition-colors"
                      :title="modul.isChaptersExpanded ? 'Sembunyikan Bab' : 'Tampilkan Bab'">
                      <span>{{ modul.chapters.length }}</span>
                      <span class="material-symbols-outlined text-base">{{ modul.isChaptersExpanded ? 'expand_less' :
                        'expand_more' }}</span>
                    </button>
                    <button v-if="!isReadOnly" @click="tambahBab(modul)"
                      class="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] transition-colors">
                      <span class="material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>

                <div v-if="modul.chapters.length > 0">
                  <Transition appear enter-active-class="transition-all duration-500 ease-in-out"
                    leave-active-class="transition-all duration-300 ease-in-out" enter-from-class="opacity-0 max-h-0"
                    enter-to-class="opacity-100 max-h-screen" leave-from-class="opacity-100 max-h-screen"
                    leave-to-class="opacity-0 max-h-0">
                    <div v-if="modul.isChaptersExpanded" class="overflow-hidden">
                      <draggable v-model="modul.chapters" item-key="temp_id" handle=".bab-handle" class="space-y-4"
                        ghost-class="ghost-bab" :disabled="isReadOnly">
                        <template #item="{ element: bab, index: babIndex }">
                          <div class="rounded-2xl p-4 bg-[var(--color-surface-container)]">
                            <div class="flex items-start">
                              <div class="flex flex-col items-center">
                                <span
                                  class="bab-handle cursor-move w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-secondary)] flex-shrink-0"
                                  :class="{ 'cursor-default': isReadOnly }">
                                  <span class="text-xl font-bold text-[var(--color-on-secondary)]">{{ babIndex + 1
                                    }}</span>
                                </span>
                                <div v-if="bab.materis.length > 0"
                                  class="w-[2px] bg-[var(--color-secondary)] flex-grow mt-2"></div>
                              </div>

                              <div class="flex-grow ml-4">
                                <div class="flex justify-between items-center">
                                  <div class="flex-grow flex flex-col gap-1">
                                    <textarea v-model="bab.title[targetLang]" @input="null" v-auto-resize
                                      :readonly="isReadOnly"
                                      class="text-xl font-bold text-[var(--color-on-background)] bg-transparent border-none focus:outline-none w-full resize-none overflow-hidden placeholder-[var(--color-outline-variant)] leading-tight"
                                      :class="{ 'placeholder-transparent': isReadOnly }" rows="1"
                                      :placeholder="`Judul Bab (${targetLang.toUpperCase()})`"></textarea>
                                    <textarea v-if="bab.title" v-model="bab.title[sourceLang]" @input="null"
                                      v-auto-resize :readonly="isReadOnly"
                                      class="text-base font-medium text-[var(--color-on-surface-variant)] bg-transparent border-none focus:outline-none w-full resize-none overflow-hidden placeholder-[var(--color-outline-variant)]"
                                      :class="{ 'placeholder-transparent': isReadOnly }" rows="1"
                                      :placeholder="`Judul Bab (${sourceLang.toUpperCase()})`"></textarea>
                                  </div>
                                  <button v-if="!isReadOnly" @click="hapusBab(modul, babIndex)"
                                    class="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[var(--color-error-container)] text-[var(--color-outline)] hover:text-[var(--color-error)] transition-colors ml-2">
                                    <span class="material-symbols-outlined">delete</span>
                                  </button>
                                </div>

                                <div class="mt-4">
                                  <div class="flex justify-between items-center mb-2">
                                    <h4 class="text-md font-semibold text-[var(--color-secondary)]">Materi</h4>
                                    <div class="flex items-center space-x-2">
                                      <button v-if="bab.materis.length > 0" @click="bab.isExpanded = !bab.isExpanded"
                                        class="flex items-center space-x-2 rounded-full bg-[var(--color-surface)] px-3 py-1 hover:bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] transition-colors"
                                        :title="bab.isExpanded ? 'Sembunyikan Materi' : 'Tampilkan Materi'">
                                        <span>{{ bab.materis.length }}</span>
                                        <span class="material-symbols-outlined text-base">{{ bab.isExpanded ?
                                          'expand_less' : 'expand_more' }}</span>
                                      </button>
                                      <button v-if="!isReadOnly" @click="tambahMateri(bab)"
                                        class="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-surface)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] transition-colors">
                                        <span class="material-symbols-outlined text-base">add</span>
                                      </button>
                                    </div>
                                  </div>
                                  <Transition appear enter-active-class="transition-all duration-500 ease-in-out"
                                    leave-active-class="transition-all duration-300 ease-in-out"
                                    enter-from-class="opacity-0 max-h-0" enter-to-class="opacity-100 max-h-screen"
                                    leave-from-class="opacity-100 max-h-screen" leave-to-class="opacity-0 max-h-0">
                                    <div v-if="bab.isExpanded" class="overflow-hidden">
                                      <div v-if="bab.materis.length > 0" class="pt-2">
                                        <draggable v-model="bab.materis" item-key="temp_id" handle=".materi-handle"
                                          class="space-y-2" ghost-class="ghost-materi" :disabled="isReadOnly">
                                          <template #item="{ element: materi, index: materiIndex }">
                                            <div v-show="!isReadOnly || materi.is_active !== false"
                                              class="bg-[var(--color-surface)] p-3 rounded-lg flex items-start group relative">

                                              <div
                                                class="materi-handle cursor-move w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-secondary)] mr-2 flex-shrink-0"
                                                :class="{ 'cursor-default': isReadOnly }">
                                                <span class="text-lg font-bold text-[var(--color-on-secondary)]">{{
                                                  materiIndex + 1 }}</span>
                                              </div>

                                              <div v-if="materi.isEditing && !isReadOnly" class="flex-grow">
                                                <textarea v-model="materi.title[targetLang]" v-auto-resize
                                                  class="text-xl font-bold text-[var(--color-on-background)] bg-transparent w-full focus:outline-none resize-none overflow-hidden border-b-2 border-[var(--color-secondary)] leading-tight mb-1"
                                                  rows="1"
                                                  :placeholder="`Judul Materi (${targetLang.toUpperCase()})`"></textarea>
                                                <textarea v-if="materi.title" v-model="materi.title[sourceLang]"
                                                  v-auto-resize
                                                  class="text-base font-medium text-[var(--color-on-background)]/80 bg-transparent w-full focus:outline-none resize-none overflow-hidden border-b border-transparent focus:border-[var(--color-secondary)]"
                                                  rows="1"
                                                  :placeholder="`Judul Materi (${sourceLang.toUpperCase()})`"></textarea>
                                              </div>

                                              <button v-else @click="manajemenMateri(materi, modul, $event)"
                                                class="flex-grow flex items-center justify-between text-left cursor-pointer hover:bg-[var(--color-surface-container-low)] rounded-lg p-2 -m-2 transition-all duration-200 group-hover:pl-3">
                                                <div class="flex flex-col flex-grow">
                                                  <div class="flex items-center gap-1 mb-0.5">
                                                    <span
                                                      class="text-lg font-bold text-[var(--color-on-background)] leading-snug">
                                                      {{ materi.title?.[targetLang] || `Judul Materi
                                                      (${targetLang.toUpperCase()})` }}
                                                    </span>
                                                    <span v-if="materi.is_active === false"
                                                      class="material-symbols-outlined text-lg text-[var(--color-error)]">
                                                      visibility_off
                                                    </span>
                                                  </div>
                                                  <span v-if="materi.title"
                                                    class="text-sm font-medium text-[var(--color-on-surface-variant)] leading-snug block mt-0.5">
                                                    {{ materi.title?.[sourceLang] || `Judul Materi
                                                    (${sourceLang.toUpperCase()})` }}
                                                  </span>
                                                </div>

                                                <div v-if="isReadOnly && materiScores[materi.id] !== undefined"
                                                  class="flex-shrink-0 ml-4">
                                                  <div class="relative w-10 h-10 flex items-center justify-center">
                                                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                                      <path class="text-[var(--color-surface-container-highest)]"
                                                        stroke-width="4" stroke="currentColor" fill="none"
                                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                      <path
                                                        class="text-[var(--color-tertiary)] transition-all duration-1000 ease-out"
                                                        stroke-dasharray="100, 100"
                                                        :stroke-dashoffset="100 - (materiScores[materi.id] || 0)"
                                                        stroke-width="3" stroke-linecap="round" stroke="currentColor"
                                                        fill="none"
                                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                    </svg>
                                                    <span
                                                      class="absolute text-xs font-bold text-[var(--color-on-surface)]">{{
                                                        materiScores[materi.id] }}</span>
                                                  </div>
                                                </div>
                                              </button>

                                              <div v-if="!isReadOnly"
                                                class="flex-shrink-0 flex items-center space-x-1 ml-2">
                                                <button v-if="materi.isEditing" @click="materi.isEditing = false"
                                                  class="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-secondary)] text-[var(--color-on-secondary)] hover:bg-[var(--color-secondary-fixed-dim)] transition-colors"
                                                  title="Selesai Edit">
                                                  <span class="material-symbols-outlined text-base">done</span>
                                                </button>
                                                <button v-else @click="materi.isEditing = true"
                                                  class="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--color-surface-container-low)] text-[var(--color-outline)] hover:text-[var(--color-secondary)] transition-colors"
                                                  title="Edit Judul Materi">
                                                  <span class="material-symbols-outlined">edit</span>
                                                </button>

                                                <!-- Toggle Active/Inactive - hanya muncul saat mode edit -->
                                                <button v-if="materi.isEditing" @click="toggleMateriActive(materi)"
                                                  class="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
                                                  :class="[
                                                    materi.is_active !== false
                                                      ? 'hover:bg-[var(--color-error-container)] text-[var(--color-outline)] hover:text-[var(--color-error)]'
                                                      : 'bg-[var(--color-primary-container)] hover:bg-[var(--color-primary)] text-[var(--color-on-primary-container)] hover:text-[var(--color-on-primary)]'
                                                  ]"
                                                  :title="materi.is_active !== false ? 'Nonaktifkan Materi (Sembunyikan dari Publik)' : 'Aktifkan Materi (Tampilkan ke Publik)'">
                                                  <span
                                                    class="material-symbols-outlined text-base">visibility_off</span>
                                                </button>

                                                <button v-if="materi.isEditing" @click="hapusMateri(bab, materiIndex)"
                                                  class="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--color-error-container)] text-[var(--color-outline)] hover:text-[var(--color-error)] transition-colors"
                                                  title="Hapus Materi">
                                                  <span class="material-symbols-outlined">delete</span>
                                                </button>
                                              </div>

                                            </div>
                                          </template>
                                        </draggable>
                                      </div>
                                      <div v-else class="text-sm text-[var(--color-outline)] italic p-3 text-center">
                                        <span>Belum ada materi</span>
                                      </div>
                                    </div>
                                  </Transition>
                                </div>
                              </div>
                            </div>
                          </div>
                        </template>
                      </draggable>
                    </div>
                  </Transition>
                </div>
                <div v-else
                  class="text-sm text-[var(--color-outline)] italic p-4 bg-[var(--color-surface-container-high)]/30 rounded-xl text-center">
                  Belum ada bab</div>
              </div>

              <div class="mt-8" v-if="!isReadOnly || (modul.references && modul.references.trim())">
                <h3 class="text-lg font-semibold text-[var(--color-secondary)] mb-2">Referensi</h3>
                <textarea v-model="modul.references" v-auto-resize :readonly="isReadOnly"
                  class="w-full p-3 rounded-xl bg-[var(--color-surface-container-high)] focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] resize-none overflow-hidden"
                  :class="{ 'placeholder-transparent': isReadOnly }" rows="3"
                  :placeholder="`Satu referensi per baris...`"></textarea>
              </div>
            </div>
          </div>
          <div v-if="!isReadOnly" class="flex justify-center mt-8" key="add-button">
            <button @click="tambahModul"
              class="px-5 py-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full font-semibold hover:bg-[var(--color-primary-fixed-dim)] transition-colors flex items-center space-x-2">
              <span class="material-symbols-outlined text-base">add</span>
              <span>Buat Modul Baru</span>
            </button>
          </div>
        </TransitionGroup>

        <TransitionRoot appear :show="!!itemToDelete" as="template">
          <Dialog as="div" @close="itemToDelete = null" class="relative z-50">
            <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
              leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
              <div class="fixed inset-0 bg-black/60" />
            </TransitionChild>
            <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
              <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
                enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
                leave-to="opacity-0 scale-95">
                <DialogPanel
                  class="w-full max-w-sm transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-center align-middle  transition-all">
                  <div
                    class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-error-container)]">
                    <span
                      class="material-symbols-outlined text-4xl text-[var(--color-on-error-container)]">warning</span>
                  </div>
                  <h2 class="mt-4 text-2xl font-bold text-[var(--color-on-background)]">Konfirmasi Hapus</h2>
                  <p class="mt-2 text-sm text-[var(--color-on-surface-variant)]">Anda yakin ingin menghapus ini?
                    Tindakan ini
                    tidak dapat diurungkan.</p>
                  <div class="mt-6 grid grid-cols-2 gap-3">
                    <button type="button" @click="itemToDelete = null"
                      class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]">Batal</button>
                    <button type="button" @click="confirmDelete"
                      class="w-full rounded-xl bg-[var(--color-error)] px-4 py-2 font-semibold text-[var(--color-on-error)] transition-colors hover:bg-[var(--color-error-container)]">Hapus</button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </Dialog>
        </TransitionRoot>

        <TransitionRoot appear :show="showConfirmBackModal" as="template">
          <Dialog as="div" @close="showConfirmBackModal = false" class="relative z-50">
            <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
              leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
              <div class="fixed inset-0 bg-black/60" />
            </TransitionChild>
            <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
              <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
                enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
                leave-to="opacity-0 scale-95">
                <DialogPanel
                  class="w-full max-w-sm transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-center align-middle  transition-all">
                  <div
                    class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-error-container)]">
                    <span
                      class="material-symbols-outlined text-4xl text-[var(--color-on-error-container)]">warning</span>
                  </div>
                  <h2 class="mt-4 text-2xl font-bold text-[var(--color-on-background)]">Perubahan Belum Disimpan</h2>
                  <p class="mt-2 text-sm text-[var(--color-on-surface-variant)]">Perubahan yang Anda buat tidak akan
                    disimpan.
                    Yakin ingin keluar?</p>
                  <div class="mt-6 grid grid-cols-2 gap-3">
                    <button type="button" @click="showConfirmBackModal = false"
                      class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]">Batal</button>
                    <button type="button" @click="confirmAndGoBack"
                      class="w-full rounded-xl bg-[var(--color-error)] px-4 py-2 font-semibold text-[var(--color-on-error)] transition-colors hover:bg-[var(--color-error-container)]">Ya,
                      Keluar</button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </Dialog>
        </TransitionRoot>

        <TransitionRoot appear :show="showImportJsonModal" as="template">
          <Dialog as="div" @close="showImportJsonModal = false" class="relative z-50">
            <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
              leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
              <div class="fixed inset-0 bg-[var(--color-scrim)]" />
            </TransitionChild>
            <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
              <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
                enter-to="opacity-100 scale-100" leave="duration-300 ease-in" leave-from="opacity-100 scale-100"
                leave-to="opacity-0 scale-95">
                <DialogPanel
                  class="modal-box w-full max-w-xl rounded-4xl bg-[var(--color-surface-container-high)] p-6 ">
                  <h2 class="text-2xl text-center font-bold text-[var(--color-on-background)]">Impor/Edit Modul dari
                    JSON</h2>
                  <textarea v-model="jsonInput"
                    class="w-full h-48 p-2 mt-4 border border-[var(--color-outline-variant)] rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm font-mono"></textarea>
                  <p v-if="jsonError" class="mt-2 text-sm text-[var(--color-error)]">{{ jsonError }}</p>
                  <div class="mt-6 flex justify-end space-x-2">
                    <button @click="showImportJsonModal = false"
                      class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-high)]">Batal</button>
                    <button @click="processJsonInput"
                      class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] text-[var(--color-on-primary)] transition-colors">{{
                        editingModuleId ? 'Perbarui Modul' : 'Impor Data' }}</button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </Dialog>
        </TransitionRoot>

        <TransitionRoot appear :show="showJsonInfoModal" as="template">
          <Dialog as="div" @close="showJsonInfoModal = false" class="relative z-50">
            <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
              leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
              <div class="fixed inset-0 bg-[var(--color-scrim)]" />
            </TransitionChild>
            <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
              <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
                enter-to="opacity-100 scale-100" leave="duration-300 ease-in" leave-from="opacity-100 scale-100"
                leave-to="opacity-0 scale-95">
                <DialogPanel
                  class="modal-box w-full max-w-2xl rounded-4xl bg-[var(--color-surface-container-high)] p-6  max-h-[80vh] flex flex-col">
                  <h2 class="text-2xl font-bold text-center text-[var(--color-on-background)]">Format JSON Modul</h2>
                  <div class="overflow-y-auto pr-2 text-sm mt-4">
                    <pre
                      class="bg-[var(--color-surface-container)] text-[var(--color-on-surface)] p-4 rounded-xl text-xs font-mono overflow-x-auto">
              <code>{{ jsonExample }}</code>
            </pre>
                  </div>
                  <div class="mt-6 flex justify-end flex-shrink-0">
                    <button @click="showJsonInfoModal = false"
                      class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] text-[var(--color-on-primary)] transition-colors">Mengerti</button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </Dialog>
        </TransitionRoot>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted, type PropType } from 'vue';
import draggable from 'vuedraggable';
import { useUIStore } from '@/stores/ui';
import { useLanguageStore } from '@/stores/language';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
} from '@headlessui/vue';
import { cloneDeep, isEqual } from 'lodash-es';
import { useEventListener, useDebounceFn } from '@vueuse/core';
import ManajemenMateri from './ManajemenMateri.vue';
import { api } from '@/utils/api';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

// Interfaces
interface LocalizedString {
  [key: string]: string;
}

interface Materi {
  id?: number | string;
  temp_id?: string | number;
  title: LocalizedString;
  code?: string;
  is_active?: boolean;
  isEditing?: boolean;
  contents?: any[]; // Tiptap content
  assignment?: any; // Assignment content
  showTargetDesc?: boolean;
  showSourceDesc?: boolean;
  description?: LocalizedString;
  learning_objectives?: LocalizedString;
  [key: string]: any;
}

interface Bab {
  id?: number | string;
  temp_id?: string | number;
  title: LocalizedString;
  materis: Materi[];
  isExpanded?: boolean;
  [key: string]: any;
}

interface ModulIconSettings {
  scale: number;
  translateX: number;
  translateY: number;
}

interface Modul {
  id?: number | string;
  temp_id?: string | number;
  title: LocalizedString;
  description: LocalizedString;
  learning_objectives: LocalizedString;
  chapters: Bab[];
  references?: string;
  is_active?: boolean;
  isRingkas?: boolean;
  isDescriptionExpanded?: boolean;
  isObjectivesExpanded?: boolean;
  isChaptersExpanded?: boolean;
  icon_svg?: string;
  icon_data_uri?: string;
  icon_settings: ModulIconSettings;
  isIconEditing?: boolean;
  code?: string;
  [key: string]: any;
}

interface LanguagePairSummary {
  language_pair: string;
  source: { nama: string; bendera: string };
  target: { nama: string; bendera: string };
  module_count: number;
}


// [OPTIMASI] Directive untuk auto-resize textarea
import { type Directive } from 'vue';

// [OPTIMASI] Directive untuk auto-resize textarea
const vAutoResize: Directive = {
  mounted: (el: HTMLElement) => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
    el.addEventListener('input', () => {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    });
  },
  updated: (el: HTMLElement) => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  },
};

const props = defineProps({
  isPublicView: { type: Boolean, default: false },
});

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const uiStore = useUIStore();
const languageStore = useLanguageStore();

onMounted(async () => {
  // [ADMIN] Ensure we have all languages including inactive ones
  if (!props.isPublicView) {
    await languageStore.fetchAdminLanguages();
  }
});

const moduls = ref<Modul[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const languagePairSummary = ref<LanguagePairSummary[]>([]);
const isSaving = ref(false);
const itemToDelete = ref<any>(null);
const materiAktif = ref<Materi | null>(null);
const originalModuls = ref<Modul[] | null>(null);
const isDirty = ref(false);
const showImportJsonModal = ref(false);
const showJsonInfoModal = ref(false);
const jsonInput = ref('');
const jsonError = ref<string | null>(null);
const showConfirmBackModal = ref(false);
const editingModuleId = ref<number | string | null>(null);
const isSummaryExpanded = ref(false); // Default collapsed
const sortKey = ref('modules'); // Default sort by module count
const sortDirection = ref<'asc' | 'desc'>('desc'); // Descending - modules yang ada di atas
const isDragging = ref(false);
const activeDragModul = ref<Modul | null>(null);
const dragStart = ref({ x: 0, y: 0 });
const initialTranslate = ref({ x: 0, y: 0 });
const dragContainerSize = ref({ width: 0, height: 0 });
const scrollContainer = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const savedScrollTop = ref(0);
const activeModuleId = ref<number | string | null>(null);
const materiScores = ref<Record<string, number>>({}); // Menyimpan skor per materi ID

const isPreviewMode = ref(false);

const isReadOnly = computed(() => {
  return props.isPublicView || isPreviewMode.value;
});

const INITIAL_IMAGE_HEIGHT = 300;
const FINAL_IMAGE_HEIGHT = 120;
const SCROLL_EFFECT_DISTANCE = 150;

const languagePair = computed(() => {
  const asal = languageStore.selectedAsal?.kodeBahasa;
  const target = languageStore.selectedTarget?.kodeBahasa;
  return asal && target ? `${asal}-${target}` : '';
});
const sourceLang = computed(() => languageStore.selectedAsal?.kodeBahasa || 'id');
const targetLang = computed(() => languageStore.selectedTarget?.kodeBahasa || 'en');

// Helper function untuk filter modul aktif di public/preview mode
const getFilteredModuls = computed(() => {
  if (!isReadOnly.value) return moduls.value;
  return moduls.value.filter((m) => m.is_active !== false);
});

// Helper function untuk filter materi aktif di public/preview mode
// Helper function untuk filter materi aktif di public/preview mode
const getFilteredMateris = (materis: Materi[]) => {
  if (!isReadOnly.value) return materis;
  return materis.filter((m) => m.is_active !== false);
};

// Helper function untuk mengambil judul dari struktur Flat
const getTitle = (obj: any, lang: string, defaultText: string) => {
  if (obj && obj.title && obj.title[lang]) return obj.title[lang];
  // Fallback ke struktur lama jika perlu
  if (
    obj &&
    obj.translations &&
    obj.translations[lang] &&
    obj.translations[lang].title
  )
    return obj.translations[lang].title;
  return defaultText;
};

const currentAiContext = computed(() => {
  if (!materiAktif.value) return null;
  const modul = moduls.value.find((m) => m.id === activeModuleId.value);
  if (!modul) return null;

  const bab = modul.chapters.find((c) =>
    c.materis.some(
      (m) =>
        (m.id || m.temp_id) ===
        (materiAktif.value.id || materiAktif.value.temp_id),
    ),
  );

  const tMod = getTitle(modul, targetLang.value, '(Tanpa Judul Target)');
  const sMod = getTitle(modul, sourceLang.value, '(Tanpa Judul Asal)');

  const tChap = getTitle(bab, targetLang.value, '(Tanpa Judul Target)');
  const sChap = getTitle(bab, sourceLang.value, '(Tanpa Judul Asal)');

  // Hitung posisi materi dalam modul untuk konteks AI
  const allMaterisInModule = [];
  modul.chapters.forEach((chapter) => {
    chapter.materis.forEach((materi) => {
      allMaterisInModule.push({
        id: materi.id || materi.temp_id,
        title_tgt: getTitle(materi, targetLang.value, ''),
      });
    });
  });

  // Cari index materi aktif
  const currentMateriId = materiAktif.value.id || materiAktif.value.temp_id;
  const currentIndex = allMaterisInModule.findIndex(
    (m) => m.id === currentMateriId,
  );

  // Ambil judul materi sebelum dan sesudah (hanya dalam bahasa target untuk hemat token)
  const prevMaterials =
    currentIndex > 0
      ? allMaterisInModule
        .slice(0, currentIndex)
        .map((m) => m.title_tgt)
        .filter((t) => t)
      : [];
  const nextMaterials =
    currentIndex < allMaterisInModule.length - 1
      ? allMaterisInModule
        .slice(currentIndex + 1)
        .map((m) => m.title_tgt)
        .filter((t) => t)
      : [];

  return {
    module_title: `${tMod} / ${sMod}`,
    chapter_title: `${tChap} / ${sChap}`,
    mod_title_src: sMod,
    mod_title_tgt: tMod,
    chap_title_src: sChap,
    chap_title_tgt: tChap,
    prev_materials: prevMaterials,
    next_materials: nextMaterials,
  };
});

// [ADMIN NAV] Daftar semua materi dalam modul aktif
const allMaterisFlat = computed(() => {
  if (!materiAktif.value || !activeModuleId.value) return [];
  const modul = moduls.value.find((m) => m.id === activeModuleId.value);
  if (!modul) return [];

  const materis = [];
  modul.chapters.forEach((chapter) => {
    chapter.materis.forEach((materi) => {
      materis.push(materi);
    });
  });
  return materis;
});

// [ADMIN NAV] Index materi aktif dalam daftar flat
const currentMateriIndex = computed(() => {
  if (!materiAktif.value || allMaterisFlat.value.length === 0) return -1;
  const currentId = materiAktif.value.id || materiAktif.value.temp_id;
  return allMaterisFlat.value.findIndex(
    (m) => (m.id || m.temp_id) === currentId,
  );
});

// [ADMIN NAV] Cek apakah ada materi sebelumnya
const hasPrevMaterial = computed(() => {
  return currentMateriIndex.value > 0;
});

// [ADMIN NAV] Cek apakah ada materi berikutnya
const hasNextMaterial = computed(() => {
  return (
    currentMateriIndex.value >= 0 &&
    currentMateriIndex.value < allMaterisFlat.value.length - 1
  );
});

// [ADMIN NAV] Navigasi ke materi sebelumnya
const navigateToPrevMaterial = () => {
  if (!hasPrevMaterial.value) return;
  const prevMateri = allMaterisFlat.value[currentMateriIndex.value - 1];
  if (prevMateri) {
    materiAktif.value = prevMateri;
  }
};

// [ADMIN NAV] Navigasi ke materi berikutnya
const navigateToNextMaterial = () => {
  if (!hasNextMaterial.value) return;
  const nextMateri = allMaterisFlat.value[currentMateriIndex.value + 1];
  if (nextMateri) {
    materiAktif.value = nextMateri;
  }
};

const processSvg = (svgString: string | null) => {
  if (
    !svgString ||
    typeof svgString !== 'string' ||
    !svgString.trim().startsWith('<svg')
  ) {
    return svgString;
  }
  let processedSvg = svgString;
  // [FIX] Gunakan 'meet' agar SVG tidak dipotong, melainkan muat dalam container
  // 'meet' = gambar tidak dipotong, muat dalam container (mungkin ada ruang kosong jika rasio berbeda)
  // 'slice' = gambar mengisi container, bagian yang keluar dipotong
  if (processedSvg.includes('preserveAspectRatio')) {
    processedSvg = processedSvg.replace(
      /preserveAspectRatio="[^"]*"/,
      'preserveAspectRatio="xMidYMid meet"',
    );
  } else {
    processedSvg = processedSvg.replace(
      '<svg',
      '<svg preserveAspectRatio="xMidYMid meet"',
    );
  }
  return processedSvg;
};

const getSvgDataUri = (svgString: string | null | undefined) => {
  if (!svgString) return '';
  try {
    const base64 = btoa(unescape(encodeURIComponent(svgString)));
    return `data:image/svg+xml;base64,${base64}`;
  } catch (e) {
    console.error('Failed to encode SVG', e);
    return '';
  }
};

// [PERUBAHAN]: Helper untuk struktur Flat
// Parameter includeObjectives = false untuk assignment (karena assignment tidak punya learning_objectives)
// [PERUBAHAN]: Helper untuk struktur Flat
// Parameter includeObjectives = false untuk assignment (karena assignment tidak punya learning_objectives)
const ensureFlatStructure = (
  obj: any,
  sourceLangCode: string,
  targetLangCode: string,
  includeObjectives = true,
) => {
  if (!obj.title) obj.title = {};
  if (!obj.description) obj.description = {};

  if (!obj.title[targetLangCode]) obj.title[targetLangCode] = '';
  if (!obj.title[sourceLangCode]) obj.title[sourceLangCode] = '';

  if (!obj.description[targetLangCode]) obj.description[targetLangCode] = '';
  if (!obj.description[sourceLangCode]) obj.description[sourceLangCode] = '';

  // learning_objectives hanya untuk modul dan materi, BUKAN assignment
  if (includeObjectives) {
    if (!obj.learning_objectives) obj.learning_objectives = {};
    if (!obj.learning_objectives[targetLangCode])
      obj.learning_objectives[targetLangCode] = '';
    if (!obj.learning_objectives[sourceLangCode])
      obj.learning_objectives[sourceLangCode] = '';
  }
};

const fetchGlobalProgress = async () => {
  // Hanya ambil progress jika dalam mode public/read-only
  if (!isReadOnly.value) return;

  try {
    const res = await api.get(`/learn/progres/`);
    if (res.data && Array.isArray(res.data)) {
      const scores: Record<string, number> = {};
      res.data.forEach((p: any) => {
        if (p.materi_id) scores[p.materi_id] = p.score;
      });
      materiScores.value = scores;
    }
  } catch (e) {
    console.error('Gagal memuat ringkasan progress:', e);
  }
};

const fetchModules = async () => {
  if (!sourceLang.value || !targetLang.value) {
    moduls.value = [];
    originalModuls.value = [];
    isDirty.value = false;
    return;
  }
  isLoading.value = true;
  error.value = null;

  try {
    let url;
    if (isReadOnly.value) {
      url = `/${sourceLang.value}-${targetLang.value}/learn/lesson/`;
    } else {
      url = `/admin/${sourceLang.value}-${targetLang.value}/learn/lesson/`;
    }

    const response = await api.get(url);
    const data = response.data;

    let rawModules: any[] = [];

    if (isReadOnly.value) {
      rawModules = Array.isArray(data) ? data : [];
      languagePairSummary.value = [];
      // Ambil data nilai juga
      fetchGlobalProgress();
    } else {
      languagePairSummary.value = Array.isArray(data.summary)
        ? data.summary
        : [];
      rawModules = Array.isArray(data.modules) ? data.modules : [];
    }

    const processedData: Modul[] = rawModules.map((result: any) => {
      // [PERUBAHAN]: Pastikan struktur flat
      ensureFlatStructure(result, sourceLang.value || 'id', targetLang.value || 'en');

      if (result.chapters) {
        result.chapters.forEach((chapter: any) => {
          ensureFlatStructure(chapter, sourceLang.value || 'id', targetLang.value || 'en');
          if (chapter.materis) {
            chapter.materis.forEach((materi: any) => {
              ensureFlatStructure(materi, sourceLang.value || 'id', targetLang.value || 'en');
              materi.isEditing = false;
              if (materi.assignment) {
                // Assignment tidak punya learning_objectives, jadi pass false
                ensureFlatStructure(
                  materi.assignment,
                  sourceLang.value || 'id',
                  targetLang.value || 'en',
                  false,
                );
              }
            });
          }
          chapter.isExpanded = chapter.isExpanded ?? true;
        });
      }
      return {
        ...result,
        temp_id: `modul-${result.id || Date.now()}-${Math.random()}`,
        icon_svg: processSvg(result.icon_svg || null),
        icon_data_uri: getSvgDataUri(processSvg(result.icon_svg || null)),
        icon_settings: result.icon_settings || {
          scale: 0.66,
          translateX: 0,
          translateY: 0,
        },
        references: Array.isArray(result.references)
          ? result.references.join('\n')
          : '',
        isChaptersExpanded: result.isChaptersExpanded ?? true,
        isIconEditing: false,
        isRingkas: true,
        showTargetDesc: true,
        showSourceDesc: true,
        isDescriptionExpanded: true,
        isObjectivesExpanded: true,
      };
    });

    moduls.value = processedData;
    originalModuls.value = cloneDeep(processedData);
    isDirty.value = false;
  } catch (err: any) {
    error.value =
      'Gagal mengambil data modul. ' +
      (err.response?.data?.detail || err.message);
    moduls.value = [];
    originalModuls.value = null;
    languagePairSummary.value = [];
  } finally {
    isLoading.value = false;
  }
};

const saveModule = async (moduleData: Modul) => {
  const isNew = !moduleData.id || String(moduleData.id).startsWith('modul-');
  const identifier = !isNew ? moduleData.id : '';
  const url = `/admin/${sourceLang.value}-${targetLang.value}/learn/lesson/${identifier ? identifier + '/' : ''}`;
  const method = isNew ? 'post' : 'patch';
  const payload = JSON.parse(JSON.stringify(moduleData || {}));

  if (isNew) {
    delete payload.id;
    delete payload.code;
  }

  delete payload.temp_id;
  delete payload.isIconEditing;
  delete payload.isRingkas;
  delete payload.isChaptersExpanded;
  delete payload.showTargetDesc;
  delete payload.showSourceDesc;
  delete payload.isDescriptionExpanded;
  delete payload.isObjectivesExpanded;
  delete payload.icon_data_uri;

  // Struktur sudah flat, tidak perlu sanitasi 'translations' lagi

  if (payload.chapters) {
    payload.chapters = payload.chapters.map((c: any) => {
      const cleanChapter = { ...c };
      delete cleanChapter.temp_id;
      delete cleanChapter.isExpanded;
      if (cleanChapter.id && String(cleanChapter.id).startsWith('temp-')) {
        delete cleanChapter.id;
      }
      if (cleanChapter.materis) {
        cleanChapter.materis = cleanChapter.materis.map((m: any) => {
          const cleanMateri = { ...m };
          delete cleanMateri.temp_id;
          delete cleanMateri.isEditing;
          if (cleanMateri.id && String(cleanMateri.id).startsWith('temp-')) {
            delete cleanMateri.id;
          }
          if (cleanMateri.assignment) {
            cleanMateri.assignment = {
              ...cleanMateri.assignment,
              max_score: cleanMateri.assignment.max_score || 100,
              contents: cleanMateri.assignment.contents || '<p></p>',
            };
            delete cleanMateri.assignment.max_duration_minutes;
          }
          return cleanMateri;
        });
      }
      return cleanChapter;
    });
  }

  // [DEBUG] Log payload sebelum dikirim
  console.log(
    '[saveModule] Module ID:',
    moduleData.id,
    'isNew:',
    isNew,
    'Method:',
    method,
  );
  console.log(
    '[saveModule] Chapters in moduleData:',
    moduleData.chapters?.length || 0,
  );
  console.log(
    '[saveModule] Chapters in payload:',
    payload.chapters?.length || 0,
  );
  console.log('[saveModule] is_active:', payload.is_active);

  try {
    const response = await api[method](url, payload);
    console.log('[saveModule] Response:', response.data);
    return response.data;
  } catch (err: any) {
    // Jika PATCH gagal dengan 404 (modul tidak ditemukan), beri error yang jelas
    if (method === 'patch' && err.response?.status === 404) {
      console.error(
        `[saveModule] Modul dengan ID ${moduleData.id} tidak ditemukan di server.`,
      );
      error.value = `Modul tidak ditemukan di server (ID: ${moduleData.id}). Data mungkin sudah berubah. Silakan muat ulang halaman.`;
      throw err;
    }
    error.value =
      'Gagal menyimpan modul: ' + (err.response?.data?.detail || err.message);
    throw err;
  }
};

const deleteModuleAPI = async (moduleId: number | string) => {
  try {
    await api.delete(
      `/admin/${sourceLang.value}-${targetLang.value}/learn/lesson/${moduleId}/`,
    );
  } catch (err: any) {
    error.value =
      'Gagal menghapus modul. ' + (err.response?.data?.detail || err.message);
    throw err;
  }
};

const imageContainerStyle = computed(() => {
  const scroll = Math.min(scrollTop.value, SCROLL_EFFECT_DISTANCE);
  const progress = scroll / SCROLL_EFFECT_DISTANCE;
  const height =
    INITIAL_IMAGE_HEIGHT -
    (INITIAL_IMAGE_HEIGHT - FINAL_IMAGE_HEIGHT) * progress;
  return {
    maxHeight: `${height}px`,
  };
});

const blurOverlayOpacity = computed(() => {
  const scroll = Math.min(scrollTop.value, SCROLL_EFFECT_DISTANCE);
  return scroll / SCROLL_EFFECT_DISTANCE;
});

const setSort = (key: string) => {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDirection.value = 'asc';
  }
};

const handleSvgUpload = (event: Event, modul: Modul) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  if (file.type === 'image/svg+xml') {
    const reader = new FileReader();
    reader.onload = (e) => {
      const svgContent = e.target?.result;
      if (typeof svgContent === 'string') {
        const processedSvgContent = processSvg(svgContent);
        const targetModulId = modul.temp_id;
        const modulIndex = moduls.value.findIndex(
          (m) => m.temp_id === targetModulId,
        );
        if (modulIndex !== -1) {
          moduls.value[modulIndex].icon_svg = processedSvgContent || undefined;
          moduls.value[modulIndex].icon_data_uri = getSvgDataUri(processedSvgContent);
        }
      }
    };
    reader.readAsText(file);
  }
  target.value = '';
};

const handleMouseDown = (event: MouseEvent, modul: Modul) => {
  if (modul.isIconEditing) {
    event.preventDefault();
    startDrag(event, modul);
  }
};

const handleTouchStart = (event: TouchEvent, modul: Modul) => {
  if (modul.isIconEditing) {
    event.preventDefault();
    startDrag(event, modul);
  }
};

const getPointerCoords = (event: MouseEvent | TouchEvent) => {
  if ('touches' in event) {
    return { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }
  return { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY };
};

const startDrag = (event: MouseEvent | TouchEvent, modul: Modul) => {
  if (!modul.isIconEditing) return;
  if (!modul.icon_svg) return;
  isDragging.value = true;
  activeDragModul.value = modul;
  const coords = getPointerCoords(event);
  dragStart.value = { x: coords.x, y: coords.y };
  initialTranslate.value = {
    x: modul.icon_settings.translateX,
    y: modul.icon_settings.translateY,
  };
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  dragContainerSize.value = { width: rect.width, height: rect.height };
  window.addEventListener('mousemove', onDrag as any);
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchmove', onDrag as any);
  window.addEventListener('touchend', endDrag);
};

const onDrag = (event: MouseEvent | TouchEvent) => {
  if (!isDragging.value || !activeDragModul.value) return;
  const coords = getPointerCoords(event);
  const dx = coords.x - dragStart.value.x;
  const dy = coords.y - dragStart.value.y;
  const percentDeltaX = (dx / dragContainerSize.value.width) * 100;
  const percentDeltaY = (dy / dragContainerSize.value.height) * 100;
  activeDragModul.value.icon_settings.translateX =
    initialTranslate.value.x + percentDeltaX;
  activeDragModul.value.icon_settings.translateY =
    initialTranslate.value.y + percentDeltaY;
};

const endDrag = () => {
  isDragging.value = false;
  activeDragModul.value = null;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', endDrag);
  window.removeEventListener('touchmove', onDrag);
  window.removeEventListener('touchend', endDrag);
};

const comprehensiveSummary = computed(() => {
  const allLangs = languageStore.opsiBahasa;
  if (!allLangs || allLangs.length < 2) return [];
  const summaryMap = new Map(
    languagePairSummary.value.map((s) => [s.language_pair, s.module_count]),
  );
  const allPairs = [];
  for (const source of allLangs) {
    for (const target of allLangs) {
      if (source.kodeBahasa === target.kodeBahasa) continue;
      const pairKey = `${source.kodeBahasa}-${target.kodeBahasa}`;
      allPairs.push({
        language_pair: pairKey,
        module_count: summaryMap.get(pairKey) || 0,
        source: { nama: source.nama, bendera: source.bendera },
        target: { nama: target.nama, bendera: target.bendera },
      });
    }
  }
  return allPairs.sort((a, b) => {
    let valA, valB;
    switch (sortKey.value) {
      case 'source':
        valA = a.source.nama.toLowerCase();
        valB = b.source.nama.toLowerCase();
        break;
      case 'target':
        valA = a.target.nama.toLowerCase();
        valB = b.target.nama.toLowerCase();
        break;
      case 'modules':
        valA = a.module_count;
        valB = b.module_count;
        break;
      default:
        valA = a.language_pair.toLowerCase();
        valB = b.language_pair.toLowerCase();
    }
    if (valA < valB) return sortDirection.value === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection.value === 'asc' ? 1 : -1;
    return 0;
  });
});

const handleScroll = () => {
  if (scrollContainer.value) {
    scrollTop.value = scrollContainer.value.scrollTop;
  }
};

onMounted(async () => {
  uiStore.setIsAdminEditingMateri(true);
  if (scrollContainer.value) {
    useEventListener(scrollContainer, 'scroll', handleScroll);
  }
});

onUnmounted(() => {
  endDrag();
  uiStore.setIsAdminEditingMateri(false);
  // useEventListener otomatis cleanup
});

const selectLanguagePair = (pair: string) => {
  if (pair === languagePair.value) return;
  const [asalCode, targetCode] = pair.split('-');
  const asalLang = languageStore.opsiBahasa.find(
    (l) => l.kodeBahasa === asalCode,
  );
  const targetLangObj = languageStore.opsiBahasa.find(
    (l) => l.kodeBahasa === targetCode,
  );

  if (asalLang && targetLangObj) {
    languageStore.setLanguages(asalLang.nama, targetLangObj.nama);
  }
};

const manajemenMateri = (materi: Materi, modul: Modul, event: MouseEvent) => {
  if (!materi.isEditing) {
    if (scrollContainer.value) {
      savedScrollTop.value = scrollContainer.value.scrollTop;
    }

    // [TRANSISI] Set transform-origin dinamis berdasarkan posisi klik mouse
    if (event) {
      const x = event.clientX;
      const y = event.clientY;
      document.documentElement.style.setProperty('--zoom-origin-x', `${x}px`);
      document.documentElement.style.setProperty('--zoom-origin-y', `${y}px`);
    } else {
      // Fallback jika tidak ada event (misal dipicu keyboard)
      document.documentElement.style.removeProperty('--zoom-origin-x');
      document.documentElement.style.removeProperty('--zoom-origin-y');
    }

    materiAktif.value = cloneDeep(materi);

    activeModuleId.value = modul.id || null;
  }
};

const handleBackFromMateri = () => {
  materiAktif.value = null;
  // Refresh skor saat kembali dari mengerjakan materi
  if (isReadOnly.value) fetchGlobalProgress();
};

watch(materiAktif, async (newVal) => {
  if (!newVal) {
    await nextTick();
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = savedScrollTop.value;
      handleScroll();
    }
  }
});

const updateMateriInState = (materiDisimpan: Materi) => {
  for (const modul of moduls.value) {
    const bab = modul.chapters.find((b) =>
      b.materis.some(
        (m) =>
          (m.id || m.temp_id) === (materiDisimpan.id || materiDisimpan.temp_id),
      ),
    );
    if (bab) {
      const index = bab.materis.findIndex(
        (m) =>
          (m.id || m.temp_id) === (materiDisimpan.id || materiDisimpan.temp_id),
      );
      if (index !== -1) {
        const isEditingState = bab.materis[index].isEditing;
        bab.materis[index] = { ...materiDisimpan, isEditing: isEditingState };
        break;
      }
    }
  }
};

const cleanForComparison = (obj: any) => {
  return JSON.parse(
    JSON.stringify(obj, (key, value) => {
      if (
        [
          'temp_id',
          'isIconEditing',
          'isRingkas',
          'isChaptersExpanded',
          'showTargetDesc',
          'showSourceDesc',
          'isExpanded',
          'isEditing',
          'isDescriptionExpanded',
          'isObjectivesExpanded',
        ].includes(key)
      ) {
        return undefined;
      }
      return value;
    }),
  );
};

const performSave = async () => {
  isSaving.value = true;
  error.value = null;

  console.log(
    '[performSave] All modules:',
    moduls.value.map((m) => ({ id: m.id, chapters: m.chapters?.length || 0 })),
  );

  const dirtyModules = moduls.value.filter((modul) => {
    if (!modul.id || String(modul.id).startsWith('modul-')) return true;
    const original = originalModuls.value
      ? originalModuls.value.find((o) => o.id === modul.id)
      : null;
    if (!original) return true;
    return !isEqual(cleanForComparison(modul), cleanForComparison(original));
  });

  console.log(
    '[performSave] Dirty modules:',
    dirtyModules.map((m) => ({ id: m.id, chapters: m.chapters?.length || 0 })),
  );

  if (dirtyModules.length === 0) {
    console.log('[performSave] No dirty modules, skipping save');
    isSaving.value = false;
    isDirty.value = false;
    return;
  }
  const savePromises = dirtyModules.map((modul) => saveModule(modul));
  try {
    const results = await Promise.allSettled(savePromises);
    if (results.some((r) => r.status === 'rejected')) {
      error.value = 'Beberapa modul gagal disimpan.';
    } else {
      await fetchModules();
    }
  } finally {
    isSaving.value = false;
  }
};

const simpanModul = async () => {
  if (!isDirty.value || isSaving.value) return;
  await performSave();
};

const handleGlobalSave = async (materiDisimpan: Materi) => {
  updateMateriInState(materiDisimpan);
  await performSave();
};

// [OPTIMASI] Gunakan useDebounceFn dari VueUse (500ms delay)
const debouncedCheckDirty = useDebounceFn((newValue) => {
  if (originalModuls.value) {
    isDirty.value =
      JSON.stringify(cleanForComparison(newValue)) !==
      JSON.stringify(cleanForComparison(originalModuls.value));
  }
}, 500);

watch(
  moduls,
  (newValue) => {
    debouncedCheckDirty(newValue);
  },
  { deep: true },
);

watch(
  languagePair,
  async (newVal) => {
    if (newVal) await fetchModules();
    else {
      moduls.value = [];
      originalModuls.value = null;
    }
  },
  { immediate: true },
);

const tambahModul = () => {
  // [PERUBAHAN]: Struktur Flat saat tambah baru
  moduls.value.push({
    temp_id: `modul-${Date.now()}-${Math.random()}`,
    source_lang: sourceLang.value,
    target_lang: targetLang.value,
    title: { [targetLang.value]: '', [sourceLang.value]: '' },
    description: { [targetLang.value]: '', [sourceLang.value]: '' },
    learning_objectives: { [targetLang.value]: '', [sourceLang.value]: '' },
    chapters: [],
    references: '',
    is_active: false, // [PERUBAHAN] Default nonaktif
    icon_svg: null,
    icon_settings: { scale: 0.66, translateX: 0, translateY: 0 },
    isIconEditing: false,
    isRingkas: true,
    showTargetDesc: true,
    showSourceDesc: true,
    isDescriptionExpanded: true,
    isObjectivesExpanded: true,
  });
};

const tambahBab = (modul: Modul) => {
  modul.chapters.push({
    temp_id: `temp-bab-${Date.now()}`,
    title: { [targetLang.value]: '', [sourceLang.value]: '' },
    description: { [targetLang.value]: '', [sourceLang.value]: '' },
    materis: [],
    isExpanded: true,
  });
};

const tambahMateri = (bab: Bab) => {
  bab.materis.push({
    temp_id: `temp-materi-${Date.now()}`,
    title: { [targetLang.value]: '', [sourceLang.value]: '' },
    description: { [targetLang.value]: '', [sourceLang.value]: '' },
    contents: [],
    isEditing: false,
    is_active: false, // [PERUBAHAN] Default nonaktif
  });
};

const hapusModul = (modul: Modul) => {
  itemToDelete.value = { type: 'modul', data: modul };
};
const hapusBab = (modul: Modul, babIndex: number) => {
  itemToDelete.value = { type: 'bab', modul: modul, index: babIndex };
};
const hapusMateri = (bab: Bab, materiIndex: number) => {
  itemToDelete.value = { type: 'materi', parent: bab, index: materiIndex };
};

// Toggle active status untuk modul - jika nonaktif, tidak muncul di publik
const toggleModulActive = (modul: Modul) => {
  // Toggle is_active, default is true if undefined
  modul.is_active = modul.is_active === false ? true : false;
  isDirty.value = true;
};

// Toggle active status untuk materi - jika nonaktif, tidak muncul di publik
const toggleMateriActive = (materi: Materi) => {
  // Toggle is_active, default is true if undefined
  materi.is_active = materi.is_active === false ? true : false;
  isDirty.value = true;
};

// Handle toggle dari ManajemenMateri component
// Handle toggle dari ManajemenMateri component
const handleToggleMateriActive = () => {
  if (!materiAktif.value) return;

  // Toggle status di materiAktif
  materiAktif.value.is_active =
    materiAktif.value.is_active === false ? true : false;

  // [FIX] Force reactivity update by creating shallow copy
  // Ini penting agar prop :is-active di ManajemenMateri mendeteksi perubahan
  materiAktif.value = { ...materiAktif.value };

  // Update juga di moduls state
  updateMateriInState(materiAktif.value);
  isDirty.value = true;
};

const confirmDelete = async () => {
  if (!itemToDelete.value) return;
  const { type, data, modul, index, parent } = itemToDelete.value;
  try {
    if (type === 'modul') {
      const moduleIndex = moduls.value.findIndex(
        (m) => m.temp_id === data.temp_id,
      );
      if (moduleIndex > -1) {
        if (data.id && !String(data.id).startsWith('modul-'))
          await deleteModuleAPI(data.id);
        moduls.value.splice(moduleIndex, 1);
      }
    } else if (type === 'bab') modul.chapters.splice(index, 1);
    else if (type === 'materi') parent.materis.splice(index, 1);
  } finally {
    itemToDelete.value = null;
  }
};

const cleanModuleJsonForDisplay = (modul: Modul) => {
  const d = cloneDeep(modul);

  // 1. Root Level System Fields
  // [IMPORTANT] Keep 'id' visible so we can map content back correctly during import
  const rootSystemKeys = [
    'code',
    'temp_id',
    'created_at',
    'updated_at',
    'user_id',
    'isIconEditing',
    'isRingkas',
    'isChaptersExpanded',
    'showTargetDesc',
    'showSourceDesc',
    'isDescriptionExpanded',
    'isObjectivesExpanded',
    'icon_svg',
    'icon_settings',
    'icon_data_uri',
  ];
  rootSystemKeys.forEach((k) => delete d[k]);

  // 2. Format References
  d.references =
    typeof d.references === 'string'
      ? d.references.split('\n').filter((r) => r.trim()).join('\n') // Changed to string/any, keeping existing logic mostly
      : d.references || '';

  // Correction: the original logic did .split and LEFT it as array or joined it?
  // Original: d.references = typeof ... ? split... : [];
  // So it returns an object with references as array for JSON display?
  // Actually line 1749 says d.references.split... so it becomes array.
  // The interface says references?: string. But for JSON display it might be convenient to show as array?
  // Wait, let's stick to original behavior.
  if (typeof d.references === 'string') {
    // @ts-ignore
    d.references = d.references.split('\n').filter((r) => r.trim());
  } else {
    // @ts-ignore
    d.references = [];
  }

  // 3. Clean Chapters
  if (d.chapters && Array.isArray(d.chapters)) {
    d.chapters.forEach((c) => {
      // Hapus System Fields di Chapter, KECUALI 'id'
      [
        'temp_id',
        'isExpanded',
        'modul_id',
        'created_at',
        'updated_at',
        'order',
      ].forEach((k) => delete c[k]);

      // Clean Materis
      if (c.materis && Array.isArray(c.materis)) {
        c.materis.forEach((m) => {
          // Hapus System Fields di Materi, KECUALI 'id'
          [
            'temp_id',
            'isEditing',
            'chapter_id',
            'created_at',
            'updated_at',
            'order',
            'showTargetDesc',
            'showSourceDesc',
          ].forEach((k) => delete m[k]);

          // Hapus Konten detail
          delete m.contents;

          // Clean Assignment Metadata
          if (m.assignment) {
            // Keep id here too just in case
            [
              'materi_id',
              'created_at',
              'updated_at',
              'is_active',
              'passing_grade',
              'max_score',
              'max_duration_minutes',
            ].forEach((k) => delete m.assignment[k]);
            delete m.assignment.contents;
          }
        });
      }
    });
  }

  return d;
};

const openImportJsonModal = (modul: Modul | null = null) => {
  jsonError.value = null;
  if (modul) {
    const cleaned = cleanModuleJsonForDisplay(modul);
    jsonInput.value = JSON.stringify(cleaned, null, 2);
    editingModuleId.value = modul.temp_id || null;
  } else {
    jsonInput.value = '';
    editingModuleId.value = null;
  }
  showImportJsonModal.value = true;
};

const processJsonInput = () => {
  try {
    const data = JSON.parse(jsonInput.value);

    // [FIX] Hapus id dan code dari JSON input karena ini tidak boleh diubah oleh user
    // ID dan CODE akan dipertahankan dari modul asli (jika edit) atau di-generate server (jika baru)
    delete data.id;
    delete data.code;

    console.log(
      '[JSON Import] Parsed data chapters:',
      data.chapters?.length || 0,
    );

    // Pastikan chapters ada (setidaknya array kosong)
    if (!data.chapters) data.chapters = [];

    const newModulData = {
      ...data,
      temp_id: `modul-${Date.now()}-${Math.random()}`,
      icon_svg: processSvg(data.icon_svg || null),
      icon_data_uri: getSvgDataUri(processSvg(data.icon_svg || null)),
      icon_settings: data.icon_settings || {
        scale: 0.66,
        translateX: 0,
        translateY: 0,
      },
      references: Array.isArray(data.references)
        ? data.references.join('\n')
        : '',
      isChaptersExpanded: data.isChaptersExpanded ?? true,
      isIconEditing: false,
      isRingkas: true,
      showTargetDesc: true,
      showSourceDesc: true,
      isDescriptionExpanded: true,
      isObjectivesExpanded: true,
    };
    ensureFlatStructure(newModulData, sourceLang.value, targetLang.value);

    // [FIX] Gunakan counter untuk unique temp_id
    let chapCounter = 0;
    let matCounter = 0;

    (newModulData.chapters || []).forEach((c) => {
      ensureFlatStructure(c, sourceLang.value, targetLang.value);
      c.temp_id = `temp-bab-${Date.now()}-${chapCounter++}`;
      c.isExpanded = true;
      (c.materis || []).forEach((m) => {
        ensureFlatStructure(m, sourceLang.value, targetLang.value);
        m.temp_id = `temp-materi-${Date.now()}-${matCounter++}`;
        m.isEditing = false;

        if (m.contents === undefined) m.contents = [];
        if (m.assignment && m.assignment.contents === undefined) {
          m.assignment.contents = {
            type: 'doc',
            content: [{ type: 'paragraph' }],
          };
        }
      });
    });

    console.log(
      '[JSON Import] newModulData chapters:',
      newModulData.chapters?.length || 0,
    );

    if (editingModuleId.value) {
      const idx = moduls.value.findIndex(
        (m) => m.temp_id === editingModuleId.value,
      );
      if (idx !== -1) {
        const oldModul = moduls.value[idx];

        // [FIX] Pertahankan id dan code dari modul asli
        newModulData.id = oldModul.id;
        newModulData.code = oldModul.code;

        // [FIX] Restore Icon jika tidak ada di JSON input (karena disembunyikan saat clean)
        if (!data.icon_svg) {
          newModulData.icon_svg = oldModul.icon_svg;
          newModulData.icon_data_uri = oldModul.icon_data_uri;
        }
        if (!data.icon_settings) {
          newModulData.icon_settings = oldModul.icon_settings;
        }

        console.log(
          '[JSON Import] Editing existing module:',
          oldModul.id,
          'Old chapters:',
          oldModul.chapters?.length,
          'New chapters:',
          newModulData.chapters?.length,
        );

        // Restore konten materi lama (untuk chapters yang sudah ada)
        (newModulData.chapters || []).forEach((newChap) => {
          const oldChap = oldModul.chapters.find((oc) => oc.id === newChap.id);
          if (!oldChap) return;

          (newChap.materis || []).forEach((newMat) => {
            const oldMat = oldChap.materis.find((om) => om.id === newMat.id);
            if (!oldMat) return;

            newMat.contents = oldMat.contents;
            if (newMat.assignment && oldMat.assignment) {
              newMat.assignment.contents = oldMat.assignment.contents;
            }
          });
        });

        // [FIX] Eksplisit ganti modul dengan data baru, termasuk chapters
        // Pertahankan hanya temp_id dari modul lama
        moduls.value[idx] = {
          ...newModulData,
          temp_id: editingModuleId.value,
        };

        console.log(
          '[JSON Import] Updated module chapters:',
          moduls.value[idx].chapters?.length,
        );
      } else {
        console.warn(
          '[JSON Import] Module not found with temp_id:',
          editingModuleId.value,
        );
      }
    } else {
      moduls.value.push(newModulData);
      console.log(
        '[JSON Import] Added new module with chapters:',
        newModulData.chapters?.length,
      );
    }
    showImportJsonModal.value = false;
    isDirty.value = true; // [FIX] Tandai bahwa ada perubahan yang perlu disimpan
  } catch (e) {
    console.error('[JSON Import] Error:', e);
    jsonError.value = 'JSON tidak valid. ' + e.message;
  }
};

const jsonExample = computed(() => {
  const target = targetLang.value || 'ru';
  const source = sourceLang.value || 'id';
  // [PERUBAHAN]: Contoh JSON format baru
  return JSON.stringify(
    {
      title: { [target]: 'Judul', [source]: 'Title' },
      description: { [target]: 'Deskripsi', [source]: 'Description' },
      learning_objectives: { [target]: 'Tujuan', [source]: 'Objectives' },
      chapters: [],
      references: [],
    },
    null,
    2,
  );
});

const handleBack = () => {
  if (isDirty.value) showConfirmBackModal.value = true;
  else emit('back');
};
const confirmAndGoBack = () => {
  showConfirmBackModal.value = false;
  emit('back');
};

const toggleDescTarget = (modul) => {
  if (modul.showTargetDesc && !modul.showSourceDesc) return;
  modul.showTargetDesc = !modul.showTargetDesc;
};
const toggleDescSource = (modul) => {
  if (modul.showSourceDesc && !modul.showTargetDesc) return;
  modul.showSourceDesc = !modul.showSourceDesc;
};

const togglePreviewMode = () => {
  isPreviewMode.value = !isPreviewMode.value;
  if (isPreviewMode.value) fetchGlobalProgress();
};
</script>

<style lang="postcss" scoped>
@reference "tailwindcss";

.ghost-bab {
  @apply opacity-50 bg-[var(--color-primary-container)] rounded-2xl;
}

.ghost-materi {
  @apply opacity-50 bg-[var(--color-primary-container)] rounded-lg;
}

input[type="range"].range-sm {
  @apply appearance-none w-full h-1 bg-white/30 rounded-full outline-none opacity-70 transition-opacity hover:opacity-100;
}

input[type="range"].range-sm::-webkit-slider-thumb {
  @apply appearance-none w-3 h-3 bg-[var(--color-primary)] cursor-pointer rounded-full;
}

input[type="range"].range-sm::-moz-range-thumb {
  @apply w-3 h-3 bg-[var(--color-primary)] cursor-pointer rounded-full border-none;
}

.no-scrollbar::-webkit-scrollbar {
  display: none !important;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none !important;
}
</style>
