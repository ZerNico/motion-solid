import { createSignal, flush } from "solid-js"
import { motion, MotionConfig, useMotionValue } from "../.."
import { nextMicrotask } from "../../gestures/__tests__/utils"
import { render } from "../../jest.setup"

describe("style prop", () => {
    test("should remove non-set styles", () => {
        function Component(props: any) {
            return (
                <MotionConfig isStatic>
                    <motion.div data-testid="child" style={props.style} />
                </MotionConfig>
            )
        }

        const [style, setStyle] = createSignal<any>({ position: "absolute" })
        const { getByTestId } = render(() => <Component style={style()} />)

        expect(getByTestId("child")).toHaveStyle("position: absolute")

        setStyle({})
        flush()

        expect(getByTestId("child")).not.toHaveStyle("position: absolute")
    })

    test("should update transforms when passed a new value", async () => {
        const Component = (props: { x?: number }) => {
            return <motion.div style={{ x: props.x ?? 0 }} />
        }

        const [x, setX] = createSignal<number | undefined>(undefined)
        const { container } = render(() => <Component x={x()} />)

        expect(container.firstChild as Element).toHaveStyle("transform: none")

        setX(1)
        flush()

        await nextMicrotask()

        expect(container.firstChild as Element).toHaveStyle(
            "transform: translateX(1px)"
        )

        setX(0)
        flush()

        await nextMicrotask()

        expect(container.firstChild as Element).toHaveStyle("transform: none")
    })

    test("doesn't update transforms that are handled by animation props", () => {
        const Component = (props: { x?: number }) => {
            return (
                <motion.div
                    initial={{ x: 1 }}
                    animate={{ x: 200 }}
                    style={{ x: props.x ?? 0 }}
                />
            )
        }

        const [x, setX] = createSignal<number | undefined>(undefined)
        const { container } = render(() => <Component x={x()} />)

        expect(container.firstChild as Element).toHaveStyle(
            "transform: translateX(1px)"
        )

        setX(2)
        flush()

        expect(container.firstChild as Element).not.toHaveStyle(
            "transform: translateX(2px)"
        )
    })

    test("should update when passed new MotionValue", async () => {
        const Component = (props: { useX?: boolean }) => {
            const x = useMotionValue(1)
            const y = useMotionValue(2)
            const z = useMotionValue(3)

            return (
                <motion.div
                    style={{
                        x: props.useX ? x : 0,
                        y: !props.useX ? y : 0,
                        z: !props.useX ? z : 0,
                    }}
                />
            )
        }

        const [useX, setUseX] = createSignal(false)
        const { container } = render(() => <Component useX={useX()} />)
        expect(container.firstChild as Element).toHaveStyle(
            "transform: translateY(2px) translateZ(3px)"
        )

        setUseX(true)
        flush()

        await nextMicrotask()

        expect(container.firstChild as Element).toHaveStyle(
            "transform: translateX(1px)"
        )

        setUseX(false)
        flush()

        await nextMicrotask()

        expect(container.firstChild as Element).toHaveStyle(
            "transform: translateY(2px) translateZ(3px)"
        )
    })

    test("should update when swapping between motion value and static value", async () => {
        const Component = (props: { useBackgroundColor?: boolean }) => {
            const backgroundColor = useMotionValue("#fff")

            return (
                <motion.div
                    style={{
                        backgroundColor: props.useBackgroundColor
                            ? backgroundColor
                            : "#000",
                    }}
                />
            )
        }

        const [useBackgroundColor, setUseBackgroundColor] = createSignal(true)
        const { container } = render(() => (
            <Component useBackgroundColor={useBackgroundColor()} />
        ))
        expect(container.firstChild as Element).toHaveStyle(
            "background-color: rgb(255, 255, 255)"
        )

        setUseBackgroundColor(false)
        flush()

        await nextMicrotask()

        expect(container.firstChild as Element).toHaveStyle(
            "background-color: rgb(0, 0, 0)"
        )

        setUseBackgroundColor(true)
        flush()

        await nextMicrotask()

        expect(container.firstChild as Element).toHaveStyle(
            "background-color: rgb(255, 255, 255)"
        )
    })
})
