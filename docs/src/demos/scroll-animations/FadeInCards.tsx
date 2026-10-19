import { motion } from "@motion-s/solid"
import { For } from "solid-js"

const cards = ["Plan", "Design", "Build", "Test", "Ship", "Repeat"]

export default function FadeInCards() {
    // `viewport.root` is a `{ current }` object, set by the container's ref.
    const root = { current: null as HTMLElement | null }

    return (
        <div
            ref={(element) => (root.current = element)}
            class="h-64 w-80 overflow-y-auto rounded-xl border border-border bg-bg p-4"
        >
            <p class="mb-40 text-center text-sm text-fg-muted">Scroll down</p>
            <div class="flex flex-col gap-4">
                <For each={cards}>
                    {(card, index) => (
                        <motion.div
                            class="flex items-center gap-3 rounded-lg border border-border bg-surface p-4"
                            initial={{ opacity: 0, x: -40 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ root, amount: 0.8 }}
                            transition={{ type: "spring", bounce: 0.3 }}
                        >
                            <span class="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                                {index() + 1}
                            </span>
                            <span class="font-medium">{card}</span>
                        </motion.div>
                    )}
                </For>
            </div>
        </div>
    )
}
