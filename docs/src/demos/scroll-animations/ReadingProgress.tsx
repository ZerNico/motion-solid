import { motion, useScroll, useSpring } from "@motion-s/solid"
import { For } from "solid-js"

const paragraphs = [
    "The bar above this text fills up as you scroll. Its width is a scale, driven by the scroll progress of this box.",
    "useScroll returns motion values. They update outside of Solid's reactivity, so the bar changes every frame without running any component code.",
    "useSpring follows the progress with a spring. The bar catches up with a short delay, which smooths out fast scrolling.",
    "The box you are scrolling is not the page. It is passed to useScroll as its container, through a signal set by its ref.",
    "Scroll back up and the bar shrinks again. Progress goes from 0 at the top to 1 at the bottom.",
]

export default function ReadingProgress() {
    const container = { current: null as HTMLElement | null }
    const { scrollYProgress } = useScroll({ container })
    const scaleX = useSpring(scrollYProgress, { stiffness: 300, damping: 40 })

    return (
        <div class="w-80 overflow-hidden rounded-xl border border-border bg-bg">
            <motion.div
                class="h-1.5 origin-left bg-accent"
                style={{ scaleX }}
            />
            <div
                ref={(element) => (container.current = element)}
                class="h-52 overflow-y-auto px-5 py-4 text-sm leading-relaxed"
            >
                <h3 class="mb-3 font-semibold">Reading progress</h3>
                <For each={paragraphs}>
                    {(paragraph) => (
                        <p class="mb-3 text-fg-muted">{paragraph}</p>
                    )}
                </For>
            </div>
        </div>
    )
}
