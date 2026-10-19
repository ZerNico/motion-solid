import { motion, stagger, type Variants } from "@motion-s/solid"
import { createSignal, For } from "solid-js"

const list: Variants = {
    open: {
        opacity: 1,
        transition: { when: "beforeChildren", delayChildren: stagger(0.07) },
    },
    closed: {
        opacity: 0,
        transition: {
            when: "afterChildren",
            delayChildren: stagger(0.04, { from: "last" }),
        },
    },
}

const item: Variants = {
    open: { opacity: 1, x: 0 },
    closed: { opacity: 0, x: -24 },
}

const labels = ["Inbox", "Drafts", "Sent", "Archive", "Trash"]

export default function VariantsDemo() {
    const [isOpen, setIsOpen] = createSignal(true)

    return (
        <div class="flex w-48 flex-col gap-3">
            <button
                type="button"
                class="rounded-full border border-border bg-bg px-4 py-2 text-sm"
                onClick={() => setIsOpen((open) => !open)}
            >
                {isOpen() ? "Close" : "Open"}
            </button>
            <motion.ul
                class="flex flex-col gap-1 rounded-xl bg-bg p-2"
                variants={list}
                initial="closed"
                animate={isOpen() ? "open" : "closed"}
            >
                <For each={labels}>
                    {(label) => (
                        <motion.li
                            class="rounded-lg px-3 py-1.5 text-sm"
                            variants={item}
                        >
                            {label}
                        </motion.li>
                    )}
                </For>
            </motion.ul>
        </div>
    )
}
