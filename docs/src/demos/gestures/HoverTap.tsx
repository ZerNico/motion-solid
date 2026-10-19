import { motion } from "@motion-s/solid"
import { createSignal } from "solid-js"

export default function HoverTap() {
    const [status, setStatus] = createSignal("Waiting")

    return (
        <div class="flex flex-col items-center gap-6">
            <motion.div
                class="flex size-28 items-center justify-center rounded-3xl bg-accent text-sm font-medium text-white"
                whileHover={{ scale: 1.1, rotate: 4 }}
                whileTap={{ scale: 0.9, rotate: -4 }}
                onHoverStart={() => setStatus("Hover start")}
                onHoverEnd={() => setStatus("Hover end")}
                onTapStart={() => setStatus("Tap start")}
                onTap={() => setStatus("Tap")}
                onTapCancel={() => setStatus("Tap cancel")}
            >
                Press me
            </motion.div>
            <p class="text-sm text-fg-muted" aria-live="polite">
                Last event: <span class="font-medium text-fg">{status()}</span>
            </p>
        </div>
    )
}
