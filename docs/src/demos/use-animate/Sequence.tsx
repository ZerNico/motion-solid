import { stagger, useAnimate } from "@motion-s/solid"
import { createSignal, For } from "solid-js"

const heights = [40, 72, 56, 96, 64, 112]

export default function Sequence() {
  const [scope, animate] = useAnimate()
  const [isPlaying, setIsPlaying] = createSignal(false)

  const play = async () => {
    setIsPlaying(true)
    await animate([
      [".total", { opacity: 0 }, { duration: 0.1 }],
      [
        ".bar",
        { scaleY: [0, 1] },
        { duration: 0.4, ease: "easeOut", delay: stagger(0.08) },
      ],
      [".total", { opacity: 1, y: [8, 0] }, { duration: 0.3 }],
    ])
    setIsPlaying(false)
  }

  return (
    <div ref={scope} class="flex flex-col items-center gap-5">
      <div class="flex h-28 items-end gap-2">
        <For each={heights}>
          {(height) => (
            <div
              class="bar w-6 origin-bottom rounded-t-md bg-accent"
              style={{ height: `${height}px` }}
            />
          )}
        </For>
      </div>
      <p class="total text-sm text-fg-muted">Total: 440</p>
      <button
        type="button"
        class="rounded-full border border-border bg-bg px-4 py-2 text-sm disabled:opacity-50"
        disabled={isPlaying()}
        onClick={play}
      >
        {isPlaying() ? "Playing…" : "Play"}
      </button>
    </div>
  )
}
