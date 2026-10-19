import { motion, type Easing } from "@motion-s/solid"
import { createSignal, For } from "solid-js"

const easings: { label: string; ease: Easing }[] = [
  { label: "linear", ease: "linear" },
  { label: "easeIn", ease: "easeIn" },
  { label: "easeOut", ease: "easeOut" },
  { label: "easeInOut", ease: "easeInOut" },
  { label: "backOut", ease: "backOut" },
  { label: "[0.7, 0, 0.3, 1]", ease: [0.7, 0, 0.3, 1] },
]

export default function Easings() {
  const [isEnd, setIsEnd] = createSignal(false)

  return (
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <For each={easings}>
          {(easing) => (
            <div class="flex items-center gap-3">
              <code class="w-36 shrink-0 text-xs text-fg-muted">
                {easing.label}
              </code>
              <div class="h-6 w-56 rounded-full bg-bg">
                <motion.div
                  class="size-6 rounded-full bg-accent"
                  animate={{ x: isEnd() ? 200 : 0 }}
                  transition={{ duration: 1, ease: easing.ease }}
                />
              </div>
            </div>
          )}
        </For>
      </div>
      <button
        type="button"
        class="self-center rounded-full border border-border bg-bg px-4 py-2 text-sm"
        onClick={() => setIsEnd((end) => !end)}
      >
        Play
      </button>
    </div>
  )
}
