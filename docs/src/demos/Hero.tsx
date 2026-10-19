import { motion } from "@motion-s/solid"

export function Hero() {
  return (
    <motion.div
      class="size-24 rounded-3xl bg-accent"
      initial={{ scale: 0, rotate: -90 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", bounce: 0.4 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9, rotate: 15 }}
    />
  )
}
