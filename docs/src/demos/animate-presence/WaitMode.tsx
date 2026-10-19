import { AnimatePresence, motion, Show } from "@motion-s/solid"
import { createSignal } from "solid-js"

const steps = ["Plan", "Build", "Ship"]

export default function WaitMode() {
    const [step, setStep] = createSignal(0)

    return (
        <div class="flex flex-col items-center gap-6">
            <div class="flex h-24 w-48 items-center justify-center rounded-2xl bg-bg">
                <AnimatePresence mode="wait" initial={false}>
                    <Show when={steps[step()]} keyed>
                        {(label) => (
                            <motion.span
                                class="text-2xl font-semibold"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.2 }}
                            >
                                {label}
                            </motion.span>
                        )}
                    </Show>
                </AnimatePresence>
            </div>
            <button
                type="button"
                class="rounded-full border border-border bg-bg px-4 py-2 text-sm"
                onClick={() => setStep((step) => (step + 1) % steps.length)}
            >
                Next step
            </button>
        </div>
    )
}
