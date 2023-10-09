import "./styles/index.css";
import "./styles/tailwind.css";
import "./styles/prosemirror.css";

export { default as BlockEditor } from "./ui/editor";
export { getPrevText } from "@/lib/editor";
export { useEditor as useBlockEditor } from "./lib/hooks/use-editor";
export { Editor as TipTapEditor } from "@tiptap/core";
export type { CommandProps } from "@/ui/editor/extensions/slash-command"

