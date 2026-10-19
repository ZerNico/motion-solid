import { motion, useMotionValue, useTransform } from "@motion-s/solid"
import { createSignal } from "solid-js"

export default function Mirror() {
    const x = useMotionValue(0)
    const [mirrored, setMirrored] = createSignal(true)

    // Reads a motion value and a signal: runs again when either changes.
    const followerX = useTransform(() => (mirrored() ? -x.get() : x.get()))

    return (
        <div class="flex flex-col items-center gap-4">
            <div class="flex h-14 w-80 items-center justify-center rounded-full bg-bg">
                <motion.div
                    class="size-10 cursor-grab rounded-xl bg-accent active:cursor-grabbing"
                    drag="x"
                    dragConstraints={{ left: -130, right: 130 }}
                    style={{ x }}
                />
            </div>
            <div class="flex h-14 w-80 items-center justify-center rounded-full bg-bg">
                <motion.div
                    class="size-10 rounded-full border-2 border-accent"
                    style={{ x: followerX }}
                />
            </div>
            <button
                type="button"
                class="rounded-full border border-border bg-bg px-4 py-2 text-sm"
                onClick={() => setMirrored((value) => !value)}
            >
                {mirrored() ? "Mirrored" : "Same direction"}
            </button>
        </div>
    )
}
