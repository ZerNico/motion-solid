import { motion, useMotionValue, useMotionValueState } from "@motion-s/solid"
import { For } from "solid-js"

const step = 60
const ticks = [-2, -1, 0, 1, 2]

export default function Snap() {
  const x = useMotionValue(0)
  const value = useMotionValueState(x)

  return (
    <div class="flex flex-col items-center gap-6">
      <div class="relative flex h-14 w-72 items-center justify-center rounded-full bg-bg">
        <For each={ticks}>
          {(tick) => (
            <span
              class="pointer-events-none absolute size-1.5 rounded-full bg-border"
              style={{
                transform: `translateX(${tick * step}px)`,
              }}
            />
          )}
        </For>
        <motion.div
          class="size-10 cursor-grab rounded-full bg-accent active:cursor-grabbing"
          style={{ x }}
          drag="x"
          dragConstraints={{ left: -2 * step, right: 2 * step }}
          dragElastic={0.15}
          dragTransition={{
            power: 0.2,
            timeConstant: 200,
            modifyTarget: (target) => Math.round(target / step) * step,
          }}
        />
      </div>
      <p class="text-sm text-fg-muted tabular-nums">
        x: {Math.round(value())}px
      </p>
    </div>
  )
}
