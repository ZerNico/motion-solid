import {
    motion,
    useMotionValue,
    useSpring,
    useTransform,
    useVelocity,
} from "@motion-s/solid"

export default function SkewByVelocity() {
    const x = useMotionValue(0)
    const xVelocity = useVelocity(x)
    const skewX = useSpring(
        useTransform(xVelocity, [-2000, 0, 2000], [30, 0, -30]),
        { stiffness: 400, damping: 30 }
    )

    return (
        <div class="flex flex-col items-center gap-4">
            <div class="flex h-28 w-80 items-center justify-center rounded-full bg-bg">
                <motion.div
                    class="h-16 w-12 cursor-grab rounded-xl bg-accent active:cursor-grabbing"
                    drag="x"
                    dragConstraints={{ left: -120, right: 120 }}
                    style={{ x, skewX }}
                />
            </div>
            <p class="text-sm text-fg-muted">Drag and throw the card</p>
        </div>
    )
}
