import type { JSX } from "@solidjs/web"
import { createSignal, flush } from "solid-js"
import { expectTypeOf } from "vitest"
import { render } from "../../jest.setup"
import { motion } from "../../render/components/motion/proxy"
import type { MotionProps } from "../../motion/types"
import { toMotionProps, type MotionDOMConflict } from "../to-motion-props"

/**
 * The props of `Attributes` that `motion` components also have, with a type they don't accept.
 */
type Conflicts<Attributes> = {
    [K in keyof Attributes & keyof MotionProps]-?: Exclude<
        Attributes[K],
        undefined
    > extends Exclude<MotionProps[K], undefined>
        ? never
        : K
}[keyof Attributes & keyof MotionProps]

describe("toMotionProps", () => {
    test("drops exactly the DOM props a motion component types differently", () => {
        expectTypeOf<
            Conflicts<JSX.HTMLAttributes<HTMLButtonElement>>
        >().toEqualTypeOf<MotionDOMConflict>()
        expectTypeOf<
            Conflicts<JSX.SVGAttributes<SVGCircleElement>>
        >().toEqualTypeOf<MotionDOMConflict>()
    })

    test("DOM props can be spread onto a motion component", () => {
        const Button = (props: JSX.HTMLAttributes<HTMLButtonElement>) => (
            <motion.button
                {...toMotionProps(props)}
                whileTap={{ scale: 0.9 }}
            />
        )
        const Circle = (props: JSX.SVGAttributes<SVGCircleElement>) => (
            <motion.circle {...toMotionProps(props)} animate={{ r: 10 }} />
        )
        expectTypeOf(Button).toBeFunction()
        expectTypeOf(Circle).toBeFunction()
    })

    test("passes the other props on, reactively", () => {
        const [label, setLabel] = createSignal("Open")
        const domProps = {
            get "aria-label"() {
                return label()
            },
            "data-state": "closed",
            style: "color: red",
        }

        const { container } = render(() => (
            <motion.button {...toMotionProps(domProps)} />
        ))
        const button = container.firstChild as HTMLButtonElement

        expect(button.getAttribute("aria-label")).toBe("Open")
        expect(button.dataset.state).toBe("closed")
        expect(button.style.color).toBe("red")

        setLabel("Close")
        flush()
        expect(button.getAttribute("aria-label")).toBe("Close")
    })

    test("doesn't pass DOM event handlers on as Motion's callbacks", () => {
        const onAnimationStart = vi.fn()
        const onDragStart = vi.fn()
        const props = toMotionProps({ onAnimationStart, onDragStart, id: "a" })

        expect("onAnimationStart" in props).toBe(false)
        expect("onDragStart" in props).toBe(false)
        expect(props.id).toBe("a")
    })
})
