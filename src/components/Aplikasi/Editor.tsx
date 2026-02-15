import { createSignal, Show, createEffect, onCleanup } from "solid-js";
import { createTiptapEditor } from "solid-tiptap";
import { Portal } from "solid-js/web";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
// import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
// import Link from "@tiptap/extension-link";
// import Dropcursor from "@tiptap/extension-dropcursor";
import { SelectableImage } from "./extensions/SelectableImage";
import Highlight from "@tiptap/extension-highlight";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Heading from "@tiptap/extension-heading";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import CharacterCount from "@tiptap/extension-character-count";
import { LinkCard } from "./extensions/LinkCard";
import Popover from "../ui/m3e/Popover";
import MoodPicker from "../ui/m3e/MoodPicker";
import TableGrid from "./editor/TableGrid";
import { Table } from "./extensions/Table";
import { AudioPlayer } from "./extensions/AudioPlayer";

import Button from "../ui/m3e/Button";
import DatePicker from "../ui/m3e/DatePicker";
import TimePicker from "../ui/m3e/TimePicker";
import { formatDate, formatTime } from "../../utils/date";

import ImageModal from "../ui/m3e/ImageModal";
import LocationModal from "../ui/m3e/LocationModal";
import Modal from "../ui/m3e/Modal";
import { getWeatherDescription } from "../../utils/weather";
import { InsertAudio } from "./InsertAudio";

interface EditorProps {
  show: boolean;
  onClose: () => void;
  onSave?: (note: { title: string; content: string; mood: string; date: Date; location?: string; weather?: string }) => void;
  initialContent?: string;
  initialTitle?: string;
  initialMood?: string;
  initialDate?: Date;
  initialLocation?: string; // JSON String
  initialWeather?: string; // JSON String
}

