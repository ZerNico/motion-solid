/**
 * Port note: copy of upstream's `gestures/drag/__tests__/utils.tsx` helpers used by the pan and
 * press tests, kept here so these tests don't depend on the drag tests' port. `React.act` is
 * replaced by `flush()` (done by the jest.setup helpers).
 */
import type { JSX } from "@solidjs/web"
import { frame } from "motion-dom"
import { MotionConfig } from "../../components/MotionConfig"
import { pointerDown, pointerMove, pointerUp } from "../../jest.setup"

export type Point = {
    x: number
    y: number
}

const pos: Point = {
    x: 0,
    y: 0,
}

export const dragFrame = {
    postRender: () => new Promise((resolve) => frame.postRender(resolve)),
}

type Deferred<T> = {
    promise: Promise<T>
    resolve: unknown extends T ? () => void : (value: T) => void
}

export function deferred<T>(): Deferred<T> {
    const def = {} as Deferred<T>
    def.promise = new Promise((resolve) => {
        def.resolve = resolve as any
    })
    return def
}

export const drag = (element: any, triggerElement?: any) => {
    pos.x = 0
    pos.y = 0
    pointerDown(triggerElement || element)

    const controls = {
        to: async (x: number, y: number) => {
            pos.x = x
            pos.y = y

            pointerMove(document.body)
            await dragFrame.postRender()

            return controls
        },
        end: () => {
            pointerUp(element)
        },
    }

    return controls
}

export const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms))

export const MockDrag = (props: { children?: JSX.Element }) => (
    <MotionConfig transformPagePoint={() => pos}>{props.children}</MotionConfig>
)
