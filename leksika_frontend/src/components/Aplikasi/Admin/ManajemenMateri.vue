<template>
  <div class="w-full h-full flex flex-col pb-20">
    <header class="relative flex-shrink-0 flex items-center justify-between mb-6 min-h-[40px]">
      <template v-if="isTesting && !isReviewing">
        <div
          class="fixed top-0 left-0 right-0 xl:left-64 flex items-center justify-between px-3 md:px-4 py-3 md:py-4 pb-4 md:pb-5 bg-[var(--color-primary-container)] z-50">
          <!-- Kiri: Timer -->
          <div class="flex items-center gap-1.5 md:gap-2 text-[var(--color-on-primary-container)]">
            <span class="material-symbols-outlined animate-pulse text-lg md:text-xl">timer</span>
            <span class="font-mono text-base md:text-xl font-bold tracking-widest">{{ formattedTime }}</span>
          </div>

          <!-- Tengah: Progress -->
          <div
            class="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-[var(--color-surface)]/20 rounded-lg text-[var(--color-on-primary-container)]">
            <span class="material-symbols-outlined text-base md:text-lg opacity-80">edit_note</span>
            <span class="font-bold text-xs md:text-sm tracking-wide">
              {{ answeredQuestions }} / {{ totalQuestions }} <span class="hidden md:inline">Terjawab</span>
            </span>
          </div>

          <!-- Kanan: Tombol (hide when bottom buttons visible) -->
          <div class="flex items-center gap-1.5 md:gap-2 transition-all duration-300 ease-out"
            :class="bottomButtonsVisible ? 'opacity-0 translate-y-4 scale-95 pointer-events-none' : 'opacity-100 translate-y-0 scale-100'">
            <button @click="showExitConfirmModal = true"
              class="flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl bg-[var(--color-surface)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] transition-all font-semibold active:scale-95 text-sm  ">
              <span class="material-symbols-outlined text-base md:text-lg">logout</span>
              <span class="hidden md:inline">Keluar</span>
            </button>
            <button @click="showSubmitConfirmModal = true"
              class="flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-5 py-1.5 md:py-2 rounded-lg md:rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)] transition-all font-bold   active:scale-95 text-sm">
              <span class="material-symbols-outlined text-base md:text-lg">send</span>
              <span class="hidden md:inline">Kirim</span>
            </button>
          </div>
        </div>
        <!-- Spacer untuk fixed header -->
        <div class="h-14 md:h-16"></div>
      </template>

      <!-- Post-Test Results Summary (replaces top bar after submission) -->
      <template v-else-if="isReviewing">
        <div class="w-full mb-4 p-5 rounded-2xl bg-[var(--color-surface-container-high)]">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl text-[var(--color-success)]">emoji_events</span>
              <h3 class="text-lg font-bold text-[var(--color-on-background)]">Hasil Pengerjaan</h3>
            </div>
            <button @click="closeTest"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-surface)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] transition-all text-sm font-semibold active:scale-95">
              <span class="material-symbols-outlined text-lg">close</span>
              Tutup
            </button>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="p-3 rounded-xl bg-[var(--color-surface)] text-center">
              <span class="block text-xs text-[var(--color-outline)] uppercase tracking-wide mb-1">Skor</span>
              <span class="block text-2xl font-extrabold text-[var(--color-success)]">{{ finalScore }}</span>
              <span class="block text-[10px] text-[var(--color-outline)]">dari {{ maxPossibleScore }}</span>
            </div>
            <div class="p-3 rounded-xl bg-[var(--color-surface)] text-center">
              <span class="block text-xs text-[var(--color-outline)] uppercase tracking-wide mb-1">Waktu</span>
              <span class="block text-2xl font-extrabold text-[var(--color-on-surface)]">{{ formattedTime }}</span>
            </div>
            <div class="p-3 rounded-xl bg-[var(--color-surface)] text-center">
              <span class="block text-xs text-[var(--color-outline)] uppercase tracking-wide mb-1">Benar</span>
              <span class="block text-2xl font-extrabold text-[var(--color-success)]">{{ correctAnswers }}</span>
              <span class="block text-[10px] text-[var(--color-outline)]">dari {{ totalQuestions }} soal</span>
            </div>
            <div class="p-3 rounded-xl bg-[var(--color-surface)] text-center">
              <span class="block text-xs text-[var(--color-outline)] uppercase tracking-wide mb-1">Salah</span>
              <span class="block text-2xl font-extrabold text-[var(--color-error)]">{{ incorrectAnswers }}</span>
              <span class="block text-[10px] text-[var(--color-outline)]">dari {{ totalQuestions }} soal</span>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="z-10">
          <button @click="handleBack"
            class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] transition-colors">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
        </div>

        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 class="text-xl font-bold text-center text-[var(--color-on-background)] px-12 pointer-events-auto">
            {{ isReadOnly ? 'Materi Pembelajaran' : 'Atur Isi Materi' }}
          </h1>
        </div>

        <div class="flex items-center space-x-2 z-10">
          <button v-if="!isReadOnly" @click="openAiWizard"
            class="relative flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] transition-colors"
            title="Generate Otomatis dengan AI" :disabled="aiState.isProcessing">
            <!-- Spinning border when processing -->
            <div v-if="aiState.isProcessing"
              class="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-primary)] animate-spin">
            </div>
            <span class="material-symbols-outlined"
              :class="{ 'animate-pulse': aiState.isProcessing }">auto_awesome</span>
          </button>

          <!-- Tombol Preview hanya untuk Admin, TIDAK untuk publik -->
          <button v-if="canTogglePreview" @click="togglePreviewMode"
            :class="isPreviewMode ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]' : 'bg-[var(--color-surface)] text-[var(--color-on-surface-variant)]'"
            class="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[var(--color-surface-container-low)] transition-colors"
            :title="isPreviewMode ? 'Keluar Pratinjau' : 'Pratinjau Mode Siswa'">
            <span class="material-symbols-outlined">{{ isPreviewMode ? 'preview_off' : 'preview' }}</span>
          </button>

          <button v-if="!isReadOnly" @click="openJsonModal"
            class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] transition-colors"
            title="Lihat/Edit Source">
            <span class="material-symbols-outlined">code</span>
          </button>

          <!-- Toggle Active/Inactive -->
          <button v-if="!isReadOnly" @click="$emit('toggle-active')"
            class="flex items-center justify-center w-10 h-10 rounded-full transition-colors" :class="[
              isActive !== false
                ? 'bg-[var(--color-surface)] hover:bg-[var(--color-error-container)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-error)]'
                : 'bg-[var(--color-primary-container)] hover:bg-[var(--color-primary)] text-[var(--color-on-primary-container)] hover:text-[var(--color-on-primary)]'
            ]"
            :title="isActive !== false ? 'Nonaktifkan Materi (Sembunyikan dari Publik)' : 'Aktifkan Materi (Tampilkan ke Publik)'">
            <span class="material-symbols-outlined">visibility_off</span>
          </button>

          <template v-if="!isReadOnly">
            <button v-if="isDirty" @click="simpanMateri"
              class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] text-[var(--color-on-primary)] transition-colors"
              title="Simpan" :disabled="isSaving">
              <span v-if="!isSaving" class="material-symbols-outlined">save</span>
              <span v-else class="material-symbols-outlined animate-spin">sync</span>
            </button>
            <div v-else-if="isSaving"
              class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary-container)] text-[var(--color-on-primary)] cursor-not-allowed"
              title="Menyimpan...">
              <span class="material-symbols-outlined animate-spin">sync</span>
            </div>
          </template>
        </div>
      </template>
    </header>

    <!-- AI Progress Box - Below Header -->
    <Transition enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2 scale-95" enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-2 scale-95">
      <div v-if="aiState.isProcessing"
        class="mb-4 w-full bg-[var(--color-surface-container)] p-4 rounded-2xl   border border-[var(--color-primary)]/50 flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <div class="relative w-10 h-10 flex-shrink-0">
            <div class="absolute inset-0 rounded-full border-2 border-[var(--color-primary)]/30"></div>
            <div
              class="absolute inset-0 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin">
            </div>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="material-symbols-outlined text-[var(--color-primary)] text-lg">smart_toy</span>
            </div>
          </div>
          <div class="flex-grow min-w-0">
            <h4 class="font-bold text-sm text-[var(--color-on-surface)] truncate">{{ aiState.statusTitle }}</h4>
            <p class="text-xs text-[var(--color-on-surface-variant)] truncate">{{ aiState.statusMsg }}</p>
          </div>
        </div>
        <div class="w-full bg-[var(--color-surface-container-highest)] rounded-full h-1.5 overflow-hidden">
          <div class="bg-[var(--color-primary)] h-1.5 rounded-full transition-all duration-500"
            :style="{ width: aiState.progress + '%' }"></div>
        </div>
        <div class="flex justify-between text-xs text-[var(--color-outline)]">
          <span>{{ aiState.step }}</span>
          <span>{{ Math.round(aiState.progress) }}%</span>
        </div>
      </div>
    </Transition>

    <div v-if="error"
      class="bg-[var(--color-error-container)] border-[var(--color-error)] text-[var(--color-on-error-container)] px-4 py-3 rounded-2xl mb-4"
      role="alert">
      <strong class="font-bold">Gagal Menyimpan: </strong>
      <span class="block sm:inline">{{ error }}</span>
    </div>

    <div v-if="currentPageIndex > 0 && editorToUse && !isReadOnly"
      class="sticky top-20 z-20 flex-shrink-0 transition-all duration-300">
      <div
        class="flex flex-col p-2 rounded-2xl rounded-b-none bg-[var(--color-surface)]/80 backdrop-blur-2xl   border border-[var(--color-outline-variant)]/20">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center space-x-1 overflow-x-auto no-scrollbar flex-grow pr-2 mask-right">
            <button @click="editorToUse.chain().focus().undo().run()"
              :disabled="!editorToUse.can().chain().focus().undo().run()" class="toolbar-button flex-shrink-0"
              title="Undo"><span class="material-symbols-outlined">undo</span></button>
            <button @click="editorToUse.chain().focus().redo().run()"
              :disabled="!editorToUse.can().chain().focus().redo().run()" class="toolbar-button flex-shrink-0"
              title="Redo"><span class="material-symbols-outlined">redo</span></button>
            <div class="border-l h-6 mx-1 border-[var(--color-outline-variant)] flex-shrink-0"></div>
            <button @click="editorToUse.chain().focus().toggleBold().run()"
              :class="{ 'is-active': editorToUse.isActive('bold') }" class="toolbar-button flex-shrink-0"
              title="Bold"><span class="material-symbols-outlined">format_bold</span></button>
            <button @click="editorToUse.chain().focus().toggleItalic().run()"
              :class="{ 'is-active': editorToUse.isActive('italic') }" class="toolbar-button flex-shrink-0"
              title="Italic"><span class="material-symbols-outlined">format_italic</span></button>
            <button @click="editorToUse.chain().focus().toggleUnderline().run()"
              :class="{ 'is-active': editorToUse.isActive('underline') }" class="toolbar-button flex-shrink-0"
              title="Underline"><span class="material-symbols-outlined">format_underlined</span></button>
            <button @click="editorToUse.chain().focus().toggleStrike().run()"
              :class="{ 'is-active': editorToUse.isActive('strike') }" class="toolbar-button flex-shrink-0"
              title="Strikethrough"><span class="material-symbols-outlined">format_strikethrough</span></button>
            <div class="border-l h-6 mx-1 border-[var(--color-outline-variant)] flex-shrink-0"></div>
            <button @click="editorToUse.chain().focus().setTextAlign('left').run()"
              :class="{ 'is-active': editorToUse.isActive({ textAlign: 'left' }) }" class="toolbar-button flex-shrink-0"
              title="Rata Kiri"><span class="material-symbols-outlined">format_align_left</span></button>
            <button @click="editorToUse.chain().focus().setTextAlign('center').run()"
              :class="{ 'is-active': editorToUse.isActive({ textAlign: 'center' }) }"
              class="toolbar-button flex-shrink-0" title="Rata Tengah"><span
                class="material-symbols-outlined">format_align_center</span></button>
            <button @click="editorToUse.chain().focus().setTextAlign('right').run()"
              :class="{ 'is-active': editorToUse.isActive({ textAlign: 'right' }) }"
              class="toolbar-button flex-shrink-0" title="Rata Kanan"><span
                class="material-symbols-outlined">format_align_right</span></button>
            <button @click="editorToUse.chain().focus().setTextAlign('justify').run()"
              :class="{ 'is-active': editorToUse.isActive({ textAlign: 'justify' }) }"
              class="toolbar-button flex-shrink-0" title="Rata Kanan Kiri"><span
                class="material-symbols-outlined">format_align_justify</span></button>
            <div class="border-l h-6 mx-1 border-[var(--color-outline-variant)] flex-shrink-0"></div>
            <button @click="editorToUse.chain().focus().toggleBulletList().run()"
              :class="{ 'is-active': editorToUse.isActive('bulletList') }" class="toolbar-button flex-shrink-0"
              title="Daftar Poin"><span class="material-symbols-outlined">format_list_bulleted</span></button>
            <button @click="editorToUse.chain().focus().toggleOrderedList().run()"
              :class="{ 'is-active': editorToUse.isActive('orderedList') }" class="toolbar-button flex-shrink-0"
              title="Daftar Nomor"><span class="material-symbols-outlined">format_list_numbered</span></button>
            <div class="border-l h-6 mx-1 border-[var(--color-outline-variant)] flex-shrink-0"></div>
            <button @click="editorToUse.chain().focus().toggleHeading({ level: 1 }).run()"
              :class="{ 'is-active': editorToUse.isActive('heading', { level: 1 }) }"
              class="toolbar-button flex-shrink-0" title="Heading 1"><span
                class="material-symbols-outlined">format_h1</span></button>
            <button @click="editorToUse.chain().focus().toggleHeading({ level: 2 }).run()"
              :class="{ 'is-active': editorToUse.isActive('heading', { level: 2 }) }"
              class="toolbar-button flex-shrink-0" title="Heading 2"><span
                class="material-symbols-outlined">format_h2</span></button>
            <button @click="editorToUse.chain().focus().toggleHeading({ level: 3 }).run()"
              :class="{ 'is-active': editorToUse.isActive('heading', { level: 3 }) }"
              class="toolbar-button flex-shrink-0" title="Heading 3"><span
                class="material-symbols-outlined">format_h3</span></button>
            <div class="border-l h-6 mx-1 border-[var(--color-outline-variant)] flex-shrink-0"></div>
            <button @click="addImage" class="toolbar-button flex-shrink-0" title="Gambar"><span
                class="material-symbols-outlined">image</span></button>
            <button @click="insertTable" class="toolbar-button flex-shrink-0" title="Tabel"><span
                class="material-symbols-outlined">table</span></button>
            <button @click="addPercakapan" class="toolbar-button flex-shrink-0" title="Percakapan"><span
                class="material-symbols-outlined">chat</span></button>
            <button @click="insertDiagram" class="toolbar-button flex-shrink-0" title="Diagram"><span
                class="material-symbols-outlined">account_tree</span></button>
          </div>

          <div class="flex-shrink-0 pl-2 border-l border-[var(--color-outline-variant)] flex items-center">
            <Menu as="div" class="relative inline-block text-left">
              <div>
                <MenuButton
                  class="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)] transition-colors text-sm font-semibold   whitespace-nowrap">
                  <span class="material-symbols-outlined text-lg">add</span>
                  <span>Soal</span>
                </MenuButton>
              </div>
              <transition enter-active-class="transition duration-100 ease-out"
                enter-from="transform scale-95 opacity-0" enter-to="transform scale-100 opacity-100"
                leave-active-class="transition duration-75 ease-in" leave-from="transform scale-100 opacity-100"
                leave-to="transform scale-95 opacity-0">
                <MenuItems
                  class="absolute right-0 mt-2 w-52 origin-top-right divide-y divide-[var(--color-outline-variant)]/20 rounded-xl bg-[var(--color-surface-container-high)]   ring-1 ring-[var(--color-outline-variant)]/20 focus:outline-none z-50 overflow-hidden">
                  <div class="px-1 py-1">
                    <MenuItem v-slot="{ active }"><button @click="addSoalPilihanGanda"
                      :class="[active ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]' : 'text-[var(--color-on-surface)]', 'group flex w-full items-center rounded-lg px-2 py-2 text-sm transition-colors font-medium']"><span
                        class="material-symbols-outlined mr-3 text-lg opacity-70">quiz</span>Pilihan Ganda</button>
                    </MenuItem>
                    <MenuItem v-slot="{ active }"><button @click="addSoalIsian"
                      :class="[active ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]' : 'text-[var(--color-on-surface)]', 'group flex w-full items-center rounded-lg px-2 py-2 text-sm transition-colors font-medium']"><span
                        class="material-symbols-outlined mr-3 text-lg opacity-70">edit_note</span>Isian / Esai</button>
                    </MenuItem>
                    <MenuItem v-slot="{ active }"><button @click="addSoalKelompokan"
                      :class="[active ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]' : 'text-[var(--color-on-surface)]', 'group flex w-full items-center rounded-lg px-2 py-2 text-sm transition-colors font-medium']"><span
                        class="material-symbols-outlined mr-3 text-lg opacity-70">rule</span>Kelompokan</button>
                    </MenuItem>
                    <MenuItem v-slot="{ active }"><button @click="addSoalRumpang"
                      :class="[active ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]' : 'text-[var(--color-on-surface)]', 'group flex w-full items-center rounded-lg px-2 py-2 text-sm transition-colors font-medium']"><span
                        class="material-symbols-outlined mr-3 text-lg opacity-70">short_text</span>Kalimat
                      Rumpang</button>
                    </MenuItem>
                    <MenuItem v-slot="{ active }"><button @click="addRumusKalimat"
                      :class="[active ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]' : 'text-[var(--color-on-surface)]', 'group flex w-full items-center rounded-lg px-2 py-2 text-sm transition-colors font-medium']"><span
                        class="material-symbols-outlined mr-3 text-lg opacity-70">reorder</span>Rumus Kalimat</button>
                    </MenuItem>
                    <MenuItem v-slot="{ active }"><button @click="addNoteBox"
                      :class="[active ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]' : 'text-[var(--color-on-surface)]', 'group flex w-full items-center rounded-lg px-2 py-2 text-sm transition-colors font-medium']"><span
                        class="material-symbols-outlined mr-3 text-lg opacity-70">description</span>Kotak
                      Catatan</button>
                    </MenuItem>
                  </div>
                </MenuItems>
              </transition>
            </Menu>
          </div>
        </div>

        <div v-if="editorToUse.isActive('table')"
          class="flex items-center justify-between space-x-1 mt-2 overflow-x-auto pb-1 no-scrollbar">
          <button @click="editorToUse.chain().focus().addColumnBefore().run()" class="toolbar-button flex-shrink-0"
            title="Tambah Kolom Kiri"><span class="material-symbols-outlined text-base">add_column_left</span></button>
          <button @click="editorToUse.chain().focus().addColumnAfter().run()" class="toolbar-button flex-shrink-0"
            title="Tambah Kolom Kanan"><span
              class="material-symbols-outlined text-base">add_column_right</span></button>
          <button @click="editorToUse.chain().focus().deleteColumn().run()" class="toolbar-button flex-shrink-0"
            title="Hapus Kolom"><span class="material-symbols-outlined text-base">delete_column</span></button>
          <div class="border-l h-6 mx-1 border-[var(--color-outline-variant)] flex-shrink-0"></div>
          <button @click="editorToUse.chain().focus().addRowBefore().run()" class="toolbar-button flex-shrink-0"
            title="Tambah Baris Atas"><span class="material-symbols-outlined text-base">add_row_above</span></button>
          <button @click="editorToUse.chain().focus().addRowAfter().run()" class="toolbar-button flex-shrink-0"
            title="Tambah Baris Bawah"><span class="material-symbols-outlined text-base">add_row_below</span></button>
          <button @click="editorToUse.chain().focus().deleteRow().run()" class="toolbar-button flex-shrink-0"
            title="Hapus Baris"><span class="material-symbols-outlined text-base">delete_row</span></button>
          <div class="border-l h-6 mx-1 border-[var(--color-outline-variant)] flex-shrink-0"></div>
          <button @click="editorToUse.chain().focus().mergeCells().run()" class="toolbar-button flex-shrink-0"
            title="Gabungkan Sel"><span class="material-symbols-outlined">combine_columns</span></button>
          <button @click="editorToUse.chain().focus().splitCell().run()" class="toolbar-button flex-shrink-0"
            title="Pisahkan Sel"><span class="material-symbols-outlined">call_split</span></button>
          <button @click="editorToUse.chain().focus().deleteTable().run()"
            class="toolbar-button flex-shrink-0 text-[var(--color-error)]" title="Hapus Tabel"><span
              class="material-symbols-outlined text-base">delete_forever</span></button>
        </div>
      </div>
    </div>

    <div class="flex-grow flex flex-col relative overflow-hidden">
      <Transition :name="transitionName" mode="out-in" @before-enter="onBeforeEnter">
        <div v-if="currentPageIndex === assignmentPageIndex && localMateri" :key="'assignment'"
          class="w-full h-full overflow-y-auto pb-24">
          <Transition :name="isTesting ? 'zoom-in' : 'zoom-out'" mode="out-in">
            <div v-if="isReadOnly && !isTesting && !isReviewing" key="assignment-info"
              class="flex flex-col items-center justify-center h-full p-8 text-center bg-[var(--color-surface-container-high)] rounded-2xl">
              <div
                class="w-24 h-24 rounded-full bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)] flex items-center justify-center mb-6">
                <span class="material-symbols-outlined text-6xl">assignment</span>
              </div>
              <h2 class="text-3xl font-bold text-[var(--color-on-background)] mb-2">
                {{ localMateri.title?.[targetLang] || 'Judul Materi' }}
              </h2>
              <h3 class="text-xl font-medium text-[var(--color-primary)] mb-8">
                {{ localMateri.title?.[sourceLang] || 'Material Title' }}
              </h3>
              <div v-if="lastAttempt"
                class="bg-[var(--color-surface)] p-6 rounded-2xl w-full max-w-md mb-8 border border-[var(--color-outline-variant)]/30  ">
                <div
                  class="flex justify-between items-center mb-4 border-b border-[var(--color-outline-variant)]/20 pb-2">
                  <span class="text-sm text-[var(--color-on-surface-variant)]">Terakhir Dikerjakan</span>
                  <span class="font-semibold text-[var(--color-on-surface)]">{{ formatDate(lastAttempt.last_completed ||
                    lastAttempt.finished_at) }}</span>
                </div>
                <div
                  class="flex justify-between items-center mb-4 border-b border-[var(--color-outline-variant)]/20 pb-2">
                  <span class="text-sm text-[var(--color-on-surface-variant)]">Durasi</span>
                  <span class="font-semibold text-[var(--color-on-surface)]">{{ formatDuration(lastAttempt.started_at,
                    lastAttempt.last_completed || lastAttempt.finished_at) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-[var(--color-on-surface-variant)]">Skor Terakhir</span>
                  <span class="text-2xl font-bold text-[var(--color-primary)]">{{ lastAttempt.score }}</span>
                </div>
              </div>
              <div v-else class="mb-8 text-[var(--color-on-surface-variant)] italic">Belum ada riwayat pengerjaan.</div>
              <button @click="startTest"
                class="px-8 py-4 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)] transition-all font-bold text-lg   hover:scale-105 active:scale-95 flex items-center gap-2">
                <span class="material-symbols-outlined text-2xl">play_circle</span>
                {{ lastAttempt ? 'Kerjakan Ulang' : 'Mulai Mengerjakan' }}
              </button>
            </div>

            <div v-else key="assignment-test"
              class="editor-wrapper relative bg-[var(--color-surface-container-high)] p-4"
              :class="[isReadOnly ? 'rounded-2xl' : 'rounded-b-2xl rounded-t-none', { 'is-focused': assignmentEditor?.isFocused && !isReadOnly, 'global-test-mode': isTesting, 'cursor-text': !isReadOnly, 'cursor-default': isReadOnly }]"
              @click="handleEditorWrapperClick">

              <!-- Skeleton Loader for Assignment -->
              <div v-if="aiState.processingAssignment && isAssignmentEmpty" class="space-y-6 animate-pulse p-4">
                <div class="h-10 w-3/4 ai-processing-gradient rounded-lg"></div>
                <div class="space-y-3">
                  <div class="h-4 w-full ai-processing-gradient rounded-md"></div>
                  <div class="h-4 w-full ai-processing-gradient rounded-md"></div>
                  <div class="h-4 w-2/3 ai-processing-gradient rounded-md"></div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div class="h-12 ai-processing-gradient rounded-xl"></div>
                  <div class="h-12 ai-processing-gradient rounded-xl"></div>
                  <div class="h-12 ai-processing-gradient rounded-xl"></div>
                  <div class="h-12 ai-processing-gradient rounded-xl"></div>
                </div>
              </div>

              <editor-content v-else :editor="assignmentEditor"
                class="prose dark:prose-invert max-w-none focus:outline-none" />

              <!-- Bottom action buttons - always visible when testing -->
              <div v-if="isTesting && !isReviewing" ref="bottomButtonsRef" class="mt-8 mb-4 flex items-center justify-between">
                <button @click="showExitConfirmModal = true"
                  class="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-surface)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] transition-all font-semibold active:scale-95 text-base   border border-[var(--color-outline-variant)]">
                  <span class="material-symbols-outlined">logout</span>
                  Keluar
                </button>
                <button @click="showSubmitConfirmModal = true"
                  class="flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)] transition-all font-bold   active:scale-95 text-base">
                  <span class="material-symbols-outlined">send</span>
                  Kirim Jawaban
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <div v-else-if="currentPageIndex === 0" :key="'title'" class="w-full h-full">
          <div class="bg-[var(--color-surface-container-high)] p-6 rounded-2xl h-full overflow-y-auto">
            <div v-if="localMateri" class="space-y-6 max-w-4xl mx-auto">
              <div class="flex flex-col gap-1">
                <div class="flex items-start gap-2">
                  <textarea v-model="localMateri.title[targetLang]" v-auto-resize :readonly="isReadOnly"
                    class="text-4xl font-extrabold tracking-tight leading-tight text-[var(--color-on-background)] bg-transparent border-none focus:outline-none flex-grow resize-none overflow-hidden block transition-colors"
                    :class="{ 'placeholder-transparent': isReadOnly, 'placeholder-[var(--color-outline-variant)]': !isReadOnly }"
                    :placeholder="`Judul Materi (${targetLang.toUpperCase()})`" rows="1">
              </textarea>
                  <span v-if="isActive === false"
                    class="material-symbols-outlined text-4xl text-[var(--color-error)] flex-shrink-0 mt-1">
                    visibility_off
                  </span>

                  <!-- Dropdown Menu for Save/Report -->
                  <Menu as="div" class="relative inline-block text-left flex-shrink-0 mt-1">
                    <MenuButton
                      class="p-2 bg-[var(--color-surface-container)] text-[var(--color-on-surface)] rounded-full hover:bg-[var(--color-surface-container-highest)] flex items-center justify-center transition-colors">
                      <span class="material-symbols-outlined text-xl">more_vert</span>
                    </MenuButton>
                    <Transition enter-active-class="transition duration-100 ease-out"
                      enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100"
                      leave-active-class="transition duration-75 ease-in"
                      leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0">
                      <MenuItems
                        class="absolute right-0 mt-2 w-40 origin-top-right divide-y divide-[var(--color-outline-variant)]/20 rounded-xl bg-[var(--color-surface-container-high)]  ring-1 ring-[var(--color-outline-variant)]/20 focus:outline-none overflow-hidden z-20">
                        <div class="px-1 py-1">
                          <MenuItem v-slot="{ active }">
                          <button @click="showSimpanModal = true" :class="[
                            active ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]' : 'text-[var(--color-on-surface)]',
                            'group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors'
                          ]">
                            <span class="material-symbols-outlined mr-2 text-lg">bookmark</span>
                            Simpan
                          </button>
                          </MenuItem>
                          <MenuItem v-slot="{ active }">
                          <button @click="reportMateri" :class="[
                            active ? 'bg-[var(--color-error-container)] text-[var(--color-on-error-container)]' : 'text-[var(--color-on-surface)]',
                            'group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors'
                          ]">
                            <span class="material-symbols-outlined mr-2 text-lg">flag</span>
                            Laporkan
                          </button>
                          </MenuItem>
                        </div>
                      </MenuItems>
                    </Transition>
                  </Menu>
                </div>
                <textarea v-if="localMateri.title" v-model="localMateri.title[sourceLang]" v-auto-resize
                  :readonly="isReadOnly"
                  class="text-2xl font-medium text-[var(--color-on-surface-variant)] bg-transparent border-none focus:outline-none w-full resize-none overflow-hidden block transition-colors"
                  :class="{ 'placeholder-transparent': isReadOnly, 'placeholder-[var(--color-outline-variant)]': !isReadOnly }"
                  :placeholder="`Judul Materi (${sourceLang.toUpperCase()})`" rows="1">
            </textarea>
              </div>
              <hr class="border-[var(--color-outline-variant)]/50" />

              <div>
                <div class="flex justify-between items-center mb-3">
                  <h3 class="text-lg font-semibold text-[var(--color-primary)]">Deskripsi Materi</h3>
                  <div v-if="!isReadOnly" class="flex items-center gap-2">
                    <button @click="toggleDescTarget"
                      :class="['w-8 h-8 flex items-center justify-center rounded-full text-[10px] font-bold transition-all   border', localMateri.showTargetDesc ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]' : 'bg-[var(--color-surface)] text-[var(--color-outline)] border-[var(--color-outline-variant)] hover:border-[var(--color-outline)]', !localMateri.showSourceDesc && localMateri.showTargetDesc ? 'cursor-not-allowed opacity-80' : 'cursor-pointer active:scale-95']">{{
                        targetLang.toUpperCase() }}</button>
                    <button @click="toggleDescSource"
                      :class="['w-8 h-8 flex items-center justify-center rounded-full text-[10px] font-bold transition-all   border', localMateri.showSourceDesc ? 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)] border-[var(--color-secondary)]' : 'bg-[var(--color-surface)] text-[var(--color-outline)] border-[var(--color-outline-variant)] hover:border-[var(--color-outline)]', !localMateri.showTargetDesc && localMateri.showSourceDesc ? 'cursor-not-allowed opacity-80' : 'cursor-pointer active:scale-95']">{{
                        sourceLang.toUpperCase() }}</button>
                  </div>
                </div>

                <!-- Skeleton Loader for Description -->
                <div
                  v-if="aiState.processingFrontPage && (!localMateri.description || !localMateri.description[targetLang])"
                  class="p-5 rounded-2xl bg-[var(--color-surface-container)] space-y-3 animate-pulse">
                  <div class="h-4 w-3/4 ai-processing-gradient rounded-md"></div>
                  <div class="h-4 w-full ai-processing-gradient rounded-md"></div>
                  <div class="h-4 w-5/6 ai-processing-gradient rounded-md"></div>
                </div>

                <div v-else class="p-4 rounded-2xl bg-[var(--color-surface-container)] transition-all"
                  :class="{ 'focus-within:ring-2 focus-within:ring-[var(--color-primary)]': !isReadOnly }">
                  <textarea v-if="localMateri.showTargetDesc" v-model="localMateri.description[targetLang]"
                    v-auto-resize :readonly="isReadOnly"
                    class="w-full bg-transparent focus:outline-none resize-none overflow-hidden text-md text-[var(--color-on-surface)] mb-2 block"
                    :class="{ 'placeholder-transparent': isReadOnly }" rows="3"
                    :placeholder="`Deskripsi singkat materi (${targetLang.toUpperCase()})...`"></textarea>
                  <div v-if="sourceLang !== targetLang && localMateri.showTargetDesc && localMateri.showSourceDesc"
                    class="border-t border-[var(--color-outline-variant)]/50 pt-3 -mt-1 mb-2"></div>
                  <textarea v-if="localMateri.description && sourceLang !== targetLang && localMateri.showSourceDesc"
                    v-model="localMateri.description[sourceLang]" v-auto-resize :readonly="isReadOnly"
                    class="w-full bg-transparent focus:outline-none resize-none overflow-hidden text-base text-[var(--color-on-surface-variant)] block"
                    :class="{ 'placeholder-transparent': isReadOnly }" rows="3"
                    :placeholder="`Deskripsi singkat materi (${sourceLang.toUpperCase()})...`"></textarea>
                </div>
              </div>

              <div>
                <div class="flex justify-between items-center mb-3">
                  <h3 class="text-lg font-semibold text-[var(--color-primary)]">Tujuan Pembelajaran</h3>
                </div>

                <!-- Skeleton Loader for Objectives -->
                <div
                  v-if="aiState.processingFrontPage && (!localMateri.learning_objectives || !localMateri.learning_objectives[targetLang])"
                  class="p-5 rounded-2xl bg-[var(--color-surface-container)] space-y-3 animate-pulse">
                  <div class="h-4 w-full ai-processing-gradient rounded-md"></div>
                  <div class="h-4 w-full ai-processing-gradient rounded-md"></div>
                  <div class="h-4 w-3/4 ai-processing-gradient rounded-md"></div>
                </div>

                <div v-else class="p-4 rounded-2xl bg-[var(--color-surface-container)] transition-all"
                  :class="{ 'focus-within:ring-2 focus-within:ring-[var(--color-primary)]': !isReadOnly }">
                  <textarea v-if="localMateri.showTargetDesc" v-model="localMateri.learning_objectives[targetLang]"
                    v-auto-resize :readonly="isReadOnly"
                    class="w-full bg-transparent focus:outline-none resize-none overflow-hidden text-md text-[var(--color-on-surface)] mb-2 block"
                    :class="{ 'placeholder-transparent': isReadOnly }" rows="3"
                    :placeholder="`- Poin 1\n- Poin 2\n- Poin 3`"></textarea>
                  <div v-if="sourceLang !== targetLang && localMateri.showTargetDesc && localMateri.showSourceDesc"
                    class="border-t border-[var(--color-outline-variant)]/50 pt-3 -mt-1 mb-2"></div>
                  <textarea
                    v-if="localMateri.learning_objectives && sourceLang !== targetLang && localMateri.showSourceDesc"
                    v-model="localMateri.learning_objectives[sourceLang]" v-auto-resize :readonly="isReadOnly"
                    class="w-full bg-transparent focus:outline-none resize-none overflow-hidden text-base text-[var(--color-on-surface-variant)] block"
                    :class="{ 'placeholder-transparent': isReadOnly }" rows="3"
                    :placeholder="`- Point 1\n- Point 2\n- Point 3`"></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else :key="'page-' + currentPageIndex" class="w-full h-full overflow-y-auto pb-24">
          <div class="editor-wrapper relative bg-[var(--color-surface-container-high)] p-4"
            :class="[isReadOnly ? 'rounded-2xl' : 'rounded-b-2xl rounded-t-none', { 'is-focused': editor?.isFocused && !isReadOnly, 'global-test-mode': isTesting, 'cursor-text': !isReadOnly, 'cursor-default': isReadOnly }]"
            @click="handleEditorWrapperClick">

            <!-- Skeleton Loader for Lesson Page -->
            <div v-if="aiState.processingPages.has(currentPageIndex - 1) && isPageEmpty(currentPageIndex - 1)"
              class="space-y-6 animate-pulse p-4">
              <div class="h-12 w-1/2 ai-processing-gradient rounded-xl mb-8"></div>
              <div class="space-y-3">
                <div class="h-4 w-full ai-processing-gradient rounded-md"></div>
                <div class="h-4 w-full ai-processing-gradient rounded-md"></div>
                <div class="h-4 w-3/4 ai-processing-gradient rounded-md"></div>
              </div>
              <div class="h-48 w-full ai-processing-gradient rounded-2xl my-8"></div>
              <div class="space-y-3">
                <div class="h-4 w-full ai-processing-gradient rounded-md"></div>
                <div class="h-4 w-5/6 ai-processing-gradient rounded-md"></div>
              </div>
            </div>

            <editor-content v-else :editor="editor" class="prose dark:prose-invert max-w-none focus:outline-none" />
          </div>
        </div>
      </Transition>
    </div>

    <Transition enter-active-class="transition duration-500 ease-out-back" enter-from-class="opacity-0 translate-y-10"
      enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-300 ease-in"
      leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-10">
      <div v-if="localMateri && !isTesting"
        class="flex-shrink-0 fixed bottom-20 xl:bottom-8 left-1/2 -translate-x-1/2 z-10 transition-all duration-300">
        <div class="relative flex items-center justify-center">
          <!-- [ADMIN NAV] Previous Material Button - jauh di kiri (khusus admin) -->
          <Transition enter-active-class="transition duration-300 ease-out-back"
            enter-from-class="opacity-0 translate-x-4 scale-50" enter-to-class="opacity-100 translate-x-0 scale-100"
            leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100 translate-x-0 scale-100"
            leave-to-class="opacity-0 translate-x-4 scale-50">
            <button v-if="!isReadOnly && hasPrevMaterial" @click="emit('navigate-prev')"
              class="absolute -left-28 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300   border-2 border-[var(--color-secondary)] bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-on-secondary)] hover:scale-110 hover:-translate-x-0.5 active:scale-95 z-10"
              title="Materi Sebelumnya">
              <span class="material-symbols-outlined text-xl">first_page</span>
            </button>
          </Transition>

          <!-- Previous Page Button (absolutely positioned left) -->
          <Transition enter-active-class="transition duration-300 ease-out-back"
            enter-from-class="opacity-0 translate-x-4 scale-50" enter-to-class="opacity-100 translate-x-0 scale-100"
            leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100 translate-x-0 scale-100"
            leave-to-class="opacity-0 translate-x-4 scale-50">
            <button v-show="currentPageIndex !== 0" @click="goToPrevPage"
              class="absolute -left-14 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300   border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)] hover:scale-110 hover:-translate-x-0.5 active:bg-[var(--color-secondary)] active:text-[var(--color-on-secondary)] active:scale-95 z-10"
              title="Halaman Sebelumnya">
              <span class="material-symbols-outlined text-xl">chevron_left</span>
            </button>
          </Transition>

          <!-- Page Index Bar (always centered) -->
          <div
            class="bg-[var(--color-surface)] p-1 rounded-full flex items-center gap-1   border border-[var(--color-outline-variant)]/40 transition-all duration-300  hover:border-[var(--color-primary)]/30">

            <button @click="goToPage(0)" :class="[
              currentPageIndex === 0
                ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] scale-105'
                : 'bg-transparent hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] hover:scale-105',
              aiState.processingFrontPage ? 'ai-processing-gradient' : ''
            ]" class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ease-out-back"
              title="Halaman Depan">
              <span class="material-symbols-outlined text-lg">door_front</span>
            </button>

            <div class="w-[1px] h-4 bg-[var(--color-outline-variant)]/40 mx-0.5"></div>

            <div ref="pageScrollContainer"
              class="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 px-1 transition-all duration-300"
              :style="{ maxWidth: uiStore.isMobile ? '120px' : '300px' }">
              <TransitionGroup tag="div" class="flex items-center gap-1" enter-active-class="list-enter-active"
                enter-from-class="opacity-0 scale-50" enter-to-class="opacity-100 scale-100"
                leave-active-class="list-leave-active" leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-50" move-class="list-move">
                <div v-for="(page, index) in localMateri.contents" :key="index" class="relative flex-shrink-0 mx-0.5"
                  style="will-change: transform, opacity">
                  <button @click="goToPage(index + 1)" :data-page="index + 1" :class="[
                    (index + 1) === currentPageIndex
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] scale-105 font-bold'
                      : 'bg-transparent hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] hover:scale-105 font-medium',
                    aiState.processingPages.has(index) ? 'ai-processing-gradient' : ''
                  ]" class="w-8 h-8 rounded-full text-xs transition-all duration-300 ease-out-back">
                    {{ index + 1 }}
                  </button>

                  <Transition enter-active-class="transition duration-200 ease-out"
                    enter-from-class="opacity-0 scale-50" enter-to-class="opacity-100 scale-100"
                    leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 scale-100"
                    leave-to-class="opacity-0 scale-50">
                    <button v-if="!isReadOnly && currentPageIndex === (index + 1)" @click.stop="hapusHalaman(index + 1)"
                      class="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-on-surface)] text-[8px]   hover:scale-110 hover:bg-[var(--color-error)] hover:text-[var(--color-on-error)] transition-all duration-200 z-20"><span
                        class="material-symbols-outlined leading-none"
                        style="font-size: 12px !important;">close</span></button>
                  </Transition>
                </div>
              </TransitionGroup>
            </div>

            <button v-if="!isReadOnly" @click="tambahHalaman"
              class="w-8 h-8 rounded-full bg-transparent hover:bg-[var(--color-primary-container)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-primary-container)] flex items-center justify-center transition-all duration-300 hover:rotate-90 hover:scale-105 ml-0.5"
              title="Tambah Halaman">
              <span class="material-symbols-outlined text-lg">add</span>
            </button>

            <div class="w-[1px] h-4 bg-[var(--color-outline-variant)]/40 mx-0.5"></div>

            <button @click="goToPage(assignmentPageIndex)" :class="[
              currentPageIndex === assignmentPageIndex
                ? 'bg-[var(--color-tertiary)] text-[var(--color-on-tertiary)] scale-105'
                : 'bg-transparent hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] hover:scale-105',
              aiState.processingAssignment ? 'ai-processing-gradient' : ''
            ]" class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ease-out-back"
              title="Halaman Tugas">
              <span class="material-symbols-outlined text-base">{{ lastAttempt ? 'assignment_turned_in' : 'assignment'
              }}</span>
            </button>
          </div>

          <!-- Next Page Button (absolutely positioned right) -->
          <Transition enter-active-class="transition duration-300 ease-out-back"
            enter-from-class="opacity-0 -translate-x-4 scale-50" enter-to-class="opacity-100 translate-x-0 scale-100"
            leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100 translate-x-0 scale-100"
            leave-to-class="opacity-0 -translate-x-4 scale-50">
            <button v-show="currentPageIndex !== assignmentPageIndex" @click="goToNextPage"
              class="absolute -right-14 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300   border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)] hover:scale-110 hover:translate-x-0.5 active:bg-[var(--color-secondary)] active:text-[var(--color-on-secondary)] active:scale-95 z-10"
              title="Halaman Berikutnya">
              <span class="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </Transition>

          <!-- [ADMIN NAV] Next Material Button - jauh di kanan (khusus admin) -->
          <Transition enter-active-class="transition duration-300 ease-out-back"
            enter-from-class="opacity-0 -translate-x-4 scale-50" enter-to-class="opacity-100 translate-x-0 scale-100"
            leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100 translate-x-0 scale-100"
            leave-to-class="opacity-0 -translate-x-4 scale-50">
            <button v-if="!isReadOnly && hasNextMaterial" @click="emit('navigate-next')"
              class="absolute -right-28 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300   border-2 border-[var(--color-secondary)] bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-on-secondary)] hover:scale-110 hover:translate-x-0.5 active:scale-95 z-10"
              title="Materi Berikutnya">
              <span class="material-symbols-outlined text-xl">last_page</span>
            </button>
          </Transition>
        </div>
      </div>
    </Transition>

    <ManajemenMateriSource :is-open="showJsonModal" :materi="localMateri" :current-page-index="currentPageIndex"
      :assignment-page-index="assignmentPageIndex" :source-lang="sourceLang" :target-lang="targetLang"
      :extensions="myExtensions" :active-page-json="editorToUse?.getHTML()" :module-id="moduleId"
      :module-title-src="aiContext.mod_title_src" :module-title-tgt="aiContext.mod_title_tgt"
      :chapter-title-src="aiContext.chap_title_src" :chapter-title-tgt="aiContext.chap_title_tgt"
      @close="showJsonModal = false" @save="handleSourceSave" />

    <TransitionRoot :show="showGenericModal" as="template">
      <Dialog @close="closeGenericModal" class="relative z-50">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-300 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-[var(--color-scrim)]" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-300 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel
              class="modal-box w-full max-w-md mx-4 rounded-4xl bg-[var(--color-surface-container-high)] p-6  ">
              <div class="relative flex items-center justify-center mb-6">
                <h2 class="text-2xl font-bold text-[var(--color-on-background)]">{{ modalConfig.title }}</h2>
                <button @click="closeGenericModal"
                  class="absolute right-0 top-0 p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors"><span
                    class="material-symbols-outlined">close</span></button>
              </div>
              <hr class="my-4 border-[var(--color-outline-variant)]" />
              <!-- Message display for confirmation modals -->
              <p v-if="modalConfig.message" class="text-[var(--color-on-surface-variant)] mb-4">{{ modalConfig.message
              }}
              </p>
              <div class="space-y-4">
                <div v-for="input in modalConfig.inputs" :key="input.key">
                  <label v-if="input.type !== 'checkbox'"
                    class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ input.label
                    }}</label>
                  <input v-if="input.type !== 'checkbox' && input.type !== 'file'" :type="input.type"
                    v-model="modalInputs[input.key]"
                    class="w-full p-2 border border-[var(--color-outline-variant)] rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    :placeholder="input.placeholder" />
                  <input v-if="input.type === 'file'" type="file" @change="handleFileChange($event, input.key)"
                    class="block w-full text-sm text-[var(--color-on-surface-variant)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary-container)] file:text-[var(--color-on-primary-container)] hover:file:bg-[var(--color-primary-fixed-dim)]/20 "
                    :accept="input.accept" />
                  <div v-if="input.type === 'checkbox'" class="flex items-center space-x-3">
                    <button type="button"
                      class="relative flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                      :class="[modalInputs[input.key] ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-outline)]']"
                      @click="modalInputs[input.key] = !modalInputs[input.key]">
                      <span :class="[modalInputs[input.key] ? 'translate-x-6' : 'translate-x-1']"
                        class="inline-block h-4 w-4 transform rounded-full bg-[var(--color-on-primary)] transition-transform"></span>
                    </button>
                    <label class="block text-sm font-medium text-[var(--color-on-background)]">{{ input.label }}</label>
                  </div>
                </div>
              </div>
              <div class="mt-6 flex justify-end space-x-2">
                <button @click="closeGenericModal"
                  class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-high)]">Batal</button>
                <button @click="handleModalConfirm"
                  class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] text-[var(--color-on-primary)] transition-colors">Konfirmasi</button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>


    <TransitionRoot :show="showScoreModal" as="template">
      <Dialog @close="showScoreModal = false" class="relative z-50">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-300 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-[var(--color-scrim)]/60" />
        </TransitionChild>
        <canvas ref="confettiCanvasRef" class="fixed inset-0 z-[60] pointer-events-none" />
        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-300 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel
              class="modal-box w-full max-w-sm mx-4 rounded-4xl bg-[var(--color-surface-container-high)] p-6   flex flex-col items-center text-center">
              <div
                class="w-20 h-20 rounded-full bg-[var(--color-success-container)] text-[var(--color-on-success-container)] flex items-center justify-center mb-4">
                <span class="material-symbols-outlined text-5xl">emoji_events</span>
              </div>
              <h2 class="text-2xl font-bold text-[var(--color-on-background)] mb-2">Tugas Selesai!</h2>
              <p class="text-[var(--color-on-surface-variant)] mb-1">Waktu pengerjaan: <strong>{{ formattedTime
              }}</strong>
              </p>
              <p class="text-[var(--color-on-surface-variant)] text-sm mb-4">Menjawab <strong>{{ answeredQuestions
              }}</strong> dari <strong>{{ totalQuestions }}</strong> soal</p>
              <div
                class="bg-[var(--color-surface)] p-4 rounded-2xl w-full border border-[var(--color-outline-variant)]/30 mb-6">
                <span class="block text-sm text-[var(--color-on-surface-variant)] uppercase tracking-wide">Nilai
                  Total</span>
                <span class="block text-5xl font-extrabold text-[var(--color-success)] mt-1">{{ finalScore }}</span>
                <span class="block text-xs text-[var(--color-outline)] mt-1">dari {{ maxPossibleScore }}</span>
              </div>
              <button @click="showScoreModal = false"
                class="w-full px-4 py-3 text-base font-bold rounded-xl bg-[var(--color-success)] hover:brightness-110 text-[var(--color-on-success)] transition-all">Tutup</button>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Modal Konfirmasi Keluar (tanpa simpan) -->
    <TransitionRoot appear :show="showExitConfirmModal" as="template">
      <Dialog as="div" @close="showExitConfirmModal = false" class="relative z-50">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-[var(--color-scrim)]/60" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel
              class="w-full max-w-sm transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-center align-middle   transition-all">
              <div
                class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-error-container)]">
                <span class="material-symbols-outlined text-4xl text-[var(--color-on-error-container)]">logout</span>
              </div>
              <h2 class="mt-4 text-2xl font-bold text-[var(--color-on-background)]">Keluar Tanpa Menyimpan?</h2>
              <p class="mt-2 text-sm text-[var(--color-on-surface-variant)]">Anda akan meninggalkan sesi pengerjaan saat
                ini. Hasil jawaban tidak akan disimpan.</p>
              <div class="mt-6 grid grid-cols-2 gap-3">
                <button type="button" @click="showExitConfirmModal = false"
                  class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]">Batal</button>
                <button type="button" @click="confirmExitWithoutSave"
                  class="w-full rounded-xl bg-[var(--color-error)] px-4 py-2 font-semibold text-[var(--color-on-error)] transition-colors hover:bg-[var(--color-error-container)]">Ya,
                  Keluar</button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Modal Konfirmasi Kirim (simpan jawaban) -->
    <TransitionRoot appear :show="showSubmitConfirmModal" as="template">
      <Dialog as="div" @close="showSubmitConfirmModal = false" class="relative z-50">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-[var(--color-scrim)]/60" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel
              class="w-full max-w-sm transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-center align-middle   transition-all">
              <div
                class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-container)]">
                <span class="material-symbols-outlined text-4xl text-[var(--color-on-primary-container)]">send</span>
              </div>
              <h2 class="mt-4 text-2xl font-bold text-[var(--color-on-background)]">Kirim Jawaban?</h2>
              <p class="mt-2 text-sm text-[var(--color-on-surface-variant)]">Kirim hasil jawaban sekarang? Hasil jawaban
                Anda akan disimpan.</p>
              <div class="mt-6 grid grid-cols-2 gap-3">
                <button type="button" @click="showSubmitConfirmModal = false"
                  class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]">Batal</button>
                <button type="button" @click="confirmSubmitAnswers"
                  class="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2 font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-fixed-dim)]">Ya,
                  Kirim</button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Modal Konfirmasi AI Wizard -->
    <TransitionRoot appear :show="showAiConfirmModal" as="template">
      <Dialog as="div" @close="showAiConfirmModal = false" class="relative z-50">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-[var(--color-scrim)]/60" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel
              class="w-full max-w-sm transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-center align-middle   transition-all">
              <div
                class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-error-container)] ring-2 ring-[var(--color-error)]/40">
                <span class="material-symbols-outlined text-4xl text-[var(--color-error)]">warning</span>
              </div>
              <h2 class="mt-4 text-2xl font-bold text-[var(--color-on-background)]">Peringatan</h2>
              <p class="mt-2 text-sm text-[var(--color-on-surface-variant)]">Fitur ini akan menimpa Deskripsi, Tujuan,
                Konten Materi, dan Tugas saat ini. Lanjutkan?</p>
              <div class="mt-6 grid grid-cols-2 gap-3">
                <button type="button" @click="showAiConfirmModal = false"
                  class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]">Batal</button>
                <button type="button" @click="showAiConfirmModal = false; runAiWizard()"
                  class="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2 font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-fixed-dim)]">Ya,
                  Lanjutkan</button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Simpan Ke Daftar Modal -->
    <SimpanKeDaftar v-if="localMateri" v-model="showSimpanModal" :item-data="itemDataForSaving" item-type="materi" />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onUnmounted,
  nextTick,
  provide,
  reactive,
  onMounted,
  type PropType,
  type Directive
} from 'vue';
import { useLanguageStore } from '@/stores/language';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
// [BARU] Import VueUse
import { useIntersectionObserver, useTimeoutFn } from '@vueuse/core';
import { cloneDeep } from 'lodash-es';
import { useEditor, EditorContent, type Editor } from '@tiptap/vue-3';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
} from '@headlessui/vue';
import { api } from '@/utils/api';

