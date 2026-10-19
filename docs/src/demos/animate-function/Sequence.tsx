import { animate, type AnimationSequence } from "@motion-s/solid"
import { onSettled } from "solid-js"

export default function Sequence() {
    let avatar!: HTMLDivElement
    let title!: HTMLDivElement
    let text!: HTMLDivElement
    let badge!: HTMLDivElement

    function play() {
        const sequence: AnimationSequence = [
            [avatar, { scale: [0, 1] }, { type: "spring", bounce: 0.4 }],
            [title, { scaleX: [0, 1] }, { duration: 0.4, at: "-0.3" }],
            [text, { scaleX: [0, 1] }, { duration: 0.4, at: "-0.25" }],
            [
                badge,
                { opacity: [0, 1], y: [8, 0] },
                { duration: 0.3, at: "+0.1" },
            ],
        ]
        animate(sequence)
    }

    onSettled(play)

    return (
        <div class="flex flex-col items-center gap-6">
            <div class="flex w-64 items-center gap-4 rounded-xl border border-border bg-bg p-4">
                <div
                    ref={avatar}
                    class="size-12 shrink-0 scale-0 rounded-full bg-accent"
                />
                <div class="flex flex-1 flex-col gap-2">
                    <div
                        ref={title}
                        class="h-3 w-3/4 origin-left scale-x-0 rounded-full bg-accent"
                    />
                    <div
                        ref={text}
                        class="h-3 origin-left scale-x-0 rounded-full bg-accent/40"
                    />
                    <div
                        ref={badge}
                        class="w-fit rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent opacity-0"
                    >
                        New
                    </div>
                </div>
            </div>
            <button
                type="button"
                class="rounded-full border border-border bg-bg px-4 py-2 text-sm"
                onClick={play}
            >
                Play again
            </button>
        </div>
    )
}
