<template>
  <div class="w-full h-full flex flex-col">
    <!-- --- HEADER (Common for List & Editor) --- -->
    <header v-if="!isPublicView" class="relative flex-shrink-0 flex items-center justify-between mb-6 min-h-[40px]">
      <div class="z-10 bg-[var(--color-surface)] rounded-full">
        <button v-if="currentArticle || isCreating" @click="handleBack"
          class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] transition-colors border border-[var(--color-outline-variant)]">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <button v-else-if="!isPublicView" @click="$emit('back')"
          class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] transition-colors border border-[var(--color-outline-variant)]">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
      </div>

      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <h1
          class="text-xl font-bold text-center text-[var(--color-on-background)] px-12 pointer-events-auto truncate max-w-[60%]">
          {{ headerTitle }}
        </h1>
      </div>

      <div class="flex items-center space-x-2 z-10">
        <!-- Editor Actions -->
        <template v-if="(currentArticle || isCreating) && !isReadOnly">
          <!-- Translate Button -->
          <button @click="performTranslation"
            class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-fixed-dim)] text-[var(--color-on-secondary)] transition-colors"
            :disabled="isSaving || isTranslating" :title="isTranslating ? $t('translating') : $t('ai_translate')">
            <span v-if="!isTranslating" class="material-symbols-outlined">translate</span>
            <span v-else class="material-symbols-outlined animate-spin">sync</span>
          </button>

          <!-- Source Code Button -->
          <button @click="openSourceModal"
            class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)] transition-colors border border-[var(--color-outline-variant)]"
            title="Lihat/Edit Source JSON">
            <span class="material-symbols-outlined">code</span>
          </button>

          <button @click="() => saveArticle(false)"
            class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] text-[var(--color-on-primary)] transition-colors"
            :disabled="isSaving" :title="isSaving ? $t('saving_article') : $t('save_article')">
            <span v-if="!isSaving" class="material-symbols-outlined">save</span>
            <span v-else class="material-symbols-outlined animate-spin">sync</span>
          </button>
        </template>
      </div>
    </header>

    <!-- --- ERROR MESSAGE --- -->
    <div v-if="error"
      class="bg-[var(--color-error-container)] border border-[var(--color-error)] text-[var(--color-on-error-container)] px-4 py-3 rounded-2xl mb-4 flex items-center gap-3">
      <span class="material-symbols-outlined">error</span>
      <span>{{ error }}</span>
      <button @click="error = null" class="ml-auto"><span class="material-symbols-outlined">close</span></button>
    </div>

    <!-- --- LISST VIEW HEADER (Public Only) --- -->
    <div v-if="!currentArticle && !isCreating && isPublicView"
      class="relative flex items-center justify-center p-6 mb-4">
      <!-- Back Button (Only if from Home) -->
      <button v-if="route.query.from === 'home'" @click="router.push('/')"
        class="absolute left-6 w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] transition-all border border-[var(--color-outline-variant)]"
        title="Kembali ke Beranda">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>

      <!-- Centered Title -->
      <h1 class="text-2xl font-bold text-[var(--color-on-background)] text-center">
        {{ $t('article_list') }}
      </h1>
    </div>

    <!-- --- LIST VIEW --- -->
    <div v-if="!currentArticle && !isCreating" class="flex-grow flex flex-col overflow-hidden">
      <div v-if="isLoadingList" class="flex-grow flex items-center justify-center flex-col gap-3">
        <LoadingSpinner size="xl" />
        <p class="text-[var(--color-outline)]">{{ $t('loading_words') }}</p>
      </div>

      <div v-else-if="articles.length === 0"
        class="flex-grow flex items-center justify-center flex-col gap-4 bg-[var(--color-surface-container-high)] rounded-3xl m-4 border border-[var(--color-outline-variant)] border-dashed">
        <span class="material-symbols-outlined text-6xl text-[var(--color-outline-variant)]">article</span>
        <p class="text-[var(--color-on-surface-variant)] text-lg">{{ $t('no_articles') }}</p>
        <button v-if="!isPublicView" @click="createNewArticle"
          class="px-6 py-2.5 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full font-bold hover:scale-105 transition-all flex items-center gap-2">
          <span class="material-symbols-outlined">add_circle</span> {{ $t('new_article') }}
        </button>
      </div>

      <div v-else class="flex-grow overflow-y-auto px-4 md:px-6 pb-20">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <!-- Add New Card -->
          <div v-if="!isPublicView" @click="createNewArticle"
            class="group aspect-[4/3] rounded-3xl border-2 border-dashed border-[var(--color-outline-variant)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-container-high)] cursor-pointer flex flex-col items-center justify-center transition-all bg-[var(--color-surface)]">
            <span
              class="material-symbols-outlined text-4xl text-[var(--color-outline-variant)] group-hover:text-[var(--color-primary)] transition-colors mb-2">add</span>
            <span
              class="font-bold text-[var(--color-outline-variant)] group-hover:text-[var(--color-primary)] transition-colors">{{
                $t('new_article') }}</span>
          </div>

          <div v-for="article in articles" :key="article.id" @click="selectArticle(article)"
            class="group bg-[var(--color-surface-container-high)] rounded-3xl overflow-hidden cursor-pointer transition-all border border-transparent hover:border-[var(--color-primary)] flex flex-col h-full">
            <div class="aspect-video bg-[var(--color-surface-container)] relative overflow-hidden">
              <img v-if="article.featured_image" :src="article.featured_image"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div v-else class="w-full h-full flex items-center justify-center text-[var(--color-outline-variant)]">
                <span class="material-symbols-outlined text-6xl">image</span>
              </div>
              <template v-if="!isPublicView">
                <div v-if="article.is_published"
                  class="absolute top-3 right-3 bg-[var(--color-primary)] text-[var(--color-on-primary)] text-xs px-2 py-1 rounded-full font-bold">
                  PUBLISHED
                </div>
                <div v-else
                  class="absolute top-3 right-3 bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)] text-xs px-2 py-1 rounded-full font-bold border border-[var(--color-outline)]">
                  DRAFT
                </div>
              </template>
              <div v-if="article.is_pinned"
                class="absolute top-3 left-3 bg-[var(--color-tertiary)] text-[var(--color-on-tertiary)] text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                <span class="material-symbols-outlined" style="font-size: 14px !important;">keep</span> {{
                  $t('is_pinned')
                }}
              </div>
            </div>
            <div class="p-5 flex flex-col flex-grow">
              <h3
                class="text-xl font-bold text-[var(--color-on-surface)] mb-2 line-clamp-2 leading-tight group-hover:text-[var(--color-primary)] transition-colors">
                {{ article.title || 'Tanpa Judul' }}
              </h3>
              <p class="text-[var(--color-on-surface-variant)] text-sm line-clamp-3 mb-4 flex-grow">
                {{ article.excerpt || 'Tidak ada ringkasan.' }}
              </p>
              <div
                class="flex items-center justify-between text-xs text-[var(--color-outline)] border-t border-[var(--color-outline-variant)] pt-3 mt-auto">
                <span class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">person</span>
                  {{ article.author?.first_name || article.author?.username || 'Admin' }}
                </span>
                <span>{{ formatDate(article.published_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-grow flex flex-col overflow-hidden">
      <TabGroup :selectedIndex="selectedTabIndex" @change="selectedTabIndex = $event" as="div" ref="scrollContainerRef"
        @scroll="handleScroll" :class="[
          'h-full overflow-y-auto no-scrollbar relative',
          /* Public: Block agar flow sticky jalan. Admin: Flex-col */
          isPublicView ? 'block bg-[var(--color-surface)]' : 'flex flex-col'
        ]">
        <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0"
          enter-to-class="opacity-100" leave-active-class="transition duration-200 ease-in"
          leave-from-class="opacity-100" leave-to-class="opacity-0">
          <div v-if="isCoverExpanded" @click="isCoverExpanded = false"
            class="fixed inset-0 z-[100] bg-[var(--color-scrim)]/95 flex items-center justify-center cursor-zoom-out">
            <img :src="editData.featured_image" :alt="editData.title[activeLang]"
              class="max-w-full max-h-full object-contain p-4" />
            <button
              class="absolute top-4 right-4 w-12 h-12 rounded-full bg-[var(--color-surface-container)]/10 hover:bg-[var(--color-surface-container)]/20 text-[var(--color-on-surface)] flex items-center justify-center transition-colors">
              <span class="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>
        </Transition>


        <div v-if="!isPublicView && availableLanguages.length > 0"
          class="sticky top-0 z-50 bg-[var(--color-surface)] border-b border-[var(--color-outline-variant)]">
          <TabList class="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-none">
            <Tab v-for="lang in availableLanguages" :key="lang.lang_code" as="template" v-slot="{ selected }">
              <button :class="[
                'px-4 py-2 rounded-full text-sm font-semibold transition-all border whitespace-nowrap flex items-center gap-1.5 focus:outline-none',
                selected
                  ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-transparent'
                  : 'bg-transparent border-[var(--color-outline)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-on-surface-variant)]'
              ]" :title="lang.name">
                {{ lang.name }}
                <span v-if="lang.lang_code === sourceLang" class="material-symbols-outlined text-sm ml-1"
                  title="Bahasa Anchor (Sumber)">anchor</span>

                <span v-if="langStatus[lang.lang_code] === 'loading'"
                  class="material-symbols-outlined text-[16px] animate-spin">sync</span>
                <span v-else-if="langStatus[lang.lang_code] === 'success'" class="material-symbols-outlined text-[16px]"
                  :class="selected ? 'text-inherit' : 'text-[var(--color-success)]'">check</span>
                <span v-else-if="langStatus[lang.lang_code] === 'error'" class="material-symbols-outlined text-[16px]"
                  :class="selected ? 'text-inherit' : 'text-[var(--color-error)]'">close</span>
              </button>
            </Tab>
          </TabList>
        </div>

        <div class="relative z-10 flex flex-col">
          <div :class="[
            'flex-grow px-4 md:px-8 lg:px-12 py-8 md:py-12 container mx-auto max-w-4xl',
            isPublicView
              /* bg-background: Warna solid (putih/hitam) untuk menutupi cover.
                 min-h-screen: Agar scroll panjang.
                     HAPUS rounded-t & shadow gradien: Agar atasnya kotak rata dan bersih.
              */
              ? 'bg-[var(--color-background)] min-h-screen border-t border-[var(--color-outline-variant)]'
              : 'shadow-none'
          ]">

            <!-- Cover Image (Moved inside container) -->
            <div v-if="editData.featured_image || !isPublicView"
              class="w-full mb-8 relative group overflow-hidden bg-[var(--color-surface-container-high)] rounded-3xl"
              :class="[
                !isPublicView ? 'cursor-pointer aspect-[21/9]' : 'aspect-video rounded-[2rem]'
              ]" @click="isPublicView ? (isCoverExpanded = true) : (!isReadOnly && addFeaturedImage())">
              <img v-if="editData.featured_image" :src="editData.featured_image"
                class="w-full h-full object-cover object-center will-change-transform transition-transform duration-500"
                :class="{ 'cursor-zoom-in': isPublicView, 'group-hover:scale-110': !isPublicView }"
                :style="isPublicView ? parallaxStyle : {}" />

              <!-- Edit Overlay (Admin only) -->
              <div v-if="!isReadOnly && editData.featured_image"
                class="absolute inset-0 bg-[var(--color-scrim)]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span class="material-symbols-outlined text-[var(--color-surface)] text-3xl">edit</span>
              </div>

              <!-- Placeholder for Admin if no image -->
              <div v-if="!editData.featured_image && !isPublicView"
                class="w-full h-full flex flex-col items-center justify-center text-[var(--color-on-surface-variant)] gap-2">
                <span class="material-symbols-outlined text-4xl">add_photo_alternate</span>
                <span class="text-sm font-medium">Tambah Cover</span>
              </div>
            </div>

            <div v-if="langStatus[activeLang] === 'error' && langErrors[activeLang]"
              class="bg-[var(--color-error-container)] border border-[var(--color-error)] text-[var(--color-on-error-container)] px-4 py-3 rounded-xl mb-6 flex items-start gap-3 animate-pulse-once">
              <span class="material-symbols-outlined mt-0.5">error</span>
              <div class="flex-grow">
                <strong class="block font-bold">{{ $t('error_translation_failed') }}</strong>
                <p class="text-sm opacity-90">{{ langErrors[activeLang] }}</p>
              </div>
            </div>

            <div class="mb-6">
              <label v-if="!isReadOnly"
                class="block text-xs font-bold text-[var(--color-primary)] mb-2 uppercase tracking-wider">{{
                  $t('title_in_lang', { lang: activeLang.toUpperCase() }) }}</label>
              <textarea v-if="!isReadOnly" v-model="editData.title[activeLang]" :dir="isRtl ? 'rtl' : 'ltr'"
                class="w-full bg-transparent text-3xl md:text-5xl font-bold text-[var(--color-on-background)] placeholder-[var(--color-outline-variant)] focus:outline-none resize-none leading-tight"
                :class="{ 'text-right': isRtl }" rows="2"
                :placeholder="`${$t('title_in_lang', { lang: '' })}...`"></textarea>

              <div v-else>
                <h1 class="text-3xl md:text-5xl font-bold text-[var(--color-on-background)] mb-4"
                  :dir="isRtl ? 'rtl' : 'ltr'" :class="{ 'text-right': isRtl }">
                  {{ editData.title[activeLang] || $t('article_not_found') }}
                </h1>

                <div v-if="isPublicView"
                  class="flex flex-wrap items-center gap-4 text-[var(--color-secondary)] text-sm mb-8"
                  :dir="isRtl ? 'rtl' : 'ltr'" :class="{ 'justify-end': isRtl }">
                  <span v-if="currentArticle?.author" class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-[var(--color-secondary)]">
                      <DeveloperAvatar />
                    </div>
                    <span class="font-medium">
                      {{ currentArticle.author.first_name || currentArticle.author.username || 'Admin' }}
                    </span>
                  </span>
                  <span class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-lg">calendar_month</span>
                    {{ formatDate(currentArticle?.published_at) }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="!isReadOnly" class="mb-6">
              <label class="block text-xs font-bold text-[var(--color-outline)] mb-2 uppercase tracking-wider">{{
                $t('slug_label') }}</label>
              <div
                class="flex items-center gap-2 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-xl px-4 py-2">
                <span class="text-[var(--color-outline)] text-sm select-none">/article/</span>
                <input v-model="editData.slug" @input="isSlugManuallyEdited = true" type="text"
                  class="flex-grow bg-transparent text-[var(--color-on-surface)] placeholder-[var(--color-outline-variant)] focus:outline-none font-mono text-sm"
                  placeholder="judul-artikel-anda" />
                <button v-if="editData.title[activeLang] && isCreating" @click="regenerateSlug"
                  class="text-xs text-[var(--color-primary)] font-bold hover:underline"
                  title="Generate ulang dari Judul">
                  <span class="material-symbols-outlined text-sm pt-1">sync</span>
                </button>
              </div>
              <p class="text-[10px] text-[var(--color-outline)] mt-1 ml-1">
                Slug digunakan untuk link artikel. Hanya gunakan huruf, angka, dan tanda hubung (-).
              </p>
            </div>

            <div v-if="!isReadOnly"
              class="mb-8 p-4 rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]">
              <label class="block text-xs font-bold text-[var(--color-secondary)] mb-2 uppercase tracking-wider">{{
                $t('excerpt_in_lang', { lang: '' }) }}</label>
              <textarea v-model="editData.excerpt[activeLang]" :dir="isRtl ? 'rtl' : 'ltr'"
                class="w-full bg-transparent text-[var(--color-on-surface-variant)] placeholder-[var(--color-outline-variant)] focus:outline-none resize-none leading-relaxed"
                :class="{ 'text-right': isRtl }" rows="2"
                :placeholder="`${$t('excerpt_in_lang', { lang: '' })}...`"></textarea>
            </div>

            <div v-if="!isReadOnly" class="flex items-center gap-4 mb-8">
              <div
                class="flex items-center gap-3 bg-[var(--color-surface-container-low)] px-4 py-2 rounded-full border border-[var(--color-outline-variant)]">
                <div class="md-switch group relative inline-flex items-center flex-shrink-0"
                  :class="{ 'selected': editData.is_published }" @click="editData.is_published = !editData.is_published"
                  role="switch" :aria-checked="editData.is_published" aria-label="Toggle Publish Status" tabindex="0"
                  @keydown.space.prevent="editData.is_published = !editData.is_published"
                  @keydown.enter.prevent="editData.is_published = !editData.is_published">
                  <div
                    class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out cursor-pointer relative"
                    :class="[
                      editData.is_published
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] group-hover:bg-[var(--color-primary-fixed-dim)]'
                        : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)] group-hover:bg-[var(--color-surface-container-high)] group-hover:border-[var(--color-outline)]'
                    ]">
                    <div class="handle-container absolute top-0 left-0 h-full w-full pointer-events-none">
                      <div
                        class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
                        :class="[
                          editData.is_published
                            ? 'h-[24px] w-[24px] bg-[var(--color-on-primary)] left-[calc(100%-24px-4px)]'
                            : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px] group-hover:bg-[var(--color-on-surface-variant)]',
                          'group-active:h-[28px] group-active:w-[28px]',
                          editData.is_published ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                        ]">
                        <svg v-if="editData.is_published" xmlns="http://www.w3.org/2000/svg" height="16"
                          viewBox="0 -960 960 960" width="16" class="fill-[var(--color-primary)] opacity-100">
                          <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
                        </svg>
                        <svg v-if="!editData.is_published" xmlns="http://www.w3.org/2000/svg" height="16"
                          viewBox="0 -960 960 960" width="16"
                          class="fill-[var(--color-surface-container-highest)] opacity-100">
                          <path
                            d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <span class="text-sm font-bold"
                  :class="editData.is_published ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface-variant)]'">
                  {{ editData.is_published ? $t('is_published') : 'Draf' }}
                </span>
              </div>

              <div
                class="flex items-center gap-3 bg-[var(--color-surface-container-low)] px-4 py-2 rounded-full border border-[var(--color-outline-variant)]">
                <div class="md-switch group relative inline-flex items-center flex-shrink-0"
                  :class="{ 'selected': editData.is_pinned }" @click="editData.is_pinned = !editData.is_pinned"
                  role="switch" :aria-checked="editData.is_pinned" aria-label="Toggle Pin Status" tabindex="0"
                  @keydown.space.prevent="editData.is_pinned = !editData.is_pinned"
                  @keydown.enter.prevent="editData.is_pinned = !editData.is_pinned">
                  <div
                    class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out cursor-pointer relative"
                    :class="[
                      editData.is_pinned
                        ? 'bg-[var(--color-tertiary)] border-[var(--color-tertiary)] group-hover:bg-[var(--color-tertiary-fixed-dim)]'
                        : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)] group-hover:bg-[var(--color-surface-container-high)] group-hover:border-[var(--color-outline)]'
                    ]">
                    <div class="handle-container absolute top-0 left-0 h-full w-full pointer-events-none">
                      <div
                        class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
                        :class="[
                          editData.is_pinned
                            ? 'h-[24px] w-[24px] bg-[var(--color-on-tertiary)] left-[calc(100%-24px-4px)]'
                            : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px] group-hover:bg-[var(--color-on-surface-variant)]',
                          'group-active:h-[28px] group-active:w-[28px]',
                          editData.is_pinned ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                        ]">
                        <span v-if="editData.is_pinned"
                          class="material-symbols-outlined text-[16px] leading-none text-[var(--color-tertiary)]"
                          style="font-size: 16px;">check</span>
                        <span v-if="!editData.is_pinned"
                          class="material-symbols-outlined text-[16px] leading-none text-[var(--color-surface-container-highest)]"
                          style="font-size: 16px;">close</span>
                      </div>
                    </div>
                  </div>
                </div>
                <span class="text-sm font-bold select-none"
                  :class="editData.is_pinned ? 'text-[var(--color-tertiary)]' : 'text-[var(--color-on-surface-variant)]'">
                  {{ editData.is_pinned ? $t('is_pinned') : 'Tidak Disematkan' }}
                </span>
              </div>
            </div>

            <div v-if="!isReadOnly && editor" class="sticky top-[58px] z-30 mb-6 transition-all duration-300">
              <div
                class="flex flex-wrap items-center gap-1 p-2 bg-[var(--color-surface-container-highest)] rounded-xl border border-[var(--color-outline-variant)] overflow-x-auto">
                <button @click="editor.chain().focus().undo().run()"
                  :disabled="!editor.can().chain().focus().undo().run()" class="toolbar-btn" title="Undo"><span
                    class="material-symbols-outlined">undo</span></button>
                <button @click="editor.chain().focus().redo().run()"
                  :disabled="!editor.can().chain().focus().redo().run()" class="toolbar-btn" title="Redo"><span
                    class="material-symbols-outlined">redo</span></button>
                <div class="toolbar-divider"></div>
                <button @click="editor.chain().focus().toggleBold().run()"
                  :class="{ 'is-active': editor.isActive('bold') }" class="toolbar-btn" title="Bold"><span
                    class="material-symbols-outlined">format_bold</span></button>
                <button @click="editor.chain().focus().toggleItalic().run()"
                  :class="{ 'is-active': editor.isActive('italic') }" class="toolbar-btn" title="Italic"><span
                    class="material-symbols-outlined">format_italic</span></button>
                <button @click="editor.chain().focus().toggleUnderline().run()"
                  :class="{ 'is-active': editor.isActive('underline') }" class="toolbar-btn" title="Underline"><span
                    class="material-symbols-outlined">format_underlined</span></button>
                <button @click="editor.chain().focus().toggleStrike().run()"
                  :class="{ 'is-active': editor.isActive('strike') }" class="toolbar-btn" title="Strikethrough"><span
                    class="material-symbols-outlined">format_strikethrough</span></button>
                <div class="toolbar-divider"></div>
                <button @click="editor.chain().focus().setTextAlign('left').run()"
                  :class="{ 'is-active': editor.isActive({ textAlign: 'left' }) }" class="toolbar-btn"
                  title="Rata Kiri"><span class="material-symbols-outlined">format_align_left</span></button>
                <button @click="editor.chain().focus().setTextAlign('center').run()"
                  :class="{ 'is-active': editor.isActive({ textAlign: 'center' }) }" class="toolbar-btn"
                  title="Rata Tengah"><span class="material-symbols-outlined">format_align_center</span></button>
                <button @click="editor.chain().focus().setTextAlign('right').run()"
                  :class="{ 'is-active': editor.isActive({ textAlign: 'right' }) }" class="toolbar-btn"
                  title="Rata Kanan"><span class="material-symbols-outlined">format_align_right</span></button>
                <button @click="editor.chain().focus().setTextAlign('justify').run()"
                  :class="{ 'is-active': editor.isActive({ textAlign: 'justify' }) }" class="toolbar-btn"
                  title="Rata Kanan Kiri"><span class="material-symbols-outlined">format_align_justify</span></button>
                <div class="toolbar-divider"></div>
                <button @click="editor.chain().focus().toggleBulletList().run()"
                  :class="{ 'is-active': editor.isActive('bulletList') }" class="toolbar-btn" title="Daftar Poin"><span
                    class="material-symbols-outlined">format_list_bulleted</span></button>
                <button @click="editor.chain().focus().toggleOrderedList().run()"
                  :class="{ 'is-active': editor.isActive('orderedList') }" class="toolbar-btn"
                  title="Daftar Nomor"><span class="material-symbols-outlined">format_list_numbered</span></button>
                <div class="toolbar-divider"></div>
                <button @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
                  :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }" class="toolbar-btn"
                  title="Heading 1"><span class="material-symbols-outlined">format_h1</span></button>
                <button @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
                  :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }" class="toolbar-btn"
                  title="Heading 2"><span class="material-symbols-outlined">format_h2</span></button>
                <button @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
                  :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }" class="toolbar-btn"
                  title="Heading 3"><span class="material-symbols-outlined">format_h3</span></button>
                <div class="toolbar-divider"></div>
                <button @click="addImage" class="toolbar-btn" title="Insert Image"><span
                    class="material-symbols-outlined">image</span></button>
                <button @click="insertLink" class="toolbar-btn" :class="{ 'is-active': editor.isActive('link') }"
                  title="Insert/Edit Link"><span class="material-symbols-outlined">link</span></button>
                <button @click="editor.chain().focus().toggleBlockquote().run()"
                  :class="{ 'is-active': editor.isActive('blockquote') }" class="toolbar-btn" title="Blockquote"><span
                    class="material-symbols-outlined">format_quote</span></button>
                <button @click="editor.chain().focus().setHorizontalRule().run()" class="toolbar-btn"
                  title="Horizontal Line"><span class="material-symbols-outlined">horizontal_rule</span></button>
                <button @click="editor.chain().focus().insertBarChart().run()" class="toolbar-btn"
                  title="Insert Bar Chart"><span class="material-symbols-outlined">bar_chart</span></button>
                <div class="toolbar-divider"></div>
                <button v-if="activeLang !== sourceLang" @click="regenerateCurrentLanguage"
                  class="toolbar-btn text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]"
                  :disabled="isTranslating" title="Regenerate (Terjemahkan Ulang)">
                  <span class="material-symbols-outlined"
                    :class="{ 'animate-spin': isTranslating && langStatus[activeLang] === 'loading' }">autorenew</span>
                </button>
                <div class="toolbar-divider"></div>
                <button @click="insertTable" class="toolbar-btn" title="Insert Table"><span
                    class="material-symbols-outlined">table</span></button>
                <div class="toolbar-divider"></div>
                <button @click="openSourceModal" class="toolbar-btn" title="Lihat/Edit Source JSON"><span
                    class="material-symbols-outlined">code</span></button>
              </div>

              <div v-if="editor.isActive('table')"
                class="flex flex-wrap items-center gap-1 p-2 mt-2 bg-[var(--color-surface-container-highest)] rounded-xl border border-[var(--color-outline-variant)] overflow-x-auto">
                <button @click="editor.chain().focus().addColumnBefore().run()" class="toolbar-btn"
                  title="Tambah Kolom Kiri"><span
                    class="material-symbols-outlined text-base">add_column_left</span></button>
                <button @click="editor.chain().focus().addColumnAfter().run()" class="toolbar-btn"
                  title="Tambah Kolom Kanan"><span
                    class="material-symbols-outlined text-base">add_column_right</span></button>
                <button @click="editor.chain().focus().deleteColumn().run()" class="toolbar-btn"
                  title="Hapus Kolom"><span class="material-symbols-outlined text-base">delete_column</span></button>
                <div class="toolbar-divider"></div>
                <button @click="editor.chain().focus().addRowBefore().run()" class="toolbar-btn"
                  title="Tambah Baris Atas"><span
                    class="material-symbols-outlined text-base">add_row_above</span></button>
                <button @click="editor.chain().focus().addRowAfter().run()" class="toolbar-btn"
                  title="Tambah Baris Bawah"><span
                    class="material-symbols-outlined text-base">add_row_below</span></button>
                <button @click="editor.chain().focus().deleteRow().run()" class="toolbar-btn" title="Hapus Baris"><span
                    class="material-symbols-outlined text-base">delete_row</span></button>
                <div class="toolbar-divider"></div>
                <button @click="editor.chain().focus().mergeCells().run()" class="toolbar-btn"
                  title="Gabungkan Sel"><span class="material-symbols-outlined">combine_columns</span></button>
                <button @click="editor.chain().focus().splitCell().run()" class="toolbar-btn" title="Pisahkan Sel"><span
                    class="material-symbols-outlined">call_split</span></button>
                <button @click="editor.chain().focus().deleteTable().run()"
                  class="toolbar-btn text-[var(--color-error)]" title="Hapus Tabel"><span
                    class="material-symbols-outlined text-base">delete_forever</span></button>
              </div>
            </div>

            <article v-if="editor" :dir="isRtl ? 'rtl' : 'ltr'"
              class="prose prose-lg dark:prose-invert max-w-none 
                             prose-headings:font-bold prose-headings:text-[var(--color-on-background)]
                             prose-p:text-[var(--color-on-surface-variant)] prose-p:leading-relaxed
                             prose-a:text-[var(--color-primary)] prose-a:no-underline hover:prose-a:underline
                             prose-img:rounded-xl
                             prose-blockquote:border-l-[var(--color-primary)] prose-blockquote:bg-[var(--color-surface-container)] prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg"
              :class="{ 'text-right': isRtl }">
              <editor-content :editor="editor" class="min-h-[300px] outline-none" />
            </article>

            <div class="mt-8 pt-6 border-t border-[var(--color-outline-variant)]">
              <button @click="isReferenceExpanded = !isReferenceExpanded"
                class="flex items-center justify-between w-full text-left group">
                <span
                  class="text-sm font-bold text-[var(--color-tertiary)] uppercase tracking-wider flex items-center gap-2">
                  <span class="material-symbols-outlined text-lg">menu_book</span>
                  {{ $t('reference_label') }}
                </span>
                <span class="material-symbols-outlined text-[var(--color-outline)] transition-transform duration-200"
                  :class="{ 'rotate-180': isReferenceExpanded }">
                  expand_more
                </span>
              </button>

              <div v-show="isReferenceExpanded" class="mt-4 transition-all duration-300 origin-top">
                <div v-if="!isReadOnly"
                  class="p-4 rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]">
                  <textarea v-model="editData.reference"
                    class="w-full bg-transparent text-[var(--color-on-surface-variant)] placeholder-[var(--color-outline-variant)] focus:outline-none resize-none leading-relaxed text-sm font-mono"
                    rows="3" :placeholder="$t('reference_label')"></textarea>
                </div>
                <div v-else
                  class="p-4 rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]">
                  <p
                    class="text-[var(--color-on-surface-variant)] whitespace-pre-wrap text-sm leading-relaxed max-w-none break-words overflow-hidden">
                    {{ editData.reference || '(Tanpa Referensi)' }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabGroup>
    </div>

    <!-- --- MODALS --- -->
    <TransitionRoot appear :show="showGenericModal" as="template">
      <Dialog as="div" @close="closeGenericModal" class="relative z-[9999]">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-[var(--color-scrim)]/60" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel
              class="w-full max-w-md transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 transition-all border border-[var(--color-outline-variant)]">
              <h3 class="text-xl font-bold leading-6 text-[var(--color-on-background)] mb-4">{{ modalConfig.title }}
              </h3>

              <div v-for="input in modalConfig.inputs" :key="input.key">
                <label v-if="input.type === 'file'" class="block relative group cursor-pointer">
                  <div
                    class="flex items-center justify-center w-full h-32 border-2 border-dashed border-[var(--color-outline-variant)] rounded-2xl bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] transition-colors">
                    <div class="text-center">
                      <span
                        class="material-symbols-outlined text-4xl text-[var(--color-outline)] mb-2">upload_file</span>
                      <p class="text-sm text-[var(--color-on-surface-variant)]" v-if="!modalInputs[input.key]">Klik
                        untuk
                        upload {{ input.label }}</p>
                      <p class="text-sm text-[var(--color-primary)] font-bold truncate px-4" v-else>{{
                        modalInputs[input.key]?.name }}</p>
                    </div>
                  </div>
                  <input type="file" :accept="input.accept"
                    @change="e => modalInputs[input.key] = (e.target as HTMLInputElement).files?.[0]"
                    class="absolute inset-0 opacity-0 cursor-pointer" />
                </label>

                <div v-else-if="input.type === 'checkbox'"
                  class="flex items-center gap-2 p-3 bg-[var(--color-surface-container)] rounded-xl border border-[var(--color-outline-variant)]">
                  <input type="checkbox" v-model="modalInputs[input.key]"
                    class="w-5 h-5 rounded border-[var(--color-outline)] text-[var(--color-primary)] focus:ring-0" />
                  <span class="text-sm font-medium text-[var(--color-on-surface)]">{{ input.label }}</span>
                </div>

                <div v-else>
                  <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ input.label
                  }}</label>
                  <input v-model="modalInputs[input.key]" :type="input.type" :placeholder="input.placeholder"
                    class="w-full px-4 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-outline-variant)] focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] focus:outline-none" />
                </div>
              </div>

              <div class="mt-8 flex justify-end gap-3">
                <button type="button" @click="closeGenericModal"
                  class="px-4 py-2 rounded-xl border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] font-medium hover:bg-[var(--color-surface-container)] transition-colors">{{
                    $t('cancel') }}</button>
                <button type="button" @click="handleModalConfirm"
                  class="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium hover:bg-[var(--color-primary-fixed-dim)] transition-colors">{{
                    $t('add') }}</button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>

    </TransitionRoot>

    <!-- --- APP MODAL (Alert/Confirm) --- -->
    <TransitionRoot appear :show="appModalOpen" as="template">
      <Dialog as="div" @close="closeAppModal" class="relative z-[9999]">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-[var(--color-scrim)]/60" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel
              class="w-full max-w-sm transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-center align-middle transition-all border border-[var(--color-outline-variant)]">
              <div v-if="appModalConfig.type === 'error'"
                class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-error-container)]">
                <span class="material-symbols-outlined text-4xl text-[var(--color-on-error-container)]">error</span>
              </div>
              <div v-else-if="appModalConfig.type === 'success'" class="mx-auto mb-4">
                <svg class="checkmark h-20 w-20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                  <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                  <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                </svg>
              </div>
              <div v-else-if="appModalConfig.type === 'confirm'"
                class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-secondary-container)]">
                <span class="material-symbols-outlined text-4xl text-[var(--color-on-secondary-container)]">help</span>
              </div>
              <div v-else
                class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-container-highest)]">
                <span class="material-symbols-outlined text-4xl text-[var(--color-on-surface-variant)]">info</span>
              </div>

              <DialogTitle as="h3" class="mt-4 text-2xl font-bold text-[var(--color-on-background)]">{{
                appModalConfig.title
              }}</DialogTitle>
              <p class="mt-2 text-sm text-[var(--color-on-surface-variant)]">{{ appModalConfig.message }}</p>

              <div class="mt-6 flex gap-3 justify-center">
                <template v-if="appModalConfig.type === 'confirm'">
                  <button type="button" @click="closeAppModal"
                    class="flex-1 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]">{{
                      $t('cancel') }}</button>
                  <button type="button" @click="handleAppModalConfirm"
                    class="flex-1 rounded-xl bg-[var(--color-primary)] px-4 py-2 font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-fixed-dim)]">{{
                      appModalConfig.actionLabel }}</button>
                </template>
                <template v-else>
                  <button type="button" @click="closeAppModal"
                    class="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2 font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-fixed-dim)]">{{
                      appModalConfig.actionLabel }}</button>
                </template>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- --- SOURCE CODE MODAL --- -->
    <TransitionRoot appear :show="showSourceModal" as="template">
      <Dialog as="div" @close="closeSourceModal" class="relative z-[9999]">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-[var(--color-scrim)]/60" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel
              class="w-full max-w-4xl transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 flex flex-col max-h-[90vh] border border-[var(--color-outline-variant)]">
              <div class="flex items-center justify-between mb-4 flex-shrink-0">
                <h2 class="text-2xl font-bold text-[var(--color-on-background)]">
                  Source Code ({{ viewMode.toUpperCase() }}) - {{ activeLang.toUpperCase() }}
                </h2>
                <div class="flex items-center gap-2">
                  <div class="flex bg-[var(--color-surface-container)] p-1 rounded-xl">
                    <button @click="setViewMode('json')"
                      :class="['px-3 py-1 text-xs font-semibold rounded-lg transition-all', viewMode === 'json' ? 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)] shadow-sm' : 'text-[var(--color-on-surface-variant)]']">JSON</button>
                    <button @click="setViewMode('html')"
                      :class="['px-3 py-1 text-xs font-semibold rounded-lg transition-all', viewMode === 'html' ? 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)] shadow-sm' : 'text-[var(--color-on-surface-variant)]']">HTML</button>
                  </div>
                  <button @click="closeSourceModal"
                    class="p-2 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors rounded-full hover:bg-[var(--color-surface-container)]">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>

              <p class="text-sm text-[var(--color-on-surface-variant)] mb-4">
                Edit konten artikel dalam format {{ viewMode.toUpperCase() }} untuk bahasa <strong>{{
                  activeLang.toUpperCase() }}</strong>. Perubahan akan langsung diterapkan ke editor.
              </p>

              <textarea v-model="sourceJsonInput"
                class="w-full flex-grow p-4 border border-[var(--color-outline-variant)] rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-xs font-mono resize-none overflow-y-auto mb-4 min-h-[400px] whitespace-pre"
                spellcheck="false"></textarea>

              <!-- Error Message -->
              <div v-if="sourceJsonError"
                class="text-xs text-[var(--color-error)] mb-4 font-mono bg-[var(--color-error-container)]/20 p-3 rounded-lg">
                <span class="font-bold">❌ Error:</span> {{ sourceJsonError }}
              </div>

              <div class="flex justify-end gap-3 flex-shrink-0">
                <button @click="copySourceToClipboard"
                  class="px-4 py-2 text-sm font-semibold rounded-xl border border-[var(--color-outline)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] transition-colors flex items-center gap-2">
                  <span class="material-symbols-outlined text-lg">content_copy</span>
                  {{ $t('copy') }}
                </button>
                <button @click="closeSourceModal"
                  class="px-4 py-2 text-sm font-semibold rounded-xl border border-[var(--color-outline-variant)] text-[var(--on-surface)] hover:bg-[var(--color-surface-container)] transition-colors">
                  {{ $t('cancel') }}
                </button>
                <button @click="applySourceChanges"
                  class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)] transition-colors flex items-center gap-2">
                  <span class="material-symbols-outlined text-lg">check</span>
                  {{ $t('apply') }}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { generateHTML, generateJSON } from '@tiptap/html';