// Extensions Import
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import History from '@tiptap/extension-history';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import TextAlign from '@tiptap/extension-text-align';
import Strike from '@tiptap/extension-strike';
import Underline from '@tiptap/extension-underline';

import ResizableImage from './ResizableImage.vue';
import SoalPilihanGandaNode, { documentation as docPG } from './SoalPilihanGandaNode';
import SoalIsianNode, { documentation as docIsian } from './SoalIsianNode';
import SoalKelompokanNode, { documentation as docKelompokan } from './SoalKelompokanNode';
import PercakapanNode, { documentation as docPercakapan } from './PercakapanNode';
import SoalRumpangNode, { documentation as docRumpang } from './SoalRumpangNode';
import DiagramNode, { documentation as docDiagram } from './DiagramNode';
import RumusKalimatNode, { documentation as docRumus } from './RumusKalimatNode';
import NoteBoxNode, { documentation as docNote } from './NoteBoxNode';
import ManajemenMateriSource from './ManajemenMateriSource.vue';
import SimpanKeDaftar from '../../SimpanKeDaftar.vue';
import { generateJSON, generateHTML } from '@tiptap/html';

// Interfaces
interface LocalizedString {
  [key: string]: string;
}

interface Materi {
  id?: number | string;
  title: LocalizedString;
  description: LocalizedString;
  learning_objectives: LocalizedString;
  contents: string[]; // Array of pages (HTML Strings)
  assignment: any; // Assignment object
  showTargetDesc?: boolean;
  showSourceDesc?: boolean;
  [key: string]: any;
}

