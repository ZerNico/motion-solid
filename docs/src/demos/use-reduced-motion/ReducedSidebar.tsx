import {
    motion,
    Show,
    AnimatePresence,
    useReducedMotion,
} from "@motion-s/solid"
import { createSignal } from "solid-js"

export default function ReducedSidebar() {
    const shouldReduceMotion = useReducedMotion()
    const [isOpen, setIsOpen] = createSignal(false)

    // Slide in, or only fade when the device asks for reduced motion.
    const hidden = () =>
        shouldReduceMotion() ? { opacity: 0 } : { opacity: 0, x: "-100%" }

    return (
        <div class="flex flex-col items-center gap-4">
            <div class="relative h-32 w-72 overflow-hidden rounded-2xl bg-bg">
                <AnimatePresence>
                    <Show when={isOpen()}>
                        <motion.nav
                            class="absolute inset-y-0 left-0 flex w-36 flex-col gap-2 bg-accent p-4 text-sm text-white"
                            initial={hidden()}
                            animate={{ opacity: 1, x: 0 }}
                            exit={hidden()}
                        >
                            <span>Home</span>
                            <span>Settings</span>
                        </motion.nav>
                    </Show>
                </AnimatePresence>
            </div>
            <button
                type="button"
                class="rounded-full border border-border bg-bg px-4 py-2 text-sm"
                onClick={() => setIsOpen((open) => !open)}
            >
                {isOpen() ? "Close menu" : "Open menu"}
            </button>
        </div>
    )
}
