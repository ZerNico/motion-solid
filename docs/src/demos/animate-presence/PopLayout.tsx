import { AnimatePresence, For, motion } from "@motion-s/solid"
import { createSignal } from "solid-js"

const colors = ["Red", "Orange", "Green", "Teal", "Blue", "Violet"]

export default function PopLayout() {
  const [tags, setTags] = createSignal(colors)

  return (
    <div class="flex w-80 flex-col items-center gap-6">
      <ul class="relative flex flex-wrap justify-center gap-2">
        <AnimatePresence mode="popLayout" initial={false}>
          <For each={tags()}>
            {(tag) => (
              <motion.li
                layout
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: "spring", bounce: 0.2 }}
              >
                <button
                  type="button"
                  class="rounded-full bg-bg px-3 py-1.5 text-sm hover:text-fg-muted"
                  aria-label={`Remove ${tag}`}
                  onClick={() =>
                    setTags((tags) => tags.filter((t) => t !== tag))
                  }
                >
                  {tag} ✕
                </button>
              </motion.li>
            )}
          </For>
        </AnimatePresence>
      </ul>
      <button
        type="button"
        class="rounded-full border border-border bg-bg px-4 py-2 text-sm"
        onClick={() => setTags(colors)}
      >
        Reset
      </button>
    </div>
  )
}
