import { AnimatePresence, motion, Show } from "@motion-s/solid"
import { createSignal } from "solid-js"

export default function ShowExit() {
  const [isVisible, setIsVisible] = createSignal(true)

  return (
    <div class="flex flex-col items-center gap-6">
      <div class="flex size-24 items-center justify-center">
        <AnimatePresence>
          <Show when={isVisible()}>
            <motion.div
              class="size-24 rounded-2xl bg-accent"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
            />
          </Show>
        </AnimatePresence>
      </div>
      <button
        type="button"
        class="rounded-full border border-border bg-bg px-4 py-2 text-sm"
        onClick={() => setIsVisible((visible) => !visible)}
      >
        {isVisible() ? "Hide" : "Show"}
      </button>
    </div>
  )
}
