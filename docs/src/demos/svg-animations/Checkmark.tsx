import { motion } from "@motion-s/solid"
import { createSignal } from "solid-js"

export default function Checkmark() {
    const [isDone, setIsDone] = createSignal(true)

    return (
        <div class="flex flex-col items-center gap-6">
            <svg
                viewBox="0 0 64 64"
                class="size-28"
                fill="none"
                stroke="#4f6bff"
            >
                <motion.circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke-width="4"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={
                        isDone()
                            ? { pathLength: 1, opacity: 1 }
                            : { pathLength: 0, opacity: 0 }
                    }
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                />
                <motion.path
                    d="M20 33 L28 41 L44 23"
                    stroke-width="5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={
                        isDone()
                            ? { pathLength: 1, opacity: 1 }
                            : { pathLength: 0, opacity: 0 }
                    }
                    transition={{
                        duration: 0.35,
                        ease: "easeOut",
                        delay: isDone() ? 0.5 : 0,
                    }}
                />
            </svg>
            <button
                type="button"
                class="rounded-full border border-border bg-bg px-4 py-2 text-sm"
                onClick={() => setIsDone((done) => !done)}
            >
                {isDone() ? "Undo" : "Complete"}
            </button>
        </div>
    )
}
