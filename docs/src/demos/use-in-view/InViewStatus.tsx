import { motion, useInView } from "@motion-s/solid"

export default function InViewStatus() {
  let root!: HTMLDivElement
  let box!: HTMLDivElement
  const isInView = useInView(() => box, { root: () => root, amount: "all" })

  return (
    <div class="flex items-center gap-6">
      <div
        ref={root}
        class="h-52 w-52 overflow-y-auto rounded-xl border border-border bg-bg"
      >
        <p class="pt-4 text-center text-sm text-fg-muted">Scroll down</p>
        <div class="flex justify-center pt-64 pb-10">
          <motion.div
            ref={box}
            class="size-20 rounded-2xl bg-accent"
            animate={{ opacity: isInView() ? 1 : 0.2 }}
          />
        </div>
      </div>
      <motion.p
        class="w-28 rounded-full border border-border bg-bg px-3 py-1.5 text-center text-sm"
        animate={{ scale: isInView() ? 1.1 : 1 }}
      >
        {isInView() ? "In view" : "Not in view"}
      </motion.p>
    </div>
  )
}
