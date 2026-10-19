import { motion, useMotionValue, useTransform } from "@motion-s/solid"

export default function DragColor() {
  const x = useMotionValue(0)
  const backgroundColor = useTransform(
    x,
    [-120, 0, 120],
    ["#f43f5e", "#4f6bff", "#10b981"]
  )
  const rotate = useTransform(x, [-120, 120], [-90, 90])

  return (
    <div class="flex h-28 w-80 items-center justify-center rounded-full bg-bg">
      <motion.div
        class="size-16 cursor-grab rounded-2xl active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: -120, right: 120 }}
        style={{ x, rotate, backgroundColor }}
      />
    </div>
  )
}
