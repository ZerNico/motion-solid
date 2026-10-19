import { createSignal } from "solid-js"

export function CopyButton(props: { text: string | (() => string) }) {
    const [copied, setCopied] = createSignal(false)
    let timeout: ReturnType<typeof setTimeout> | undefined

    const copy = async () => {
        const text =
            typeof props.text === "function" ? props.text() : props.text
        await navigator.clipboard.writeText(text)
        setCopied(true)
        clearTimeout(timeout)
        timeout = setTimeout(() => setCopied(false), 1500)
    }

    return (
        <button
            type="button"
            class="rounded-md px-2 py-1 text-xs text-fg-muted hover:bg-surface hover:text-fg"
            onClick={copy}
        >
            {copied() ? "Copied" : "Copy"}
        </button>
    )
}
