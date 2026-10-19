import { motion } from "@motion-s/solid"

export default function Keyframes() {
    return (
        <motion.div
            class="size-20 bg-accent"
            animate={{
                scale: [1, 1.4, 1.4, 1, 1],
                rotate: [0, 0, 180, 180, 0],
                borderRadius: ["20%", "20%", "50%", "50%", "20%"],
            }}
            transition={{
                duration: 2,
                ease: "easeInOut",
                times: [0, 0.2, 0.5, 0.8, 1],
                repeat: Infinity,
                repeatDelay: 0.5,
            }}
        />
    )
}
