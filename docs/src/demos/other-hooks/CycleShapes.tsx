import { motion, useCycle } from "@motion-s/solid"

export default function CycleShapes() {
    const [shape, cycleShape] = useCycle(
        { borderRadius: "16px", rotate: 0, scale: 1 },
        { borderRadius: "50%", rotate: 0, scale: 0.8 },
        { borderRadius: "4px", rotate: 45, scale: 0.9 }
    )

    return (
        <div class="flex flex-col items-center gap-6">
            <motion.div
                class="size-24 bg-accent"
                initial={false}
                animate={shape()}
                transition={{ type: "spring", bounce: 0.4 }}
            />
            <button
                type="button"
                class="rounded-full border border-border bg-bg px-4 py-2 text-sm"
                onClick={() => cycleShape()}
            >
                Next shape
            </button>
        </div>
    )
}
