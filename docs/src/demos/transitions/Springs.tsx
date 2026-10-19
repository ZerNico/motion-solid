import { motion, type Transition } from "@motion-s/solid"
import { createSignal, For } from "solid-js"

const springs: { label: string; transition: Transition }[] = [
    {
        label: "bounce: 0",
        transition: { type: "spring", visualDuration: 0.5, bounce: 0 },
    },
    {
        label: "bounce: 0.3",
        transition: { type: "spring", visualDuration: 0.5, bounce: 0.3 },
    },
    {
        label: "bounce: 0.6",
        transition: { type: "spring", visualDuration: 0.5, bounce: 0.6 },
    },
    {
        label: "stiffness: 50, damping: 5",
        transition: { type: "spring", stiffness: 50, damping: 5 },
    },
    {
        label: "stiffness: 400, damping: 30",
        transition: { type: "spring", stiffness: 400, damping: 30 },
    },
]

export default function Springs() {
    const [isEnd, setIsEnd] = createSignal(false)

    return (
        <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
                <For each={springs}>
                    {(spring) => (
                        <div class="flex items-center gap-3">
                            <code class="w-48 shrink-0 text-xs text-fg-muted">
                                {spring.label}
                            </code>
                            <div class="h-6 w-56 rounded-full bg-bg">
                                <motion.div
                                    class="size-6 rounded-full bg-accent"
                                    animate={{ x: isEnd() ? 200 : 0 }}
                                    transition={spring.transition}
                                />
                            </div>
                        </div>
                    )}
                </For>
            </div>
            <button
                type="button"
                class="self-center rounded-full border border-border bg-bg px-4 py-2 text-sm"
                onClick={() => setIsEnd((end) => !end)}
            >
                Play
            </button>
        </div>
    )
}
