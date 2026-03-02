import { For, Show } from "solid-js";
import Popover from "./Popover";

interface MoodPickerProps {
  show: boolean;
  onClose: () => void;
  anchor: HTMLElement | undefined;
  onSelect: (emoji: string) => void;
  selected?: string;
}

const MOODS = [
  { emoji: "🥳", label: "Sangat Bersemangat" },
  { emoji: "😊", label: "Senang" },
  { emoji: "😐", label: "Biasa Saja" },
  { emoji: "😔", label: "Sedih" },
  { emoji: "😭", label: "Sangat Sedih" },
  { emoji: "😟", label: "Cemas" },
  { emoji: "😡", label: "Marah" },
  { emoji: "🤯", label: "Stress Berat" },
  { emoji: "🥱", label: "Lelah" },
  { emoji: "🤢", label: "Kurang Sehat" }
];

export default function MoodPicker(props: MoodPickerProps) {
  return (
    <Popover
      show={props.show}
      onClose={props.onClose}
      anchor={props.anchor}
      placement="bottom-start"
      class="p-2 shadow-elevation-3 bg-[var(--color-surface-container)] rounded-2xl z-[10005] flex flex-col min-w-[200px]"
    >
      <div class="flex flex-col gap-1">
        <For each={MOODS}>
          {(mood) => (
            <button
              onClick={() => {
                if (props.selected === mood.emoji) {
                  props.onSelect("");
                } else {
                  props.onSelect(mood.emoji);
                }
                props.onClose();
              }}
              class={`
                flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 w-full text-left group
                ${props.selected === mood.emoji
                  ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]'
                  : 'hover:bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)]'}
              `}
              title={mood.label}
            >
              <span class="text-2xl font-emoji leading-none pb-[2px]">{mood.emoji}</span>
              <span class={`text-sm font-medium ${props.selected === mood.emoji ? 'font-semibold' : ''}`}>
                {mood.label}
              </span>
              <Show when={props.selected === mood.emoji}>
                 <span class="material-symbols-rounded text-lg ml-auto">check</span>
              </Show>
            </button>
          )}
        </For>
      </div>
    </Popover>
  );
}
