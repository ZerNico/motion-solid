import { motion, useMotionValue, ValueTransition } from "../.."
import { render } from "../../jest.setup"

/**
 * Port note: motion-solid has a single entry point (no `framer-motion/client`), so the second
 * component uses the same `motion` export.
 */
const clientMotion = motion

describe("accepts motion values into both motion components from both entry points", () => {
    it("renders", () => {
        function Component() {
            const valueTransition: ValueTransition = {
                duration: 1,
                ease: "easeInOut",
            }
            const x = useMotionValue(0)
            return (
                <>
                    <motion.div style={{ x }} />
                    <clientMotion.div
                        style={{ x }}
                        transition={valueTransition}
                    />
                </>
            )
        }

        render(() => <Component />)
    })

    it("accepts expected values", () => {
        function Component() {
            return (
                <motion.div
                    animate={{
                        x: 100,
                        translateX: 100,
                        originX: 0.5,
                        backgroundColor: "red",
                        pathOffset: 0.5,
                        transition: {
                            originX: {},
                            x: {},
                            translateX: {},
                            backgroundColor: {},
                            pathOffset: {},
                        },
                    }}
                    transition={{
                        originX: {},
                        x: {},
                        translateX: {},
                        backgroundColor: {},
                        pathOffset: {},
                    }}
                />
            )
        }

        render(() => <Component />)
    })
})
