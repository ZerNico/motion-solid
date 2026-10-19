import { motion } from "@motion-s/solid"

export default function HoverVariants() {
    return (
        <motion.button
            type="button"
            class="flex items-center gap-3 rounded-full bg-bg py-3 pr-4 pl-6 text-sm font-medium"
            initial="rest"
            whileHover="hover"
            whileTap="press"
            variants={{
                rest: { scale: 1 },
                hover: { scale: 1.04 },
                press: { scale: 0.96 },
            }}
        >
            Continue
            <motion.span
                class="flex size-7 items-center justify-center rounded-full bg-accent text-white"
                variants={{
                    rest: { x: 0, rotate: 0 },
                    hover: { x: 4, rotate: -45 },
                    press: { x: 8, rotate: -45 },
                }}
            >
                →
            </motion.span>
        </motion.button>
    )
}
