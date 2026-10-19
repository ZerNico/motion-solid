import { motion } from "@motion-s/solid"

export default function Spinner() {
    return (
        <svg viewBox="0 0 48 48" class="size-20" fill="none" stroke-width="4">
            <circle cx="24" cy="24" r="20" class="stroke-border" />
            <motion.circle
                cx="24"
                cy="24"
                r="20"
                stroke="#4f6bff"
                stroke-linecap="round"
                animate={{
                    pathLength: [0.05, 0.6, 0.05],
                    pathOffset: [0, 0.3, 1],
                    rotate: [0, 360],
                }}
                transition={{
                    duration: 1.6,
                    ease: "easeInOut",
                    repeat: Infinity,
                    rotate: { duration: 1.6, ease: "linear", repeat: Infinity },
                }}
            />
        </svg>
    )
}
