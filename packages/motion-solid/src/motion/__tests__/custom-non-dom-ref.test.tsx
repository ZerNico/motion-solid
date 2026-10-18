import { motion } from "../.."
import { render } from "../../jest.setup"

/**
 * Regression test for #2777
 *
 * When `motion.create()` wraps a custom component whose ref doesn't resolve to
 * a DOM element (e.g. the inner component is a class component, so its ref is
 * the class instance rather than a styleable element), the render loop would
 * throw `Cannot convert undefined or null to object` from deep inside the
 * frame loop, breaking every animation on the page.
 *
 * Motion should instead throw an actionable invariant at mount.
 */
describe("motion.create() wrapping a custom component with a non-DOM ref", () => {
    let consoleError: ReturnType<typeof jest.spyOn>

    beforeEach(() => {
        // React logs uncaught errors thrown from refs, which is noise here.
        consoleError = jest.spyOn(console, "error").mockImplementation(() => {})
    })

    afterEach(() => consoleError.mockRestore())

    test("throws an actionable invariant when the ref isn't an element", () => {
        /**
         * Port note: Solid has no class components. This component hands its ref a
         * non-element instance (no `.style`), like a ref forwarded to a class component.
         */
        class ClassButton {
            constructor(public children: unknown) {}
        }

        const AnimateButton = (props: any) => {
            props.ref?.(new ClassButton(props.children))
            return <button>{props.children}</button>
        }

        const MotionButton = motion.create(AnimateButton)

        expect(() =>
            render(() => (
                <MotionButton initial={{ opacity: 0 }}>BUY</MotionButton>
            ))
        ).toThrowError(
            "motion.create() components must forward their ref to a HTML or SVG element. For more information and steps for solving, visit https://motion.dev/troubleshooting/custom-component-ref"
        )
    })

    test("mounts without error when the ref resolves to an element", () => {
        const AnimateButton = (props: any) => (
            <button ref={props.ref} {...props} />
        )

        const MotionButton = motion.create(AnimateButton)

        expect(() =>
            render(() => (
                <MotionButton initial={{ opacity: 0 }}>BUY</MotionButton>
            ))
        ).not.toThrow()
    })
})
