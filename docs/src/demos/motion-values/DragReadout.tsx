import { animate, motion, useMotionValue, useTransform } from "@motion-s/solid"

export default function DragReadout() {
    const x = useMotionValue(0)
    const rounded = useTransform(() => Math.round(x.get()))

    return (
        <div class="flex flex-col items-center gap-6">
            <div class="flex h-24 w-80 items-center justify-center rounded-full bg-bg">
                <motion.div
                    class="size-16 cursor-grab rounded-2xl bg-accent active:cursor-grabbing"
                    drag="x"
                    dragConstraints={{ left: -110, right: 110 }}
                    style={{ x }}
                />
            </div>
            <div class="flex items-center gap-4 text-sm">
                <span class="w-20 font-mono text-fg-muted">
                    x: <motion.span>{rounded}</motion.span>
                </span>
                <button
                    type="button"
                    class="rounded-full border border-border bg-bg px-4 py-2"
                    onClick={() =>
                        animate(x, 0, { type: "spring", bounce: 0.4 })
                    }
                >
                    Center
                </button>
            </div>
        </div>
    )
}
