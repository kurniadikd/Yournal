import { createSignal, Show, createEffect, onCleanup, For } from "solid-js";
import { createTiptapEditor } from "solid-tiptap";
import { Portal } from "solid-js/web";
import { invoke } from "@tauri-apps/api/core";
import { NodeSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
// import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
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
import { VideoPlayer } from "./extensions/VideoPlayer";
import { migrateMathStrings } from "@tiptap/extension-mathematics";
import { Mathematics } from "./extensions/Mathematics";
import "katex/dist/katex.min.css";

import Button from "../ui/m3e/Button";
import DatePicker from "../ui/m3e/DatePicker";
import TimePicker from "../ui/m3e/TimePicker";
import MathModal from "../ui/m3e/MathModal";
import { formatTime, formatDate } from "../../utils/date";

import ImageModal from "../ui/m3e/ImageModal";
import { MapAttachment } from "./extensions/MapAttachment";
import LocationModal from "../ui/m3e/LocationModal";
import Modal from "../ui/m3e/Modal";
import VideoModal from "../ui/m3e/VideoModal";
import ConfirmationModal from "../ui/m3e/ConfirmationModal";
import ExportModal from "../ui/m3e/ExportModal";
import type { ExportSettings } from "../ui/m3e/ExportModal";
import { getWeatherDescription } from "../../utils/weather";
import { InsertAudio } from "./InsertAudio";
import Paragraph from "@tiptap/extension-paragraph";

const CustomParagraph = Paragraph.extend({
  addAttributes() {
    return {
      placeholder: {
        default: null,
        parseHTML: element => element.getAttribute('data-placeholder'),
        renderHTML: attributes => {
          if (!attributes.placeholder || attributes.placeholder === 'Mulai menulis...') {
            return {}
          }
          return {
            'data-placeholder': attributes.placeholder,
          }
        },
      },
    }
  },
})

interface EditorProps {
  show: boolean;
  onClose: () => void;
  onSave?: (note: { title: string; content: string; mood: string; date: Date; location?: string; weather?: string; tags?: string[] }) => void;
  onDelete?: () => void;
  initialContent?: string;
  initialTitle?: string;
  initialMood?: string;
  initialDate?: Date;
  initialLocation?: string; // JSON String
  initialWeather?: string; // JSON String
  initialTags?: string[];
}

export default function Editor(props: EditorProps) {
  let titleRef!: HTMLTextAreaElement;
  let scrollContainerRef!: HTMLDivElement;
  const [tableBtnRef, setTableBtnRef] = createSignal<HTMLButtonElement>();
  const [insertTableBtnRef, setInsertTableBtnRef] = createSignal<HTMLButtonElement>();
  const [emojiBtnRef, setEmojiBtnRef] = createSignal<HTMLButtonElement>();
  const [container, setContainer] = createSignal<HTMLDivElement>();
  const [updateTrigger, setUpdateTrigger] = createSignal(0);
  const [baseHTML, setBaseHTML] = createSignal("");

  const [title, setTitle] = createSignal(props.initialTitle || "");
  const [entryDate, setEntryDate] = createSignal(new Date());
  const [location, setLocation] = createSignal<{ name: string; lat: number; lng: number } | null>(null);
  const [weather, setWeather] = createSignal<{ temp: number; code: number; desc: string } | null>(null);
  const [tags, setTags] = createSignal<string[]>(props.initialTags || []);
  const [tagInput, setTagInput] = createSignal("");
  
  const [showDatePicker, setShowDatePicker] = createSignal(false);
  const [showTimePicker, setShowTimePicker] = createSignal(false);
  const [showImageModal, setShowImageModal] = createSignal(false);
  const [showLinkModal, setShowLinkModal] = createSignal(false);
  const [showMoodPicker, setShowMoodPicker] = createSignal(false);
  const [showLocationModal, setShowLocationModal] = createSignal(false);
  const [showAudioRecorder, setShowAudioRecorder] = createSignal(false);
  const [showVideoModal, setShowVideoModal] = createSignal(false);
  const [showExportModal, setShowExportModal] = createSignal(false);
  const [showMapAttachmentModal, setShowMapAttachmentModal] = createSignal(false);
  
  const [linkUrl, setLinkUrl] = createSignal('');
  const [tableMenuOpen, setTableMenuOpen] = createSignal(false);
  const [insertTableOpen, setInsertTableOpen] = createSignal(false);
  const [mood, setMood] = createSignal("");

  const handleAddTag = () => {
    let val = tagInput().trim();
    // Final sanitization: ensure no lingering invalid characters
    val = val.replace(/[^a-zA-Z0-9_]/g, '');
    
    if (val && !tags().includes(val)) {
       setTags([...tags(), val]);
       setTagInput("");
    }
  };
  const [previewImageUrl, setPreviewImageUrl] = createSignal<string | null>(null);
  const [isPreviewZoomed, setIsPreviewZoomed] = createSignal(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = createSignal(false);
  const [shouldRenderEditor, setShouldRenderEditor] = createSignal(false);
  const [isEditorVisible, setIsEditorVisible] = createSignal(false);
  let editorTransitionTimer: number;

  const resetEditorState = () => {
    setTitle("");
    setEntryDate(new Date());
    setLocation(null);
    setWeather(null);
    setTags([]);
    setTagInput("");
    setMood("");
    setBaseHTML("");
    editor()?.commands.clearContent();
  };

  const handleSave = () => {
    const html = editor()?.getHTML() || '';
    if (props.onSave) {
      props.onSave({
        title: title(),
        content: html,
        mood: mood(),
        date: entryDate(),
        location: location() ? JSON.stringify(location()) : undefined,
        weather: weather() ? JSON.stringify(weather()) : undefined,
        tags: tags().length > 0 ? tags() : undefined
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

  // First effect removed — consolidated into the second createEffect below (after editor initialization)

  // ... (Toolbar buttons etc)



  const [mathModalOpen, setMathModalOpen] = createSignal(false);
  const [mathModalLatex, setMathModalLatex] = createSignal('');
  const [mathModalPos, setMathModalPos] = createSignal<number | null>(null);
  const [mathModalIsEdit, setMathModalIsEdit] = createSignal(false);
  const [mathModalType, setMathModalType] = createSignal<'inline' | 'block'>('block');

  const openMathModal = (latex: string, pos: number | null = null, isEdit = false, type: 'inline' | 'block' = 'block') => {
    setMathModalLatex(latex);
    setMathModalPos(pos);
    setMathModalIsEdit(isEdit);
    setMathModalType(type);
    setMathModalOpen(true);
  };

  const editor = createTiptapEditor(() => ({
    element: container() as HTMLElement,
    extensions: [
      StarterKit.configure({
        paragraph: false,
        codeBlock: false,
        bold: false,
        italic: false,
        heading: false,
        dropcursor: false, 
        link: false,
      }),
      CustomParagraph,
      LinkCard,
      Bold,
      Italic,
      Heading.configure({
        levels: [1, 2, 3],
      }),
      VideoPlayer,
      MapAttachment,
      SelectableImage.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          draggable: 'true',
        },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-[var(--color-primary)] underline cursor-pointer',
        },
      }),
      Highlight.configure({ 
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
            if (node.attrs.placeholder) {
                return node.attrs.placeholder
            }
            return null
        },
        showOnlyWhenEditable: false,
        includeChildren: true,
        showOnlyCurrent: false,
        emptyNodeClass: 'is-empty',
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
      Mathematics.configure({
        inlineOptions: {
          onClick: (node, pos) => {
            openMathModal(node.attrs.latex, pos, true, 'inline');
          },
        },
        blockOptions: {
          onClick: (node, pos) => {
            openMathModal(node.attrs.latex, pos, true, 'block');
          },
        },
        katexOptions: {
          throwOnError: false,
        },
      }),
    ],
    content: props.initialContent || '',
    onCreate: ({ editor: currentEditor }) => {
      migrateMathStrings(currentEditor);
      setBaseHTML(currentEditor.getHTML());
    },
    onTransaction: () => setUpdateTrigger(v => v + 1),
    onSelectionUpdate: ({ editor: ed }) => {
      setUpdateTrigger(v => v + 1);
      // Prevent keyboard from showing when a non-text node is selected (mobile)
      const proseMirrorEl = ed.view.dom as HTMLElement;
      const nonTextNodes = ['selectableImage', 'videoPlayer', 'mapAttachment', 'audioPlayer', 'inlineMath', 'mathBlock', 'linkCard'];
      if (ed.state.selection instanceof NodeSelection && nonTextNodes.includes(ed.state.selection.node.type.name)) {
        proseMirrorEl.setAttribute('inputmode', 'none');
      } else {
        proseMirrorEl.removeAttribute('inputmode');
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[500px] pb-32 w-full h-full prose-headings:mt-0 prose-p:my-0',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return true;

            const reader = new FileReader();
            reader.onload = async (e) => {
              const base64 = e.target?.result as string;
              try {
                const avifData = await invoke<string>('convert_to_avif', { base64Data: base64 });
                view.dispatch(view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.selectableImage.create({ src: avifData })
                ));
              } catch (err) {
                console.warn('AVIF conversion failed for paste, using original:', err);
                view.dispatch(view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.selectableImage.create({ src: base64 })
                ));
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        const imageFile = Array.from(files).find(f => f.type.startsWith('image/'));
        if (!imageFile) return false;

        event.preventDefault();
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });

        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          try {
            const avifData = await invoke<string>('convert_to_avif', { base64Data: base64 });
            const node = view.state.schema.nodes.selectableImage.create({ src: avifData });
            const tr = view.state.tr.insert(coords?.pos ?? view.state.selection.from, node);
            view.dispatch(tr);
          } catch (err) {
            console.warn('AVIF conversion failed for drop, using original:', err);
            const node = view.state.schema.nodes.selectableImage.create({ src: base64 });
            const tr = view.state.tr.insert(coords?.pos ?? view.state.selection.from, node);
            view.dispatch(tr);
          }
        };
        reader.readAsDataURL(imageFile);
        return true;
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

  const isDirty = () => {
    updateTrigger(); // Reactive dependency for content changes

    // 1. Check content changes
    const currentContent = editor()?.getHTML();
    const initialCont = baseHTML() || "";
    const contentChanged = currentContent !== initialCont 
      && !(initialCont === "" && currentContent === "<p></p>");

    // 2. Check title changes
    const titleChanged = title() !== (props.initialTitle || "");

    // 3. Check mood changes
    const moodChanged = mood() !== (props.initialMood || "");

    // 4. Check date changes
    const initialDate = props.initialDate || null;
    const dateChanged = initialDate 
      ? entryDate().getTime() !== initialDate.getTime()
      : false; // New notes don't track date changes

    // 5. Check location changes
    const currentLoc = location() ? JSON.stringify(location()) : undefined;
    const locationChanged = currentLoc !== (props.initialLocation || undefined);

    // 6. Check weather changes  
    const currentWeather = weather() ? JSON.stringify(weather()) : undefined;
    const weatherChanged = currentWeather !== (props.initialWeather || undefined);
    
    // 7. Check tags changes
    const currentTags = [...tags()].sort();
    const initialTags = [...(props.initialTags || [])].sort();
    const tagsChanged = JSON.stringify(currentTags) !== JSON.stringify(initialTags);

    return contentChanged || titleChanged || moodChanged || dateChanged || locationChanged || weatherChanged || tagsChanged;
  };

  const resizeTitle = () => {
    if (titleRef) {
      titleRef.style.height = 'auto';
      titleRef.style.height = titleRef.scrollHeight + 'px';
    }
  };

  // Sync editor state ONLY when it opens
  createEffect(() => {
    if (props.show) {
      // Untrack props to prevent re-triggering if parent state updates while editor is open
      const initialTitle = props.initialTitle || "";
      const initialMood = props.initialMood || "";
      const initialDate = props.initialDate || new Date();
      const initialTags = props.initialTags || [];
      const initialLocation = props.initialLocation;
      const initialWeather = props.initialWeather;
      const initialContent = props.initialContent || "";

      if (titleRef) setTimeout(resizeTitle, 0);
      
      setTitle(initialTitle);
      setMood(initialMood);
      setEntryDate(initialDate);
      setTags([...initialTags]);
      
      if (initialLocation) {
        try { setLocation(JSON.parse(initialLocation)); } 
        catch (e) { setLocation(null); }
      } else { setLocation(null); }
      
      if (initialWeather) {
        try { setWeather(JSON.parse(initialWeather)); } 
        catch (e) { setWeather(null); }
      } else { setWeather(null); }
      
      // Use setTimeout to ensure TiapTap is ready and outside Solid's synchronous batch
      setTimeout(() => {
        const e = editor();
        if (e) {
          e.commands.setContent(initialContent, { emitUpdate: false }); // Disable update event to prevent feedback loop
          migrateMathStrings(e);
          setBaseHTML(e.getHTML());
          e.commands.focus('start'); 
          if (scrollContainerRef) scrollContainerRef.scrollTop = 0;
        }
      }, 0);
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
      
      onCleanup(() => {
        el.removeEventListener('preview-image', handlePreview);
      });
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

  const addVideo = () => {
    setShowVideoModal(true);
  };

  const handleVideoConfirm = (url: string) => {
    editor()?.chain().focus().insertContent({
      type: 'videoPlayer',
      attrs: { src: url }
    }).run();
  };

  const addMapAttachment = () => {
    setShowMapAttachmentModal(true);
  };

  const handleMapAttachmentConfirm = (loc: { name: string; lat: number; lng: number } | null) => {
    if (loc) {
      editor()?.chain().focus().insertContent({
        type: 'mapAttachment',
        attrs: { name: loc.name, lat: loc.lat, lng: loc.lng }
      }).run();
    }
  };

  const handleClose = () => {
    if (isDirty()) {
        setShowDiscardConfirm(true);
    } else {
        props.onClose();
    }
  };

  const handleAdvancedExport = (settings: ExportSettings) => {
    setShowExportModal(false);
    const editorInstance = editor();
    if (!editorInstance) return;

    const content = editorInstance.getHTML() || '';
    const noteTitle = title() || 'Untitled';
    const dateStr = formatDate(entryDate());
    const timeStr = formatTime(entryDate());

    const paperMap: Record<string, string> = {
      'A4': '210mm 297mm',
      'Letter': '216mm 279mm',
      'Legal': '216mm 356mm',
      'F4': '215mm 330mm',
    };
    const marginMap: Record<string, string> = {
      'normal': '2.54cm',
      'narrow': '1.27cm',
      'wide': '5.08cm',
    };
    const fontSizeMap: Record<string, string> = {
      'small': '10pt',
      'normal': '12pt',
      'large': '14pt',
    };

    const pageSize = paperMap[settings.paperSize] || '210mm 297mm';
    const pageMargin = marginMap[settings.margin] || '2.54cm';
    const baseFontSize = fontSizeMap[settings.fontSize] || '12pt';
    const orient = settings.orientation;

    const printHtml = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${noteTitle}</title>
<style>
  @page {
    size: ${pageSize} ${orient};
    margin: ${pageMargin};
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: ${baseFontSize};
    line-height: 1.6;
    color: #000000;
    padding: ${settings.format === 'html' ? '3rem max(5vw, 20px)' : '0'};
    max-width: ${settings.format === 'html' ? '900px' : 'none'};
    margin: ${settings.format === 'html' ? '0 auto' : '0'};
  }
  .header {
    margin-bottom: 1.5em;
    padding-bottom: 0.75em;
    border-bottom: 2px solid #000000;
  }
  .header h1 {
    font-size: 2.2em;
    font-weight: 700;
    margin-bottom: 0.25em;
    color: #000000;
  }
  .header .meta {
    font-size: 0.9em;
    color: #000000;
  }
  .content {
    font-size: 1.05em;
    color: #000000;
  }
  .content h1 { font-size: 1.8em; margin: 1.2em 0 0.6em; }
  .content h2 { font-size: 1.5em; margin: 1em 0 0.5em; }
  .content h3 { font-size: 1.25em; margin: 0.8em 0 0.4em; }
  .content p { margin: 0.8em 0; }
  .content ul, .content ol { margin: 0.8em 0; padding-left: 1.8em; }
  .content li { margin: 0.4em 0; }
  .content blockquote { border-left: 5px solid #ddd; padding-left: 1.2em; margin: 1em 0; color: #444; font-style: italic; }
  .content img { max-width: 100%; height: auto; border-radius: 8px; margin: 1em 0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
  .content table { width: 100%; border-collapse: collapse; margin: 1.2em 0; overflow: hidden; border-radius: 8px; border: 1px solid #eee; }
  .content th, .content td { border: 1px solid #eee; padding: 0.6em 0.8em; text-align: left; }
  .content th { background: #fafafa; font-weight: 600; color: #333; }
  .content hr { border: none; border-top: 1px solid #eee; margin: 1.5em 0; }
  .content mark { background: #fff3cd; padding: 0 4px; border-radius: 2px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
    .header { border-bottom-color: #333; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>${noteTitle}</h1>
    <div class="meta">${dateStr} &bull; ${timeStr}</div>
  </div>
  <div class="content">
    ${content}
  </div>
</body>
</html>`;

    if (settings.format === 'pdf') {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(printHtml);
        doc.close();
        
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      } else {
        alert('Gagal membuat frame untuk pencetakan.');
        document.body.removeChild(iframe);
      }
    } else {
      // HTML Export: Direct Download
      const blob = new Blob([printHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeTitle = noteTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note';
      
      a.href = url;
      a.download = `${safeTitle}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }
  };

  // Transition effect for editor open/close
  createEffect(() => {
    if (props.show) {
      if (editorTransitionTimer) clearTimeout(editorTransitionTimer);
      setShouldRenderEditor(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsEditorVisible(true)));
    } else {
      setIsEditorVisible(false);
      resetEditorState(); // Reset data fully to prevent stale content leaks
      editorTransitionTimer = setTimeout(() => setShouldRenderEditor(false), 300);
    }
  });

  return (
    <Show when={shouldRenderEditor()}>
      <div class={`
        fixed inset-0 z-50 bg-[var(--color-background)] flex flex-col overflow-hidden
        transition-all duration-300 ease-out
        ${isEditorVisible() ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
      `}>
        
        {/* --- 1. STICKY HEADER & TOOLBAR --- */}
        <div class="sticky top-0 z-50 bg-[var(--color-surface)] border-b border-[var(--color-outline-variant)]/10">
          
          {/* Row 1: Action Buttons (Top) */}
          <div class="flex items-center justify-between px-4 py-2 border-b border-[var(--color-outline-variant)]/10">
            <div class="text-sm font-medium text-[var(--color-on-surface-variant)] opacity-70 ml-2">
               {/* Optional: Status or Title placeholder */}
            </div>
            <div class="flex items-center gap-1.5 sm:gap-2">
              <Show when={props.onDelete}>
                <Button 
                  variant="text" 
                  onClick={props.onDelete}
                  class="!h-9 !w-9 !p-0 sm:!w-auto sm:!px-4 sm:!min-w-0 text-sm font-medium !rounded-lg shrink-0 !text-[var(--color-error)] hover:bg-[var(--color-error-container)] mr-2"
                  title="Hapus"
                >
                  <span class="material-symbols-rounded !text-[20px] font-normal">delete</span>
                  <span class="hidden sm:inline sm:ml-2">Hapus</span>
                </Button>
              </Show>
              
              <Button 
                  type="button"
                  variant="text" 
                  onClick={() => setShowExportModal(true)}
                  class="!h-9 !w-9 !p-0 sm:!w-auto sm:!px-4 sm:!min-w-0 text-sm font-medium !rounded-lg shrink-0 !text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] mr-2"
                  title="Ekspor"
                >
                  <span class="material-symbols-rounded !text-[20px] font-normal">ios_share</span>
                  <span class="hidden sm:inline sm:ml-2">Ekspor</span>
                </Button>
              <Button 
                variant="tonal" 
                onClick={handleClose}
                class="!h-9 !w-9 !p-0 sm:!w-auto sm:!px-4 sm:!min-w-0 text-sm font-medium !rounded-lg shrink-0"
                title="Batal"
              >
                <span class="material-symbols-rounded !text-[20px] font-normal">close</span>
                <span class="hidden sm:inline sm:ml-2">Batal</span>
              </Button>
              <Show when={isDirty()}>
                <Button 
                  variant="filled" 
                  onClick={handleSave}
                  class="!h-9 !w-9 !p-0 sm:!w-auto sm:!px-4 sm:!min-w-0 text-sm font-medium !rounded-lg shrink-0"
                  title="Simpan"
                >
                  <span class="material-symbols-rounded !text-[20px] font-normal">save</span>
                  <span class="hidden sm:inline sm:ml-2">Simpan</span>
                </Button>
              </Show>
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
                <ToolbarButton icon="border_color" action={() => editor()?.chain().focus().toggleHighlight({ color: 'var(--color-tertiary)' }).run()} active={isActive('highlight')} title="Highlight" />
                
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
                <ToolbarButton icon="movie" action={addVideo} title="Sisipkan Video" />
                <ToolbarButton icon="add_location_alt" action={addMapAttachment} title="Sisipkan Peta Lokasi" />
                <ToolbarButton icon="mic" action={() => setShowAudioRecorder(true)} title="Rekam Suara" />
                <ToolbarButton icon="link" action={setLink} active={isActive('link')} title="Tambah Link" />
                <ToolbarButton icon="link_off" action={() => editor()?.chain().focus().unsetLink().run()} disabled={!isActive('link')} title="Hapus Link" />
                <ToolbarButton icon="function" action={() => openMathModal('E=mc^2', null, false)} title="Sisipkan Rumus Matematika" />

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
          ref={scrollContainerRef}
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

            {/* TAGS SECTION */}
            <div class="mt-8 pt-6 border-t border-[var(--color-outline-variant)]/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div class="flex flex-wrap items-center gap-2">
                </div>
               
               <div class="flex flex-wrap items-center gap-2">
                  <For each={tags()}>
                     {(tag) => (
                        <div class="flex items-center gap-1 pl-3 pr-2 py-1 bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] rounded-lg text-lg font-normal transition-all hover:shadow-sm">
                           <span>#{tag}</span>
                           <button 
                             onClick={() => setTags(tags().filter(t => t !== tag))}
                             class="w-5 h-5 flex items-center justify-center rounded-full hover:bg-[var(--color-on-secondary-container)]/10"
                           >
                              <span class="material-symbols-rounded text-[14px]">close</span>
                           </button>
                        </div>
                     )}
                  </For>
                  
                  <div class="flex items-center bg-[var(--color-surface-container)] rounded-lg border border-transparent focus-within:border-[var(--color-primary)] transition-all overflow-hidden group/input">
                     <span class="pl-3 text-[var(--color-on-surface)] text-md shrink-0">#</span>
                     <input
                        type="text"
                        value={tagInput()}
                        onInput={(e) => {
                           const value = e.currentTarget.value;
                           // Sanitasi real-time: Izinkan hanya alfanumerik & underscore
                           // Langsung ubah spasi menjadi underscore
                           const sanitized = value.replace(/[^a-zA-Z0-9\s_]/g, '').replace(/\s+/g, '_');
                           setTagInput(sanitized);
                        }}
                        onKeyDown={(e) => {
                           // Block specific invalid symbols from the keyboard
                           if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !/^[a-zA-Z0-9\s_]$/.test(e.key)) {
                               e.preventDefault();
                               return;
                           }
                           
                           if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                           } else if (e.key === 'Backspace' && !tagInput() && tags().length > 0) {
                              setTags(tags().slice(0, -1));
                           }
                        }}
                        placeholder="Tambah tag..."
                        class="h-10 pl-1 pr-2 bg-transparent text-lg text-[var(--color-on-surface)]/90 placeholder:text-[var(--color-on-surface-variant)]/50 border-none outline-none transition-all font-normal"
                        style={{ width: `${Math.max(tagInput().length || 10, 8) + 1}ch` }}
                     />
                     <Show when={tagInput().trim()}>
                        <button 
                           onClick={handleAddTag}
                           class="flex items-center justify-center w-10 h-10 hover:bg-[var(--color-on-surface)]/5 text-[var(--color-primary)] transition-all animate-in fade-in zoom-in duration-200"
                        >
                           <span class="material-symbols-rounded text-xl">check</span>
                        </button>
                     </Show>
                  </div>
               </div>
            </div>

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

        <LocationModal 
          show={showMapAttachmentModal()}
          onClose={() => setShowMapAttachmentModal(false)}
          onConfirm={handleMapAttachmentConfirm}
        />

        <ImageModal
          show={showImageModal()}
          onClose={() => setShowImageModal(false)}
            onConfirm={handleImageConfirm}
        />

        <VideoModal // Added VideoModal rendering
            show={showVideoModal()}
            onClose={() => setShowVideoModal(false)}
            onConfirm={handleVideoConfirm}
        />

        <ExportModal
          show={showExportModal()}
          onClose={() => setShowExportModal(false)}
          onExport={handleAdvancedExport}
          title={title()}
          content={editor()?.getHTML() || ''}
          dateStr={formatDate(entryDate())}
          timeStr={formatTime(entryDate())}
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

        <ConfirmationModal
            show={showDiscardConfirm()}
            onClose={() => setShowDiscardConfirm(false)}
            onConfirm={props.onClose}
            title="Buang Perubahan?"
            message="Anda memiliki perubahan yang belum disimpan. Apakah Anda yakin ingin menutup catatan ini? Semua perubahan akan hilang."
            confirmLabel="Ya, Buang"
            variant="danger"
            icon="warning"
        />
        <MathModal
        show={mathModalOpen()}
        onClose={() => setMathModalOpen(false)}
        initialValue={mathModalLatex()}
        initialType={mathModalType()}
        isEdit={mathModalIsEdit()}
        onConfirm={(latex, type) => {
          if (mathModalIsEdit()) {
            const pos = mathModalPos();
            if (pos !== null) {
              const currentNode = editor()?.state.doc.nodeAt(pos);
              const currentType = currentNode?.type.name === 'inlineMath' ? 'inline' : 'block';

              if (currentType === type) {
                // Just update attributes
                if (type === 'inline') {
                  (editor() as any).chain().setNodeSelection(pos).updateInlineMath({ latex }).focus().run();
                } else {
                  (editor() as any).chain().setNodeSelection(pos).updateBlockMath({ latex }).focus().run();
                }
              } else {
                // Type changed: delete old, insert new
                (editor() as any).chain()
                  .deleteSelection() // Since pos is selected/focused or we should use deleteInlineMath/deleteBlockMath
                  .setNodeSelection(pos)
                  .deleteSelection()
                  .insertContentAt(pos, { type: type === 'inline' ? 'inlineMath' : 'blockMath', attrs: { latex } })
                  .focus()
                  .run();
              }
            }
          } else {
            if (type === 'inline') {
              (editor() as any).chain().focus().insertInlineMath({ latex }).run();
            } else {
              (editor() as any).chain().focus().insertBlockMath({ latex }).run();
            }
          }
          setMathModalOpen(false);
        }}
      />
      </div>
    </Show>
  );
}