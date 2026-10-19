import { motion, useDragControls } from "@motion-s/solid"
import { createSignal } from "solid-js"

export default function Scrubber() {
    const controls = useDragControls()
    const [track, setTrack] = createSignal<HTMLDivElement>()

    return (
        <div
            ref={setTrack}
            class="flex h-10 w-80 cursor-pointer touch-none items-center rounded-full bg-bg px-1"
            onPointerDown={(event) =>
                controls.start(event, { snapToCursor: true })
            }
        >
            <motion.div
                class="size-8 rounded-full bg-accent shadow"
                drag="x"
                dragControls={controls}
                dragListener={false}
                dragConstraints={track}
                dragElastic={0}
                dragMomentum={false}
                whileDrag={{ scale: 1.15 }}
            />
        </div>
    )
}