import { useRoute, useRouter } from 'vue-router';
import { useLanguageStore } from '@/stores/language';
import { api } from '@/utils/api';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@headlessui/vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import { Editor, EditorContent } from '@tiptap/vue-3';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Blockquote from '@tiptap/extension-blockquote';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import HardBreak from '@tiptap/extension-hard-break';
import History from '@tiptap/extension-history';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Strike from '@tiptap/extension-strike';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import ResizableImage from '@/components/Aplikasi/Admin/ResizableImage.vue';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import DeveloperAvatar from '@/components/DeveloperAvatar.vue';
import { useClipboard } from '@vueuse/core';
import BarChartNode from './BarChartNode';
import { useSEO, getArticleSchema, type SEOOptions } from '@/composables/useSEO';

// --- PARALLAX LOGIC ---
const scrollContainerRef = ref<HTMLElement | null>(null);
const scrollTop = ref(0);

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  scrollTop.value = target.scrollTop;
};

// Hitung style paralax
const parallaxStyle = computed(() => {
  if (!props.isPublicView) return {};

  return {
    // Ubah faktor scale dari 0.0002 menjadi 0.0005 agar efek zoom lebih terasa
    transform: `scale(${1 + scrollTop.value * 0.0005})`,
    opacity: `${1 - Math.min(scrollTop.value / 700, 0.5)}`, // Fade out pelan
    transition: 'transform 0.05s linear, opacity 0.05s linear' // Responsif cepat
  };
});

