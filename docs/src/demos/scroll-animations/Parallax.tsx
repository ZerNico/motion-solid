import { motion, useScroll, useTransform } from "@motion-s/solid"
import { For } from "solid-js"

type Ref = { current: HTMLElement | null }

function Section(props: { container: Ref; index: number }) {
    const target: Ref = { current: null }
    const { scrollYProgress } = useScroll({
        container: props.container,
        target,
        offset: ["start end", "end start"],
    })
    // The shape moves down while the section moves up, so it scrolls slower.
    const y = useTransform(scrollYProgress, [0, 1], [-60, 60])

    return (
        <section
            ref={(element) => (target.current = element)}
            class="relative flex h-44 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface"
        >
            <motion.div class="size-20 rounded-3xl bg-accent" style={{ y }} />
            <span class="absolute top-3 left-4 text-sm font-semibold text-fg-muted">
                0{props.index + 1}
            </span>
        </section>
    )
}

export default function Parallax() {
    const container: Ref = { current: null }

    return (
        <div
            ref={(element) => (container.current = element)}
            class="relative flex h-64 w-80 flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-bg p-4"
        >
            <For each={[0, 1, 2, 3]}>
                {(index) => <Section container={container} index={index} />}
            </For>
        </div>
    )
}
