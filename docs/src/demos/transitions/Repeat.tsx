import { motion, type RepeatType } from "@motion-s/solid"
import { For } from "solid-js"

const repeatTypes: RepeatType[] = ["loop", "reverse", "mirror"]

export default function Repeat() {
    return (
        <div class="flex flex-col gap-3">
            <For each={repeatTypes}>
                {(repeatType) => (
                    <div class="flex items-center gap-3">
                        <code class="w-16 shrink-0 text-xs text-fg-muted">
                            {repeatType}
                        </code>
                        <div class="h-6 w-56 rounded-full bg-bg">
                            <motion.div
                                class="size-6 rounded-md bg-accent"
                                animate={{ x: 200, rotate: 180 }}
                                transition={{
                                    duration: 1.2,
                                    ease: "easeIn",
                                    repeat: Infinity,
                                    repeatType,
                                    repeatDelay: 0.3,
                                }}
                            />
                        </div>
                    </div>
                )}
            </For>
        </div>
    )
}
