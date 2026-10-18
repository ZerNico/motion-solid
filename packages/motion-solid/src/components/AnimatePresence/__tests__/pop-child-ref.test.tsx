import { createSignal } from "solid-js"
import { AnimatePresence, motion } from "../../.."
import { render } from "../../../jest.setup"
import { Show } from "../control-flow"

/**
 * Regression test for #3745.
 *
 * In React 18.3, creating an element with a `ref` prop installs a warning
 * getter on `element.props.ref`. `PopChild` read `children.props.ref`
 * unconditionally, which fired the "`ref` is not a prop" warning even when not
 * in `popLayout` mode — where the composed ref is never used.
 *
 * This lives in its own test file so React's (module-level) "warned once"
 * flag starts fresh: other AnimatePresence tests render ref'd children and
 * would otherwise trip the warning before this test runs.
 *
 * Port note: Solid has no such warning (refs are callbacks), so this only
 * checks that rendering a ref'd child logs no such error.
 */
describe("AnimatePresence PopChild ref access", () => {
    test("does not read children.props.ref in non-popLayout mode", () => {
        const consoleError = jest
            .spyOn(console, "error")
            .mockImplementation(() => {})

        const Component = (props: { isVisible: boolean }) => {
            const ref: { current: HTMLDivElement | null } = { current: null }
            return (
                <AnimatePresence>
                    <Show when={props.isVisible}>
                        <motion.div
                            ref={(el: HTMLDivElement) => (ref.current = el)}
                            exit={{ opacity: 0 }}
                        >
                            Hello
                        </motion.div>
                    </Show>
                </AnimatePresence>
            )
        }

        const [isVisible] = createSignal(true)
        render(() => <Component isVisible={isVisible()} />)

        const refWarning = consoleError.mock.calls.find((call) =>
            call.some((arg) => String(arg).includes("`ref` is not a prop"))
        )

        consoleError.mockRestore()

        expect(refWarning).toBeUndefined()
    })
})
