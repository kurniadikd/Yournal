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

  return (
    <div 
      onClick={props.onClick}
      class="p-6 rounded-[24px] bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] transition-colors cursor-pointer group hover:shadow-elevation-1"
    >
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
        <div class="flex flex-wrap gap-2 mt-3">
            <For each={tags()}>
                {(tag) => (
                    <span class="text-xs bg-[var(--color-surface)]/20 px-2 py-1 rounded-md font-medium">#{tag}</span>
                )}
            </For>
        </div>
      </Show>
    </div>
  );
};

export default ItemCatatan;