// --- INTERFACES ---

interface Language {
  lang_code: string;
  name: string;
}

interface Article {
  id: number | string;
  title: string;
  slug?: string;
  excerpt?: string;
  featured_image?: string | null;
  is_published: boolean;
  is_pinned?: boolean;
  published_at?: string;
  author?: {
    first_name?: string;
    username?: string;
  };
  translations?: Record<string, any>;
  content?: any;
  contents?: any; // sometimes returned as contents
  author_id?: number | string;
  reference?: string;
}

interface EditData {
  id?: number | string;
  slug: string;
  is_published: boolean;
  is_pinned: boolean;
  featured_image: string | null;
  title: Record<string, string>;
  excerpt: Record<string, string>;
  reference: string;
  content: Record<string, any>;
  author_id?: number | string;
}

const props = defineProps({
  article: { type: Object, default: null }, // Passed by wrapper if viewing specific article
  isPublicView: { type: Boolean, default: false }, // Passed by wrapper
  articleSlug: { type: String, default: null }, // For direct fetching in public mode
});

const emit = defineEmits(['back']);
const languageStore = useLanguageStore();
const router = useRouter();
const route = useRoute();

// --- STATE ---
const articles = ref<Article[]>([]);
const currentArticle = ref<Article | null>(null);
const isCreating = ref(false);
const isLoadingList = ref(false);
const isSaving = ref(false);
const isTranslating = ref(false);
const translatingLanguages = ref<string[]>([]); // Track distinct languages being translated
const error = ref<string | null>(null);
const isSlugManuallyEdited = ref(false);
const isReferenceExpanded = ref(false); // Default collapsed
const isCoverExpanded = ref(false);
const langStatus = ref<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
const langErrors = ref<Record<string, string>>({}); // Store specific error messages per language

