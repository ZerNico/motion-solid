import { motion } from "@motion-s/solid"
import type { JSX } from "@solidjs/web"

// A plain component: it passes `ref` to its root element and renders `children`.
function Card(props: {
    ref?: (element: HTMLDivElement) => void
    title: string
    children?: JSX.Element
}) {
    return (
        <div
            ref={props.ref}
            class="w-56 rounded-xl border border-border bg-bg p-4"
        >
            <p class="font-medium">{props.title}</p>
            <p class="mt-1 text-sm text-fg-muted">{props.children}</p>
        </div>
    )
}

const MotionCard = motion.create(Card)

export default function CreateComponent() {
    return (
        <MotionCard
            title="Weekly report"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            Hover or press the card.
        </MotionCard>
    )
}
