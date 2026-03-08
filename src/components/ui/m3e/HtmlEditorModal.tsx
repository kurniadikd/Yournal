import { createSignal, createEffect } from "solid-js";
import Modal from "./Modal";
import Button from "./Button";
import Switch from "./Switch";

interface HtmlEditorModalProps {
  show: boolean;
  onClose: () => void;
  initialHtml: string;
  onConfirm: (html: string) => void;
}

function formatHTML(html: string) {
  let formatted = '';
  let reg = /(>)(<)(\/*)/g;
  html = html.replace(reg, '$1\r\n$2$3');
  let pad = 0;
  html.split('\r\n').forEach(function(line) {
    let indent = 0;
    if (line.match(/.+<\/\w[^>]*>$/)) {
      indent = 0;
    } else if (line.match(/^<\/\w/)) {
      if (pad !== 0) {
        pad -= 1;
      }
    } else if (line.match(/^<\w[^>]*[^\/]>.*$/)) {
      indent = 1;
    } else {
      indent = 0;
    }

    let padding = '';
    for (let i = 0; i < pad; i++) {
      padding += '  ';
    }

    formatted += padding + line + '\r\n';
    pad += indent;
  });

  return formatted.trim();
}

export default function HtmlEditorModal(props: HtmlEditorModalProps) {
  const [htmlContent, setHtmlContent] = createSignal("");
  const [isPretty, setIsPretty] = createSignal(false);

  createEffect(() => {
    if (props.show) {
      setHtmlContent(props.initialHtml);
      setIsPretty(false);
    }
  });

  const handleTogglePretty = (checked: boolean) => {
    setIsPretty(checked);
    if (checked) {
      setHtmlContent(formatHTML(htmlContent()));
    } else {
      // Minify (simple)
      setHtmlContent(htmlContent().replace(/>\s+</g, '><'));
    }
  };

  const handleConfirm = () => {
    props.onConfirm(htmlContent());
    props.onClose();
  };

  return (
    <Modal
      show={props.show}
      onClose={props.onClose}
      title="Edit Kode HTML"
      maxWidth="800px"
      actions={
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-3 ml-4">
            <span class="text-sm font-medium text-[var(--color-on-surface-variant)]">Pretty View</span>
            <Switch checked={isPretty()} onChange={handleTogglePretty} />
          </div>
          <div class="flex gap-2">
            <Button variant="text" onClick={props.onClose}>
              Batal
            </Button>
            <Button variant="filled" onClick={handleConfirm}>
              Terapkan
            </Button>
          </div>
        </div>
      }
    >
      <div class="py-2 h-[60vh] min-h-[400px]">
        <textarea
          value={htmlContent()}
          onInput={(e) => setHtmlContent(e.currentTarget.value)}
          class="w-full h-full p-4 bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] rounded-xl border border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] focus:outline-none font-mono text-sm resize-none"
          spellcheck={false}
          placeholder="<h1>Judul</h1><p>Paragraf...</p>"
        />
      </div>
    </Modal>
  );
}
