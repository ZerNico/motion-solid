import { MotionValue, motionValue } from "motion-dom"
import { createSignal, flush, onSettled } from "solid-js"
import { motion } from "../../"
import { nextMicrotask } from "../../gestures/__tests__/utils"
import { render } from "../../jest.setup"
import { useMotionTemplate } from "../use-motion-template"
import { useMotionValue } from "../use-motion-value"

describe("useMotionTemplate", () => {
    test("sets initial value", async () => {
        const Component = () => {
            const x = useMotionValue(1)
            const y = useMotionValue(2)
            const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px)`
            return <motion.div style={{ transform }} />
        }

        const { container } = render(() => <Component />)

        expect(container.firstChild).toHaveStyle(
            `transform: translateX(1px) translateY(2px)`
        )
    })

    test("responds to manual setting from parent value", async () => {
        const Component = () => {
            const x = useMotionValue(1)
            const y = useMotionValue(2)
            const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px)`

            onSettled(() => {
                x.set(10)
            })

            return <motion.div style={{ transform }} />
        }

        // Port note: upstream re-renders here (`rerender(<Component />)`), a no-op in Solid.
        const { container } = render(() => <Component />)
        const { firstChild } = container

        return new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
                expect(firstChild).toHaveStyle(
                    `transform: translateX(10px) translateY(2px)`
                )
                resolve()
            })
        })
    })

    // Port note: arguments that change are passed as accessors (hooks run once in Solid).
    test("can be re-pointed to another `MotionValue`", async () => {
        const a = motionValue(1)
        const b = motionValue(2)
        const Component = (props: { value: MotionValue }) => {
            const transform = useMotionTemplate`translateX(${() =>
                props.value}px)`
            return <motion.div style={{ transform }} />
        }

        const [value, setValue] = createSignal(a)
        const { container } = render(() => <Component value={value()} />)

        expect(container.firstChild).toHaveStyle(`transform: translateX(1px)`)

        setValue(() => b)
        flush()

        await nextMicrotask()

        expect(container.firstChild).toHaveStyle(`transform: translateX(2px)`)
    })

    // Port note: arguments that change are passed as accessors (hooks run once in Solid).
    test("respects static values", async () => {
        const Component = (props: { y: number }) => {
            const x = useMotionValue(1)
            const transform = useMotionTemplate`translateX(${x}px) translateY(${() =>
                props.y}px)`
            return <motion.div style={{ transform }} />
        }

        const [y, setY] = createSignal(1)
        const { container } = render(() => <Component y={y()} />)

        expect(container.firstChild).toHaveStyle(
            `transform: translateX(1px) translateY(1px)`
        )
        setY(2)
        flush()
        await nextMicrotask()
        expect(container.firstChild).toHaveStyle(
            `transform: translateX(1px) translateY(2px)`
        )
    })
})
