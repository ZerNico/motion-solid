import { For, motion } from "@motion-s/solid"
import { createSignal } from "solid-js"

const initial = ["#4f6bff", "#14b8a6", "#f59e0b", "#ec4899"]

function shuffle<T>(items: T[]) {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

export default function ListReorder() {
  const [colors, setColors] = createSignal(initial)

  return (
    <div class="flex flex-col items-center gap-6">
      <ul class="grid grid-cols-2 gap-3">
        <For each={colors()}>
          {(color) => (
            <motion.li
              layout
              class="size-16"
              style={{ backgroundColor: color, borderRadius: 12 }}
              transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
            />
          )}
        </For>
      </ul>
      <button
        type="button"
        class="rounded-full border border-border bg-bg px-4 py-2 text-sm"
        onClick={() => setColors((colors) => shuffle(colors))}
      >
        Shuffle
      </button>
    </div>
  )
}