// --- SEO LOGIC ---
const seoOptions = ref<SEOOptions>({
  title: 'Manajemen Artikel',
  description: 'Kelola artikel Leksika.',
});

if (props.isPublicView) {
  useSEO(seoOptions);
}

const updateArticleSEO = () => {
  if (currentArticle.value && props.isPublicView) {
    const sLang = sourceLang.value;
    const tLang = targetLang.value;

    // Get localized title for SEO
    const title = editData.value.title[sLang] || editData.value.title[tLang] || Object.values(editData.value.title)[0] || 'Artikel';
    const excerpt = editData.value.excerpt[sLang] || editData.value.excerpt[tLang] || Object.values(editData.value.excerpt)[0] || '';

    seoOptions.value = {
      title: title,
      description: excerpt,
      image: editData.value.featured_image || undefined,
      url: `https://leksika.id/article/${editData.value.slug}`,
      type: 'article',
      jsonLd: getArticleSchema({ ...currentArticle.value, title }),
    };
  } else if (props.isPublicView) {
    // List view SEO
    seoOptions.value = {
      title: 'Artikel',
      description: 'Baca artikel terbaru tentang pembelajaran bahasa di Leksika.',
      url: 'https://leksika.id/articles',
    };
  }
};

interface ModalConfig {
  title?: string;
  message?: string;
  type?: 'info' | 'success' | 'error' | 'confirm';
  actionLabel?: string;
  onConfirm?: ((data?: any) => void | Promise<void>) | null;
  inputs?: Array<{
    key: string;
    label: string;
    type: 'text' | 'file' | 'checkbox';
    accept?: string;
    placeholder?: string;
  }>;
}


// App Modal State
const appModalOpen = ref(false);
const appModalConfig = ref<ModalConfig>({
  title: '',
  message: '',
  type: 'info', // 'info', 'success', 'error', 'confirm'
  actionLabel: 'OK',
  onConfirm: null,
});

const openAppModal = ({
  title,
  message,
  type = 'info',
  actionLabel = 'OK',
  action = null,
}: {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'confirm';
  actionLabel?: string;
  action?: (() => Promise<void> | void) | null;
}) => {
  appModalConfig.value = {
    title,
    message,
    type,
    actionLabel,
    onConfirm: action,
  };
  appModalOpen.value = true;
};

const closeAppModal = () => {
  appModalOpen.value = false;
};

const handleAppModalConfirm = async () => {
  closeAppModal(); // Close immediately as requested
  if (appModalConfig.value.onConfirm) {
    await appModalConfig.value.onConfirm();
  }
};

// Language tabs - default to Indonesian
// Language tabs - initialized from store language (Source Language)
const activeLang = ref(languageStore.selectedAsal?.kodeBahasa || 'id');
const isRtl = computed(() => activeLang.value === 'ar');
const availableLanguages = ref<Language[]>([]);
const isLoadingLanguages = ref(false);

// Editor Data
// Structure: { slug, is_published, featured_image, title: {id, en}, excerpt: {id, en}, content: {id: JSON, en: JSON} }
const editData = ref<EditData>({
  slug: '',
  is_published: false,
  is_pinned: false,
  featured_image: null,
  title: {},
  excerpt: {},
  reference: '',
  content: {}, // Map of language -> JSON
});

// Modal State
const showGenericModal = ref(false);
const modalConfig = ref<ModalConfig>({});
const modalInputs = ref<Record<string, any>>({});

