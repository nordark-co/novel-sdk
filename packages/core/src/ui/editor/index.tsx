"use client";

import { useEffect, useRef } from "react";
import { EditorContent } from "@tiptap/react";
import { EditorBubbleMenu } from "./bubble-menu";
import { ImageResizer } from "./extensions/image-resizer";
import { NovelContext } from "./provider";
import { EditorStateController } from "@/lib/hooks/use-editor";
import { __NSDK__INTERNAL__ } from "@/lib/hooks/use-editor";

export default function Editor(props: { controller: EditorStateController }) {
  const {
    localStorageContent, 
    isHydrated,
    setIsHydrated,
    options,
    editor,
    completionResult
  } = props.controller[__NSDK__INTERNAL__];

  const { complete, completion, isLoading, stop } = (completionResult ?? {});

  const prev = useRef("");

  // Insert chunks of the generated text
  useEffect(() => {
    if (!completionResult) return;
    const diff = completion.slice(prev.current.length);
    prev.current = completion;
    editor?.commands.insertContent(diff);
  }, [isLoading, editor, completion]);

  useEffect(() => {
    if (!completionResult) return;
    // if user presses escape or cmd + z and it's loading,
    // stop the request, delete the completion, and insert back the "++"
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || (e.metaKey && e.key === "z")) {
        stop();
        if (e.key === "Escape") {
          editor?.commands.deleteRange({
            from: editor.state.selection.from - completion.length,
            to: editor.state.selection.from,
          });
        }
        editor?.commands.insertContent("++");
      }
    };
    const mousedownHandler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      stop();
      if (window.confirm("AI writing paused. Continue?")) {
        complete(editor?.getText() || "");
      }
    };
    if (isLoading) {
      document.addEventListener("keydown", onKeyDown);
      window.addEventListener("mousedown", mousedownHandler);
    } else {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", mousedownHandler);
    }
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", mousedownHandler);
    };
  }, [stop, isLoading, editor, complete, completion.length]);

  // Default: Hydrate the editor with the content from localStorage.
  // If disableLocalStorage is true, hydrate the editor with the defaultValue.
  useEffect(() => {
    if (!editor || isHydrated) return;

    const value = options.disableLocalStorage ? options.defaultValue : localStorageContent;

    if (value) {
      editor.commands.setContent(value);
      setIsHydrated(true);
    }
  }, [editor, options.defaultValue, localStorageContent, isHydrated, options.disableLocalStorage]);

  return (
    <NovelContext.Provider
      value={{
        completionApi: options.completionApi,
      }}
    >
      <div
        onClick={() => {
          editor?.chain().focus().run();
        }}
        className={options.className}
      >
        {editor && <EditorBubbleMenu editor={editor} />}
        {editor?.isActive("image") && <ImageResizer editor={editor} />}
        <EditorContent editor={editor} />
      </div>
    </NovelContext.Provider>
  );
}