interface AIContext {
  module_title: string;
  chapter_title: string;
  mod_title_src: string;
  mod_title_tgt: string;
  chap_title_src: string;
  chap_title_tgt: string;
  prev_materials: any[];
  next_materials: any[];
}

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
  materi: { type: Object as PropType<Materi>, required: true },
  isSaving: { type: Boolean, default: false },
  error: { type: String as PropType<string | null>, default: null },
  isPublicView: { type: Boolean, default: false },
  moduleId: { type: [Number, String], default: null },

  aiContext: {
    type: Object as PropType<AIContext>,
    default: () => ({
      module_title: '',
      chapter_title: '',
      mod_title_src: '',
      mod_title_tgt: '',
      chap_title_src: '',
      chap_title_tgt: '',
      prev_materials: [],
      next_materials: [],
    }),
  },
  canTogglePreview: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  // [ADMIN NAV] Props untuk navigasi antar materi
  hasPrevMaterial: { type: Boolean, default: false },
  hasNextMaterial: { type: Boolean, default: false },
});

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'request-global-save', payload: Materi): void;
  (e: 'update:materi', payload: Materi): void;
  (e: 'toggle-preview'): void;
  (e: 'toggle-active'): void;
  (e: 'navigate-prev'): void;
  (e: 'navigate-next'): void;
}>();

