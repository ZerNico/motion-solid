import { motion, useDragControls } from "@motion-s/solid"
import { createSignal } from "solid-js"

export default function Handle() {
    const controls = useDragControls()
    const [container, setContainer] = createSignal<HTMLDivElement>()

    return (
        <div
            ref={setContainer}
            class="flex h-56 w-96 items-center justify-center rounded-2xl border border-dashed border-border"
        >
            <motion.div
                class="w-52 overflow-hidden rounded-xl border border-border bg-bg shadow-sm"
                drag
                dragControls={controls}
                dragListener={false}
                dragConstraints={container}
                dragMomentum={false}
            >
                <div class="flex items-center gap-2 border-b border-border px-3 py-2">
                    <div
                        class="cursor-grab touch-none rounded px-1 text-fg-muted select-none hover:bg-surface active:cursor-grabbing"
                        aria-label="Move note"
                        onPointerDown={(event) => controls.start(event)}
                    >
                        ⠿
                    </div>
                    <span class="text-sm font-medium">Note</span>
                </div>
                <p class="p-3 text-sm text-fg-muted">
                    Move this card by its handle. The text stays selectable.
                </p>
            </motion.div>
        </div>
    )
}
