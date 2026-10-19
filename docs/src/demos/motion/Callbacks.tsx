import { motion } from "@motion-s/solid"
import { createSignal } from "solid-js"

const positions = [-80, 0, 80]

export default function Callbacks() {
    const [index, setIndex] = createSignal(1)
    const [status, setStatus] = createSignal("Idle")

    return (
        <div class="flex flex-col items-center gap-6">
            <motion.div
                class="size-16 rounded-2xl bg-accent"
                animate={{ x: positions[index()] }}
                transition={{ type: "spring", bounce: 0.25, duration: 0.8 }}
                onAnimationStart={() => setStatus("Animating…")}
                onAnimationComplete={() => setStatus("Done")}
            />
            <div class="flex gap-2">
                <button
                    type="button"
                    class="rounded-full border border-border bg-bg px-4 py-2 text-sm"
                    onClick={() => setIndex((i) => (i + 1) % positions.length)}
                >
                    Move
                </button>
            </div>
            <p class="text-sm text-fg-muted" aria-live="polite">
                {status()}
            </p>
        </div>
    )
}