const languageStore = useLanguageStore();
const uiStore = useUIStore();
const localMateri = ref<Materi | null>(null);
const originalMateri = ref<Materi | null>(null);
const isDirty = ref(false);
const currentPageIndex = ref(0);
const pageScrollContainer = ref<HTMLElement | null>(null); // For scrolling active page to center
const targetLang = computed(() => languageStore.selectedTarget?.kodeBahasa || 'en');
const sourceLang = computed(() => languageStore.selectedAsal?.kodeBahasa || 'id');

// Provide Context for Question Components
provide(
  'materialContext',
  computed(() => ({
    topic:
      localMateri.value?.assignment?.title?.[targetLang.value] ||
      localMateri.value?.title?.[targetLang.value] ||
      'General Topic',
    sourceLang: sourceLang.value || 'id',
    targetLang: targetLang.value || 'en',
    moduleId: props.moduleId,
    description: localMateri.value?.description?.[targetLang.value] || '',
    learningObjectives:
      localMateri.value?.learning_objectives?.[targetLang.value] || '',
  })),
);

const isDeleting = ref(false);
const isSwitchingMaterial = ref(false);
const showJsonModal = ref(false);
const showGenericModal = ref(false);
const showAiConfirmModal = ref(false);
const showSimpanModal = ref(false);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const modalConfig = ref<any>({});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const modalInputs = ref<any>({});

// [STATE] Exam & Interactive Mode
const isTesting = ref(false);
const testDuration = ref(0);
const finalScore = ref(0);
const startTime = ref<string>('');
const answeredQuestions = ref(0);
const totalQuestions = ref(0);
const maxPossibleScore = ref(0);
const lastAttempt = ref<any>(null);
const timerInterval = ref<any>(undefined);
const showScoreModal = ref(false);
const showExitConfirmModal = ref(false);
const showSubmitConfirmModal = ref(false);
const questionRegistry = ref(new Map());
const bottomButtonsRef = ref<HTMLElement | null>(null);
const bottomObserver = ref<any>(null);
const bottomButtonsVisible = ref(false);
const isReviewing = ref(false);
const correctAnswers = ref(0);
const incorrectAnswers = ref(0);
const confettiCanvasRef = ref<HTMLCanvasElement | null>(null);

// --- CONFETTI ANIMATION ---
const launchConfetti = () => {
  const canvas = confettiCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Read theme colors from CSS variables
  const style = getComputedStyle(document.documentElement);
  const colors = [
    style.getPropertyValue('--color-primary').trim(),
    style.getPropertyValue('--color-secondary').trim(),
    style.getPropertyValue('--color-tertiary').trim(),
    style.getPropertyValue('--color-success').trim(),
    style.getPropertyValue('--color-primary-container').trim(),
    style.getPropertyValue('--color-tertiary-container').trim(),
  ].filter(c => c.length > 0);

  if (colors.length === 0) return;

  interface Particle {
    x: number; y: number; vx: number; vy: number;
    w: number; h: number; color: string; rotation: number;
    rotationSpeed: number; opacity: number; shape: number;
  }

  const particles: Particle[] = [];
  const count = 120;
  const cx = canvas.width / 2;
  const cy = canvas.height * 0.35;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 10;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed * (0.6 + Math.random() * 0.8),
      vy: Math.sin(angle) * speed * (0.5 + Math.random()) - 4,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
      shape: Math.floor(Math.random() * 3), // 0=rect, 1=circle, 2=strip
    });
  }

  let frame = 0;
  const maxFrames = 180; // ~3s at 60fps
  const gravity = 0.18;

  const animate = () => {
    if (frame >= maxFrames) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x += p.vx;
      p.vy += gravity;
      p.y += p.vy;
      p.vx *= 0.99;
      p.rotation += p.rotationSpeed;
      if (frame > maxFrames * 0.6) {
        p.opacity -= 0.025;
        if (p.opacity < 0) p.opacity = 0;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;

      if (p.shape === 0) {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else if (p.shape === 1) {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -1, p.w, 2.5);
      }

      ctx.restore();
    }
    frame++;
    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
};

watch(showScoreModal, (val) => {
  if (val) {
    nextTick(() => {
      launchConfetti();
    });
  }
});


// AI State Management
interface AIState {
  isProcessing: boolean;
  statusTitle: string;
  statusMsg: string;
  progress: number;
  step: string;
  processingPages: Set<number>;
  processingFrontPage: boolean;
  processingAssignment: boolean;
}

const aiState = reactive<AIState>({
  isProcessing: false,
  statusTitle: '',
  statusMsg: '',
  progress: 0,
  step: '',
  processingPages: new Set<number>(), // Track which page indices are being processed
  processingFrontPage: false, // Track front page (description/objectives)
  processingAssignment: false, // Track assignment page
});

