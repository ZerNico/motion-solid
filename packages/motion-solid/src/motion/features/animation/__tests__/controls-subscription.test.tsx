import { createSignal, flush } from "solid-js"
import { motion, motionValue } from "../../../.."
import { render } from "../../../../jest.setup"
import { animationControls } from "../../../../animation/hooks/animation-controls"

describe("animate={controls}", () => {
    test("switching controls unsubscribes from the previous ones", async () => {
        const a = animationControls()
        const b = animationControls()
        const unmountA = a.mount()
        const unmountB = b.mount()
        const x = motionValue(0)
        const [controls, setControls] = createSignal(a)

        const { unmount } = render(() => (
            <motion.div animate={controls()} style={{ x }} />
        ))
        await new Promise((resolve) => setTimeout(resolve, 10))

        a.set({ x: 10 })
        expect(x.get()).toBe(10)

        setControls(b)
        flush()
        await new Promise((resolve) => setTimeout(resolve, 10))

        a.set({ x: 20 })
        expect(x.get()).toBe(10)
        b.set({ x: 30 })
        expect(x.get()).toBe(30)

        unmount()
        b.set({ x: 40 })
        expect(x.get()).toBe(30)

        unmountA()
        unmountB()
    })
})
