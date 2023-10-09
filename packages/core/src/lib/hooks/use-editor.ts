import { Editor as EditorClass, Extensions } from "@tiptap/core";
import { JSONContent, useEditor as useTipTapEditor } from "@tiptap/react";
import { EditorProps } from "@tiptap/pm/view";
import useLocalStorage from "./use-local-storage";
import { useMemo, useState } from "react";
import { getDefaultExtensions } from "@/ui/editor/extensions";
import { defaultEditorProps } from "@/ui/editor/props";
import { useDebouncedCallback } from "use-debounce";
import { getPrevText } from "../editor";
import { useCompletion } from "ai/react";
import { toast } from "sonner";
import va from "@vercel/analytics";
import { SlashCommandConfig } from "@/ui/editor/extensions/slash-command";
import { Transaction } from "@tiptap/pm/state";

/** @internal */
export const __NSDK__INTERNAL__: unique symbol = Symbol('DO NOT USE: Novel SDK Internals');

export type NovelEditorOptions = {
    /**
     * The API route to use for the OpenAI completion API.
     * Defaults to "/api/generate".
     */
    completionApi?: string;
    /**
     * Additional classes to add to the editor container.
     * Defaults to "relative min-h-[500px] w-full max-w-screen-lg border-stone-200 bg-white sm:mb-[calc(20vh)] sm:rounded-lg sm:border sm:shadow-lg".
     */
    className?: string;
    /**
     * The default value to use for the editor.
     * Defaults to defaultEditorContent.
     */
    defaultValue?: JSONContent | string;
    /**
     * A list of extensions to use for the editor, in addition to the default Novel extensions.
     * Defaults to [].
     */
    extensions?: Extensions;
    /**
     * Props to pass to the underlying Tiptap editor, in addition to the default Novel editor props.
     * Defaults to {}.
     */
    editorProps?: EditorProps;
    /**
     * A callback function that is called whenever the editor is updated.
     * Defaults to () => {}.
     */
    // eslint-disable-next-line no-unused-vars
    onUpdate?: (editor?: EditorClass) => void | Promise<void>;
    /**
     * A callback function that is called whenever the editor is updated, but only after the defined debounce duration.
     * Defaults to () => {}.
     */
    // eslint-disable-next-line no-unused-vars
    onDebouncedUpdate?: (editor?: EditorClass) => void | Promise<void>;
    /**
     * The duration (in milliseconds) to debounce the onDebouncedUpdate callback.
     * Defaults to 750.
     */
    debounceDuration?: number;
    /**
     * The key to use for storing the editor's value in local storage.
     * Defaults to "novel__content".
     */
    storageKey?: string;
    /**
     * Disable local storage read/save.
     * Defaults to false.
     */
    disableLocalStorage?: boolean;
};

export type EditorStateController = {
    [__NSDK__INTERNAL__]: {
        options: Required<NovelEditorOptions>,
        saveToLocalStorage: (content: string | JSONContent) => void,
        localStorageContent: string | JSONContent,
        isHydrated: boolean,
        setIsHydrated: (value: boolean) => void,

        editor: ReturnType<typeof useTipTapEditor>,
        completionResult: Pick<ReturnType<typeof useCompletion>, "complete"| "completion" | "stop" | "isLoading">
    },
    editor: ReturnType<typeof useTipTapEditor>,
};

export type UseEditorOptions = NovelEditorOptions & {
    /**
     * The unique id identifying this instance of the editor
     */
    id?: string;

    /**
     * The default placeholder text to display when text block is empty
     */
    defaultPlaceholderText?: string,

    /**
     * Additional Slash commands you would like to add to the editor
     */
    additionalSlashCommands?: SlashCommandConfig['customItems'],

    /**
     * Interceptors for onUpdate events
     */
    onUpdateInterceptors?: Array<(e: { editor: EditorClass, transaction: Transaction}) => boolean>,

    /**
     * aiCompletion
     */
    completionResult: Pick<ReturnType<typeof useCompletion>, "complete"| "completion" | "stop" | "isLoading">
};

export function useEditor(options?: UseEditorOptions): EditorStateController {

    const normalizedOptions: Required<NovelEditorOptions> = {
        completionApi: "/api/generate",
        className: "novel-relative novel-min-h-[500px] novel-w-full novel-max-w-screen-lg novel-border-stone-200 novel-bg-white sm:novel-mb-[calc(20vh)] sm:novel-rounded-lg sm:novel-border sm:novel-shadow-lg",
        defaultValue: "",
        extensions: [],
        editorProps: {},
        onUpdate: () => { },
        onDebouncedUpdate: () => { },
        debounceDuration: 750,
        storageKey: options?.id ?? "novel__content",
        disableLocalStorage: false,
        ...options
    }

    const [localStorageContent, saveToLocalStorage] = useLocalStorage(normalizedOptions.storageKey, normalizedOptions.defaultValue);
    const [hydrated, setHydrated] = useState(false);

    const debouncedUpdates = useDebouncedCallback(async ({ editor }) => {
        const json = editor.getJSON();
        normalizedOptions.onDebouncedUpdate(editor);

        if (!normalizedOptions.disableLocalStorage) {
            saveToLocalStorage(json);
        }
    }, normalizedOptions.debounceDuration);

    const defaultExtensions = useMemo(() => {
        return getDefaultExtensions({
            defaultPlaceholderText: options?.defaultPlaceholderText,
            customSlashCommands: options?.additionalSlashCommands
        });
    }, [options?.defaultPlaceholderText, options?.additionalSlashCommands]);

    const editor = useTipTapEditor({
        extensions: [...defaultExtensions, ...normalizedOptions.extensions],
        editorProps: {
            ...defaultEditorProps,
            ...normalizedOptions.editorProps,
        },
        onUpdate: (e) => {
            if (options?.onUpdateInterceptors) {
                const intercepted = options.onUpdateInterceptors.some(interceptor => interceptor(e));
                if (intercepted) return;
            }
            
            normalizedOptions.onUpdate(e.editor);
            debouncedUpdates(e);
            
        },
        autofocus: "end",
    });

    return {
        [__NSDK__INTERNAL__]: {
            options: normalizedOptions,
            saveToLocalStorage: saveToLocalStorage,
            localStorageContent: localStorageContent,
            isHydrated: hydrated,
            setIsHydrated: setHydrated,

            editor,
            completionResult: options.completionResult
        },
        editor,
    }
}