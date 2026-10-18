import { checkVariantsDidChange } from "motion-dom"
import { createSignal, flush } from "solid-js"
import { motion, motionValue } from "../.."
import { render } from "../../jest.setup"

describe("keyframes transition", () => {
    test("keyframes as target", async () => {
        const promise = new Promise((resolve) => {
            const resolveContainer = () => {
                requestAnimationFrame(() => {
                    resolve(container.firstChild)
                })
            }

            const Component = () => (
                <motion.div
                    initial={{ x: 0 }}
                    animate={{ x: [10, 200] }}
                    transition={{ duration: 0.1 }}
                    onAnimationComplete={resolveContainer}
                />
            )

            // Port note: upstream's identical-props rerender is a no-op in Solid.
            const { container } = render(() => <Component />)
        })

        // Port note: upstream doesn't await this and resolves the test container
        // (not the motion element), so the assertion never runs in Jest. Vitest
        // reports unawaited rejections, so it's awaited and checks the element.
        await expect(promise).resolves.toHaveStyle(
            "transform: translateX(200px)"
        )
    })

    test("hasUpdated detects only changed keyframe arrays", async () => {
        expect(checkVariantsDidChange("1", "2")).toBe(true)
        expect(checkVariantsDidChange(["1", "2", "3"], ["1", "2", "3"])).toBe(
            false
        )
        expect(checkVariantsDidChange(["1", "2", "3"], ["1", "2", "4"])).toBe(
            true
        )
    })

    test("keyframes with non-pixel values", async () => {
        const promise = new Promise((resolve) => {
            const resolveContainer = () => {
                requestAnimationFrame(() => {
                    resolve(container.firstChild)
                })
            }

            const Component = () => (
                <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: ["0%", "100%"] }}
                    transition={{ duration: 0.1 }}
                    onAnimationComplete={resolveContainer}
                />
            )

            // Port note: upstream's identical-props rerender is a no-op in Solid.
            const { container } = render(() => <Component />)
        })

        // Port note: upstream doesn't await this and resolves the test container
        // (not the motion element), so the assertion never runs in Jest. Vitest
        // reports unawaited rejections, so it's awaited and checks the element.
        await expect(promise).resolves.toHaveStyle("width: 100%;")
    })

    test("if initial={false}, take state of final keyframe", async () => {
        const xResult = await new Promise((resolve) => {
            const x = motionValue(0)
            const Component = (props: any) => {
                return (
                    <motion.div
                        initial={false}
                        animate={props.animate}
                        variants={{ a: { x: [0, 100] }, b: { x: [0, 100] } }}
                        transition={{ ease: () => 0.5, duration: 10 }}
                        style={{ x }}
                    />
                )
            }

            render(() => <Component animate="a" />)
            setTimeout(() => resolve(x.get()), 50)
        })

        expect(xResult).toBe(100)
    })

    test("keyframes animation reruns when variants change and keyframes are the same", async () => {
        const xResult = await new Promise((resolve) => {
            const x = motionValue(0)
            const Component = (props: any) => {
                return (
                    <motion.div
                        initial={false}
                        animate={props.animate}
                        variants={{
                            a: { x: [0, 100] },
                            b: { x: [0, 100], transition: { type: false } },
                        }}
                        transition={{ ease: () => 0.5, duration: 10 }}
                        style={{ x }}
                    />
                )
            }

            const [animate, setAnimate] = createSignal("a")
            render(() => <Component animate={animate()} />)
            setAnimate("b")
            flush()
            setAnimate("a")
            flush()
            setTimeout(() => resolve(x.get()), 50)
        })

        expect(xResult).toBe(50)
    })

    test("issue #2855: keyframes with shared values across variants rerun on each change", async () => {
        const z = motionValue(0)
        const updateCounts: number[] = []

        const Component = (props: any) => (
            <motion.div
                animate={props.animate}
                variants={{
                    start: { rotateZ: [0, 10, 0] },
                    end: { rotateZ: [0, 10, 0] },
                }}
                transition={{ duration: 0.05, ease: "linear" }}
                style={{ rotateZ: z }}
            />
        )

        const recordAndReset = async () => {
            let count = 0
            const unsubscribe = z.on("change", () => count++)
            await new Promise((r) => setTimeout(r, 100))
            unsubscribe()
            updateCounts.push(count)
        }

        const [animate, setAnimate] = createSignal("start")
        render(() => <Component animate={animate()} />)
        await recordAndReset()

        setAnimate("end")
        flush()
        await recordAndReset()

        setAnimate("start")
        flush()
        await recordAndReset()

        expect(updateCounts[0]).toBeGreaterThan(0)
        expect(updateCounts[1]).toBeGreaterThan(0)
        expect(updateCounts[2]).toBeGreaterThan(0)
    })

    test("times works as expected", async () => {
        const values = await new Promise<number[]>((resolve) => {
            const output: number[] = []

            const Component = () => (
                <motion.div
                    animate={{ x: [50, 100, 200, 300] }}
                    transition={{ duration: 0.1, times: [0, 0, 1, 1] }}
                    onUpdate={(latest) =>
                        output.push(Math.round(latest.x as number))
                    }
                    onAnimationComplete={() => resolve(output)}
                    // Manually setting willChange to auto to prevent changes to willChange triggering onUpdate
                    style={{ willChange: "auto" }}
                />
            )

            // Port note: upstream's identical-props rerender is a no-op in Solid.
            render(() => <Component />)
        })

        expect(values[0] >= 100).toBe(true)
        expect(values[values.length - 2] <= 200).toBe(true)
    })
})