export default function Editor(props: EditorProps) {
  let titleRef!: HTMLTextAreaElement;
  const [tableBtnRef, setTableBtnRef] = createSignal<HTMLButtonElement>();
  const [insertTableBtnRef, setInsertTableBtnRef] = createSignal<HTMLButtonElement>();
  const [emojiBtnRef, setEmojiBtnRef] = createSignal<HTMLButtonElement>();
  const [container, setContainer] = createSignal<HTMLDivElement>();
  const [updateTrigger, setUpdateTrigger] = createSignal(0);

  const [title, setTitle] = createSignal(props.initialTitle || "");
  const [entryDate, setEntryDate] = createSignal(new Date());
  const [location, setLocation] = createSignal<{ name: string; lat: number; lng: number } | null>(null);
  const [weather, setWeather] = createSignal<{ temp: number; code: number; desc: string } | null>(null);
  
  const [showDatePicker, setShowDatePicker] = createSignal(false);
  const [showTimePicker, setShowTimePicker] = createSignal(false);
  const [showImageModal, setShowImageModal] = createSignal(false);
  const [showLinkModal, setShowLinkModal] = createSignal(false);
  const [showMoodPicker, setShowMoodPicker] = createSignal(false);
  const [showLocationModal, setShowLocationModal] = createSignal(false);
  const [showAudioRecorder, setShowAudioRecorder] = createSignal(false);
  
  const [linkUrl, setLinkUrl] = createSignal('');
  const [tableMenuOpen, setTableMenuOpen] = createSignal(false);
  const [insertTableOpen, setInsertTableOpen] = createSignal(false);
  const [mood, setMood] = createSignal("");
  const [previewImageUrl, setPreviewImageUrl] = createSignal<string | null>(null);
  const [isPreviewZoomed, setIsPreviewZoomed] = createSignal(false);

  const handleSave = () => {
    const html = editor()?.getHTML() || '';
    if (props.onSave) {
      props.onSave({
        title: title(),
        content: html,
        mood: mood(),
        date: entryDate(),
        location: location() ? JSON.stringify(location()) : undefined,
        weather: weather() ? JSON.stringify(weather()) : undefined
      });
    }
    props.onClose();
  };

  // ... (Tiptap initialization omitted)

  const fetchWeather = async (lat: number, lng: number, date: Date) => {
    try {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const hour = date.getHours();

      // Check if date is historical (older than 7 days)
      const now = new Date();
      const isHistorical = (now.getTime() - date.getTime()) > 7 * 24 * 60 * 60 * 1000;
      
      const baseUrl = isHistorical 
        ? 'https://archive-api.open-meteo.com/v1/archive' 
        : 'https://api.open-meteo.com/v1/forecast';

      const url = `${baseUrl}?latitude=${lat}&longitude=${lng}&start_date=${dateStr}&end_date=${dateStr}&hourly=temperature_2m,weathercode&timezone=auto`;

      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.hourly && data.hourly.temperature_2m) {
        const temp = data.hourly.temperature_2m[hour];
        const code = data.hourly.weathercode[hour];
        
        if (temp !== undefined && code !== undefined) {
             const desc = getWeatherDescription(code);
             setWeather({ temp, code, desc: desc.label });
        }
      }
    } catch (e) {
      console.error("Failed to fetch weather", e);
    }
  };

  const handleLocationConfirm = (loc: { name: string; lat: number; lng: number } | null) => {
      setLocation(loc);
      if (loc) {
          fetchWeather(loc.lat, loc.lng, entryDate());
      } else {
          setWeather(null);
      }
  };

  const handleDateSelect = (date: Date) => {
      setEntryDate(date);
      if (location()) {
          fetchWeather(location()!.lat, location()!.lng, date);
      }
  };

  const handleTimeSelect = (hour: number, minute: number) => {
       const newDate = new Date(entryDate());
       newDate.setHours(hour);
       newDate.setMinutes(minute);
       setEntryDate(newDate);
       
       if (location()) {
          fetchWeather(location()!.lat, location()!.lng, newDate);
       }
  };

  createEffect(() => {
    if (props.show) {
      if (titleRef) setTimeout(resizeTitle, 0);
      
      setTitle(props.initialTitle || "");
      setMood(props.initialMood || "");
      setEntryDate(props.initialDate || new Date());
      
      if (props.initialLocation) {
        try {
            setLocation(JSON.parse(props.initialLocation));
        } catch (e) { setLocation(null); }
      } else {
        setLocation(null);
      }

      if (props.initialWeather) {
        try {
            setWeather(JSON.parse(props.initialWeather));
        } catch (e) { setWeather(null); }
      } else {
        setWeather(null);
      }
      
      const commands = editor()?.commands;
      if (commands) {
        commands.setContent(props.initialContent || "");
        commands.focus();
      }
    }
  });

  // ... (Toolbar buttons etc)



  const editor = createTiptapEditor(() => ({
    element: container() as HTMLElement,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        bold: false,
        italic: false,
        heading: false,
        dropcursor: false, // Configure dropcursor via StarterKit or disable it here if adding manually
      }),
      LinkCard,
      Bold,
      Italic,
      Heading.configure({
        levels: [1, 2, 3],
      }),
      SelectableImage.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          draggable: 'true',
        },
      }),
      // Dropcursor, // Already in StarterKit or we configure it there
      // Underline, // Warning says duplicate?
      // Link.configure({
      //   openOnClick: false,
      //   HTMLAttributes: {
      //     class: 'text-[var(--color-primary)] underline cursor-pointer',
      //   },
      // }),
      Highlight.configure({ 
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Apa yang Anda pikirkan?',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Subscript,
      Superscript,
      CharacterCount.configure({
        limit: 10000,
      }),
      Table, 
      AudioPlayer,
    ],
    content: props.initialContent || '',
    onTransaction: () => setUpdateTrigger(v => v + 1),
    onSelectionUpdate: () => setUpdateTrigger(v => v + 1),
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[500px] pb-32 w-full h-full prose-headings:mt-0 prose-p:my-0',
      },
    },
  }));

  const isActive = (nameOrAttrs: string | Record<string, any>, attrs?: any) => {
    updateTrigger(); // Dependency
    const ed = editor();
    if (!ed) return false;
    if (typeof nameOrAttrs === 'string') {
      return ed.isActive(nameOrAttrs, attrs);
    }
    return ed.isActive(nameOrAttrs);
  };

  const canUndo = () => {
    updateTrigger();
    return editor()?.can().undo();
  }

  const canRedo = () => {
    updateTrigger();
    return editor()?.can().redo();
  }

  const resizeTitle = () => {
    if (titleRef) {
      titleRef.style.height = 'auto';
      titleRef.style.height = titleRef.scrollHeight + 'px';
    }
  };

  createEffect(() => {
    if (props.show) {
      if (titleRef) setTimeout(resizeTitle, 0);
      
      // Sync state with props when editor opens
      setTitle(props.initialTitle || "");
      setMood(props.initialMood || "");
      setEntryDate(props.initialDate || new Date());
      
      if (props.initialLocation) {
        try {
            setLocation(JSON.parse(props.initialLocation));
        } catch (e) {
            console.error("Failed to parse location", e);
            setLocation(null);
        }
      } else {
        setLocation(null);
      }
      
      if (props.initialWeather) {
        try {
            setWeather(JSON.parse(props.initialWeather));
        } catch (e) { setWeather(null); }
      } else {
        setWeather(null);
      }
      
      // Sync Tiptap content
      const commands = editor()?.commands;
      if (commands) {
        commands.setContent(props.initialContent || "");
        commands.focus();
      }
    }
  });

  // Handle custom preview-image event from SelectableImage extension
  createEffect(() => {
    const el = container();
    if (el) {
      const handlePreview = (e: any) => {
        if (e.detail && e.detail.src) {
          setPreviewImageUrl(e.detail.src);
        }
      };
      el.addEventListener('preview-image', handlePreview);
      onCleanup(() => el.removeEventListener('preview-image', handlePreview));
    }
  });

  const ToolbarButton = (btnProps: { 
    icon: string, 
    action: () => void, 
    active?: boolean, 
    title?: string,
    disabled?: boolean 
  }) => (
    <button 
      onMouseDown={(e) => { e.preventDefault(); btnProps.action(); }}
      title={btnProps.title}
      disabled={btnProps.disabled}
      class={`
        flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 shrink-0
        ${btnProps.active 
          ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' 
          : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'}
        ${btnProps.disabled ? 'opacity-30 cursor-not-allowed' : ''}
      `}
    >
      <span class={`material-symbols-rounded text-[20px] ${btnProps.active ? 'icon-fill' : ''}`}>
        {btnProps.icon}
      </span>
    </button>
  );

  const Divider = () => <div class="w-[1px] h-5 bg-[var(--color-outline-variant)] mx-1 self-center shrink-0 opacity-50" />;



  const setLink = () => {
    const previousUrl = editor()?.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setShowLinkModal(true);
  };

  const handleLinkConfirm = (url: string) => {
    if (url === '') {
      editor()?.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      const { empty } = editor()?.state.selection || { empty: true };
      
      if (empty) {
        editor()?.chain().focus().insertContent({
          type: 'linkCard',
          attrs: { href: url }
        }).run();
      } else {
        editor()?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      }
    }
  };

  const addImage = () => {
    setShowImageModal(true);
  };

  const handleImageConfirm = (url: string) => {
    editor()?.chain().focus().setImage({ src: url }).run();
  };

  return (
    <Show when={props.show}>
      <div class="fixed inset-0 z-50 bg-[var(--color-background)] flex flex-col animate-in fade-in duration-300">
        
        {/* --- 1. STICKY HEADER & TOOLBAR --- */}
        <div class="sticky top-0 z-50 bg-[var(--color-surface)] border-b border-[var(--color-outline-variant)]/10">
          
          {/* Row 1: Action Buttons (Top) */}
          <div class="flex items-center justify-between px-4 py-2 border-b border-[var(--color-outline-variant)]/10">
            <div class="text-sm font-medium text-[var(--color-on-surface-variant)] opacity-70 ml-2">
               {/* Optional: Status or Title placeholder */}
            </div>
            <div class="flex items-center gap-1.5 sm:gap-2">
              <Button 
                variant="tonal" 
                onClick={props.onClose}
                class="!h-9 !w-9 !p-0 sm:!w-auto sm:!px-4 sm:!min-w-0 text-sm font-medium !rounded-lg shrink-0"
                title="Batal"
              >
                <span class="material-symbols-rounded !text-[20px] font-normal">close</span>
                <span class="hidden sm:inline sm:ml-2">Batal</span>
              </Button>
              <Button 
                variant="filled" 
                onClick={handleSave}
                class="!h-9 !w-9 !p-0 sm:!w-auto sm:!px-4 sm:!min-w-0 text-sm font-medium !rounded-lg shrink-0"
                title="Simpan"
              >
                <span class="material-symbols-rounded !text-[20px] font-normal">save</span>
                <span class="hidden sm:inline sm:ml-2">Simpan</span>
              </Button>
            </div>
          </div>

          {/* Row 2: Toolbar (Bottom) */}
          <div class="px-4 py-2 overflow-x-auto no-scrollbar bg-[var(--color-surface)]">
             <div class="flex items-center gap-1 min-w-max">
                <ToolbarButton icon="undo" action={() => editor()?.chain().focus().undo().run()} title="Undo" disabled={!canUndo()} />
                <ToolbarButton icon="redo" action={() => editor()?.chain().focus().redo().run()} title="Redo" disabled={!canRedo()} />
                
                <Divider />
                
                <ToolbarButton icon="format_bold" action={() => editor()?.chain().focus().toggleBold().run()} active={isActive('bold')} title="Bold" />
                <ToolbarButton icon="format_italic" action={() => editor()?.chain().focus().toggleItalic().run()} active={isActive('italic')} title="Italic" />
                <ToolbarButton icon="format_underlined" action={() => editor()?.chain().focus().toggleUnderline().run()} active={isActive('underline')} title="Underline" />
                <ToolbarButton icon="format_strikethrough" action={() => editor()?.chain().focus().toggleStrike().run()} active={isActive('strike')} title="Strike" />
                
                <Divider />

                <ToolbarButton icon="subscript" action={() => editor()?.chain().focus().toggleSubscript().run()} active={isActive('subscript')} title="Subscript" />
                <ToolbarButton icon="superscript" action={() => editor()?.chain().focus().toggleSuperscript().run()} active={isActive('superscript')} title="Superscript" />
                <ToolbarButton icon="border_color" action={() => editor()?.chain().focus().toggleHighlight({ color: 'var(--color-secondary-container)' }).run()} active={isActive('highlight')} title="Highlight" />
                
                <Divider />

                <div class="flex items-center gap-0.5 px-0.5">
                  <ToolbarButton 
                    icon="format_h1" 
                    action={() => editor()?.chain().focus().toggleHeading({ level: 1 }).run()} 
                    active={isActive('heading', { level: 1 })} 
                    title="Heading 1" 
                  />
                  <ToolbarButton 
                    icon="format_h2" 
                    action={() => editor()?.chain().focus().toggleHeading({ level: 2 }).run()} 
                    active={isActive('heading', { level: 2 })} 
                    title="Heading 2" 
                  />
                  <ToolbarButton 
                    icon="format_h3" 
                    action={() => editor()?.chain().focus().toggleHeading({ level: 3 }).run()} 
                    active={isActive('heading', { level: 3 })} 
                    title="Heading 3" 
                  />
                </div>
                
                <Divider />

                <ToolbarButton 
                  icon="format_align_left" 
                  action={() => (editor()?.chain().focus() as any).setTextAlign('left').run()} 
                  active={isActive({ textAlign: 'left' }) || (!isActive({ textAlign: 'center' }) && !isActive({ textAlign: 'right' }) && !isActive({ textAlign: 'justify' }))} 
                  title="Rata Kiri" 
                />
                <ToolbarButton icon="format_align_center" action={() => (editor()?.chain().focus() as any).setTextAlign('center').run()} active={isActive({ textAlign: 'center' })} title="Rata Tengah" />
                <ToolbarButton icon="format_align_right" action={() => (editor()?.chain().focus() as any).setTextAlign('right').run()} active={isActive({ textAlign: 'right' })} title="Rata Kanan" />
                <ToolbarButton icon="format_align_justify" action={() => (editor()?.chain().focus() as any).setTextAlign('justify').run()} active={isActive({ textAlign: 'justify' })} title="Rata Kiri-Kanan" />

                <ToolbarButton icon="format_list_bulleted" action={() => editor()?.chain().focus().toggleBulletList().run()} active={isActive('bulletList')} title="Bullet List" />
                <ToolbarButton icon="format_list_numbered" action={() => editor()?.chain().focus().toggleOrderedList().run()} active={isActive('orderedList')} title="Numbered List" />
                <ToolbarButton icon="checklist" action={() => editor()?.chain().focus().toggleTaskList().run()} active={isActive('taskList')} title="Task List" />
                
                <Divider />

                <ToolbarButton icon="format_quote" action={() => editor()?.chain().focus().toggleBlockquote().run()} active={isActive('blockquote')} title="Blockquote" />
                <ToolbarButton icon="horizontal_rule" action={() => editor()?.chain().focus().setHorizontalRule().run()} title="Garis Mendatar" />
                <ToolbarButton icon="image" action={addImage} title="Sisipkan Gambar" />
                <ToolbarButton icon="mic" action={() => setShowAudioRecorder(true)} title="Rekam Suara" />
                <ToolbarButton icon="link" action={setLink} active={isActive('link')} title="Tambah Link" />
                <ToolbarButton icon="link_off" action={() => editor()?.chain().focus().unsetLink().run()} disabled={!isActive('link')} title="Hapus Link" />

                <Divider />

                <button
                  ref={setTableBtnRef}
                  onMouseDown={(e) => { e.preventDefault(); setTableMenuOpen(!tableMenuOpen()); }}
                  class={`
                    flex items-center gap-1 h-9 px-3 rounded-lg transition-all duration-200 shrink-0
                    ${tableMenuOpen() || isActive('table') 
                      ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]' 
                      : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'}
                  `}
                >
                  <span class="material-symbols-rounded text-[20px]">table_chart</span>
                  <span class="text-sm font-medium">Tabel</span>
                  <span class="material-symbols-rounded text-[16px]">expand_more</span>
                </button>

                <Popover
                  show={tableMenuOpen()}
                  onClose={() => setTableMenuOpen(false)}
                  anchor={tableBtnRef()}
                  class="menu p-2 shadow-elevation-2 bg-[var(--color-surface-container)] rounded-box w-64 z-50 flex flex-col gap-1"
                >
                    <div class="flex flex-col gap-1">
                        {/* 1. Insert Grid Trigger */}
                        <button 
                          ref={setInsertTableBtnRef}
                          onMouseEnter={() => setInsertTableOpen(true)}
                          class={`
                            w-full text-left px-3 py-2.5 flex items-center justify-between rounded-lg transition-colors
                            ${insertTableOpen() ? 'bg-[var(--color-surface-container-highest)]' : 'hover:bg-[var(--color-on-surface-variant)]/[0.08]'}
                          `}
                        >
                           <div class="flex items-center gap-3">
                             <span class="material-symbols-rounded text-[20px]">grid_view</span>
                             <span class="text-sm font-medium text-[var(--color-on-surface)]">Sisipkan Tabel</span>
                           </div>
                           <span class="material-symbols-rounded text-[20px] text-[var(--color-on-surface-variant)]">chevron_right</span>
                        </button>

                        {/* Nested Popover for Grid */}
                        <Popover
                          show={insertTableOpen()}
                          onClose={() => setInsertTableOpen(false)}
                          anchor={insertTableBtnRef()}
                          placement="right-start"
                          class="p-2 shadow-elevation-2 bg-[var(--color-surface-container)] rounded-box z-[60]"
                        >
                           <div 
                              onMouseLeave={() => setInsertTableOpen(false)}
                           >
                              <TableGrid onConfirm={(rows, cols, withHeader) => {
                                  editor()?.chain().focus().insertTable({ rows, cols, withHeaderRow: withHeader }).run();
                                  setTableMenuOpen(false);
                                  setInsertTableOpen(false);
                              }} />
                           </div>
                        </Popover>

                        <div class="h-[1px] bg-[var(--color-outline-variant)] opacity-50 mx-2 my-1" />

                        {/* 2. Context Actions */}
                        <div class="flex flex-col gap-1">
                            <button 
                              disabled={!editor()?.can().addColumnBefore()}
                              onClick={() => { editor()?.chain().focus().addColumnBefore().run(); setTableMenuOpen(false); }}
                              class="flex items-center gap-3 px-4 py-2 text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] disabled:opacity-30 disabled:pointer-events-none text-left rounded-lg"
                            >
                               <span class="material-symbols-rounded text-[18px]">view_column</span> Tambah Kolom (Kiri)
                            </button>
                            <button 
                              disabled={!editor()?.can().addColumnAfter()}
                              onClick={() => { editor()?.chain().focus().addColumnAfter().run(); setTableMenuOpen(false); }}
                              class="flex items-center gap-3 px-4 py-2 text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] disabled:opacity-30 disabled:pointer-events-none text-left rounded-lg"
                            >
                               <span class="material-symbols-rounded text-[18px]">view_column</span> Tambah Kolom (Kanan)
                            </button>
                            <button 
                              disabled={!editor()?.can().deleteColumn()}
                              onClick={() => { editor()?.chain().focus().deleteColumn().run(); setTableMenuOpen(false); }}
                              class="flex items-center gap-3 px-4 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error-container)] disabled:opacity-30 disabled:pointer-events-none text-left rounded-lg"
                            >
                               <span class="material-symbols-rounded text-[18px]">delete_sweep</span> Hapus Kolom
                            </button>
                            
                            <div class="h-[1px] bg-[var(--color-outline-variant)] opacity-50 mx-2 my-1" />

                            <button 
                              disabled={!editor()?.can().addRowBefore()}
                              onClick={() => { editor()?.chain().focus().addRowBefore().run(); setTableMenuOpen(false); }}
                              class="flex items-center gap-3 px-4 py-2 text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] disabled:opacity-30 disabled:pointer-events-none text-left rounded-lg"
                            >
                               <span class="material-symbols-rounded text-[18px]">table_rows</span> Tambah Baris (Atas)
                            </button>
                            <button 
                              disabled={!editor()?.can().addRowAfter()}
                              onClick={() => { editor()?.chain().focus().addRowAfter().run(); setTableMenuOpen(false); }}
                              class="flex items-center gap-3 px-4 py-2 text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] disabled:opacity-30 disabled:pointer-events-none text-left rounded-lg"
                            >
                               <span class="material-symbols-rounded text-[18px]">table_rows</span> Tambah Baris (Bawah)
                            </button>
                            <button 
                              disabled={!editor()?.can().deleteRow()}
                              onClick={() => { editor()?.chain().focus().deleteRow().run(); setTableMenuOpen(false); }}
                              class="flex items-center gap-3 px-4 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error-container)] disabled:opacity-30 disabled:pointer-events-none text-left rounded-lg"
                            >
                               <span class="material-symbols-rounded text-[18px]">delete_sweep</span> Hapus Baris
                            </button>

                            <div class="h-[1px] bg-[var(--color-outline-variant)] opacity-50 mx-2 my-1" />

                            <button 
                              disabled={!editor()?.can().mergeCells()}
                              onClick={() => { editor()?.chain().focus().mergeCells().run(); setTableMenuOpen(false); }}
                              class="flex items-center gap-3 px-4 py-2 text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] disabled:opacity-30 disabled:pointer-events-none text-left rounded-lg"
                            >
                               <span class="material-symbols-rounded text-[18px]">merge</span> Merge / Split
                            </button>
                            <button 
                              disabled={!editor()?.can().deleteTable()}
                              onClick={() => { editor()?.chain().focus().deleteTable().run(); setTableMenuOpen(false); }}
                              class="flex items-center gap-3 px-4 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error-container)] disabled:opacity-30 disabled:pointer-events-none text-left rounded-lg"
                            >
                               <span class="material-symbols-rounded text-[18px]">delete_forever</span> Hapus Tabel
                            </button>
                        </div>
                    </div>
                </Popover>
             </div>
          </div>
        </div>

        {/* --- 2. MAIN SCROLLABLE AREA --- */}
        <div 
          class="flex-1 overflow-y-auto bg-[var(--color-background)] cursor-text"
          onClick={() => editor()?.commands.focus()}
        >
          <div 
            class="max-w-4xl mx-auto px-6 py-12 md:py-16 min-h-full flex flex-col"
            onClick={(e) => e.stopPropagation()} 
          >
            
            <textarea
              ref={titleRef}
              rows="1"
              placeholder="Tulis Judul..."
              value={title()}
              onInput={(e) => {
                setTitle(e.currentTarget.value);
                resizeTitle();
              }}
              class="w-full bg-transparent text-4xl font-extrabold text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)]/50 border-none outline-none resize-none overflow-hidden p-0 m-0 mb-4 leading-[1.2]"
            />

            <div class="flex flex-wrap items-center gap-2 mb-6 animate-in slide-in-from-bottom-2 duration-500">
               {/* Date Badge */}
               <button 
                 onClick={() => setShowDatePicker(true)}
                 class="group flex items-center gap-2 h-9 px-3 rounded-full bg-[var(--color-surface-container-high)] hover:bg-[var(--color-secondary-container)] text-base font-medium text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-secondary-container)] transition-all duration-200"
               >
                 <span class="material-symbols-rounded text-base">calendar_today</span>
                 <span>{formatDate(entryDate())}</span>
               </button>
               
               {/* Time Badge */}
               <button 
                 onClick={() => setShowTimePicker(true)}
                 class="group flex items-center gap-2 h-9 px-3 rounded-full bg-[var(--color-surface-container-high)] hover:bg-[var(--color-secondary-container)] text-base font-medium text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-secondary-container)] transition-all duration-200"
               >
                 <span class="material-symbols-rounded text-base">schedule</span>
                 <span>{formatTime(entryDate())}</span>
               </button>

               {/* Location Badge */}
               <button 
                 onClick={() => setShowLocationModal(true)}
                 class={`
                   group flex items-center gap-2 h-9 px-3 rounded-full transition-all duration-200
                   ${location() 
                     ? 'bg-[var(--color-surface-container-high)] hover:bg-[var(--color-secondary-container)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-secondary-container)]' 
                     : 'bg-[var(--color-surface-container-high)] hover:bg-[var(--color-secondary-container)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-secondary-container)]'}
                 `}
                 title={location() ? location()?.name : "Tambah Lokasi"}
               >
                 <span class="material-symbols-rounded text-base">
                   {location() ? 'location_on' : 'add_location_alt'}
                 </span>
                 <Show when={location()} fallback={<span>Lokasi</span>}>
                    <span class="max-w-[250px] truncate md:max-w-none md:whitespace-normal text-left leading-tight py-1">{location()?.name}</span>
                 </Show>
               </button>

               {/* Weather Badge */}
               <Show when={weather()}>
                   <div 
                     class="flex items-center gap-2 h-9 px-3 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] select-none animate-in fade-in zoom-in duration-300"
                     title={weather()?.desc}
                   >
                     <span class="material-symbols-rounded text-base">
                        {getWeatherDescription(weather()!.code).icon}
                     </span>
                     <span class="text-base font-medium">{weather()?.temp}°C</span>
                   </div>
               </Show>

               <div class="w-[1px] h-4 bg-[var(--color-outline-variant)] opacity-50 mx-1" />

               {/* Emoji Button */}
               <button 
                 ref={setEmojiBtnRef}
                 title="Pilih Perasaan"
                 onClick={() => setShowMoodPicker(!showMoodPicker())}
                 class={`
                   group flex items-center justify-center h-9 min-w-[36px] px-1 rounded-full transition-all duration-200 shrink-0 font-emoji
                   ${mood() 
                     ? 'bg-[var(--color-surface-container-high)] hover:bg-[var(--color-secondary-container)] text-xl select-none leading-none pb-[2px]' 
                     : 'bg-[var(--color-surface-container-high)] hover:bg-[var(--color-secondary-container)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-secondary-container)]'}
                 `}
               >
                 <Show when={!mood()} fallback={mood()}>
                    <span class="material-symbols-rounded text-xl">add_reaction</span>
                 </Show>
               </button>
            </div>

            <div class="h-[1px] bg-[var(--color-outline-variant)] opacity-20 mb-8" />

            <div 
               ref={setContainer}
               class="flex-1 [&_.ProseMirror]:min-h-[500px] [&_.ProseMirror]:outline-none text-xl leading-relaxed text-[var(--color-on-surface)]/90 font-normal"
               style={{ "font-family": "inherit" }}
               onClick={() => editor()?.commands.focus()}
            />

          </div>
        </div>


        {/* --- 3. MODALS (Date/Time/Mood) --- */}
        <DatePicker 
          show={showDatePicker()} 
          onClose={() => setShowDatePicker(false)} 
          value={entryDate()} 
          onSelect={handleDateSelect} 
        />
        <TimePicker 
          show={showTimePicker()} 
          onClose={() => setShowTimePicker(false)} 
          hour={entryDate().getHours()}
          minute={entryDate().getMinutes()}
          onSelect={handleTimeSelect} 
        />
        
        <MoodPicker
          show={showMoodPicker()}
          onClose={() => setShowMoodPicker(false)}
          anchor={emojiBtnRef()}
          selected={mood()}
          onSelect={setMood}
        />
        
        <LocationModal 
          show={showLocationModal()}
          onClose={() => setShowLocationModal(false)}
          onConfirm={handleLocationConfirm}
          initialLocation={location() || undefined}
        />

        <ImageModal 
          show={showImageModal()} 
          onClose={() => setShowImageModal(false)}
          onConfirm={handleImageConfirm}
        />
        
        <Modal
          show={showLinkModal()}
          onClose={() => setShowLinkModal(false)}
          title="Sisipkan Link"
          actions={
            <div class="flex justify-end gap-2 mt-4 px-1">
              <Button variant="text" onClick={() => setShowLinkModal(false)}>Batal</Button>
            </div>
          }
        >
          <div class="flex flex-col gap-4 py-2">
            <div class="relative">
              <input 
                type="text"
                placeholder="https://example.com"
                value={linkUrl()}
                onInput={(e) => setLinkUrl(e.currentTarget.value)}
                autofocus
                class="w-full h-12 px-4 bg-[var(--color-surface-container-low)] border-none rounded-2xl focus:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)]/40 outline-none transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && linkUrl().trim()) {
                    handleLinkConfirm(linkUrl());
                    setShowLinkModal(false);
                  }
                }}
              />
            </div>
            <div class="text-xs text-[var(--color-on-surface-variant)] opacity-60 px-1">
              Tekan Enter untuk menyimpan
            </div>
          </div>
        </Modal>

        <Modal
            show={showAudioRecorder()}
            onClose={() => setShowAudioRecorder(false)}
            actions={
                <div class="flex justify-end gap-2 mt-4 px-1">
                    <Button variant="text" onClick={() => setShowAudioRecorder(false)}>Tutup</Button>
                </div>
            }
        >
            <Show when={showAudioRecorder()}>
                <InsertAudio onRecordingComplete={(blob, duration, waveform) => {
                    // Convert to Base64 for persistence
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = () => {
                        const base64data = reader.result as string;
                        editor()?.chain().focus().insertContent({
                            type: 'audioPlayer',
                            attrs: {
                                src: base64data,
                                duration: duration,
                                waveform: waveform
                            }
                        }).run();
                    };
                    setShowAudioRecorder(false);
                }} />
            </Show>
        </Modal>


        {/* Custom Zoomable Full-size Image Preview Overlay */}
        <Show when={previewImageUrl()}>
          <Portal>
            <div 
              class="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center cursor-zoom-out animate-preview-overlay"
              onClick={() => { setPreviewImageUrl(null); setIsPreviewZoomed(false); }}
            >
              <div class="relative w-full h-full flex items-center justify-center overflow-auto p-4 md:p-8 no-scrollbar">
                <img 
                  src={previewImageUrl() || ''} 
                  class={`
                    max-w-full max-h-full transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) cursor-zoom-in rounded-sm animate-preview-image
                    ${isPreviewZoomed() ? 'scale-[2.4] md:scale-[3]' : 'scale-100'}
                  `}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPreviewZoomed(!isPreviewZoomed());
                  }}
                  alt="Full preview"
                />
                
                {/* Close button for convenience */}
                <button 
                  onClick={() => { setPreviewImageUrl(null); setIsPreviewZoomed(false); }}
                  class="fixed top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-colors"
                >
                  <span class="material-symbols-rounded">close</span>
                </button>
              </div>
            </div>
          </Portal>
        </Show>

      </div>
    </Show>
  );
}