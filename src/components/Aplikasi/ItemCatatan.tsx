import { Component } from 'solid-js';
import { Note } from '../../services/db';

interface ItemCatatanProps {
  note: Note;
  onClick: () => void;
}

const ItemCatatan: Component<ItemCatatanProps> = (props) => {
  return (
    <div 
      onClick={props.onClick}
      class="p-6 rounded-[24px] bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] transition-colors cursor-pointer group hover:shadow-elevation-1"
    >
      <div class="flex items-start justify-between mb-2">
        <h3 class="text-xl font-semibold inherit line-clamp-1">{props.note.title}</h3>
        <span class="text-2xl font-emoji">{props.note.mood}</span>
      </div>
      <div class="flex items-center gap-3 text-sm opacity-80 mb-0">
        <span class="flex items-center gap-1">
          <span class="material-symbols-rounded text-[18px]">calendar_today</span>
          {props.note.date}
        </span>
        <span class="flex items-center gap-1">
          <span class="material-symbols-rounded text-[18px]">schedule</span>
          {props.note.time}
        </span>
      </div>

    </div>
  );
};

export default ItemCatatan;
