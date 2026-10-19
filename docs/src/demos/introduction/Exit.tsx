import { AnimatePresence, motion, Show } from "@motion-s/solid"
import { createSignal } from "solid-js"

export default function Exit() {
    const [isOpen, setIsOpen] = createSignal(false)

    return (
        <div class="flex h-40 flex-col items-center justify-between">
            <button
                type="button"
                class="rounded-full border border-border bg-bg px-4 py-2 text-sm"
                onClick={() => setIsOpen((open) => !open)}
            >
                {isOpen() ? "Dismiss" : "Notify me"}
            </button>
            <AnimatePresence>
                <Show when={isOpen()}>
                    <motion.div
                        class="flex w-64 items-center gap-3 rounded-xl border border-border bg-bg px-4 py-3 text-sm shadow-lg"
                        initial={{ opacity: 0, y: 24, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.95 }}
                        transition={{ type: "spring", bounce: 0.3 }}
                    >
                        <span class="size-8 shrink-0 rounded-full bg-accent" />
                        <span>Your export is ready.</span>
                    </motion.div>
                </Show>
            </AnimatePresence>
        </div>
    )
}
