import { motion } from "@motion-s/solid"

export default function Gestures() {
  return (
    <motion.button
      class="rounded-full bg-accent px-6 py-3 font-medium text-white"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      Press me
    </motion.button>
  )
}