// Source Code Modal State
const showSourceModal = ref(false);
const viewMode = ref<'json' | 'html'>('json');
const sourceJsonInput = ref('');
const sourceJsonError = ref<string | null>(null);

// Tiptap Editor Ref
const editor = shallowRef<Editor | null>(null);

const openSourceModal = () => {
  if (!editor.value) return;
  // Sync current editor to editData first
  editData.value.content[activeLang.value] = editor.value.getJSON();
  updateSourcePreview();
  showSourceModal.value = true;
};

const updateSourcePreview = () => {
  if (!editor.value) return;

  const activeContent = editData.value.content[activeLang.value];
  const activeTitle = editData.value.title[activeLang.value] || '';
  const activeExcerpt = editData.value.excerpt[activeLang.value] || '';
  const activeReference = editData.value.reference || '';

  if (viewMode.value === 'html') {
    const extensions = [
      Document,
      Paragraph,
      Text,
      Bold,
      Italic,
      Heading.configure({ levels: [1, 2, 3] }),
      BulletList,
      OrderedList,
      ListItem,
      Blockquote,
      HorizontalRule,
      HardBreak,
      CustomImage,
      Underline,
      Link,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Strike,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      BarChartNode,
    ];
    const contentHtml = generateHTML(activeContent, extensions);
    const fullHtml = `<!-- ARTICLE_SOURCE_START -->
<h1 data-type="title">${activeTitle}</h1>
<div data-type="excerpt">${activeExcerpt}</div>
<div data-type="reference">${activeReference}</div>
<!-- ARTICLE_SOURCE_END -->

${contentHtml}`;
    sourceJsonInput.value = formatHTML(fullHtml);
  } else {
    const sourceData = {
      title: activeTitle,
      excerpt: activeExcerpt,
      reference: activeReference,
      content: activeContent,
      is_published: editData.value.is_published,
      is_pinned: editData.value.is_pinned,
    };
    sourceJsonInput.value = JSON.stringify(sourceData, null, 2);
  }
  sourceJsonError.value = null;
};

const closeSourceModal = () => {
  showSourceModal.value = false;
  sourceJsonError.value = null;
};

const { copy } = useClipboard({ legacy: true });

const copySourceToClipboard = () => {
  copy(sourceJsonInput.value);
  openAppModal({
    title: 'Tersalin!',
    message: 'JSON telah disalin ke clipboard.',
    type: 'success',
    actionLabel: 'OK',
  });
};

const applySourceChanges = () => {
  try {
    if (viewMode.value === 'html') {
      const html = sourceJsonInput.value;
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const titleEl = doc.querySelector('[data-type="title"]');
      const excerptEl = doc.querySelector('[data-type="excerpt"]');
      const referenceEl = doc.querySelector('[data-type="reference"]');

      // Remove the metadata parts from HTML before parsing content
      const metaStart = html.indexOf('<!-- ARTICLE_SOURCE_START -->');
      const metaEnd = html.indexOf('<!-- ARTICLE_SOURCE_END -->');
      let contentHtml = html;
      if (metaStart !== -1 && metaEnd !== -1) {
        contentHtml = html.substring(metaEnd + '<!-- ARTICLE_SOURCE_END -->'.length).trim();
      }

      const extensions = [
        Document,
        Paragraph,
        Text,
        Bold,
        Italic,
        Heading.configure({ levels: [1, 2, 3] }),
        BulletList,
        OrderedList,
        ListItem,
        Blockquote,
        HorizontalRule,
        HardBreak,
        CustomImage,
        Underline,
        Link,
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        Strike,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        BarChartNode,
      ];
      const parsedContent = generateJSON(contentHtml, extensions);

      editData.value.title[activeLang.value] = titleEl?.textContent || '';
      editData.value.excerpt[activeLang.value] = excerptEl?.textContent || '';
      editData.value.reference = referenceEl?.textContent || '';
      editData.value.content[activeLang.value] = parsedContent;

      if (editor.value) {
        editor.value.commands.setContent(parsedContent);
      }
    } else {
      const parsed = JSON.parse(sourceJsonInput.value);

      if (typeof parsed.title !== 'string') throw new Error('Field "title" harus berupa string');
      if (typeof parsed.excerpt !== 'string') throw new Error('Field "excerpt" harus berupa string');
      if (!parsed.content || parsed.content.type !== 'doc') throw new Error('Field "content" harus memiliki type: "doc"');

      editData.value.title[activeLang.value] = parsed.title;
      editData.value.excerpt[activeLang.value] = parsed.excerpt;
      editData.value.reference = parsed.reference || '';
      editData.value.content[activeLang.value] = parsed.content;
      if (parsed.is_published !== undefined) editData.value.is_published = parsed.is_published;
      if (parsed.is_pinned !== undefined) editData.value.is_pinned = parsed.is_pinned;

      if (editor.value) {
        editor.value.commands.setContent(parsed.content);
      }
    }

    closeSourceModal();
  } catch (e: any) {
    sourceJsonError.value = e.message;
  }
};

const setViewMode = (mode: 'json' | 'html') => {
  viewMode.value = mode;
  updateSourcePreview();
};

const cleanHtmlOutput = (html: string) => {
  return html
    .replace(/\s+xmlns="[^"]*"/g, '')
    .replace(/\s+contenteditable="[^"]*"/g, '')
    .replace(/\s+data-node-view-[^=]*="[^"]*"/g, '')
    // Preserve styles for text-alignment and width (important for tables)
    .replace(/\s+style="(?!.*(text-align|width))[^"]*"/g, '')
    // .replace(/<colgroup>[\s\S]*?<\/colgroup>/g, '') // Keep colgroup for table widths
    .replace(/\s+colspan="1"/g, '')
    .replace(/\s+rowspan="1"/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+>/g, '>')
    .trim();
};

