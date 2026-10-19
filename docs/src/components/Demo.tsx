import { createSignal, For, Show, type Component } from "solid-js"
import { CopyButton } from "./CopyButton"

/**
 * A live example with its source, from `import source from "./Example.tsx?source"`.
 */
export function Demo(props: {
  component: Component
  source: { code: string; html: string }
}) {
  // A new value renders a new instance, which replays the animations on mount.
  const [instance, setInstance] = createSignal(0)
  const [showSource, setShowSource] = createSignal(false)

  return (
    <div class="not-prose my-6 overflow-hidden rounded-xl border border-border">
      <div class="relative flex min-h-56 items-center justify-center bg-surface p-8">
        <For each={[instance()]}>{() => <props.component />}</For>
        <button
          type="button"
          class="absolute top-2 right-2 rounded-md px-2 py-1 text-xs text-fg-muted hover:bg-bg hover:text-fg"
          onClick={() => setInstance((n) => n + 1)}
        >
          Replay
        </button>
      </div>
      <div class="flex items-center justify-between border-t border-border px-3 py-1.5">
        <button
          type="button"
          class="rounded-md px-2 py-1 text-xs text-fg-muted hover:bg-surface hover:text-fg"
          aria-expanded={showSource() ? "true" : "false"}
          onClick={() => setShowSource((show) => !show)}
        >
          {showSource() ? "Hide code" : "Show code"}
        </button>
        <CopyButton text={props.source.code} />
      </div>
      <Show when={showSource()}>
        <div
          class="code border-t border-border"
          innerHTML={props.source.html}
        />
      </Show>
    </div>
  )
}
