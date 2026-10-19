import { motion } from "@motion-s/solid"
import { For } from "solid-js"

export default function Focus() {
  return (
    <div class="flex flex-col items-center gap-4">
      <div class="flex gap-3">
        <For each={["Day", "Week", "Month"]}>
          {(label) => (
            <motion.button
              type="button"
              class="rounded-full border border-border bg-bg px-4 py-2 text-sm outline-none"
              whileFocus={{
                scale: 1.1,
                borderColor: "#4f6bff",
                boxShadow: "0 0 0 3px rgba(79, 107, 255, 0.3)",
              }}
            >
              {label}
            </motion.button>
          )}
        </For>
      </div>
      <p class="text-sm text-fg-muted">Move focus with the Tab key.</p>
    </div>
  )
}
