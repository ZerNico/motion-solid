import { AnimatePresence, motion, Show, type Variants } from "@motion-s/solid"
import { createSignal } from "solid-js"

const slides = [
    { title: "One", color: "#4f6bff" },
    { title: "Two", color: "#14b8a6" },
    { title: "Three", color: "#f59e0b" },
    { title: "Four", color: "#ec4899" },
]

// `direction` is the `custom` value: 1 for next, -1 for previous.
const variants: Variants = {
    enter: (direction: number) => ({ x: direction * 120, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction * -120, opacity: 0 }),
}

export default function Slideshow() {
    const [index, setIndex] = createSignal(0)
    const [direction, setDirection] = createSignal(1)

    const paginate = (step: number) => {
        setDirection(step)
        setIndex((index) => (index + step + slides.length) % slides.length)
    }

    return (
        <div class="flex items-center gap-4">
            <button
                type="button"
                class="rounded-full border border-border bg-bg px-3 py-2 text-sm"
                aria-label="Previous slide"
                onClick={() => paginate(-1)}
            >
                ←
            </button>
            <div class="relative h-32 w-48 overflow-hidden rounded-2xl">
                <AnimatePresence initial={false} custom={direction()}>
                    <Show when={slides[index()]} keyed>
                        {(slide) => (
                            <motion.div
                                class="absolute inset-0 flex items-center justify-center text-2xl font-semibold text-white"
                                style={{ backgroundColor: slide.color }}
                                custom={direction()}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.35 }}
                            >
                                {slide.title}
                            </motion.div>
                        )}
                    </Show>
                </AnimatePresence>
            </div>
            <button
                type="button"
                class="rounded-full border border-border bg-bg px-3 py-2 text-sm"
                aria-label="Next slide"
                onClick={() => paginate(1)}
            >
                →
            </button>
        </div>
    )
}
