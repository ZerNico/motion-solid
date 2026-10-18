import { motionValue, MotionValue } from "motion-dom"
import { createSignal, flush } from "solid-js"
import { motion } from "../../"
import { nextMicrotask } from "../../gestures/__tests__/utils"
import { render } from "../../jest.setup"
import { useMotionValue } from "../use-motion-value"

describe("useMotionValue", () => {
    test("sets initial value", async () => {
        const Component = () => {
            const x = useMotionValue(100)
            return <motion.div style={{ x }} />
        }

        const { container } = render(() => <Component />)
        expect(container.firstChild).toHaveStyle("transform: translateX(100px)")
    })

    test("can be set manually", async () => {
        const Component = () => {
            const x = useMotionValue(100)

            x.set(500)

            return <motion.div style={{ x }} />
        }

        const { container } = render(() => <Component />)
        expect(container.firstChild).toHaveStyle("transform: translateX(500px)")
    })

    test("accepts new motion values", async () => {
        const a = motionValue(0)
        const b = motionValue(5)
        const Component = (props: { x: MotionValue<number> }) => {
            return <motion.div style={{ x: props.x }} />
        }

        const [x, setX] = createSignal(a)
        const { container } = render(() => <Component x={x()} />)
        expect(container.firstChild).toHaveStyle("transform: none")

        setX(() => b)
        flush()

        await nextMicrotask()

        expect(container.firstChild).toHaveStyle("transform: translateX(5px)")
    })

    test("fires callbacks", async () => {
        const onChange = jest.fn()
        const Component = () => {
            const x = useMotionValue(100)
            x.on("change", onChange)

            x.set(500)

            return <motion.div style={{ x }} />
        }

        render(() => <Component />)
        expect(onChange).toHaveBeenCalled()
    })

    test("is typed", async () => {
        const Component = () => {
            const x = useMotionValue(100)
            return <motion.div style={{ x }} />
        }

        const { container } = render(() => <Component />)
        expect(container.firstChild).toHaveStyle("transform: translateX(100px)")
    })
})
