import { motion } from "@motion-s/solid"

export default function Enter() {
  return (
    <motion.div
      class="size-24 rounded-2xl bg-accent"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    />
  )
}