const formatHTML = (html: string) => {
  let cleaned = cleanHtmlOutput(html);
  let f = '';
  let reg = /(>)(<)(\/*)/g;
  let xml = cleaned.replace(reg, '$1\r\n$2$3');
  let pad = 0;
  xml.split('\r\n').forEach((node) => {
    let indent = 0;
    if (node.match(/.+<\/\w[^>]*>$/)) indent = 0;
    else if (node.match(/^<\/\w/)) {
      if (pad !== 0) pad -= 1;
    } else if (node.match(/^<\w[^>]*[^/]>.*$/)) indent = 1;
    let padding = '';
    for (let i = 0; i < pad; i++) padding += '  ';
    f += padding + node + '\r\n';
    pad += indent;
  });
  return f.trim();
};




// --- COMPUTED ---
// Use getter/setter logic properly typed
const isReadOnly = computed(() => props.isPublicView);

const targetLang = computed(
  () => languageStore.selectedTarget?.kodeBahasa || 'en',
);
const sourceLang = computed(
  () => languageStore.selectedAsal?.kodeBahasa || 'id',
);

const articleTitle = computed(() => {
  if (!currentArticle.value) return '';
  // Normalized editData title is always an object by this point
  return (
    editData.value.title[activeLang.value] ||
    editData.value.title['id'] ||
    Object.values(editData.value.title)[0] ||
    'Tanpa Judul'
  );
});

const articleReference = computed(() => {
  if (!currentArticle.value) return '';
  return editData.value.reference || '';
});

const formatDate = (dateString: string | null) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const headerTitle = computed(() => {
  if (isCreating.value) return 'Buat Artikel Baru';
  if (currentArticle.value)
    return isReadOnly.value
      ? editData.value.title[activeLang.value] || 'Artikel'
      : 'Edit Artikel';
  return isReadOnly.value ? 'Daftar Artikel' : 'Manajemen Artikel';
});

const selectedTabIndex = computed({
  get: (): number => {
    const idx = availableLanguages.value.findIndex(
      (l) => l.lang_code === activeLang.value,
    );
    return idx === -1 ? 0 : idx;
  },
  set: (index: number) => {
    if (availableLanguages.value[index]) {
      switchLanguage(availableLanguages.value[index].lang_code);
    }
  },
});

// --- LIFECYCLE ---
onMounted(async () => {
  // Fetch available languages first
  await fetchLanguages();

  if (props.article) {
    // Direct View Mode (e.g. from Artikel.vue wrapper)
    loadArticleData(props.article as Article);
  } else if (props.isPublicView && props.articleSlug) {
    // Direct Fetch Mode (Public URL)
    await selectArticleBySlug(props.articleSlug);
  } else {
    // List Mode
    await fetchArticles();
  }
});


watch(
  () => props.article,
  (newVal) => {
    if (newVal) loadArticleData(newVal as Article);
  },
);

// [FIX] Watch articleSlug prop to react to route changes
// When same component is reused for /articles and /article/:slug,
// onMounted won't re-run, so we need this watcher to handle transitions
watch(
  () => props.articleSlug,
  async (newSlug, oldSlug) => {
    if (newSlug === oldSlug) return;
    if (newSlug) {
      // Navigated to a new article
      await selectArticleBySlug(newSlug);
    } else if (oldSlug && !newSlug) {
      // Navigated back to list (slug removed from URL)
      destroyEditor();
      currentArticle.value = null;
      isCreating.value = false;
      activeLang.value = languageStore.selectedAsal?.kodeBahasa || 'id';
      langStatus.value = {};
      langErrors.value = {};
      error.value = null;
      initEditorData();
      updateArticleSEO();
      await fetchArticles();
    }
  },
);

// --- ACTIONS ---

const fetchLanguages = async () => {
  if (isLoadingLanguages.value) return;
  isLoadingLanguages.value = true;
  try {
    // [ADMIN] Use store action to ensure we get all languages including inactive ones
    if (!props.isPublicView) {
      await languageStore.fetchAdminLanguages();
      availableLanguages.value = languageStore.opsiBahasa.map((l: any) => ({
        lang_code: l.kodeBahasa,
        name: l.nama
      }));
    } else {
      // [PUBLIC] Ensure store is initialized before fetching list
      await languageStore.fetchLanguages();
      const res = await api.get('/languages/');
      availableLanguages.value = res.data || [];
    }

    const idLang = availableLanguages.value.find((l) => l.lang_code === 'id');
    if (!idLang) {
      availableLanguages.value.unshift({ lang_code: 'id', name: 'Indonesian' });
    } else {
      availableLanguages.value = [
        idLang,
        ...availableLanguages.value.filter((l) => l.lang_code !== 'id')
      ];
    }
  } catch (e) {
    console.error(e);
    availableLanguages.value = [
      { lang_code: 'id', name: 'Indonesia' },
      { lang_code: 'en', name: 'Inggris' }
    ];
  } finally {
    isLoadingLanguages.value = false;
  }
}
// Removed Duplicate fetchLanguages logic if present below


const fetchArticles = async () => {
  isLoadingList.value = true;
  try {
    const url = props.isPublicView ? '/articles' : '/admin/articles';
    const res = await api.get(url, {
      params: { lang: languageStore.selectedAsal?.kodeBahasa || 'id' }
    });

    // Normalize data for display (Admin API returns translations, Public API returns flat title)
    articles.value = (res.data as any[]).map((a: any) => {
      if (a.translations && !a.title) {
        // Try to find title in targetLang -> sourceLang -> id -> any
        const t =
          a.translations[sourceLang.value] ||
          a.translations[targetLang.value] ||
          a.translations['id'] ||
          Object.values(a.translations)[0];
        return {
          ...a,
          title: t?.title || '',
          excerpt: t?.excerpt || '',
        };
      }
      return a as Article;
    });
  } catch (err: any) {
    error.value =
      'Gagal memuat artikel: ' + (err.response?.data?.error || err.message);
  } finally {
    isLoadingList.value = false;
  }
};

const createNewArticle = () => {
  isCreating.value = true;
  currentArticle.value = null;
  initEditorData();
  initTiptap();
};

const selectArticle = async (articleListItem: Article) => {
  // Clear any previous error/status state
  langStatus.value = {};
  langErrors.value = {};
  activeLang.value = languageStore.selectedAsal?.kodeBahasa || 'id';
  error.value = null;

  // Use Slug for Public Navigation (SEO Friendly)
  if (props.isPublicView) {
    if (articleListItem.slug) {
      router.push(`/article/${articleListItem.slug}`);
    } else {
      // Fallback if no slug (should not happen for published articles)
      console.warn("Article has no slug, falling back to ID");
      await selectArticleBySlug(String(articleListItem.id));
    }
    return;
  }

  // Admin View: Load details directly
  isLoadingList.value = true;
  try {
    const url = `/admin/articles/${articleListItem.id}`;
    const res = await api.get(url);
    loadArticleData(res.data);
  } catch (err: any) {
    error.value = 'Gagal memuat detail artikel: ' + err.message;
  } finally {
    isLoadingList.value = false;
  }
};

const selectArticleBySlug = async (slug: string) => {
  // Clear any previous error/status state
  langStatus.value = {};
  langErrors.value = {};
  activeLang.value = languageStore.selectedAsal?.kodeBahasa || 'id';
  error.value = null;

  isLoadingList.value = true;
  try {
    const url = `/articles/${slug}`;
    const params: Record<string, string> = { lang: activeLang.value };
    const res = await api.get(url, { params });
    loadArticleData(res.data);
  } catch (err: any) {
    error.value = 'Gagal memuat detail artikel: ' + err.message;
  } finally {
    isLoadingList.value = false;
  }
};

const loadArticleData = (data: Article) => {
  currentArticle.value = data;
  isCreating.value = false;

  // Update SEO if in public mode
  updateArticleSEO();
  // Backend returns content as HashMap<String, Value> or Value
  // Ensure title/excerpt/content are objects
  // Parse Translations (Admin View) or use Title/Excerpt (Public View)
  let titleMap: Record<string, string> = {};
  let excerptMap: Record<string, string> = {};
  let referenceStr = '';

  if (data.reference) {
    referenceStr = data.reference;
  }

  if (data.translations) {
    // Admin format: translations: { "en": { "title": "...", "excerpt": "..." } }
    for (const [lang, val] of Object.entries(data.translations)) {
      if ((val as any).title) titleMap[lang] = (val as any).title;
      if ((val as any).excerpt) excerptMap[lang] = (val as any).excerpt;
    }
  } else {
    // Public format: title and excerpt can be string OR object
    if (data.title && typeof data.title === 'object') {
      titleMap = { ...(data.title as unknown as Record<string, string>) };
    } else if (typeof data.title === 'string') {
      titleMap = { [activeLang.value]: data.title };
    }

    if (data.excerpt && typeof data.excerpt === 'object') {
      excerptMap = { ...(data.excerpt as unknown as Record<string, string>) };
    } else if (typeof data.excerpt === 'string') {
      excerptMap = { [activeLang.value]: data.excerpt };
    }
  }

  editData.value = {
    ...editData.value,
    id: data.id,
    slug: data.slug || '',
    is_published: data.is_published,
    is_pinned: data.is_pinned || false,
    featured_image: data.featured_image || null,
    title: { ...editData.value.title, ...titleMap },
    excerpt: { ...editData.value.excerpt, ...excerptMap },
    reference: referenceStr,
    content: { ...editData.value.content, ...data.content || data.contents },
  };

  // Ensure slug is set (fallback to id if somehow missing, though DB enforces)
  if (!editData.value.slug && data.slug) editData.value.slug = data.slug;

  // Reset manual edit flag when loading existing data
  isSlugManuallyEdited.value = false;

  // Ensure all langs exist
  const langs = [targetLang.value, sourceLang.value];
  langs.forEach((l) => {
    if (!editData.value.title[l]) editData.value.title[l] = '';
    if (!editData.value.excerpt[l]) editData.value.excerpt[l] = '';
    if (!editData.value.content[l])
      editData.value.content[l] = {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      };
  });

  initTiptap(); // Re-init needed to load content after data set? No, initTiptap reads from editData.
  // But wait, initTiptap uses activeLang. Ensure activeLang is valid? Yes.

  // Force editor update
  if (editor.value) {
    editor.value.commands.setContent(editData.value.content[activeLang.value]);
  } else {
    initTiptap();
  }
};

const handleBack = () => {
  // 1. Destroy Editor Instance to prevent memory leaks or state holding
  destroyEditor();

  // 2. Reset Core State
  currentArticle.value = null;
  isCreating.value = false;

  // 3. Reset UI/Error State (Critical to prevent "ghost" errors)
  activeLang.value = languageStore.selectedAsal?.kodeBahasa || 'id';
  langStatus.value = {};
  langErrors.value = {};
  error.value = null;

  // 4. Reset Editor Data to clean slate
  initEditorData();

  if (props.isPublicView) {
    // Always sync URL back to list when closing an article in public view
    router.push('/articles');
    return;
  }

  if (props.article) {
    // If we were passed an article prop (embedded mode), just emit back
    emit('back');
  } else {
    // If in Manager mode, refresh list
    fetchArticles();
  }
};

const initEditorData = () => {
  editData.value = {
    slug: '',
    is_published: false,
    is_pinned: false,
    featured_image: null,
    title: { [targetLang.value]: '', [sourceLang.value]: '' },
    excerpt: { [targetLang.value]: '', [sourceLang.value]: '' },
    reference: '',
    content: {
      [targetLang.value]: { type: 'doc', content: [{ type: 'paragraph' }] },
      [sourceLang.value]: { type: 'doc', content: [{ type: 'paragraph' }] },
    },
  };
  isSlugManuallyEdited.value = false; // Reset modification flag on new init
};

// --- SLUG LOGIC ---
const generateSlug = (text: string) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start
    .replace(/-+$/, ''); // Trim - from end
};

const regenerateSlug = () => {
  // Force regeneration from current title, prioritizing English (en) - User Requirement
  const currentTitle =
    editData.value.title['en'] ||
    editData.value.title['id'] || // Fallback to ID if EN missing
    editData.value.title[activeLang.value] || // Fallback to current
    '';
  if (currentTitle) {
    editData.value.slug = generateSlug(currentTitle);
    isSlugManuallyEdited.value = true; // Mark as edited so it doesn't auto-change anymore unless requested
  }
};

watch(
  () => editData.value.title,
  (newTitles) => {
    // if (!isCreating.value) return; // Removed to allow always updating slug based on English title as per user request
    if (isSlugManuallyEdited.value) return; // Don't overwrite if user touched it

    // Prioritize English title for slug, always use English if available
    const relevantTitle = newTitles['en'];
    // Only generate if English title is present
    if (relevantTitle) {
      editData.value.slug = generateSlug(relevantTitle);
    }
  },
  { deep: true },
);

// --- LANGUAGE REACTION LOGIC ---
watch(
  () => languageStore.selectedAsal?.kodeBahasa,
  async (newLang, oldLang) => {
    // Only react in Public View. Admin view uses tabs causing conflicts if we auto-switch here.
    if (!props.isPublicView || !newLang || newLang === oldLang) return;

    activeLang.value = newLang;

    if (currentArticle.value) {
      // If viewing an article, refetch to get the translation for the new language
      // We use the slug from the current data to ensure we fetch the right article
      const slug = editData.value.slug || currentArticle.value.slug;
      if (slug) {
        await selectArticleBySlug(slug as string);
      }
    } else if (!isCreating.value) {
      // If in list view, refetch the list to update titles/excerpts
      await fetchArticles();
    }
  }
);

// editor already defined above





const destroyEditor = () => {
  if (editor.value) {
    editor.value.destroy();
    editor.value = null;
  }
};

onBeforeUnmount(() => {
  destroyEditor();
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

const initTiptap = () => {
  destroyEditor();

  editor.value = new Editor({
    content: editData.value.content[activeLang.value] || { type: 'doc', content: [{ type: 'paragraph' }] },
    editable: !props.isPublicView,
    extensions: [
      Document,
      Paragraph,
      Text,
      Bold,
      Italic,
      Heading.configure({ levels: [1, 2, 3] }),
      BulletList,
      OrderedList,
      ListItem,
      Blockquote,
      HorizontalRule,
      HardBreak,
      History,
      CustomImage,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Mulai menulis artikel...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Strike,
      Dropcursor,
      Gapcursor,
      BarChartNode,
    ],
    editorProps: {
      handlePaste: (view, event) => props.isPublicView, // Suppress paste in public
      handleDrop: (view, event, _slice, moved) => props.isPublicView, // Suppress drop in public
      ...(props.isPublicView ? {} : {
        handlePaste(view, event) {
          const items = Array.from(event.clipboardData?.items || []);
          const imageItem = items.find(item => item.type.startsWith('image/'));

          if (imageItem) {
            const file = imageItem.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const src = e.target?.result as string;
                if (src && editor.value) {
                  editor.value.chain().focus().setImage({ src }).run();
                }
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
          return false;
        },
        handleDrop(view, event, _slice, moved) {
          if (!moved && event.dataTransfer?.files.length) {
            const file = event.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const src = e.target?.result as string;
                if (src && editor.value) {
                  editor.value.chain().focus().setImage({ src }).run();
                }
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
          return false;
        },
      }),
    },
    onUpdate: ({ editor }) => {
      if (activeLang.value) {
        editData.value.content[activeLang.value] = editor.getJSON();
      }
    },
  });
};

// Watch for slug changes (e.g. browser back/forward or direct URL change)
watch(() => props.articleSlug, (newSlug) => {
  if (props.isPublicView && newSlug && (!currentArticle.value || currentArticle.value.slug !== newSlug)) {
    selectArticleBySlug(newSlug);
  }
});

const switchLanguage = async (langCode: string) => {
  activeLang.value = langCode;

  // In public view, if content for this language is missing, fetch it
  if (props.isPublicView && currentArticle.value && !editData.value.content[langCode]) {
    try {
      const url = `/articles/${currentArticle.value.slug}`;
      const res = await api.get(url, { params: { lang: langCode } });
      loadArticleData(res.data);
    } catch (err) {
      console.error('Failed to fetch article language content:', err);
    }
  }

  if (editor.value) {
    editor.value.commands.setContent(editData.value.content[langCode] || { type: 'doc', content: [{ type: 'paragraph' }] });
  }
};

// --- WATCHERS ---

// Watch for global language changes in public view
watch(() => languageStore.selectedAsal?.kodeBahasa, (newLang) => {
  if (props.isPublicView && newLang) {
    // Switch content language to match global app language (Source Language / Asal)
    switchLanguage(newLang);

    if (!currentArticle.value && !props.article && !props.articleSlug) {
      // refresh list if in list mode (ONLY if no slug is provided)
      fetchArticles();
    }
  }
}, { immediate: true });

const saveArticle = async (silent = false, skipValidation = false) => {
  if (isSaving.value) return;

  // Basic validation (unless skipped)
  // We skip validation during Regen because the user might be regenerating an empty/invalid target language
  // and we only need to ensure the Source is saved (which is usually validated before switching tabs or handled by backend)
  const currentTitle = editData.value.title[activeLang.value];
  if (!skipValidation && !currentTitle) {
    error.value = `Judul (${activeLang.value.toUpperCase()}) wajib diisi!`;
    return;
  }

  // Auto-generate slug if empty (and not manually edited preference if we tracked it per save, but here we just check emptiness)
  if (!editData.value.slug && currentTitle) {
    editData.value.slug = generateSlug(currentTitle);
  }
  // Fallback slug if completely empty and skipping validation
  if (!editData.value.slug && skipValidation) {
    // Only if we definitely need a slug (new article)? 
    // If existing, backend keeps old slug.
    // If new, we might fail backend validation if slug is missing.
    // Try to generate from Source Lang if possible
    const sourceTitle = editData.value.title['id'] || editData.value.title[sourceLang.value];
    if (sourceTitle) editData.value.slug = generateSlug(sourceTitle);
  }

  isSaving.value = true;
  error.value = null;

  try {
    // Construct payload for Admin API
    // Must contain 'translations' map and general fields
    const translationsMap: Record<string, any> = {};
    const allLangs = availableLanguages.value.map(l => l.lang_code);

    allLangs.forEach((lang) => {
      const t = editData.value.title[lang];
      const e = editData.value.excerpt[lang];
      if (t || e) {
        translationsMap[lang] = {
          title: t || '',
          excerpt: e || '',
        };
      }
    });

    const payload = {
      slug: editData.value.slug || undefined,
      translations: translationsMap,
      contents: editData.value.content,
      featured_image: editData.value.featured_image,
      is_published: editData.value.is_published,
      is_pinned: editData.value.is_pinned,
      author_id: editData.value.author_id,
      reference: editData.value.reference,
    };

    console.log('Saving Article Payload:', payload);

    let savedData;
    if (isCreating.value) {
      const res = await api.post('/admin/articles', payload);
      savedData = res.data;

      // Update local state to switch from Create to Edit mode without closing
      isCreating.value = false;
      currentArticle.value = savedData;
      editData.value.id = savedData.id;
      // Ensure slug is synced if backend changed it
      if (savedData.slug) editData.value.slug = savedData.slug;
    } else {
      const res = await api.put(`/admin/articles/${editData.value.id}`, payload);
      savedData = res.data;
    }

    // Notify success
    if (!silent) {
      openAppModal({
        title: 'Berhasil',
        message: 'Artikel berhasil disimpan.',
        type: 'success'
      });
    }
  } catch (err: any) {
    error.value = 'Gagal menyimpan: ' + err.message;
    console.error(err);
    // Re-throw if it was a silent save (internal) so caller knows it failed
    if (silent) throw err;
  } finally {
    isSaving.value = false;
  }
};

/* --- TRANSLATION LOGIC --- */

const performTranslation = async () => {
  // Check if saved
  const id = currentArticle.value?.id || editData.value.id;
  if (!id) {
    openAppModal({
      title: 'Peringatan',
      message: 'Mohon simpan artikel terlebih dahulu sebelum menerjemahkan.',
      type: 'error',
    });
    return;
  }

  // Ensure ANCHOR_LANG exists
  const ANCHOR_LANG = 'id';
  if (!editData.value.title[ANCHOR_LANG]) {
    openAppModal({
      title: 'Error',
      message: `Konten Utama (Bahasa Indonesia) belum diisi. Mohon lengkapi tab 'Indonesia' sebagai acuan.`,
      type: 'error'
    });
    return;
  }

  // Force Switch to Anchor Lang so user sees the source
  if (activeLang.value !== ANCHOR_LANG) {
    switchLanguage(ANCHOR_LANG);
  }

  // Collect all other languages as targets
  const source = ANCHOR_LANG;
  const selectedLangs = availableLanguages.value
    .filter((l) => l.lang_code !== source)
    .map((l) => l.lang_code);

  if (selectedLangs.length === 0) {
    openAppModal({
      title: 'Peringatan',
      message:
        'Tidak ada bahasa tujuan yang tersedia. Tambahkan bahasa lain di sistem.',
      type: 'error',
    });
    return;
  }

  openAppModal({
    title: 'Konfirmasi Penerjemahan AI',
    message: `Apakah Anda yakin ingin menerjemahkan artikel ini ke ${selectedLangs.length} bahasa lain? Proses ini menggunakan AI.`,
    type: 'confirm',
    actionLabel: 'Ya, Terjemahkan',
    action: async () => {
      isTranslating.value = true;
      translatingLanguages.value = [...selectedLangs];

      // Set status to loading for selected langs
      selectedLangs.forEach(code => {
        langStatus.value[code] = 'loading';

        // --- RESET CONTENT BEFORE REGEN ---
        // Clear local content to indicate work in progress
        // This ensures the user sees the old content is gone and new content is coming
        editData.value.content[code] = { type: 'doc', content: [{ type: 'paragraph' }] };

        // If we are currently viewing this tab, clear the editor immediately
        if (activeLang.value === code && editor.value) {
          editor.value.commands.clearContent();
        }
      });

      try {
        // --- PREVIEW-ONLY MODE (Logic Modified) ---
        // 1. We keep proper clean-up of local state (optional, but good for UI consistency)
        // STRICT POLICY: We do NOT save the "clean up" to DB automatically anymore.
        // User must click save.

        const keepOnlyAnchor = (map: Record<string, any>) => {
          const newMap: Record<string, any> = {};
          if (map[ANCHOR_LANG]) newMap[ANCHOR_LANG] = map[ANCHOR_LANG];
          return newMap;
        };

        // Update LOCAL state only (cleaning other langs)
        // NOTE: If user refreshes page, old data returns. This is intended "Preview" behavior.
        editData.value.title = keepOnlyAnchor(editData.value.title);
        editData.value.excerpt = keepOnlyAnchor(editData.value.excerpt);
        editData.value.content = keepOnlyAnchor(editData.value.content);

        // --- PARALLEL TRANSLATION STEP ---
        const translationPromises = selectedLangs.map(async (langCode) => {
          try {
            // 1. Trigger Translation calling backend
            // Extract CURRENT source content as HTML for direct translation
            const sourceHtml = editor.value ? editor.value.getHTML() : "";

            const patchRes = await api.patch(`/admin/articles/${id}`, {
              target_languages: [langCode],
              scopes: ['metadata', 'content'],
              source_override: {
                title: editData.value.title[ANCHOR_LANG] || "",
                excerpt: editData.value.excerpt[ANCHOR_LANG] || "",
                content_html: sourceHtml
              }
            });
            const patchData = patchRes.data;

            // Check for failure
            if (patchData.failed_languages && patchData.failed_languages[langCode]) {
              const failReason = patchData.failed_languages[langCode];
              console.error(`Translation failed for ${langCode}: ${failReason}`);
              langStatus.value[langCode] = 'error';
              langErrors.value[langCode] = failReason;
              return;
            }

            // 2. USE PREVIEW DATA from Response (No DB Fetch)
            if (patchData.preview_translations && patchData.preview_translations[langCode]) {
              const transHdr = patchData.preview_translations[langCode];
              let transContent = patchData.preview_contents[langCode];

              // --- CONVERT HTML BACK TO JSON (If returned as string) ---
              if (typeof transContent === 'string' && editor.value) {
                // Use TipTap's generateJSON if it's a raw HTML string from AI
                // Since we don't have direct access to generateJSON global here without imports,
                // we can use a temporary editor instance or TipTap's internal parser if available.
                // Standard way in TipTap: editor.commands.setContent(html) handles it automatically.
                // But we need the JSON for the editData state.

                // We'll set content to editor first, then get JSON
                if (activeLang.value === langCode) {
                  editor.value.commands.setContent(transContent);
                  transContent = editor.value.getJSON();
                } else {
                  // Temporary method: setContent handles HTML -> JSON mapping internally
                  // We update editData.content as the raw HTML string first, then 
                  // it will be converted when the user switches to that tab.
                  // However, it's safer to have JSON in the state.

                  // Tip: Since we are in the component, we can use the editor to convert
                  const currentContent = editor.value.getJSON();
                  editor.value.commands.setContent(transContent);
                  const jsonResult = editor.value.getJSON();
                  editor.value.commands.setContent(currentContent); // Restore
                  transContent = jsonResult;
                }
              }

              // VALIDATION: Ensure we actually got content
              if (!transHdr.title || !transHdr.title.trim()) {
                langStatus.value[langCode] = 'error';
                langErrors.value[langCode] = "Hasil terjemahan judul kosong";
                return;
              }

              langStatus.value[langCode] = 'success';

              // 3. Update Local Data incrementally
              editData.value.title[langCode] = transHdr.title;
              editData.value.excerpt[langCode] = transHdr.excerpt;
              if (transContent) {
                editData.value.content[langCode] = transContent;

                // Immediate refresh if user is currently looking at this language tab
                if (langCode === activeLang.value && editor.value) {
                  editor.value.commands.setContent(transContent);
                }
              }
            } else {
              langStatus.value[langCode] = 'error';
              langErrors.value[langCode] = "No preview data returned";
            }

          } catch (innerErr: any) {
            console.error(`Translation failed for ${langCode}:`, innerErr);
            langStatus.value[langCode] = 'error';
            langErrors.value[langCode] = innerErr.response?.data?.error || innerErr.message;
          }
        });

        // Wait for ALL to finish (regardless of success/fail)
        await Promise.allSettled(translationPromises);
        // 5. Final Refresh Editor Content if current lang was updated during process
        if (editor.value) {
          const content = editData.value.content[activeLang.value];
          if (content) {
            editor.value.commands.setContent(content);
          }
        }

        // Check if any failed
        const hasErrors = Object.values(langStatus.value).some(status => status === 'error');

        openAppModal({
          title: hasErrors ? 'Selesai (Dengan Error)' : 'Selesai',
          message: hasErrors
            ? 'Penerjemahan selesai dengan beberapa error:\n\n' +
            Object.entries(langErrors.value)
              .filter(([_, msg]) => msg) // Ensure message is not empty
              .map(([code, msg]) => `• ${code.toUpperCase()}: ${msg}`)
              .join('\n')
            : 'Penerjemahan AI selesai untuk semua bahasa.',
          type: hasErrors ? 'info' : 'success',
        });

      } catch (err) {
        // catch logic for outer Setup block (e.g. saveArticle failed)
        console.error('Setup failed:', err);
        openAppModal({
          title: 'Gagal',
          message: 'Gagal memulai penerjemahan: ' + err.message,
          type: 'error',
        });
      } finally {
        isTranslating.value = false;
        translatingLanguages.value = [];
      }
    },
  });
};

// --- REGENERATION LOGIC (Single Language) ---
const regenerateCurrentLanguage = async () => {
  if (activeLang.value === sourceLang.value || activeLang.value === 'id') {
    // Should not happen as button is hidden, but safety check
    return;
  }

  // 1. Confirm First
  openAppModal({
    title: 'Regenerate Terjemahan?',
    message: `Terjemahan untuk bahasa ${activeLang.value.toUpperCase()} akan dibuat ulang dari awal. Konten saat ini akan dihapus. Lanjutkan?`,
    type: 'confirm',
    actionLabel: 'Ya, Buat Ulang',
    action: async () => {
      isTranslating.value = true;
      langStatus.value[activeLang.value] = 'loading';

      try {
        // --- RESET CONTENT BEFORE REGEN ---
        editData.value.content[activeLang.value] = { type: 'doc', content: [{ type: 'paragraph' }] };
        if (editor.value) {
          editor.value.commands.clearContent();
        }

        // STRICT: No Auto-Save. User wants Regen to run anytime without forcing save.
        // Backend will use whatever is in DB for source. 
        // If user has unsaved source changes, they won't be reflected in regen (unless backend supports ephemeral source).
        // But this matches user request "jangan pernah force save".

        // 2. Call API (Preview Mode) with Source Override
        // Send current Source Content (from Editor/State) to backend so we don't need to save to DB first.
        const sourceLangCode = 'id'; // hardcoded or sourceLang.value
        const sourceTitle = editData.value.title[sourceLangCode] || "";
        const sourceExcerpt = editData.value.excerpt[sourceLangCode] || "";

        // Get Source Content as HTML (if available in editor or state)
        let sourceHtml = "";
        if (activeLang.value === sourceLangCode && editor.value) {
          sourceHtml = editor.value.getHTML();
        } else {
          // If not currently on source tab, we temporarily set and get HTML
          // This is slightly heavy but ensures we get the latest HTML structure
          if (editor.value) {
            const currentJSON = editor.value.getJSON();
            editor.value.commands.setContent(editData.value.content[sourceLangCode]);
            sourceHtml = editor.value.getHTML();
            editor.value.commands.setContent(currentJSON); // Restore
          }
        }

        const patchRes = await api.patch(`/admin/articles/${currentArticle.value?.id || editData.value.id}`, {
          target_languages: [activeLang.value],
          scopes: ['metadata', 'content'],
          source_override: {
            title: sourceTitle,
            excerpt: sourceExcerpt,
            content_html: sourceHtml
          }
        });
        const patchData = patchRes.data;

        // 3. Handle Result
        if (patchData.failed_languages && patchData.failed_languages[activeLang.value]) {
          throw new Error(patchData.failed_languages[activeLang.value]);
        }

        if (patchData.preview_translations && patchData.preview_translations[activeLang.value]) {
          langStatus.value[activeLang.value] = 'success';

          const transHdr = patchData.preview_translations[activeLang.value];
          let transContent = patchData.preview_contents[activeLang.value];

          // --- CONVERT HTML BACK TO JSON ---
          if (typeof transContent === 'string' && editor.value) {
            const currentJSON = editor.value.getJSON();
            editor.value.commands.setContent(transContent);
            const jsonResult = editor.value.getJSON();
            // If we are currently on the tab, we leave the content. 
            // Otherwise restore.
            if (activeLang.value !== activeLang.value) { // wait, this logic is inside regen for activeLang
              // Since it's for activeLang, we don't restore.
            }
            transContent = jsonResult;
          }

          // Update Local Data
          editData.value.title[activeLang.value] = transHdr.title;
          editData.value.excerpt[activeLang.value] = transHdr.excerpt;
          if (transContent) {
            editData.value.content[activeLang.value] = transContent;
            if (editor.value) {
              // Already set during conversion above, but to be sure:
              editor.value.commands.setContent(transContent);
            }
          }

          // Notify Success (Toast)
          openAppModal({
            title: 'Berhasil',
            message: 'Terjemahan berhasil dibuat ulang.',
            type: 'success'
          });
        } else {
          throw new Error("No preview data returned from AI.");
        }

      } catch (e: any) {
        console.error("Regen Failed:", e);
        langStatus.value[activeLang.value] = 'error';
        langErrors.value[activeLang.value] = e.message || "Gagal membuat ulang terjemahan.";

        openAppModal({
          title: 'Gagal Regenerate',
          message: e.message || "Terjadi kesalahan saat menghubungi AI.",
          type: 'error'
        });
      } finally {
        isTranslating.value = false;
      }
    }
  });
};

// --- IMAGE LOGIC ---
// Copied from ManajemenMateri logic

const addImage = () => {
  if (isReadOnly.value) return;
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
    onConfirm: (data: any) => {
      if (data.file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target?.result as string;
          if (editor.value && src)
            editor.value.chain().focus().setImage({ src }).run();
        };
        reader.readAsDataURL(data.file);
      } else if (data.url) {
        const url = String(data.url).trim();
        if (url && editor.value) {
          try {
            editor.value.chain().focus().setImage({ src: url }).run();
          } catch (err) {
            console.error("Failed to insert image from URL", err);
            openAppModal({ title: "Error", message: "Gagal menyisipkan gambar dari URL.", type: "error" });
          }
        }
      }
      closeGenericModal();
    },
  };
  showGenericModal.value = true;
};

