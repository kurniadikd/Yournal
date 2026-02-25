import { Component, createMemo, Show, For } from 'solid-js';
import { Note } from '../../services/db';
import { getWeatherDescription } from '../../utils/weather';
import { formatTime } from '../../utils/date';

interface ItemCatatanProps {
  note: Note;
  onClick: () => void;
}

const ItemCatatan: Component<ItemCatatanProps> = (props) => {
  const location = createMemo(() => {
    try {
        return props.note.location ? JSON.parse(props.note.location) : null;
    } catch (e) { return null; }
  });

  const weather = createMemo(() => {
    try {
        return props.note.weather ? JSON.parse(props.note.weather) : null;
    } catch (e) { return null; }
  });

  const tags = createMemo(() => {
    try {
        return props.note.tags ? JSON.parse(props.note.tags) : [];
    } catch (e) { return []; }
  });

  const images = createMemo(() => {
    const content = props.note.content || "";
    // Regex to match src attribute of img tags
    const _images: string[] = [];
    const regex = /<img[^>]+src="([^">]+)"/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match[1]) {
        _images.push(match[1]);
      }
    }
    return _images;
  });

  return (
    <div 
      onClick={props.onClick}
      class="p-6 rounded-[24px] bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] transition-colors cursor-pointer group hover:shadow-elevation-1"
    >
      {/* Image Gallery */}
      <Show when={images().length > 0}>
        <div class="flex items-center gap-2 mb-4 overflow-x-auto custom-scrollbar pb-2 z-10 relative">
          <For each={images()}>
            {(src) => (
              <img 
                src={src} 
                alt="Catatan Gambar" 
                class="w-16 h-16 rounded-xl object-cover shrink-0 border border-[var(--color-outline-variant)]/50 bg-[var(--color-surface-container)]"
                loading="lazy"
              />
            )}
          </For>
        </div>
      </Show>

      <div class="flex items-start justify-between mb-2">
        <h3 class="text-xl font-medium inherit line-clamp-1">{props.note.title}</h3>
        <span class="text-2xl font-emoji">{props.note.mood}</span>
      </div>
      <div class="flex flex-wrap items-center gap-4 text-sm opacity-80 mb-0">
        <span class="flex items-center gap-1">
          <span class="material-symbols-rounded text-[18px]">schedule</span>
          {formatTime(new Date(`${props.note.date}T${props.note.time}`))}
        </span>
        
        <Show when={location()}>
            <span class="flex items-center gap-1 max-w-[150px]" title={location()?.name}>
              <span class="material-symbols-rounded text-[18px]">location_on</span>
              <span class="truncate">{location()?.name}</span>
            </span>
        </Show>

        <Show when={weather()}>
            <span class="flex items-center gap-1" title={weather()?.desc}>
              <span class="material-symbols-rounded text-[18px]">
                {getWeatherDescription(weather()!.code).icon}
              </span>
              {weather()?.temp}°C
            </span>
        </Show>
      </div>
      
      <Show when={tags().length > 0}>
        <div class="flex flex-wrap gap-1.5 mt-3">
            <For each={tags()}>
                {(tag) => (
                    <span class="inline-flex items-center gap-0.5 h-6 px-2.5 rounded-full text-[11px] font-medium bg-[var(--color-on-primary-container)] text-[var(--color-primary-container)]">
                      <span class="opacity-70">#</span>{tag}
                    </span>
                )}
            </For>
        </div>
      </Show>
    </div>
  );
};

export default ItemCatatan;
