import type { JSX } from "@solidjs/web"
import { motion, useMotionValue } from "../.."
import { nextFrame } from "../../gestures/__tests__/utils"
import { render } from "../../jest.setup"
import { MotionProps } from "../types"

interface Props {
    foo: boolean
}

/**
 * Port note: Solid components receive `ref` as a prop (a callback) and forward it to an element,
 * no `forwardRef` needed.
 */
type RefProps = { ref?: (element: HTMLDivElement) => void }

function runTests(name: string, motionFactory: typeof motion.create) {
    describe(name, () => {
        test("accepts custom types", () => {
            const BaseComponent = (props: Props & RefProps) => {
                return <div ref={props.ref} />
            }

            const MotionComponent = motionFactory(BaseComponent)

            const Component = () => <MotionComponent foo />

            render(() => <Component />)
        })

        test("accepts normal component", () => {
            const MotionComponent = motionFactory((props: Props) =>
                props.foo ? <div /> : null
            )

            const Component = () => <MotionComponent foo />

            render(() => <Component />)
        })

        test("doesn't forward motion props but does forward custom props", () => {
            let animate: any
            let foo: boolean = false
            const BaseComponent = (props: Props & RefProps) => {
                animate = (props as any).animate
                foo = props.foo
                return <div ref={props.ref} />
            }

            const MotionComponent = motionFactory(BaseComponent)

            const Component = () => <MotionComponent foo animate={{ x: 100 }} />

            render(() => <Component />)

            expect(animate).toBeUndefined()
            expect(foo).toBe(true)
        })

        test("forwards MotionProps if forwardMotionProps is defined", () => {
            let animate: any
            let foo: boolean = false
            const BaseComponent = (
                props: Props & MotionProps & RefProps & { children?: any }
            ) => {
                animate = props.animate
                foo = props.foo
                return <div ref={props.ref} />
            }

            const MotionComponent = motionFactory(BaseComponent, {
                forwardMotionProps: true,
            })

            const Component = () => <MotionComponent foo animate={{ x: 100 }} />

            render(() => <Component />)

            expect(animate).toEqual({ x: 100 })
            expect(foo).toBe(true)
        })

        test("forwards MotionValue children as raw values", () => {
            let children: number
            const BaseComponent = (
                props: Props & MotionProps & RefProps & { children?: any }
            ) => {
                children = props.children as any
                return <div ref={props.ref} />
            }

            const MotionComponent = motionFactory(BaseComponent)

            const Component = () => (
                <MotionComponent foo>{useMotionValue(5)}</MotionComponent>
            )

            render(() => <Component />)

            expect(children!).toEqual(5)
        })

        test("Accepts children as a function if original component accepts children as a function", () => {
            const BaseComponent = (
                props: Props &
                    RefProps & {
                        children:
                            | JSX.Element
                            | (({
                                  isServer,
                              }: {
                                  isServer: boolean
                              }) => JSX.Element)
                    }
            ) => {
                return (
                    <div ref={props.ref}>
                        {typeof props.children === "function"
                            ? props.children({ isServer: false })
                            : props.children}
                    </div>
                )
            }

            const MotionComponent = motionFactory(BaseComponent)

            const Component = () => (
                // Port note: motion components type `children` as an element or a motion value.
                // @ts-expect-error
                <MotionComponent foo>{() => <div />}</MotionComponent>
            )

            render(() => <Component />)
        })
    })
}

runTests("motion.create()", motion.create)

describe("motion.create() with type: 'svg'", () => {
    test("animates SVG-specific attributes like viewBox when type is 'svg'", async () => {
        // Custom SVG component that wraps an <svg> element
        const CustomSVG = (
            props: JSX.SvgSVGAttributes<SVGSVGElement> & {
                ref?: (element: SVGSVGElement) => void
            }
        ) => {
            return <svg ref={props.ref} {...props} />
        }

        // Without type: "svg", viewBox won't animate correctly
        // because motion treats custom components as HTML by default
        const MotionCustomSVG = motion.create(CustomSVG, { type: "svg" })

        const Component = () => {
            return (
                <MotionCustomSVG
                    data-testid="custom-svg"
                    viewBox="0 0 100 100"
                    transition={{ type: false }}
                    animate={{ viewBox: "100 100 200 200" }}
                />
            )
        }

        const { getByTestId } = render(() => <Component />)

        await nextFrame()

        expect(getByTestId("custom-svg")).toHaveAttribute(
            "viewBox",
            "100 100 200 200"
        )
    })
})
