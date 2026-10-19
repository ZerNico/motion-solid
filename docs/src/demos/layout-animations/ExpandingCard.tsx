import { motion, Show } from "@motion-s/solid"
import { createSignal } from "solid-js"

export default function ExpandingCard() {
  const [isOpen, setIsOpen] = createSignal(false)

  return (
    <motion.button
      type="button"
      layout
      class={[
        "flex flex-col gap-3 overflow-hidden bg-bg p-4 text-left",
        isOpen() ? "w-80" : "w-48",
      ]}
      style={{ borderRadius: 16 }}
      aria-expanded={isOpen() ? "true" : "false"}
      onClick={() => setIsOpen((open) => !open)}
      transition={{ layout: { type: "spring", bounce: 0.2, duration: 0.5 } }}
    >
      <motion.div layout="position" class="flex items-center gap-3">
        <div class="size-10 shrink-0 rounded-full bg-accent" />
        <span class="font-medium">Layout card</span>
      </motion.div>
      <Show when={isOpen()}>
        <motion.p
          class="text-sm text-fg-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          The card animates from its old size to its new one. The header has
          layout="position", so it moves without being stretched.
        </motion.p>
      </Show>
    </motion.button>
  )
}
