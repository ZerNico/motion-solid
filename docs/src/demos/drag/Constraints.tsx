import { motion } from "@motion-s/solid"
import { createSignal } from "solid-js"

export default function Constraints() {
  const [container, setContainer] = createSignal<HTMLDivElement>()

  return (
    <div
      ref={setContainer}
      class="flex h-48 w-80 items-center justify-center rounded-2xl border border-dashed border-border bg-bg"
    >
      <motion.div
        class="size-16 cursor-grab rounded-2xl bg-accent active:cursor-grabbing"
        drag
        dragConstraints={container}
        whileDrag={{ scale: 1.1, rotate: 6 }}
      />
    </div>
  )
}