const insertTable = () => {
  if (isReadOnly.value || !editor.value) return;
  editor.value.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
};

const addFeaturedImage = () => {
  if (isReadOnly.value) return;
  modalInputs.value = { url: '', file: null };
  modalConfig.value = {
    title: 'Atur Gambar Sampul (Cover)',
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
    onConfirm: (data: any) => {
      if (data.file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const res = e.target?.result as string;
          if (res) editData.value.featured_image = res;
        };
        reader.readAsDataURL(data.file);
      } else if (data.url) {
        const url = String(data.url).trim();
        if (url) editData.value.featured_image = url;
      }
      closeGenericModal();
    },
  };
  showGenericModal.value = true;
};

const closeGenericModal = () => {
  showGenericModal.value = false;
  modalConfig.value = {};
  modalInputs.value = {};
};
const handleModalConfirm = () => {
  if (modalConfig.value.onConfirm)
    modalConfig.value.onConfirm(modalInputs.value);
};

const insertLink = () => {
  if (isReadOnly.value || !editor.value) return;
  const previousUrl = editor.value.getAttributes('link').href || '';
  modalInputs.value = { url: previousUrl };
  modalConfig.value = {
    title: 'Tambahkan Link',
    inputs: [
      {
        key: 'url',
        label: 'URL',
        type: 'text',
        placeholder: 'https://example.com',
      },
    ],
    onConfirm: (data) => {
      if (data.url === '') {
        editor.value.chain().focus().extendMarkRange('link').unsetLink().run();
      } else {
        editor.value
          .chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: data.url })
          .run();
      }
      closeGenericModal();
    },
  };
  showGenericModal.value = true;
};
// Initial Load Logic
onMounted(() => {
  // If public view and we have a slug, load it directly
  if (props.isPublicView && props.articleSlug) {
    isLoadingList.value = true; // Prevent list flicker
    selectArticleBySlug(props.articleSlug);
  } else if (props.isPublicView) {
    // If list view (no slug), explicitly fetch list
    fetchArticles();
  }
});
</script>

