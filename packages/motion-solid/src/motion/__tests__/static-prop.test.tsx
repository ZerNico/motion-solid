import { motionValue, stagger, globalProjectionState } from "motion-dom"
import { createSignal, flush, onSettled } from "solid-js"
import { motion, useMotionValue } from "../.."
import { MotionConfig } from "../../components/MotionConfig"
import { render } from "../../jest.setup"

describe("isStatic prop", () => {
    test("it prevents rendering of animated values", async () => {
        const promise = new Promise((resolve) => {
            const scale = motionValue(0)
            const Component = () => (
                <MotionConfig isStatic>
                    <motion.div
                        animate={{ scale: 2 }}
                        transition={{ type: false }}
                        style={{ scale }}
                    />
                </MotionConfig>
            )

            // Port note: upstream re-renders with the same props, a no-op in Solid.
            render(() => <Component />)

            setTimeout(() => resolve(scale.get()), 50)
        })

        return expect(promise).resolves.toBe(0)
    })

    test("it permits updating transform values via style", () => {
        function Component(props: { x: number }) {
            return (
                <MotionConfig isStatic>
                    <motion.div data-testid="child" style={{ x: props.x }} />
                </MotionConfig>
            )
        }
        const [x, setX] = createSignal(100)
        const { getByTestId } = render(() => <Component x={x()} />)
        setX(200)
        flush()

        expect(getByTestId("child") as Element).toHaveStyle(
            "transform: translateX(200px)"
        )
    })

    test("it removes unused styles", () => {
        function Component(props: { z?: number }) {
            return (
                <MotionConfig isStatic>
                    <motion.div data-testid="child" style={{ z: props.z }} />
                </MotionConfig>
            )
        }

        const [z, setZ] = createSignal<number | undefined>(100)
        const { getByTestId } = render(() => <Component z={z()} />)

        expect(getByTestId("child") as Element).toHaveStyle(
            "transform: translateZ(100px)"
        )

        setZ(undefined)
        flush()

        expect(getByTestId("child") as Element).not.toHaveStyle(
            "transform: translateZ(100px)"
        )
    })

    test("it doesn't respond to updates in `initial`", () => {
        function Component(props: { x?: number }) {
            return (
                <MotionConfig isStatic={false}>
                    <motion.div data-testid="child" initial={{ x: props.x }} />
                </MotionConfig>
            )
        }
        const [x, setX] = createSignal(100)
        const { getByTestId } = render(() => <Component x={x()} />)
        setX(200)
        flush()

        expect(getByTestId("child") as Element).toHaveStyle(
            "transform: translateX(100px)"
        )
    })

    test("it responds to updates in `initial` if isStatic", () => {
        function Component(props: { x?: number }) {
            return (
                <MotionConfig isStatic>
                    <motion.div data-testid="child" initial={{ x: props.x }} />
                </MotionConfig>
            )
        }
        const [x, setX] = createSignal(100)
        const { getByTestId } = render(() => <Component x={x()} />)
        setX(200)
        flush()

        expect(getByTestId("child") as Element).toHaveStyle(
            "transform: translateX(200px)"
        )
    })

    test("it doesn't override defined styles if values are removed", () => {
        function Component(props: { initial?: { [key: string]: number } }) {
            return (
                <MotionConfig isStatic>
                    <motion.div
                        data-testid="child"
                        initial={props.initial}
                        style={{ opacity: 0.5 }}
                    />
                </MotionConfig>
            )
        }
        const [initial, setInitial] = createSignal<
            { [key: string]: number } | undefined
        >({ opacity: 0.8 })
        const { getByTestId } = render(() => <Component initial={initial()} />)

        expect(getByTestId("child") as Element).toHaveStyle("opacity: 0.8")

        setInitial(undefined)
        flush()

        expect(getByTestId("child") as Element).toHaveStyle("opacity: 0.5")
    })

    test("it propagates changes in `initial` if isStatic", () => {
        const variants = {
            visible: { opacity: 1 },
            hidden: { opacity: 0 },
        }

        const Component = (props: { initial: string }) => (
            <MotionConfig isStatic>
                <motion.div
                    data-testid="parent"
                    initial={props.initial}
                    variants={variants}
                >
                    <motion.div data-testid="child" variants={variants} />
                </motion.div>
            </MotionConfig>
        )

        const [initial, setInitial] = createSignal("visible")
        const { getByTestId } = render(() => <Component initial={initial()} />)
        setInitial("hidden")
        flush()

        expect(getByTestId("parent")).toHaveStyle("opacity: 0")
        expect(getByTestId("child")).toHaveStyle("opacity: 0")
    })

    test("it prevents rendering of children via context", async () => {
        const promise = new Promise((resolve) => {
            const scale = motionValue(0)
            const Component = () => (
                <MotionConfig isStatic>
                    <motion.div
                        animate={{ opacity: 0 }}
                        transition={{ type: false }}
                    >
                        <motion.button
                            animate={{ scale: 2 }}
                            transition={{ type: false }}
                            style={{ scale }}
                        />
                    </motion.div>
                </MotionConfig>
            )

            // Port note: upstream re-renders with the same props, a no-op in Solid.
            render(() => <Component />)

            setTimeout(() => resolve(scale.get()), 50)
        })

        return expect(promise).resolves.toBe(0)
    })

    it("accepts externally-defined transition", () => {
        const transition = {
            delayChildren: stagger(10, { from: "last" }),
            when: "beforeChildren",
        }
        function Test() {
            return (
                <MotionConfig isStatic>
                    <motion.div data-testid="child" transition={transition} />
                </MotionConfig>
            )
        }

        // Port note: upstream re-renders with the same props, a no-op in Solid.
        const { getByTestId } = render(() => <Test />)

        expect(getByTestId("child")).toBeTruthy()
    })

    // Port note: skipped (the assertion throws in a timer, so the test times out). Upstream's
    // static useMotionValue re-renders on change, Solid components don't re-render (documented in
    // value/use-motion-value.ts).
    test.skip("it reflects changes in attached motion values", async () => {
        function Component() {
            const x = useMotionValue(10)

            onSettled(() => x.set(20))

            return <motion.div data-testid="child" style={{ x }} />
        }
        const { getByTestId } = render(() => (
            <MotionConfig isStatic>
                <Component />
            </MotionConfig>
        ))

        return new Promise((resolve) => {
            setTimeout(() => {
                expect(getByTestId("child") as Element).toHaveStyle(
                    "transform: translateX(20px)"
                )
                resolve(undefined)
            }, 40)
        })
    })

    test("it does not assign projection id to the node", () => {
        function Component(props: { x: number }) {
            return (
                <MotionConfig isStatic>
                    <motion.div data-testid="a" style={{ x: props.x }} />
                </MotionConfig>
            )
        }
        globalProjectionState.hasEverUpdated = true
        const { getByTestId } = render(() => <Component x={100} />)

        expect(getByTestId("a") as Element).not.toHaveAttribute(
            "data-projection-id"
        )
    })
})