// [UPDATED] Parse AI Output - supports both JSON and HTML
// HTML is more token-efficient, so AI now outputs HTML
// [HELPER] Strip markdown formatting from text
const stripMarkdown = (text: any) => {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1')     // italic
    .replace(/__(.*?)__/g, '$1')     // bold underscore
    .replace(/_(.*?)_/g, '$1')       // italic underscore
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // code
    .replace(/\\([*#_~])/g, '$1');    // escaped characters
};

// [HELPER] Recursively strip markdown from objects/arrays
const stripMarkdownDeep = (obj: any): any => {
  if (typeof obj === 'string') return stripMarkdown(obj);
  if (Array.isArray(obj)) return obj.map(stripMarkdownDeep);
  if (typeof obj === 'object' && obj !== null) {
    const newObj = {};
    for (const key in obj) {
      newObj[key] = stripMarkdownDeep(obj[key]);
    }
    return newObj;
  }
  return obj;
};

const parseAiContent = (str, extensions) => {
  if (!str) {
    console.warn('[parseAiContent] Input is empty/null');
    return null;
  }
  console.log('[parseAiContent] Raw input length:', str.length);
  console.log('[parseAiContent] Raw input:', str);
  let cleaned = str.trim();

  // 1. Remove markdown code fence (```html, ```json, or ``` ... ```)
  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n');
    if (firstNewline !== -1) {
      cleaned = cleaned.substring(firstNewline + 1);
    }
    const lastBacktick = cleaned.lastIndexOf('```');
    if (lastBacktick !== -1) {
      cleaned = cleaned.substring(0, lastBacktick);
    }
    cleaned = cleaned.trim();
  }

  // 2. Fallback regex untuk edge cases
  cleaned = cleaned
    .replace(/^```(?:json|html)?\s*\n?/i, '')
    .replace(/\n?\s*```\s*$/i, '');

  // 3. Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  cleaned = cleaned.trim();

  // 4. Detect if output is HTML or JSON
  const isHtml = cleaned.startsWith('<') || !cleaned.startsWith('{');

  if (isHtml) {
    // === HTML MODE ===
    console.log('[parseAiContent] Detected HTML output');

    // [CLEANUP] Remove legacy OUTPUT markers that AI might still emit
    cleaned = cleaned
      .replace(/<<<\/?OUTPUT>>>/gi, '')  // Remove <<<OUTPUT>>> and <<</OUTPUT>>>
      .replace(/<<</g, '')               // Remove any stray <<< 
      .replace(/>>>/g, '')               // Remove any stray >>>
      .replace(/<</g, '')                // Remove any stray <<
      .replace(/>>/g, '')                // Remove any stray >>
      .replace(/\.{4,}$/g, '')           // Remove trailing dots (....)
      .trim();

    // [AUTO-FIX] Convert Markdown to HTML
    // 1. Bold: **text** → <strong>text</strong>
    cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // 2. Italics: *text* → <em>text</em> (must run AFTER bold conversion)

    // [CRITICAL FIX] Robust attribute parsing for complex JSON and nested quotes in HTML tags.
    // AI often outputs malformed HTML like: <soal-pg instruction="He said "Hello"" options='[...]'>
    // We must escape quotes inside attributes BEFORE the browser's DOM parser/generateJSON sees them.
    const tagsToFix = ['soal-pg', 'soal-pilihan-ganda', 'soal-rumpang', 'soal-kelompokan', 'soal-isian', 'percakapan', 'diagram-node'];

    tagsToFix.forEach(tagName => {
      // Regex to find the whole tag: <tag ... >
      const tagRegex = new RegExp(`<(${tagName})(\\s+[\\s\\S]*?)>`, 'gi');

      cleaned = cleaned.replace(tagRegex, (fullTag, name, attrContent) => {
        // Now parse attributes inside this specific tag match
        // We look for name="value" or name='value'
        let fixedAttrContent = attrContent;

        // This inner regex finds each attribute and its value
        // Lookahead (?=\s|>|/|$) ensures we stop at the quote that actually terminates the attribute
        const attrRegex = /([a-z0-9_]+)\s*=\s*(["'])([\s\S]*?)\2(?=\s|>|\/|$)/gi;

        // We use a manual loop to handle JSON arrays with brackets which might confuse simple regex
        let result = '';
        let lastIdx = 0;
        let m;

        while ((m = attrRegex.exec(attrContent)) !== null) {
          const attrName = m[1];
          const quote = m[2];
          let attrValue = m[3];

          const isJsonAttr = ['options', 'distractors', 'pairs', 'word_bank', 'content_data'].includes(attrName);

          // Add everything before this attribute
          result += attrContent.substring(lastIdx, m.index);

          // Manual scanning to ensure we captured the WHOLE attribute value, 
          // even if it contains internal quotes that match the wrapper quote.
          // Example: question='It's fine' - regex might stop at 'It'

          let fullValue = attrValue;
          const startInFull = attrContent.indexOf(quote + attrValue + quote, m.index);

          if (startInFull !== -1) {
            const valueStart = startInFull + 1;
            let j = valueStart + attrValue.length;
            let foundRealEnd = false;

            // Check if the current closing quote is actually the end
            // A real closing quote is usually followed by a space, /, >, or end of string
            const checkEnd = (pos) => {
              if (pos >= attrContent.length) return true;
              const nextChar = attrContent[pos];
              return /\s/.test(nextChar) || nextChar === '>' || nextChar === '/';
            };

            if (!checkEnd(j)) {
              // Not the real end! Continue scanning until we find a matching quote followed by a boundary
              while (j < attrContent.length) {
                if (attrContent[j] === quote) {
                  if (checkEnd(j + 1)) {
                    fullValue = attrContent.substring(valueStart, j);
                    attrRegex.lastIndex = j + 1; // Advance regex
                    foundRealEnd = true;
                    break;
                  }
                }
                j++;
              }
            }

            if (foundRealEnd) {
              attrValue = fullValue;
            }
          }

          // Special handling for JSON attributes to handle nested brackets
          if (isJsonAttr && (attrValue.startsWith('[') || attrValue.startsWith('{'))) {
            // If it's a bracketed JSON, we apply the bracket counting logic to be even more sure
            const startInFullBracket = attrContent.indexOf(attrValue[0], m.index + attrName.length);
            if (startInFullBracket !== -1) {
              let openChar = attrValue[0];
              let closeChar = openChar === '[' ? ']' : '}';
              let bracketCount = 0;
              let k = startInFullBracket;

              while (k < attrContent.length) {
                if (attrContent[k] === openChar) bracketCount++;
                else if (attrContent[k] === closeChar) {
                  bracketCount--;
                  if (bracketCount === 0) {
                    // Found closing bracket, check for boundary
                    let next = k + 1;
                    while (next < attrContent.length && /\s/.test(attrContent[next])) next++;
                    if (attrContent[next] === quote || attrContent[next] === '>' || attrContent[next] === '/' || /\s/.test(attrContent[next])) {
                      attrValue = attrContent.substring(startInFullBracket, k + 1);
                      attrRegex.lastIndex = next;
                      break;
                    }
                  }
                }
                k++;
              }
            }
          }

          // NORMALIZATION: Strip markdown from string attributes
          const attributesToStrip = ['instruction', 'question', 'hint', 'content', 'label', 'text', 'content_data'];
          if (attributesToStrip.includes(attrName)) {
            attrValue = stripMarkdown(attrValue);
          }

          if (isJsonAttr) {
            try {
              // Attempt to parse and clean JSON
              const parsed = JSON.parse(attrValue);
              attrValue = JSON.stringify(stripMarkdownDeep(parsed));
            } catch (e) {
              // If JSON is invalid, still try to strip some basic markdown from it
              attrValue = stripMarkdown(attrValue);
            }
          }

          // ESCAPE the wrapper quote inside the value
          const escapedValue = attrValue.split(quote).join(quote === '"' ? '&quot;' : '&apos;');

          result += `${attrName}=${quote}${escapedValue}${quote}`;
          lastIdx = attrRegex.lastIndex;
        }

        result += attrContent.substring(lastIdx);
        return `<${name}${result}>`;
      });
    });

    // Step A: Keep existing unescape ONLY as a last resort or for legacy consistency
    // cleaned = cleaned.replace(/\\'/g, "'"); // DISABLED: Now handled by robust parser above

    try {
      // Use Tiptap's generateJSON to convert HTML to JSON
      // const json = generateJSON(cleaned, extensions);
      // console.log('[parseAiContent] HTML converted to JSON successfully');
      // return json;

      // [REF_HTML] Return sanitized HTML string directly
      return cleaned;
    } catch (e) {
      console.error('[parseAiContent] HTML clean failed:', e.message);
      throw new Error(`Gagal parse HTML: ${e.message}`);
    }
  } else {
    // === JSON MODE (legacy fallback) ===
    console.log('[parseAiContent] Detected JSON output');

    // Find the actual JSON object
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace > 0) {
      cleaned = cleaned.substring(firstBrace);
    }

    // ... (Existing JSON parsing logic skipped for brevity, implementing minimal wrapper)
    // Actually we need to keep the JSON parsing logic to convert LEGACY JSON to HTML

    try {
      const jsonContent = parseAiJson(cleaned);
      // Convert to HTML
      return generateHTML(jsonContent, extensions);
    } catch (e) {
      console.error('[parseAiContent] JSON to HTML failed', e);
      return '';
    }
  }
};

// Utility to parse HTML-based metadata (Plan, Translation, Validation)
const parseAiMetadata = (str: string) => {
  if (!str) return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(str, 'text/html');

  // 1. Handle <plan>
  const planNode = doc.querySelector('plan');
  if (planNode) {
    const pagesPlan = Array.from(planNode.querySelectorAll('pages page')).map(
      (p) => ({
        topic: p.getAttribute('topic') || '',
        objective: p.getAttribute('objective') || '',
        header: p.getAttribute('header') || '',
        connection: p.getAttribute('connection') || '',
        seed_content: Array.from(p.querySelectorAll('seed')).map((s) =>
          s.textContent?.trim() || '',
        ),
      }),
    );
    return {
      description: planNode.querySelector('desc')?.textContent?.trim() || '',
      learning_objectives: Array.from(planNode.querySelectorAll('objs li')).map(
        (li) => li.textContent?.trim() || '',
      ),
      pages_plan: pagesPlan,
    };
  }

  // 2. Handle <translation>
  const transNode = doc.querySelector('translation');
  if (transNode) {
    return {
      description: transNode.querySelector('desc')?.textContent?.trim() || '',
      learning_objectives: Array.from(transNode.querySelectorAll('objs li')).map(
        (li) => li.textContent?.trim() || '',
      ),
    };
  }

  // 3. Handle <validation>
  const valNode = doc.querySelector('validation');
  if (valNode) {
    const issues = Array.from(valNode.querySelectorAll('issues li')).map(
      (li) => li.textContent?.trim() || '',
    );
    const specificFixes = Array.from(
      valNode.querySelectorAll('specific_fixes li'),
    ).map((li) => li.textContent?.trim() || '');

    return {
      needs_revision:
        valNode.querySelector('needs_revision')?.textContent?.trim() === 'true',
      severity: valNode.querySelector('severity')?.textContent?.trim() || 'minor',
      issues: issues,
      specific_fixes: specificFixes,
    };
  }

  // Fallback to old JSON parser if no tags found (for backward compatibility during rollout)
  try {
    return parseAiJson(str);
  } catch (e) {
    console.error('[parseAiMetadata] Failed to parse as HTML or JSON');
    return null;
  }
};

// Pure JSON parser (legacy/fallback)
const parseAiJson = (str) => {
  if (!str) return null;
  let cleaned = str.trim();

  // Remove markdown code fence
  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n');
    if (firstNewline !== -1) {
      cleaned = cleaned.substring(firstNewline + 1);
    }
    const lastBacktick = cleaned.lastIndexOf('```');
    if (lastBacktick !== -1) {
      cleaned = cleaned.substring(0, lastBacktick);
    }
    cleaned = cleaned.trim();
  }

  // Fallback regex
  cleaned = cleaned
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?\s*```\s*$/i, '');

  // Detect if it's an object or array
  const isArray = cleaned.trim().startsWith('[');
  const isObject = cleaned.trim().startsWith('{');

  if (!isArray && !isObject) {
    // Try to find first { or [
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');

    if (firstBrace === -1 && firstBracket === -1) {
      throw new Error('No valid JSON found');
    }

    const startPos =
      firstBrace === -1
        ? firstBracket
        : firstBracket === -1
          ? firstBrace
          : Math.min(firstBrace, firstBracket);

    cleaned = cleaned.substring(startPos);
  }

  // Find matching closing brace/bracket
  let count = 0;
  let lastValidIndex = -1;
  let insideString = false;
  let escapeNext = false;
  const openChar = cleaned.trim().startsWith('[') ? '[' : '{';
  const closeChar = openChar === '[' ? ']' : '}';

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      insideString = !insideString;
      continue;
    }
    if (!insideString) {
      if (char === openChar) count++;
      if (char === closeChar) {
        count--;
        if (count === 0) {
          lastValidIndex = i;
          break;
        }
      }
    }
  }

  if (lastValidIndex !== -1 && lastValidIndex < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastValidIndex + 1);
  }

  // Sanitize: Fix common AI JSON errors
  // 1. Replace invalid \' with just ' (JSON doesn't need escaped single quotes)
  cleaned = cleaned.replace(/\\'/g, "'");
  // 2. Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  // 3. Fix unescaped control characters (newlines) inside strings - replace with space
  // This regex finds strings and replaces raw newlines/tabs with escaped versions
  cleaned = cleaned.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
    return match
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t')
      .replace(/\r/g, '\\r');
  });

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('[parseAiJson] Parse failed:', e.message);
    console.error(
      '[parseAiJson] Attempted to parse:',
      cleaned.substring(0, 600),
    );
    throw e;
  }
};

const tiptapDocs = `
════ HTML FORMAT (Token Efficient) ════

[1] STANDARD ELEMENTS:
<h2>Heading Level 2</h2>
<h3>Heading Level 3</h3>
<p>Paragraph with <strong>bold</strong> and <em>italic</em></p>
<table>
  <tr><th><p>Header</p></th><th><p>Header</p></th></tr>
  <tr><td><p>Data</p></td><td><p>Data</p></td></tr>
</table>
<ul><li><p>Bullet item</p></li></ul>

[2] DIALOGUE (percakapan):
${docPercakapan.htmlExample}

[3] DIAGRAM (Flowchart, Mindmap, Graph):
${docDiagram.htmlExample}

[4] SENTENCE FORMULA (rumus-kalimat):
${docRumus.htmlExample}

════ QUIZ ELEMENTS (Assignment Only) ════

[3] Multiple Choice (soal-pg):
${docPG.htmlExample}

[4] Matching (soal-kelompokan):
${docKelompokan.htmlExample}

[5] Cloze/Fill-in-the-Blank (soal-rumpang):
${docRumpang.htmlExample}

[6] Short Answer (soal-isian):
${docIsian.htmlExample}

════ RULES ════
✅ Use <strong> for bold, NOT **markdown**
✅ Target language words need stress marks: а́ е́ и́ о́ у́
❌ No markdown formatting
`;

const isPreviewMode = computed(() => props.isPublicView);
const isReadOnly = computed(() => isPreviewMode.value);

const assignmentPageIndex = computed(() =>
  localMateri.value ? localMateri.value.contents.length + 1 : 1,
);

const isAssignmentEmpty = computed(() => {
  if (!localMateri.value?.assignment?.contents) return true;
  const content = localMateri.value.assignment.contents;
  if (typeof content !== 'string') return false; // Should be string

  // Basic empty check
  const stripped = content.replace(/<[^>]*>/g, '').trim(); // Remove tags
  if (!stripped || stripped === 'Generating assignment...') return true;

  // Check specifically for empty paragraph
  if (content === '<p></p>' || content === '<p></p><p></p>' || content.includes('Generating assignment...')) return true;

  return false;
});

const isPageEmpty = (index: number) => {
  const page = localMateri.value.contents[index];
  if (!page) return true;
  if (typeof page !== 'string') return false;

  const stripped = page.replace(/<[^>]*>/g, '').trim();
  if (!stripped || stripped.startsWith('Generating page') || stripped.includes('...')) return true;
  if (page === '<p></p>') return true;
  return false;
};

// Computed property untuk data item yang akan disimpan (dengan lang_pair)
const itemDataForSaving = computed(() => {
  if (!localMateri.value) return null;
  const src = sourceLang.value || '';
  const tgt = targetLang.value || '';
  const langPair = src && tgt ? `${src}-${tgt}` : '';
  return {
    id: props.materi?.id || localMateri.value?.id,
    title:
      localMateri.value.title?.[tgt] ||
      localMateri.value.title?.[src] ||
      'Materi',
    content:
      localMateri.value.description?.[tgt] ||
      localMateri.value.description?.[src] ||
      '',
    lang_pair: langPair,
  };
});

// Function to report material
const reportMateri = () => {
  uiStore.openReportModal({
    id: props.materi?.id || localMateri.value?.id,
    tipe: 'materi',
    appLabel: 'learning_materials_app',
    konten: localMateri.value?.title?.[targetLang.value] || 'Materi',
  });
};

// Helper: Sanitize assignment content - hanya simpan komponen soal
// Note: soalIsian dan percakapan dinonaktifkan untuk halaman penugasan
const ALLOWED_QUESTION_TYPES = [
  'soalPilihanGanda',
  'soalKelompokan',
  'soalRumpang',
];

const sanitizeAssignmentContent = (content) => {
  // FILTER REMOVED AS REQUESTED BY USER
  // We now allow all content types to persist in the assignment editor
  // This prevents 'malformed' but valid questions from being deleted
  return content;
};

// Validasi: Deteksi dan buang soal kosong & komponen terlarang (AI kadang menghasilkan tag kosong/terlarang)
const validateAndFilterEmptyQuestions = (content: any) => {
  if (!content || !content.content) return content;

  const validContent = content.content.filter((node: any) => {
    // FORBIDDEN: Percakapan tidak boleh di halaman penugasan
    if (node.type === 'percakapan') {
      console.warn(
        '[VALIDATION] Removing percakapan from assignment (FORBIDDEN)',
      );
      return false;
    }

    // FORBIDDEN: Soal Isian tidak boleh di halaman penugasan
    if (node.type === 'soalIsian') {
      console.warn(
        '[VALIDATION] Removing soalIsian from assignment (FORBIDDEN)',
      );
      return false;
    }

    // SoalPilihanGanda: Validasi dilonggarkan (User Request)
    if (node.type === 'soalPilihanGanda') {
      // Pass through without empty check
    }

    // SoalKelompokan: Validasi dilonggarkan (User Request)
    if (node.type === 'soalKelompokan') {
      // Pass through without empty check
    }

    // SoalRumpang: Validasi dilonggarkan (User Request)
    if (node.type === 'soalRumpang') {
      // Pass through without empty check
    }

    return true;
  });

  if (validContent.length === 0) {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }

  return { type: 'doc', content: validContent };
};



const formattedTime = computed(() => {
  const minutes = Math.floor(testDuration.value / 60);
  const seconds = testDuration.value % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDuration = (startStr: string, endStr: string) => {
  if (!startStr || !endStr) return '-';
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return '00:00';
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const fetchAssignmentHistory = async () => {
  if (!localMateri.value || !localMateri.value.id || !props.moduleId) return;

  const authStore = useAuthStore();

  // [GUEST MODE] Jika user belum login, cari dari syncQueue lokal
  if (!authStore.isLoggedIn) {
    const localProgress = getLocalProgress(localMateri.value.id);
    lastAttempt.value = localProgress;
    return;
  }

  // [LOGGED IN] Jika user sudah login, fetch dari API
  try {
    const res = await api.get(`/learn/progres/`);
    if (res.data && Array.isArray(res.data)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const found = res.data.find((p: any) => p.materi_id === localMateri.value?.id);
      lastAttempt.value = found || null;
    }
  } catch (e) {
    console.error('Gagal memuat riwayat tugas:', e);
    // Fallback ke lokal jika API gagal
    const localProgress = getLocalProgress(localMateri.value.id);
    lastAttempt.value = localProgress;
  }
};

// [HELPER] Ambil progress dari syncQueue lokal untuk guest
const getLocalProgress = (materiId: number | string) => {
  const authStore = useAuthStore();

  // Cari di syncQueue berdasarkan materiId
  for (const item of authStore.syncQueue) {
    if (item.type === 'lesson_completion') {
      const payload = authStore.deobfuscate(item.data);
      if (payload?.body?.materi_id === materiId) {
        return {
          ...payload.body.payload,
          materi_id: materiId,
          last_completed: payload.body.payload.finished_at,
        };
      }
    }
  }
  return null;
};

watch(
  () => [currentPageIndex.value, isReadOnly.value, props.materi] as const,
  ([newIndex, newReadOnly, newMateri]) => {
    if (isTesting.value) return;
    if (newReadOnly && newIndex === assignmentPageIndex.value && newMateri) {
      fetchAssignmentHistory();
    }
  },
);

onMounted(async () => {
  if (!isReadOnly.value) {
    // [ADMIN] Ensure we have all languages including inactive ones
    await languageStore.fetchAdminLanguages();
  }

  if (isReadOnly.value && localMateri.value?.id) {
    fetchAssignmentHistory();
  }
});

const examContext = reactive({ mode: 'admin', feedbackType: 'immediate' });
provide('examContext', examContext);

watch(
  isReadOnly,
  (newVal) => {
    if (newVal) {
      if (!isTesting.value) {
        examContext.mode = 'public';
        examContext.feedbackType = 'deferred';
      }
    } else {
      examContext.mode = 'admin';
      examContext.feedbackType = 'immediate';
      isTesting.value = false;
      if (timerInterval.value) {
        clearInterval(timerInterval.value);
        timerInterval.value = null;
      }
    }
  },
  { immediate: true },
);



const registerQuestion = (id: string, methods: any) => {
  if (id && methods) questionRegistry.value.set(id, methods);
};
const unregisterQuestion = (id: string) => {
  if (id) questionRegistry.value.delete(id);
};
provide('questionRegistry', {
  register: registerQuestion,
  unregister: unregisterQuestion,
});

const CustomImage = Image.extend({
  addAttributes() {
    return { ...this.parent?.(), width: { default: 400 } };
  },
  draggable: true,
  addNodeView() {
    return VueNodeViewRenderer(ResizableImage);
  },
});

const myExtensions = [
  Document,
  Paragraph,
  Text,
  Bold,
  Italic,
  ListItem,
  BulletList,
  OrderedList,
  Heading.configure({ levels: [1, 2, 3, 4] }),
  TextAlign.configure({
    types: ['heading', 'paragraph', 'image'],
    alignments: ['left', 'center', 'right', 'justify'],
  }),
  CustomImage,
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  History,
  Dropcursor,
  Gapcursor,
  Strike,
  Underline,
  SoalPilihanGandaNode,
  SoalIsianNode,
  SoalKelompokanNode,
  PercakapanNode,
  SoalRumpangNode,
  DiagramNode,
  RumusKalimatNode,
  NoteBoxNode,
];

// Main Editors
const editor = useEditor({
  extensions: myExtensions,
  content: '',
  editable: !isReadOnly.value,
  editorProps: {
    attributes: {
      class: 'prose dark:prose-invert max-w-none focus:outline-none',
    },
  },
  onUpdate: ({ editor }) => {
    if (
      !isDeleting.value &&
      currentPageIndex.value > 0 &&
      currentPageIndex.value !== assignmentPageIndex.value &&
      localMateri.value
    ) {
      const dataIndex = currentPageIndex.value - 1;
      if (!localMateri.value.contents[dataIndex])
        localMateri.value.contents[dataIndex] = '';
      localMateri.value.contents[dataIndex] = editor.getHTML();
    }
  },
});

const assignmentEditor = useEditor({
  extensions: myExtensions,
  content: '',
  editable: !isReadOnly.value,
  editorProps: {
    attributes: {
      class: 'prose dark:prose-invert max-w-none focus:outline-none',
    },
  },
  onUpdate: ({ editor }) => {
    if (
      currentPageIndex.value === assignmentPageIndex.value &&
      localMateri.value?.assignment
    ) {
      // Sanitize: hanya simpan komponen soal di halaman penugasan
      localMateri.value.assignment.contents = sanitizeAssignmentContent(
        editor.getHTML(),
      );
    }
  },
});

watch(isReadOnly, (val) => {
  editor.value?.setEditable(!val);
  assignmentEditor.value?.setEditable(!val);
});

const editorToUse = computed<Editor | undefined>(() => {
  return currentPageIndex.value === assignmentPageIndex.value
    ? assignmentEditor.value
    : editor.value;
});

const closeGenericModal = () => {
  showGenericModal.value = false;
  modalConfig.value = {};
  modalInputs.value = {};
};
const handleModalConfirm = () => {
  if (modalConfig.value.onConfirm)
    modalConfig.value.onConfirm(modalInputs.value);
  closeGenericModal();
};

const handleFileChange = (event: Event, key: string) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    modalInputs.value[key] = target.files[0];
  }
};

const openJsonModal = () => {
  showJsonModal.value = true;
};

const togglePreviewMode = () => {
  emit('toggle-preview');
};

const handleSourceSave = ({ type, data }: { type: string; data: any }) => {
  if (!localMateri.value) return;

  if (type === 'full') {
    localMateri.value = data;
    goToPage(0);
  } else if (type === 'assignment') {
    localMateri.value.assignment.contents = data;
    if (currentPageIndex.value === assignmentPageIndex.value)
      assignmentEditor.value?.commands.setContent(data, { emitUpdate: true });
  } else if (type === 'metadata') {
    localMateri.value.title = data.title || localMateri.value.title;
    localMateri.value.description =
      data.description || localMateri.value.description;
    localMateri.value.learning_objectives =
      data.learning_objectives || localMateri.value.learning_objectives;
  } else if (type === 'content') {
    const dataIndex = currentPageIndex.value - 1;
    if (dataIndex >= 0) {
      localMateri.value.contents[dataIndex] = data;
      if (
        currentPageIndex.value > 0 &&
        currentPageIndex.value !== assignmentPageIndex.value
      )
        editor.value?.commands.setContent(data, { emitUpdate: true });
    }
  }
  isDirty.value = true;
  showJsonModal.value = false;
};

const getLocalizedText = (obj, field, lang) => {
  if (!obj) return '';
  if (obj[field] && typeof obj[field] === 'object') {
    return obj[field][lang] || '';
  }
  if (
    obj.translations &&
    obj.translations[lang] &&
    obj.translations[lang][field]
  ) {
    return obj.translations[lang][field];
  }
  return '';
};

const ensureTranslation = (
  obj,
  source,
  target,
  fields = ['title', 'description', 'learning_objectives'],
) => {
  fields.forEach((field) => {
    if (!obj[field]) obj[field] = {};
    if (obj[field][target] === undefined) obj[field][target] = '';
    if (obj[field][source] === undefined) obj[field][source] = '';
  });
};

watch(
  () => props.materi,
  (newMateri, oldMateri) => {
    if (isTesting.value) return;

    // Detect if this is a genuine material switch (different ID)
    const isDifferentMaterial = newMateri && oldMateri && newMateri.id !== oldMateri.id;
    if (isDifferentMaterial) {
      isSwitchingMaterial.value = true;
    }

    if (
      localMateri.value &&
      newMateri &&
      newMateri.id === localMateri.value.id &&
      isReadOnly.value
    ) {
      fetchAssignmentHistory();
      return;
    }

    // IMPORTANT: Skip re-initialization if only `is_active` changed on the same material
    // This prevents the editor from being reset when toggling material visibility
    if (
      localMateri.value &&
      newMateri &&
      oldMateri &&
      newMateri.id === localMateri.value.id &&
      newMateri.id === oldMateri.id
    ) {
      // Check if only is_active changed
      const newWithoutActive = { ...newMateri, is_active: undefined };
      const oldWithoutActive = { ...oldMateri, is_active: undefined };
      if (
        JSON.stringify(newWithoutActive) === JSON.stringify(oldWithoutActive)
      ) {
        console.log(
          '[ManajemenMateri] Skipping re-init: only is_active changed',
        );
        return;
      }
    }

    if (newMateri) {
      const clonedMateri = cloneDeep(newMateri);
      ensureTranslation(clonedMateri, sourceLang.value, targetLang.value);

      if (!clonedMateri.assignment) {
        clonedMateri.assignment = {
          title: {
            [targetLang.value]: 'Tugas Bab',
            [sourceLang.value]: 'Chapter Assignment',
          },
          description: {},
          contents: '<p></p>',
          max_score: 100,
        };
      }
      ensureTranslation(
        clonedMateri.assignment,
        sourceLang.value,
        targetLang.value,
        ['title', 'description'],
      );

      if (!Array.isArray(clonedMateri.contents)) clonedMateri.contents = [];
      clonedMateri.showTargetDesc = true;
      clonedMateri.showSourceDesc = true;

      // [FIX] Selalu reset ke halaman depan saat berpindah materi
      currentPageIndex.value = 0;

      localMateri.value = clonedMateri;
      originalMateri.value = cloneDeep(clonedMateri);
      isDirty.value = false;

      if (isDifferentMaterial) {
        nextTick(() => {
          isSwitchingMaterial.value = false;
        });
      }

      if (currentPageIndex.value === assignmentPageIndex.value) {
        const content = localMateri.value.assignment.contents || '<p></p>';
        assignmentEditor.value?.commands.setContent(content, { emitUpdate: false });
      } else if (currentPageIndex.value > 0) {
        const dataIndex = currentPageIndex.value - 1;
        const content = localMateri.value.contents[dataIndex] || '<p></p>';
        editor.value?.commands.setContent(content, { emitUpdate: false });
      }

      // nextTick(() => { document.querySelectorAll('textarea').forEach(el => autoResize({ target: el })); });
    }
  },
  { immediate: true, deep: true },
);

watch(
  localMateri,
  (newValue) => {
    if (originalMateri.value && !isReadOnly.value) {
      const cleanNew = JSON.parse(
        JSON.stringify(newValue, (k, v) =>
          k === 'showTargetDesc' || k === 'showSourceDesc' ? undefined : v,
        ),
      );
      const cleanOld = JSON.parse(
        JSON.stringify(originalMateri.value, (k, v) =>
          k === 'showTargetDesc' || k === 'showSourceDesc' ? undefined : v,
        ),
      );
      isDirty.value = JSON.stringify(cleanNew) !== JSON.stringify(cleanOld);
    }
  },
  { deep: true },
);

const transitionName = ref('slide-next');

watch(currentPageIndex, (newIndex, oldIndex) => {
  // Set transition direction
  if (newIndex > oldIndex) {
    transitionName.value = 'slide-next';
  } else {
    transitionName.value = 'slide-prev';
  }

  if (isDeleting.value || isSwitchingMaterial.value) return;

  // Save current page content before switching (immediately, before leave transition)
  if (!isReadOnly.value) {
    if (
      oldIndex > 0 &&
      oldIndex !== assignmentPageIndex.value &&
      editor.value
    ) {
      // [REF_HTML] Save as HTML
      localMateri.value.contents[oldIndex - 1] = editor.value.getHTML();
    } else if (
      oldIndex === assignmentPageIndex.value &&
      assignmentEditor.value
    ) {
      localMateri.value.assignment.contents = sanitizeAssignmentContent(
        assignmentEditor.value.getHTML(),
      );
    }
  }
});

// Called by Transition @before-enter hook - update content right before new element enters
const onBeforeEnter = () => {
  const newIndex = currentPageIndex.value;

  if (newIndex > 0 && newIndex !== assignmentPageIndex.value) {
    const content = localMateri.value.contents[newIndex - 1] || '<p></p>';
    editor.value?.commands.setContent(content, { emitUpdate: false });
    assignmentEditor.value?.commands.setContent(
      '<p></p>',
      { emitUpdate: false },
    );
  } else if (newIndex === assignmentPageIndex.value) {
    const sanitizedContent = sanitizeAssignmentContent(
      localMateri.value.assignment.contents,
    ) || '<p></p>';
    assignmentEditor.value?.commands.setContent(sanitizedContent, { emitUpdate: false });
    editor.value?.commands.setContent(
      '<p></p>',
      { emitUpdate: false },
    );
  } else {
    editor.value?.commands.setContent(
      '<p></p>',
      { emitUpdate: false },
    );
    assignmentEditor.value?.commands.setContent(
      '<p></p>',
      { emitUpdate: false },
    );
  }
};

const goToPage = (index) => {
  currentPageIndex.value = index;
};

const goToPrevPage = () => {
  if (currentPageIndex.value > 0) {
    currentPageIndex.value--;
  }
};

const goToNextPage = () => {
  if (currentPageIndex.value < assignmentPageIndex.value) {
    currentPageIndex.value++;
  }
};

// Scroll to center the active page button in the footer
function scrollToActivePage(pageIndex) {
  nextTick(() => {
    const container = pageScrollContainer.value;
    if (!container) return;
    const activeBtn = container.querySelector(
      `button[data-page="${pageIndex}"]`,
    );
    if (!activeBtn) return;
    const containerRect = container.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    const scrollOffset =
      btnRect.left -
      containerRect.left -
      containerRect.width / 2 +
      btnRect.width / 2;
    container.scrollBy({ left: scrollOffset, behavior: 'smooth' });
  });
}

// Watch currentPageIndex to scroll active page to center
watch(currentPageIndex, (newIndex) => {
  setTimeout(() => {
    scrollToActivePage(newIndex);
  }, 50);
});

const tambahHalaman = async () => {
  if (isReadOnly.value) return;
  localMateri.value.contents.push('<p></p>');
  currentPageIndex.value = localMateri.value.contents.length;
  await nextTick();
  editor.value.chain().focus('end').run();
};

const hapusHalaman = async (uiIndex) => {
  if (isReadOnly.value || uiIndex <= 0 || uiIndex === assignmentPageIndex.value)
    return;
  isDeleting.value = true;
  try {
    const dataIndex = uiIndex - 1;
    localMateri.value.contents.splice(dataIndex, 1);
    const maxPage = localMateri.value.contents.length;
    const newUiIndex = uiIndex > maxPage ? maxPage : uiIndex;
    currentPageIndex.value = maxPage === 0 ? 0 : newUiIndex;
    await nextTick();
    if (
      currentPageIndex.value > 0 &&
      currentPageIndex.value !== assignmentPageIndex.value
    ) {
      const content = localMateri.value.contents[
        currentPageIndex.value - 1
      ] || '<p></p>';
      editor.value?.commands.setContent(content, { emitUpdate: false });
    }
  } finally {
    await nextTick();
    isDeleting.value = false;
  }
};

const addImage = () => {
  if (isReadOnly.value) return;
  const currentEditor = editorToUse.value;
  if (!currentEditor) return;
  modalInputs.value = { url: '', file: null };
  modalConfig.value = {
    title: 'Tambahkan Gambar',
    inputs: [
      {
        key: 'file',
        label: 'Unggah dari Komputer',
        type: 'file',
        accept: 'image/*',
      },
      {
        key: 'url',
        label: 'Atau dari URL',
        type: 'text',
        placeholder: 'https://example.com/image.png',
      },
    ],
    onConfirm: (data) => {
      if (data.file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target?.result as string;
          if (currentEditor && src)
            (currentEditor.chain().focus() as any).setImage({ src }).run();
        };
        reader.readAsDataURL(data.file);
      } else if (data.url) {
        if (currentEditor)
          currentEditor.chain().focus().setImage({ src: data.url }).run();
      }
    },
  };
  showGenericModal.value = true;
};

const insertTable = () => {
  if (isReadOnly.value) return;
  const currentEditor = editorToUse.value;
  if (!currentEditor) return;
  modalInputs.value = { rows: 3, cols: 3, withHeader: true };
  modalConfig.value = {
    title: 'Sisipkan Tabel',
    inputs: [
      { key: 'rows', label: 'Jumlah Baris', type: 'number' },
      { key: 'cols', label: 'Jumlah Kolom', type: 'number' },
      { key: 'withHeader', label: 'Sertakan baris header', type: 'checkbox' },
    ],
    onConfirm: (data) => {
      const { rows, cols, withHeader } = data;
      if (rows > 0 && cols > 0 && currentEditor)
        (currentEditor
          .chain()
          .focus() as any)
          .insertTable({ rows, cols, withHeaderRow: withHeader })
          .run();
    },
  };
  showGenericModal.value = true;
};

const addSoalPilihanGanda = () =>
  !isReadOnly.value &&
  (editorToUse.value?.chain().focus() as any)
    .insertSoalPilihanGanda()
    .createParagraphNear()
    .run();
const addSoalIsian = () =>
  !isReadOnly.value &&
  (editorToUse.value?.chain().focus() as any)
    .insertSoalIsian()
    .createParagraphNear()
    .run();
const addSoalKelompokan = () =>
  !isReadOnly.value &&
  (editorToUse.value?.chain().focus() as any)
    .insertSoalKelompokan()
    .createParagraphNear()
    .run();
const addPercakapan = () =>
  !isReadOnly.value &&
  (editorToUse.value?.chain().focus() as any)
    .insertPercakapan()
    .createParagraphNear()
    .run();
const addSoalRumpang = () =>
  !isReadOnly.value &&
  (editorToUse.value?.chain().focus() as any)
    .insertSoalRumpang()
    .createParagraphNear()
    .run();

const insertDiagram = () => {
  if (isReadOnly.value) return;
  const currentEditor = editorToUse.value;
  if (!currentEditor) return;

  // Default sample diagram
  const defaultCode = `graph TD
  A[Start] --> B{Is it working?}
  B -- Yes --> C[Great!]
  B -- No --> D[Debug]`;

  (currentEditor.chain().focus() as any).insertDiagram({ code: defaultCode }).run();
};

const addRumusKalimat = () =>
  !isReadOnly.value &&
  (editorToUse.value?.chain().focus() as any)
    .insertRumusKalimat()
    .createParagraphNear()
    .run();
const addNoteBox = () =>
  !isReadOnly.value &&
  (editorToUse.value?.chain().focus() as any)
    .insertNoteBox()
    .run();

const simpanMateri = () => {
  if (isReadOnly.value || !isDirty.value) return;

  if (
    currentPageIndex.value === assignmentPageIndex.value &&
    assignmentEditor.value
  ) {
    localMateri.value.assignment.contents = assignmentEditor.value.getHTML();
  } else if (currentPageIndex.value > 0 && editor.value) {
    localMateri.value.contents[currentPageIndex.value - 1] =
      editor.value.getHTML();
  }

  const materiToSave = cloneDeep(localMateri.value);
  delete materiToSave.showTargetDesc;
  delete materiToSave.showSourceDesc;
  emit('request-global-save', materiToSave);
};

const handleBack = () => {
  if (!isReadOnly.value) {
    if (
      currentPageIndex.value === assignmentPageIndex.value &&
      assignmentEditor.value
    )
      localMateri.value.assignment.contents = assignmentEditor.value.getHTML();
    else if (currentPageIndex.value > 0 && editor.value)
      localMateri.value.contents[currentPageIndex.value - 1] =
        editor.value.getHTML();

    const materiToEmit = cloneDeep(localMateri.value);
    delete materiToEmit.showTargetDesc;
    delete materiToEmit.showSourceDesc;
    emit('update:materi', materiToEmit);
  }
  emit('back');
};

const handleEditorWrapperClick = (event) => {
  if (isReadOnly.value) return;
  const currentEditor = editorToUse.value;
  if (currentEditor) {
    if (event.target.closest('.ProseMirror')) return;
    const editorElement = event.currentTarget.querySelector('.ProseMirror');
    if (!editorElement) return;
    const editorRect = editorElement.getBoundingClientRect();
    if (event.clientY < editorRect.top)
      currentEditor.chain().focus('start').run();
    else if (event.clientY > editorRect.bottom)
      currentEditor.chain().focus('end').run();
  }
};

// Setup Intersection Observer untuk detect bottom buttons visibility
// [OPTIMASI] Gunakan useIntersectionObserver
const { stop: stopBottomObserver } = useIntersectionObserver(
  bottomButtonsRef,
  ([{ isIntersecting }]) => {
    // Hanya update jika sedang testing
    if (isTesting.value) {
      bottomButtonsVisible.value = isIntersecting;
    }
  },
  { threshold: 0.3 },
);

// Watch isTesting untuk reset visibility saat testing selesai
watch(isTesting, (testing) => {
  if (!testing) {
    bottomButtonsVisible.value = false;
  }
});

// Fungsi setup/cleanup lama dihapus/dikosongkan karena useIntersectionObserver sudah reaktif
const setupBottomObserver = () => { };
const cleanupBottomObserver = () => {
  bottomButtonsVisible.value = false;
};

const toggleDescTarget = () => {
  if (localMateri.value.showTargetDesc && !localMateri.value.showSourceDesc)
    return;
  localMateri.value.showTargetDesc = !localMateri.value.showTargetDesc;
  // nextTick(() => { document.querySelectorAll('textarea').forEach(el => autoResize({ target: el })); });
};

const toggleDescSource = () => {
  if (localMateri.value.showSourceDesc && !localMateri.value.showTargetDesc)
    return;
  localMateri.value.showSourceDesc = !localMateri.value.showSourceDesc;
  // nextTick(() => { document.querySelectorAll('textarea').forEach(el => autoResize({ target: el })); });
};

// [UPDATED] 4-Step AI Wizard (with Assignment Generation)
const openAiWizard = () => {
  // Show warning modal instead of browser confirm
  showAiConfirmModal.value = true;
};

// Actual AI wizard execution
const runAiWizard = async () => {
  aiState.isProcessing = true;
  aiState.progress = 0;

  // [CLEANUP] Reset State Before Generation
  // Sesuai permintaan: Bersihkan konten materi & assignment sebelum generate
  localMateri.value.contents = [];
  if (localMateri.value.assignment) {
    localMateri.value.assignment.contents = '<p></p>';
  }
  // Optional: Clear metadata to ensure fresh generation
  if (localMateri.value.description) {
    Object.keys(localMateri.value.description).forEach(k => localMateri.value.description[k] = '');
  }
  if (localMateri.value.learning_objectives) {
    Object.keys(localMateri.value.learning_objectives).forEach(k => localMateri.value.learning_objectives[k] = '');
  }

  // Reset page view to 0
  currentPageIndex.value = 0;

  try {
    const ctxBase = {
      mod_t_src: props.aiContext.mod_title_src,
      mod_t_tgt: props.aiContext.mod_title_tgt,
      chap_t_src: props.aiContext.chap_title_src,
      chap_t_tgt: props.aiContext.chap_title_tgt,
      mat_t_src: localMateri.value.title[sourceLang.value] || 'Untitled',
      mat_t_tgt: localMateri.value.title[targetLang.value] || 'Untitled',
      src: languageStore.selectedAsal?.nama || 'Indonesia',
      tgt: languageStore.selectedTarget?.nama || 'Asing',
      src_code: sourceLang.value,
      tgt_code: targetLang.value,
      docs: '',
    };

    // --- TAHAP 1: PLANNING (Target Lang) ---
    aiState.statusTitle = 'Tahap 1/4: Perencanaan';
    aiState.statusMsg = 'Membuat deskripsi & tujuan (Bahasa Target)...';
    aiState.step = 'Phase 1: Planning';
    aiState.processingFrontPage = true; // Animate front page button

    const planPayload = {
      ai_action: 'plan_lesson',
      ctx: ctxBase,
      // num_objectives dihapus - biarkan AI menentukan sendiri berdasarkan kompleksitas topik
      // Konteks posisi materi dalam modul (untuk menghindari redundansi)
      prev_materials: props.aiContext.prev_materials || [],
      next_materials: props.aiContext.next_materials || [],
    };

    const planRes = await api.patch(
      `/admin/${sourceLang.value}-${targetLang.value}/learn/lesson/${props.moduleId}/`,
      planPayload,
    );

    const planData = parseAiMetadata(planRes.data.content);

    if (!planData) throw new Error('Gagal merencanakan materi (Format tidak valid)');

    // Simpan Metadata Target (Source masih kosong atau lama)
    if (planData.description) {
      if (!localMateri.value.description) localMateri.value.description = {};
      localMateri.value.description[targetLang.value] = planData.description;
    }

    // Handle learning_objectives (bisa array atau string)
    if (planData.learning_objectives) {
      // PENTING: Pastikan objek learning_objectives sudah ada
      if (!localMateri.value.learning_objectives) {
        localMateri.value.learning_objectives = {};
      }

      if (Array.isArray(planData.learning_objectives)) {
        // Convert array to bullet point string
        localMateri.value.learning_objectives[targetLang.value] =
          planData.learning_objectives.map((obj) => `- ${obj}`).join('\n');
      } else {
        localMateri.value.learning_objectives[targetLang.value] =
          planData.learning_objectives;
      }

      console.log(
        '[AI] learning_objectives set:',
        localMateri.value.learning_objectives[targetLang.value],
      );
    }

    const pagesPlan = planData.pages_plan || [];
    localMateri.value.contents = []; // Reset konten lama

    aiState.progress = 15;

    // --- TAHAP 2: GENERATING PAGES (PARALLEL) ---
    const totalPages = pagesPlan.length;

    aiState.statusTitle = `Tahap 2/4: Menulis & Validasi ${totalPages} Halaman`;
    aiState.statusMsg = `Memproses halaman secara paralel (dengan validasi kualitas)...`;
    aiState.step = `Generating & Validating Pages...`;
    aiState.processingFrontPage = false; // Phase 1 done

    // Initialize contents array with placeholders
    localMateri.value.contents = pagesPlan.map((_, i) =>
      `<p>Generating page ${i + 1}...</p>`
    );

    // PRE-COMPUTE semua LessonMemory terlebih dahulu (SAMA PERSIS seperti sequential)
    // Ini memastikan setiap halaman mendapat memory yang identik dengan versi sequential
    const precomputedMemories = [];
    let runningMemory = {
      covered_concepts: [],
      introduced_vocab: [],
      grammar_rules: [],
    };

    for (let i = 0; i < totalPages; i++) {
      // Simpan snapshot memory saat ini untuk halaman i
      precomputedMemories.push(
        i > 0 ? JSON.parse(JSON.stringify(runningMemory)) : null,
      );

      // Update memory dengan konten halaman ini (SAMA seperti di sequential)
      const pagePlan = pagesPlan[i];
      runningMemory.covered_concepts.push(pagePlan.topic);
      if (pagePlan.seed_content) {
        runningMemory.covered_concepts.push(
          ...pagePlan.seed_content.slice(0, 2),
        );
      }
    }

    // Generate single page function with validation
    const generatePage = async (pagePlan, i) => {
      // Mark this page as being processed (for footer animation)
      aiState.processingPages.add(i);

      // Extract titles for context
      const prevTitles = pagesPlan.slice(0, i).map((p) => p.header || p.topic);
      const nextTitles = pagesPlan.slice(i + 1).map((p) => p.header || p.topic);

      const pagePayload = {
        ai_action: 'generate_page',
        ctx: { ...ctxBase, docs: tiptapDocs },
        topic: pagePlan.topic,
        objective: pagePlan.objective,
        page_index: i,
        total_pages: totalPages,
        // Seeds untuk konten sinergis antar halaman
        header: pagePlan.header || null,
        seed_content: pagePlan.seed_content || null,
        connection: pagePlan.connection || null,
        // Exclusions - hal yang TIDAK BOLEH ada di halaman ini
        exclusions: pagePlan.exclusions || null,
        // Memory dari halaman sebelumnya (pre-computed, IDENTIK dengan sequential)
        lesson_memory: precomputedMemories[i],
        // Context: titles of other materials in the module
        prev_titles: prevTitles.length > 0 ? prevTitles : null,
        next_titles: nextTitles.length > 0 ? nextTitles : null,
      };

      try {
        // --- STAGE 1: GENERATE & SHOW ---
        const pageRes = await api.patch(
          `/admin/${sourceLang.value}-${targetLang.value}/learn/lesson/${props.moduleId}/`,
          pagePayload,
        );

        const initialHtml = pageRes.data.content;
        let pageContent = parseAiContent(initialHtml, myExtensions);

        // Update local state IMMEDIATELY (Display #1)
        localMateri.value.contents[i] = pageContent;

        // If user is viewing this page, update the editor in real-time
        if (currentPageIndex.value === i + 1 && editor.value) {
          editor.value.commands.setContent(pageContent, { emitUpdate: false });
          console.log(`[AI PAGE ${i + 1}] Initial content displayed`);
        }

        // --- STAGE 2: VALIDATE & REFINEMENT (Background-ish) ---
        // We do this within the parallel promise to ensure the wizard waits for full completion
        // but it doesn't block the UI from showing Stage 1.
        try {
          const validateRes = await api.patch(
            `/admin/${sourceLang.value}-${targetLang.value}/learn/lesson/${props.moduleId}/`,
            {
              ai_action: 'validate_page',
              ctx: ctxBase,
              page_topic: pagePlan.topic,
              page_objective: pagePlan.objective,
              page_content: initialHtml,
            },
          );

          const valData = parseAiMetadata(validateRes.data.content);

          if (!valData) {
            console.warn(`[AI PAGE ${i + 1}] Validation returned no data`);
            return;
          }

          if (valData.needs_revision && valData.severity !== 'minor') {
            console.log(
              `[AI PAGE ${i + 1}] 🛠 Refining based on feedback:`,
              valData.issues,
            );

            const regenRes = await api.patch(
              `/admin/${sourceLang.value}-${targetLang.value}/learn/lesson/${props.moduleId}/`,
              {
                ai_action: 'regen_page',
                ctx: pagePayload,
                original_content: initialHtml,
                validation_feedback: JSON.stringify(valData.issues || valData.comments || []),
              },
            );

            // Update local state AGAIN (Display #2)
            pageContent = parseAiContent(regenRes.data.content, myExtensions);
            localMateri.value.contents[i] = pageContent;

            if (currentPageIndex.value === i + 1 && editor.value) {
              editor.value.commands.setContent(pageContent, { emitUpdate: false });
              console.log(`[AI PAGE ${i + 1}] Refined content displayed`);
            }
          }
        } catch (valErr) {
          console.warn(`[AI PAGE ${i + 1}] Validation/Regen failed:`, valErr);
        }

        // Remove from processing set (Final completion)
        aiState.processingPages.delete(i);

        return { index: i, content: pageContent, success: true };
      } catch (err: any) {
        console.error(`[AI PAGE ${i + 1}] ❌ Error:`, err);
        aiState.processingPages.delete(i);
        return {
          index: i,
          content: '',
          success: false,
        };
      }
    };

    // Execute ALL pages in parallel
    console.log('[AI PARALLEL] Starting parallel generation...');
    const startTime = Date.now();

    const pagePromises = pagesPlan.map((plan, i) => generatePage(plan, i));
    const results = await Promise.all(pagePromises);

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

    results.forEach((result) => {
      if (result && result.success) {
        localMateri.value.contents[result.index] = result.content;
      }
    });

    const successCount = results.filter((r) => r && r.success).length;
    aiState.statusMsg = `${successCount}/${totalPages} generated (${elapsedSeconds}s)`;
    aiState.progress = 60;

    // --- TAHAP 3: GENERATE ASSIGNMENT ---
    aiState.statusTitle = 'Tahap 3/4: Membuat & Validasi Soal';
    aiState.statusMsg = 'Generating Assignment...';
    aiState.step = 'Phase 3: Generating Assignment';
    aiState.progress = 65;
    aiState.processingAssignment = true;

    const materiSummary = pagesPlan
      .map((p, idx) => `Page ${idx + 1}: ${p.topic}\nObjective: ${p.objective}`)
      .join('\n\n');

    let assignContent: any = { type: 'doc', content: [] };

    try {
      const payload = {
        ai_action: 'generate_assignment',
        ctx: { ...ctxBase, docs: tiptapDocs },
        material_summary: materiSummary,
        question_config: { soalPilihanGanda: 10, soalRumpang: 10 },
      };

      const res = await api.patch(
        `/admin/${sourceLang.value}-${targetLang.value}/learn/lesson/${props.moduleId}/`,
        payload,
      );

      const initialHtml = res.data.content;
      console.log('[AI ASSIGNMENT] Raw initialHtml:', initialHtml);

      // Convert HTML string to JSON for validation/filtering
      let assignJson = generateJSON(initialHtml || '<p></p>', myExtensions);
      assignJson = validateAndFilterEmptyQuestions(assignJson);

      // Convert back to HTML for storage
      const assignHtml = generateHTML(assignJson, myExtensions);
      assignContent = assignJson; // Keep JSON for counting valid nodes below

      // Display #1 Immediately (Use HTML)
      localMateri.value.assignment.contents = assignHtml;
      assignmentEditor.value?.commands.setContent(assignHtml, {
        emitUpdate: true,
      });

      // BACKGROUND VALIDATION & REFINEMENT
      // We don't 'await' this so Phase 4 (Translation) can start concurrently
      api
        .patch(
          `/admin/${sourceLang.value}-${targetLang.value}/learn/lesson/${props.moduleId}/`,
          {
            ai_action: 'validate_assignment',
            ctx: ctxBase,
            assignment_content: initialHtml,
            material_summary: materiSummary,
          },
        )
        .then(async (valRes) => {
          const valData = parseAiMetadata(valRes.data.content);

          if (!valData) {
            console.warn('[AI ASSIGNMENT] Validation returned no data');
            return;
          }

          if (valData.needs_revision && valData.severity !== 'minor') {
            console.log('[AI ASSIGNMENT] 🛠 Refining assignment...');
            const regenRes = await api.patch(
              `/admin/${sourceLang.value}-${targetLang.value}/learn/lesson/${props.moduleId}/`,
              {
                ai_action: 'regen_assignment',
                ctx: payload,
                original_prompt: payload.material_summary,
                original_content: initialHtml,
                validation_feedback: JSON.stringify(valData.issues || valData.comments || []),
              },
            );

            // Display #2 (Refined)
            const refinedHtml = parseAiContent(regenRes.data.content, myExtensions); // Returns HTML string
            let refinedJson = generateJSON(refinedHtml, myExtensions);
            refinedJson = validateAndFilterEmptyQuestions(refinedJson);
            const finalRefinedHtml = generateHTML(refinedJson, myExtensions);
            assignContent = refinedJson; // Update for valid count check

            localMateri.value.assignment.contents = finalRefinedHtml;
            assignmentEditor.value?.commands.setContent(finalRefinedHtml, {
              emitUpdate: true,
            });
            console.log('[AI ASSIGNMENT] ✅ Refinement complete');
          }
          aiState.processingAssignment = false;
        })
        .catch((err) => {
          console.warn('[AI ASSIGNMENT] Background refinement skipped:', err);
          aiState.processingAssignment = false;
        });

      const validQuestionCount = assignContent.content.filter((n: any) =>
        ['soalPilihanGanda', 'soalKelompokan', 'soalRumpang'].includes(n.type),
      ).length;

      console.log(
        `[AI ASSIGNMENT] ✅ Initial assignment displayed with ${validQuestionCount} valid question nodes`,
      );
    } catch (jsonErr) {
      console.error(`[AI ASSIGNMENT] Error:`, jsonErr);

      // Tampilkan pesan error di assignment editor
      const errorContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `[ERROR ASSIGNMENT]: Gagal generate soal. Cek Console untuk detail.`,
              },
            ],
          },
        ],
      };
      localMateri.value.assignment.contents = errorContent;
      assignmentEditor.value?.commands.setContent(errorContent, {
        emitUpdate: true,
      });
      aiState.processingAssignment = false;
    }

    aiState.progress = 80;

    // --- TAHAP 4: TRANSLATE PLAN (Source Lang) ---
    aiState.statusTitle = 'Tahap 4/4: Penerjemahan';
    aiState.statusMsg = 'Menerjemahkan metadata ke Bahasa Asal...';
    aiState.step = 'Phase 4: Translating Metadata';
    aiState.progress = 85;
    aiState.processingAssignment = false; // Phase 3 done
    aiState.processingFrontPage = true; // Translation updates front page

    const transPayload = {
      ai_action: 'translate_plan',
      ctx: ctxBase,
      description_tgt: localMateri.value.description[targetLang.value],
      objectives_tgt: localMateri.value.learning_objectives[targetLang.value],
    };

    const transRes = await api.patch(
      `/admin/${sourceLang.value}-${targetLang.value}/learn/lesson/${props.moduleId}/`,
      transPayload,
    );

    const transData = parseAiMetadata(transRes.data.content);

    if (!transData) throw new Error('Gagal menerjemahkan rencana materi');

    if (transData.description) {
      if (!localMateri.value.description) localMateri.value.description = {};
      localMateri.value.description[sourceLang.value] = transData.description;
    }

    // Handle learning_objectives translation (bisa array atau string)
    if (transData.learning_objectives) {
      // Pastikan objek sudah ada
      if (!localMateri.value.learning_objectives) {
        localMateri.value.learning_objectives = {};
      }

      if (Array.isArray(transData.learning_objectives)) {
        localMateri.value.learning_objectives[sourceLang.value] =
          transData.learning_objectives.map((obj) => `- ${obj}`).join('\n');
      } else {
        localMateri.value.learning_objectives[sourceLang.value] =
          transData.learning_objectives;
      }

      console.log(
        '[AI] learning_objectives (translated) set:',
        localMateri.value.learning_objectives[sourceLang.value],
      );
    }

    aiState.statusTitle = 'Selesai!';
    aiState.statusMsg = 'Materi dan soal berhasil dibuat.';
    aiState.progress = 100;

    // Clear all processing animations
    aiState.processingPages.clear();
    aiState.processingFrontPage = false;
    aiState.processingAssignment = false;

    isDirty.value = true;
    goToPage(0);

    useTimeoutFn(() => {
      aiState.isProcessing = false;
    }, 1000);
  } catch (e) {
    console.error('AI Wizard Error:', e);
    aiState.statusTitle = 'Gagal';
    aiState.statusMsg = 'Terjadi kesalahan saat memproses AI.';
    // Clear all animations on error
    aiState.processingPages.clear();
    aiState.processingFrontPage = false;
    aiState.processingAssignment = false;
    useTimeoutFn(() => {
      aiState.isProcessing = false;
    }, 2000);
  }
};

const startTest = () => {
  isTesting.value = true;
  isReviewing.value = false;
  testDuration.value = 0;
  finalScore.value = 0;
  startTime.value = new Date().toISOString();
  examContext.mode = 'public';
  examContext.feedbackType = 'deferred';
  currentPageIndex.value = assignmentPageIndex.value;
  let attempts = 0;
  const maxAttempts = 15;
  const initInterval = setInterval(() => {
    attempts++;
    if (questionRegistry.value.size > 0) {
      clearInterval(initInterval);
      questionRegistry.value.forEach((methods) => {
        if (typeof methods.reset === 'function') methods.reset();
        if (typeof methods.setMode === 'function')
          methods.setMode('public', 'deferred');
      });
    } else if (attempts >= maxAttempts) clearInterval(initInterval);
  }, 200);
  if (timerInterval.value) clearInterval(timerInterval.value);
  timerInterval.value = setInterval(() => {
    testDuration.value++;
    let answered = 0;
    let total = 0;
    questionRegistry.value.forEach((methods) => {
      // Logic Fix: Skip components explicitly marked as NOT a question (e.g. Percakapan)
      if (methods.isQuestion === false) return;

      total++;
      if (methods.checkStatus) {
        const status = methods.checkStatus();
        let isFilled = status.isAnswered;
        if (!isFilled) {
          const val = status.userAnswer;
          if (Array.isArray(val))
            isFilled = val.some((x) => x && String(x).trim() !== '');
          else if (typeof val === 'object' && val !== null)
            isFilled = Object.keys(val).length > 0;
          else
            isFilled =
              val !== null && val !== undefined && String(val).trim() !== '';
        }
        if (isFilled) answered++;
      }
    });
    answeredQuestions.value = answered;
    totalQuestions.value = total;
  }, 1000);
};

const getSafeISOString = (date = new Date()) =>
  date.toISOString().split('.')[0] + 'Z';

const finishTest = async () => {
  if (timerInterval.value) clearInterval(timerInterval.value);
  let totalUserScore = 0;
  let totalMaxScore = 0;
  let total = 0;
  let answered = 0;
  let correct = 0;
  let incorrect = 0;
  const answersPayload = {};
  questionRegistry.value.forEach((methods, id) => {
    // Logic Fix: Skip counting non-questions
    if (methods.isQuestion === false) return;

    total++;
    if (typeof methods.submit === 'function') {
      const result = methods.submit();
      if (result) {
        if (result.maxScore > 0) {
          totalUserScore += result.score || 0;
          totalMaxScore += result.maxScore;
          // Count correct vs incorrect
          if ((result.score || 0) >= result.maxScore) {
            correct++;
          } else {
            incorrect++;
          }
        }
        let isFilled = result.isAnswered;
        const val = result.userAnswer;
        if (!isFilled) {
          if (Array.isArray(val))
            isFilled = val.some((x) => x && String(x).trim() !== '');
          else if (typeof val === 'object' && val !== null)
            isFilled = Object.keys(val).length > 0;
          else
            isFilled =
              val !== null && val !== undefined && String(val).trim() !== '';
        }
        if (isFilled) answered++;
        answersPayload[id] = result.userAnswer;
      }
    }
  });
  totalQuestions.value = total;
  answeredQuestions.value = answered;
  correctAnswers.value = correct;
  incorrectAnswers.value = incorrect;
  finalScore.value =
    totalMaxScore > 0 ? Math.round((totalUserScore / totalMaxScore) * 100) : 0;
  maxPossibleScore.value = 100;
  const materiId = localMateri.value?.id;
  if (props.moduleId && materiId) {
    try {
      const url = `/${sourceLang.value}-${targetLang.value}/learn/lesson/${props.moduleId}/`;
      const start = startTime.value ? new Date(startTime.value) : new Date();
      const payload = {
        answers: answersPayload,
        score: finalScore.value,
        started_at: getSafeISOString(start),
        finished_at: getSafeISOString(),
      };
      const body = {
        activity_type: 'submit_assignment',
        materi_id: materiId,
        payload: payload,
      };

      const authStore = useAuthStore();
      // Cek koneksi & login
      if (!authStore.isLoggedIn || !navigator.onLine) {
        console.log('Offline/Guest mode detected. Saving to sync queue.');
        authStore.addToSyncQueue({ url, body });
        // Optimistic UI: pura-pura sukses
        lastAttempt.value = { ...payload, last_completed: payload.finished_at };
      } else {
        const response = await api.patch(url, body);
        if (response.data) lastAttempt.value = response.data;
      }
    } catch (err) {
      console.error('GAGAL mengirim hasil tugas (Mencoba Simpan Lokal):', err);
      // Jika gagal kirim (misal timeout atau 500), masukkan antrean juga
      const authStore = useAuthStore();
      const url = `/${sourceLang.value}-${targetLang.value}/learn/lesson/${props.moduleId}/`;
      const start = startTime.value ? new Date(startTime.value) : new Date();
      const payload = {
        answers: answersPayload,
        score: finalScore.value,
        started_at: getSafeISOString(start),
        finished_at: getSafeISOString(),
      };
      const body = {
        activity_type: 'submit_assignment',
        materi_id: materiId,
        payload: payload,
      };

      // Hindari duplikasi kode payload, tapi karena kita di blok catch, kita buat ulang body amannya.
      authStore.addToSyncQueue({ url, body });
      // Optimistic UI update
      lastAttempt.value = { ...payload, last_completed: payload.finished_at };
    }
  }
  showScoreModal.value = true;
  isReviewing.value = true;
};

const closeTest = () => {
  showScoreModal.value = false;
  isTesting.value = false;
  isReviewing.value = false;
  testDuration.value = 0;
  correctAnswers.value = 0;
  incorrectAnswers.value = 0;
  if (isReadOnly.value) {
    examContext.mode = 'public';
    examContext.feedbackType = 'deferred';
  } else {
    examContext.mode = 'admin';
    examContext.feedbackType = 'immediate';
  }
  questionRegistry.value.forEach((methods) => {
    if (typeof methods.reset === 'function') methods.reset();
    if (typeof methods.setMode === 'function')
      methods.setMode(examContext.mode);
  });

  // Refresh assignment history dan tetap di halaman penugasan
  fetchAssignmentHistory();
};

// Konfirmasi keluar tanpa menyimpan
const confirmExitWithoutSave = () => {
  showExitConfirmModal.value = false;
  // Hentikan timer
  if (timerInterval.value) clearInterval(timerInterval.value);
  // Reset state tanpa menyimpan
  isTesting.value = false;
  testDuration.value = 0;
  if (isReadOnly.value) {
    examContext.mode = 'public';
    examContext.feedbackType = 'deferred';
  } else {
    examContext.mode = 'admin';
    examContext.feedbackType = 'immediate';
  }
  questionRegistry.value.forEach((methods) => {
    if (typeof methods.reset === 'function') methods.reset();
    if (typeof methods.setMode === 'function')
      methods.setMode(examContext.mode);
  });
};

// Konfirmasi kirim jawaban
const confirmSubmitAnswers = async () => {
  showSubmitConfirmModal.value = false;
  await finishTest();
};

onUnmounted(() => {
  editor.value?.destroy();
  assignmentEditor.value?.destroy();
  if (timerInterval.value) clearInterval(timerInterval.value);
  cleanupBottomObserver();
});
</script>

<style lang="postcss">
@reference "tailwindcss";
/* Note: Slide transition CSS (.slide-next-*, .slide-prev-*) is defined in main.css */

.toolbar-button {
  @apply p-2 rounded-lg transition-colors text-[var(--color-on-surface-variant)];
}

.toolbar-button:not([disabled]):hover {
  @apply bg-[var(--color-surface-container-low)];
}

.toolbar-button.is-active {
  @apply text-[var(--color-primary)];
}

.toolbar-button[disabled] {
  @apply opacity-30 cursor-not-allowed;
}

.prose .ProseMirror {
  min-height: 9rem;
  outline: none;
  counter-reset: soal-counter;
}

.prose img {
  border: none !important;
  border-radius: 0.5rem;
  max-width: 100%;
}

.prose .image-wrapper {
  max-width: 100%;
}

.prose [style*="text-align: center"] .image-wrapper {
  margin-left: auto;
  margin-right: auto;
}

.prose [style*="text-align: right"] .image-wrapper {
  margin-left: auto;
}

.prose [style*="text-align: left"] .image-wrapper {
  margin-right: auto;
}

.editor-wrapper.is-focused {
  box-shadow: 0 0 0 2px var(--color-primary);
  outline: none;
}

.prose [data-type^="soal"] {
  counter-increment: soal-counter;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}

.prose [data-type^="soal"]::before {
  content: counter(soal-counter) ".";
  font-weight: bold;
  font-size: 1.125rem;
  color: var(--color-on-surface-variant);
  flex-shrink: 0;
  padding-top: 1.25rem;
}

.dark .prose [data-type^="soal"]::before {
  color: var(--color-outline);
}

.prose [data-type^="soal"]>div {
  flex-grow: 1;
}

.prose .tableWrapper {
  @apply my-6 w-full overflow-x-auto rounded-xl border border-[var(--color-outline-variant)];
  -webkit-overflow-scrolling: touch;
}

.prose table {
  @apply w-full border-collapse m-0;
  table-layout: fixed;
}

.prose th,
.prose td {
  @apply border-r border-b border-[var(--color-outline-variant)] px-4 py-3 align-top relative min-w-[120px] text-[var(--color-on-surface)];
}

.prose th {
  @apply font-bold text-left bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)];
}

.prose th:last-child,
.prose td:last-child {
  border-right: none;
}

.prose tr:last-child td {
  border-bottom: none;
}

.prose .selectedCell:after {
  @apply absolute inset-0 border-2 border-[var(--color-primary)] pointer-events-none content-[''] z-10 bg-[var(--color-primary)]/10;
}

.prose .column-resize-handle {
  @apply absolute right-[-2px] top-0 bottom-0 w-1 bg-[var(--color-outline)] cursor-col-resize z-20;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Fade slide untuk tombol header - smooth transition */
.fade-slide-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-15px) scale(0.95);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(15px) scale(0.95);
}

/* Fade slide up untuk tombol bottom */
.fade-slide-up-enter-active,
.fade-slide-up-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.mask-right {
  mask-image: linear-gradient(to right, var(--color-surface) 90%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, var(--color-surface) 90%, transparent 100%);
}

textarea {
  field-sizing: content;
}

.global-test-mode [data-type] .absolute.top-4.right-4 {
  display: none !important;
}

/* AI Processing Skeleton Shimmer Animation */
.ai-processing-gradient {
  position: relative;
  overflow: hidden;
  background: var(--color-surface-container-high);
}

.ai-processing-gradient::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg,
      transparent 0%,
      var(--color-primary-container) 50%,
      transparent 100%);
  animation: shimmer 1.5s infinite ease-in-out;
  border-radius: inherit;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }

  100% {
    left: 100%;
  }
}
</style>
