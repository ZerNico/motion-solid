import type { JSX } from "@solidjs/web"
import { createSignal } from "solid-js"

/**
 * Copies `text`. A promise of it (fetched on click) is handed to the clipboard as is, so Safari
 * still sees the copy as part of the click.
 */
export function CopyButton(props: {
  text: string | (() => string | Promise<string>)
  label?: JSX.Element
}) {
  const [copied, setCopied] = createSignal(false)
  let timeout: ReturnType<typeof setTimeout> | undefined

  const copy = async () => {
    const text = typeof props.text === "function" ? props.text() : props.text
    if (typeof text === "string") {
      await navigator.clipboard.writeText(text)
    } else if (typeof ClipboardItem !== "undefined") {
      const blob = text.then(
        (value) => new Blob([value], { type: "text/plain" })
      )
      await navigator.clipboard.write([
        new ClipboardItem({ "text/plain": blob }),
      ])
    } else {
      await navigator.clipboard.writeText(await text)
    }
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
      {copied() ? "Copied" : (props.label ?? "Copy")}
    </button>
  )
}
