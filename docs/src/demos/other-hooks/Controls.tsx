import { motion, useAnimationControls } from "@motion-s/solid"
import { For, onSettled } from "solid-js"

export default function Controls() {
    const controls = useAnimationControls()

    // Runs once the boxes are mounted.
    onSettled(() => {
        controls.start({ opacity: 1, y: 0 })
    })

    const jump = () =>
        controls.start((index: number) => ({
            y: [0, -32, 0],
            transition: { duration: 0.5, delay: index * 0.08 },
        }))

    return (
        <div class="flex flex-col items-center gap-8">
            <div class="flex gap-3">
                <For each={[0, 1, 2, 3, 4]}>
                    {(index) => (
                        <motion.div
                            class="size-10 rounded-xl bg-accent"
                            custom={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={controls}
                        />
                    )}
                </For>
            </div>
            <div class="flex gap-2">
                <button
                    type="button"
                    class="rounded-full border border-border bg-bg px-4 py-2 text-sm"
                    onClick={jump}
                >
                    Jump
                </button>
                <button
                    type="button"
                    class="rounded-full border border-border bg-bg px-4 py-2 text-sm"
                    onClick={() => controls.stop()}
                >
                    Stop
                </button>
            </div>
        </div>
    )
}
