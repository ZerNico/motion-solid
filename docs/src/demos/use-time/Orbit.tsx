import { motion, useTime, useTransform } from "@motion-s/solid"

export default function Orbit() {
  const time = useTime()

  // One turn every 4 seconds, without stopping at 360.
  const rotate = useTransform(time, [0, 4000], [0, 360], { clamp: false })

  // A point on a circle, computed from the time.
  const cx = useTransform(() => 80 + Math.cos(time.get() / 600) * 56)
  const cy = useTransform(() => 80 + Math.sin(time.get() / 600) * 56)

  return (
    <svg viewBox="0 0 160 160" class="size-40" aria-hidden="true">
      <circle
        cx="80"
        cy="80"
        r="56"
        fill="none"
        stroke="currentColor"
        class="text-border"
      />
      <motion.rect
        x="60"
        y="60"
        width="40"
        height="40"
        rx="10"
        class="fill-accent"
        style={{ rotate, originX: "50%", originY: "50%" }}
      />
      <motion.circle cx={cx} cy={cy} r="8" class="fill-accent" />
    </svg>
  )
}
