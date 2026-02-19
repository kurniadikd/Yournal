import { Mathematics as TiptapMathematics, BlockMath as TiptapBlockMath, InlineMath as TiptapInlineMath } from "@tiptap/extension-mathematics";
import { createSolidNodeView } from "../../../utils/SolidNodeView";
import MathBlockComponent from "./MathBlockComponent";
import MathInlineComponent from "./MathInlineComponent";

/**
 * Localized Mathematics extension using official Tiptap Mathematics nodes
 * but with custom SolidJS NodeViews for consistent project UX.
 */
const BlockMath = TiptapBlockMath.extend({
  addNodeView() {
    return createSolidNodeView(MathBlockComponent);
  },
});

const InlineMath = TiptapInlineMath.extend({
  addNodeView() {
    return createSolidNodeView(MathInlineComponent);
  },
});

export const Mathematics = TiptapMathematics.extend({
  addExtensions() {
    return [
      BlockMath.configure({ ...this.options.blockOptions, katexOptions: this.options.katexOptions }),
      InlineMath.configure({ ...this.options.inlineOptions, katexOptions: this.options.katexOptions })
    ];
  }
});


