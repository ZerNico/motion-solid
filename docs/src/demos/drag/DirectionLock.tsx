import { motion } from "@motion-s/solid"
import { createSignal } from "solid-js"

export default function DirectionLock() {
  const [axis, setAxis] = createSignal<"x" | "y" | null>(null)

  return (
    <div class="flex flex-col items-center gap-6">
      <div class="relative flex size-40 items-center justify-center">
        <div
          class={[
            "pointer-events-none absolute h-1 w-full rounded-full bg-border transition-opacity",
            { "opacity-30": axis() === "y" },
          ]}
        />
        <div
          class={[
            "pointer-events-none absolute h-full w-1 rounded-full bg-border transition-opacity",
            { "opacity-30": axis() === "x" },
          ]}
        />
        <motion.div
          class="size-12 cursor-grab rounded-full bg-accent active:cursor-grabbing"
          drag
          dragDirectionLock
          dragSnapToOrigin
          onDirectionLock={(direction) => setAxis(direction)}
          onDragEnd={() => setAxis(null)}
        />
      </div>
      <p class="text-sm text-fg-muted">
        Locked to: <span class="font-medium text-fg">{axis() ?? "none"}</span>
      </p>
    </div>
  )
}
