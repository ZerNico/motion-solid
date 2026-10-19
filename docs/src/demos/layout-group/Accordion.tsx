import { LayoutGroup, motion } from "@motion-s/solid"
import { createSignal, For, Show } from "solid-js"

const sections = [
    {
        title: "What is a layout group?",
        body: "A set of components whose layout animations are measured together.",
    },
    {
        title: "When do I need one?",
        body: "When components that affect each other's layout are in separate motion components.",
    },
    {
        title: "Does it render an element?",
        body: "No. It only provides a context to the components inside it.",
    },
]

function Section(props: { title: string; body: string }) {
    const [isOpen, setIsOpen] = createSignal(false)

    return (
        // Each section has its own (non-layout) motion wrapper for the hover effect,
        // so the sections are in separate layout scopes.
        <motion.div whileHover={{ scale: 1.01 }}>
            <motion.div
                layout
                class="overflow-hidden bg-bg"
                style={{ borderRadius: 12 }}
            >
                <motion.button
                    layout="position"
                    type="button"
                    class="w-full px-4 py-3 text-left text-sm font-medium"
                    aria-expanded={isOpen() ? "true" : "false"}
                    onClick={() => setIsOpen((open) => !open)}
                >
                    {props.title}
                </motion.button>
                <Show when={isOpen()}>
                    <motion.p
                        class="px-4 pb-3 text-sm text-fg-muted"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        {props.body}
                    </motion.p>
                </Show>
            </motion.div>
        </motion.div>
    )
}

export default function Accordion() {
    return (
        <div class="flex w-80 flex-col gap-2">
            <LayoutGroup>
                <For each={sections}>
                    {(section) => <Section {...section} />}
                </For>
            </LayoutGroup>
        </div>
    )
}
