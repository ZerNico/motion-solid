import { motion, useMotionValue, useSpring } from "@motion-s/solid"

export default function Follower() {
  const x = useMotionValue(140)
  const y = useMotionValue(80)
  const springX = useSpring(x, { stiffness: 150, damping: 15 })
  const springY = useSpring(y, { stiffness: 150, damping: 15 })

  return (
    <div
      class="relative h-40 w-72 cursor-crosshair overflow-hidden rounded-2xl bg-bg"
      onPointerMove={(event) => {
        const box = event.currentTarget.getBoundingClientRect()
        x.set(event.clientX - box.left)
        y.set(event.clientY - box.top)
      }}
    >
      <motion.div
        class="pointer-events-none absolute -top-2 -left-2 size-4 rounded-full border-2 border-fg-muted"
        style={{ x, y }}
      />
      <motion.div
        class="pointer-events-none absolute -top-5 -left-5 size-10 rounded-full bg-accent opacity-80"
        style={{ x: springX, y: springY }}
      />
    </div>
  )
}
