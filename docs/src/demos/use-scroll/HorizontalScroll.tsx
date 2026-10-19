import { motion, useMotionValueState, useScroll } from "@motion-s/solid"
import { For } from "solid-js"

export default function HorizontalScroll() {
    const container = { current: null as HTMLElement | null }
    const { scrollX, scrollXProgress } = useScroll({ container })
    // Read a motion value in JSX through an accessor.
    const x = useMotionValueState(scrollX)

    return (
        <div class="flex w-80 flex-col gap-3">
            <div
                ref={(element) => (container.current = element)}
                class="flex gap-3 overflow-x-auto pb-3"
            >
                <For each={[1, 2, 3, 4, 5, 6, 7, 8]}>
                    {(item) => (
                        <div class="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl border border-border bg-bg text-2xl font-semibold">
                            {item}
                        </div>
                    )}
                </For>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-border">
                <motion.div
                    class="h-full origin-left rounded-full bg-accent"
                    style={{ scaleX: scrollXProgress }}
                />
            </div>
            <p class="text-xs text-fg-muted tabular-nums">
                scrollX: {Math.round(x())}px
            </p>
        </div>
    )
}
