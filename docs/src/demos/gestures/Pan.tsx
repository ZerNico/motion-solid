import { animate, motion, useMotionValue } from "@motion-s/solid"
import { createSignal } from "solid-js"

export default function Pan() {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const [offset, setOffset] = createSignal({ x: 0, y: 0 })

  return (
    <div class="flex flex-col items-center gap-4">
      <motion.div
        class="flex size-40 touch-none items-center justify-center rounded-3xl border border-dashed border-border bg-bg select-none"
        onPan={(_, info) => {
          // Follow the pointer at half its distance.
          x.set(info.offset.x / 2)
          y.set(info.offset.y / 2)
          setOffset(info.offset)
        }}
        onPanEnd={() => {
          const spring = {
            type: "spring",
            visualDuration: 0.4,
            bounce: 0.5,
          } as const
          animate(x, 0, spring)
          animate(y, 0, spring)
        }}
      >
        <motion.div class="size-12 rounded-full bg-accent" style={{ x, y }} />
      </motion.div>
      <p class="text-sm text-fg-muted tabular-nums">
        offset: {Math.round(offset().x)}, {Math.round(offset().y)}
      </p>
    </div>
  )
}