<style>
/* Global override for ProseMirror in RTL mode */
.prose[dir="rtl"] {
  text-align: right;
  direction: rtl;
}

/* 1. Reset Padding untuk List */
.prose[dir="rtl"] ul,
.prose[dir="rtl"] ol {
  padding-left: 0;
  padding-right: 1.75em;
  /* Ruang untuk bullet/nomor di kanan */
  margin-right: 0;
  margin-left: 0;
  list-style-position: outside;
  /* Supaya nomor sejajar dengan indentasi heading/teks */
}

/* 2. Atur Item List agar rata kanan */
.prose[dir="rtl"] li {
  padding-right: 0.5em;
  padding-left: 0;
  text-align: right;
}

/* 3. Paksa Nomor List menjadi Angka Arab Timur (١, ٢, ٣) */
.prose[dir="rtl"] ol {
  list-style-type: arabic-indic;
}

/* 4. Perbaiki posisi Marker (Bullet/Nomor) untuk Tailwind Typography */
.prose[dir="rtl"] ul>li::marker,
.prose[dir="rtl"] ol>li::marker {
  direction: rtl;
  unicode-bidi: isolate;
  /* Pastikan warna kontras */
  color: var(--color-on-surface-variant);
}

/* 5. Heading & Paragraf */
.prose[dir="rtl"] h1,
.prose[dir="rtl"] h2,
.prose[dir="rtl"] h3,
.prose[dir="rtl"] h4,
.prose[dir="rtl"] p,
.prose[dir="rtl"] blockquote {
  text-align: right;
  direction: rtl;
}

/* 6. Blockquote Border di Kanan */
.prose[dir="rtl"] blockquote {
  border-left: none;
  border-right-width: 4px;
  border-right-color: var(--color-primary);
  padding-left: 1em;
  padding-right: 1em;
  border-radius: 0.5rem;
}

/* 7. Animated Checkmark (Global for Teleported Modals) */
.checkmark__circle {
  stroke-dasharray: 166;
  stroke-dashoffset: 166;
  stroke-width: 2;
  stroke-miterlimit: 10;
  stroke: var(--color-success);
  fill: none;
  animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}

.checkmark {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: block;
  stroke-width: 2;
  stroke: var(--color-surface-container-high);
  stroke-miterlimit: 10;
  margin: 0 auto;
  box-shadow: inset 0px 0px 0px var(--color-success);
  animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
}

.checkmark__check {
  transform-origin: 50% 50%;
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  stroke: var(--color-on-success);
  animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
}

@keyframes stroke {
  100% {
    stroke-dashoffset: 0;
  }
}

@keyframes scale {

  0%,
  100% {
    transform: none;
  }

  50% {
    transform: scale3d(1.1, 1.1, 1);
  }
}

@keyframes fill {
  100% {
    box-shadow: inset 0px 0px 0px 40px var(--color-success);
  }
}

/* Standard Material Dark Mode checkmark fix */
.dark .checkmark {
  stroke: var(--color-surface-container-high);
}

.dark .checkmark__check {
  stroke: var(--color-on-success);
}
</style>

<style scoped>
/* stylelint-disable */
/* @reference "tailwindcss"; */
/* Scrollbar hiding for cleaner UI */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Toolbar button styles */
/* Toolbar button styles */
.toolbar-btn {
  padding: 0.375rem;
  /* p-1.5 */
  border-radius: 0.25rem;
  /* rounded */
  transition-property: color, background_color, border-color, text-decoration-color, fill, stroke;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--color-on-surface-variant);
  flex-shrink: 0;
}

.toolbar-btn:hover {
  background-color: var(--color-surface-container-high);
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-btn.is-active {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}

.toolbar-btn .material-symbols-outlined {
  font-size: 1.125rem;
  /* text-lg */
  line-height: 1.75rem;
}

.toolbar-divider {
  width: 1px;
  height: 1.25rem;
  /* h-5 */
  background-color: var(--color-outline-variant);
  margin-left: 0.25rem;
  /* mx-1 */
  margin-right: 0.25rem;
  flex-shrink: 0;
}

.mask-right {
  mask-image: linear-gradient(to right, var(--color-scrim) 90%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, var(--color-scrim) 90%, transparent 100%);
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
</style>
