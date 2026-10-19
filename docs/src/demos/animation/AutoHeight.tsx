import { motion } from "@motion-s/solid"
import { createSignal } from "solid-js"

export default function AutoHeight() {
    const [isOpen, setIsOpen] = createSignal(false)

    return (
        <div class="w-72 overflow-hidden rounded-xl bg-bg">
            <button
                type="button"
                class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
                aria-expanded={isOpen() ? "true" : "false"}
                onClick={() => setIsOpen((open) => !open)}
            >
                What is motion-solid?
                <motion.span
                    class="text-fg-muted"
                    animate={{ rotate: isOpen() ? 180 : 0 }}
                >
                    ▾
                </motion.span>
            </button>
            <motion.div
                class="overflow-hidden"
                initial={false}
                animate={{
                    height: isOpen() ? "auto" : 0,
                    opacity: isOpen() ? 1 : 0,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
            >
                <p class="px-4 pb-4 text-sm text-fg-muted">
                    A port of Motion for React to Solid 2. Components, gestures,
                    layout animations and hooks work like in React, with Solid's
                    signals and control flow.
                </p>
            </motion.div>
        </div>
    )
}
