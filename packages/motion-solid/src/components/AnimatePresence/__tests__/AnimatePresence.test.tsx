import { waitFor } from "@testing-library/dom"
import { motionValue, Variants } from "motion-dom"
import {
    createEffect,
    createSignal,
    flush,
    onSettled,
    Show as SolidShow,
} from "solid-js"
import type { JSX } from "@solidjs/web"
import {
    AnimatePresence,
    For,
    frame,
    LayoutGroup,
    motion,
    MotionConfig,
    Show,
    useAnimation,
} from "../../.."
import { nextFrame } from "../../../gestures/__tests__/utils"
import { render } from "../../../jest.setup"
import { ResolvedValues } from "../../../render/types"

/**
 * Port note: upstream's `rerender` with new props becomes a signal update followed by `flush()`.
 * A `rerender` with the same props is a no-op in Solid and is dropped. React `key` swaps become
 * motion-solid's `<Show when={key} keyed>`, `{cond && <X />}` its `<Show when={cond}>` and keyed
 * arrays its `<For>`. Keys are passed as strings to `Show` because `0` is falsy.
 */

describe("AnimatePresence", () => {
    test("Allows initial animation if no `initial` prop defined", async () => {
        const promise = new Promise((resolve) => {
            const x = motionValue(0)
            const Component = () => {
                return (
                    <AnimatePresence>
                        <motion.div
                            animate={{ x: 100 }}
                            style={{ x }}
                            exit={{ x: 0 }}
                            onAnimationStart={() => {
                                frame.postRender(() => {
                                    frame.postRender(() => {
                                        resolve(x.get())
                                    })
                                })
                            }}
                        />
                    </AnimatePresence>
                )
            }

            render(() => <Component />)
        })

        const x = await promise
        expect(x).not.toBe(0)
        expect(x).not.toBe(100)
    })

    test("Suppresses initial animation if `initial={false}`", async () => {
        const promise = new Promise((resolve) => {
            const Component = () => {
                return (
                    <AnimatePresence initial={false}>
                        <motion.div
                            initial={{ x: 0 }}
                            animate={{ x: 100 }}
                            exit={{ opacity: 0 }}
                        />
                    </AnimatePresence>
                )
            }

            const { container } = render(() => <Component />)

            setTimeout(() => {
                resolve(container.firstChild as Element)
            }, 50)
        })

        const element = await promise
        expect(element).toHaveStyle("transform: translateX(100px)")
    })

    test("Normal rerenders work as expected", async () => {
        const [color, setColor] = createSignal("red")
        const Component = (props: { color: string }) => {
            return (
                <AnimatePresence>
                    <div style={{ "background-color": props.color }} />
                </AnimatePresence>
            )
        }

        const { container } = render(() => <Component color={color()} />)
        setColor("green")
        flush()

        // Port note: this jsdom version serializes named colors as rgb().

        expect(container.firstChild).toHaveStyle(
            "background-color: rgb(0, 128, 0)"
        )
    })

    test("Animates out a component when its removed", async () => {
        const opacity = motionValue(1)
        const [isVisible, setIsVisible] = createSignal(true)

        const Component = (props: { isVisible: boolean }) => {
            return (
                <AnimatePresence>
                    <Show when={props.isVisible}>
                        <motion.div
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                            style={{ opacity }}
                        />
                    </Show>
                </AnimatePresence>
            )
        }

        const { container } = render(() => (
            <Component isVisible={isVisible()} />
        ))

        setIsVisible(false)
        flush()

        await new Promise<void>((resolve) => {
            // Check it's animating out
            setTimeout(() => {
                expect(opacity.get()).not.toBe(1)
                expect(opacity.get()).not.toBe(0)
            }, 50)

            //  Resolve after the animation is expected to have completed
            setTimeout(() => {
                resolve()
            }, 150)
        })
        flush()

        expect(container.firstChild).toBeFalsy()
    })

    test("Allows nested exit animations", async () => {
        const promise = new Promise(async (resolve) => {
            const opacity = motionValue(0)
            const [isOpen, setIsOpen] = createSignal(true)
            const Component = (props: any) => {
                return (
                    <AnimatePresence>
                        <Show when={props.isOpen}>
                            <motion.div exit={{ x: 100 }}>
                                <motion.div
                                    animate={{ opacity: 0.9 }}
                                    style={{ opacity }}
                                    exit={{ opacity: 0.1 }}
                                    transition={{ type: false }}
                                />
                            </motion.div>
                        </Show>
                    </AnimatePresence>
                )
            }

            render(() => <Component isOpen={isOpen()} />)

            await nextFrame()

            expect(opacity.get()).toBe(0.9)
            setIsOpen(false)
            flush()

            await nextFrame()

            resolve(opacity.get())
        })

        const opacity = await promise
        expect(opacity).toEqual(0.1)
    })

    test("when: afterChildren fires correctly", async () => {
        const child = await new Promise<number>(async (resolve) => {
            const parentOpacityOutput: ResolvedValues[] = []

            const variants = {
                visible: { opacity: 1 },
                hidden: { opacity: 0 },
            }

            const [isVisible, setIsVisible] = createSignal(true)

            const Component = (props: { isVisible: boolean }) => {
                return (
                    <AnimatePresence>
                        <Show when={props.isVisible}>
                            <motion.div
                                initial={false}
                                animate="visible"
                                exit="hidden"
                                transition={{
                                    duration: 0.2,
                                    when: "afterChildren",
                                }}
                                variants={variants}
                                onUpdate={(v) => parentOpacityOutput.push(v)}
                                onAnimationComplete={() =>
                                    resolve(parentOpacityOutput.length)
                                }
                            >
                                <motion.div
                                    variants={variants}
                                    transition={{ type: false }}
                                />
                            </motion.div>
                        </Show>
                    </AnimatePresence>
                )
            }

            render(() => <Component isVisible={isVisible()} />)
            await nextFrame()
            await nextFrame()
            setIsVisible(false)
            flush()
        })

        expect(child).toBeGreaterThan(1)
    })

    test("Animates a component back in if it's re-added before animating out", async () => {
        const promise = new Promise<Element | null>((resolve) => {
            const [isVisible, setIsVisible] = createSignal(true)
            const Component = (props: { isVisible: boolean }) => {
                return (
                    <AnimatePresence>
                        <Show when={props.isVisible}>
                            <motion.div
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.1 }}
                            />
                        </Show>
                    </AnimatePresence>
                )
            }

            const { container } = render(() => (
                <Component isVisible={isVisible()} />
            ))

            setTimeout(() => {
                setIsVisible(false)
                flush()

                setTimeout(() => {
                    setIsVisible(true)
                    flush()

                    setTimeout(() => {
                        resolve(container.firstChild as Element | null)
                    }, 150)
                }, 50)
            }, 50)
        })

        const child = await promise
        expect(child).toHaveStyle("opacity: 1;")
    })

    test("Animates a component out after having an animation cancelled", async () => {
        const opacity = motionValue(1)
        const [isVisible, setIsVisible] = createSignal(true)
        const Component = (props: { isVisible: boolean }) => {
            return (
                <AnimatePresence>
                    <Show when={props.isVisible}>
                        <motion.div
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                            style={{ opacity }}
                        />
                    </Show>
                </AnimatePresence>
            )
        }

        const { container } = render(() => (
            <Component isVisible={isVisible()} />
        ))
        setIsVisible(false)
        flush()
        setIsVisible(true)
        flush()
        setIsVisible(false)
        flush()

        await new Promise<void>((resolve) => {
            // Check it's animating out
            setTimeout(() => {
                expect(opacity.get()).not.toBe(1)
                expect(opacity.get()).not.toBe(0)
            }, 50)

            //  Resolve after the animation is expected to have completed
            setTimeout(() => {
                resolve()
            }, 300)
        })
        flush()

        expect(container.firstChild).toBeFalsy()
    })

    test("Removes a child with no animations", async () => {
        const promise = new Promise<Element | null>((resolve) => {
            const [isVisible, setIsVisible] = createSignal(true)
            const Component = (props: { isVisible: boolean }) => {
                return (
                    <AnimatePresence>
                        <Show when={props.isVisible}>
                            <div />
                        </Show>
                    </AnimatePresence>
                )
            }

            const { container } = render(() => (
                <Component isVisible={isVisible()} />
            ))
            setIsVisible(false)
            flush()

            // Check it's gone
            resolve(container.firstChild as Element | null)
        })

        const child = await promise
        expect(child).toBeFalsy()
    })

    test("Can cycle through multiple components", async () => {
        const promise = new Promise<number>((resolve) => {
            const [i, setI] = createSignal(0)
            const Component = (props: { i: number }) => {
                return (
                    <AnimatePresence>
                        <Show when={String(props.i)} keyed>
                            {(_key) => (
                                <motion.div
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                />
                            )}
                        </Show>
                    </AnimatePresence>
                )
            }

            const { container } = render(() => <Component i={i()} />)
            setTimeout(() => {
                setI(1)
                flush()
            }, 50)
            setTimeout(() => {
                setI(2)
                flush()
                resolve(container.childElementCount)
            }, 400)
        })

        return await expect(promise).resolves.toBe(3)
    })

    test("Only renders one child at a time if mode === 'wait'", async () => {
        const promise = new Promise<number>((resolve) => {
            const [i, setI] = createSignal(0)
            const Component = (props: { i: number }) => {
                return (
                    <AnimatePresence mode="wait">
                        <Show when={String(props.i)} keyed>
                            {(_key) => (
                                <motion.div
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.1 }}
                                />
                            )}
                        </Show>
                    </AnimatePresence>
                )
            }

            const { container } = render(() => <Component i={i()} />)
            setTimeout(() => {
                setI(1)
                flush()
            }, 50)
            setTimeout(() => {
                setI(2)
                flush()
                resolve(container.childElementCount)
            }, 200)
        })

        return await expect(promise).resolves.toBe(1)
    })

    test("Immediately remove child if no exit animations defined", async () => {
        const promise = new Promise<HTMLElement>((resolve) => {
            const [i, setI] = createSignal(0)
            const Component = (props: { i: number }) => {
                return (
                    <AnimatePresence mode="wait">
                        <Show when={String(props.i)} keyed>
                            {(key) => (
                                <motion.div
                                    data-testid={key}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5 }}
                                />
                            )}
                        </Show>
                    </AnimatePresence>
                )
            }

            const { getByTestId } = render(() => <Component i={i()} />)
            setTimeout(() => {
                setI(1)
                flush()
            }, 50)
            setTimeout(() => {
                setI(2)
                flush()
                resolve(getByTestId("2"))
            }, 150)
        })

        return await expect(promise).resolves.toBeTruthy()
    })

    test("Fast animations with wait render the child content correctly", async () => {
        const promise = new Promise<boolean>((resolve) => {
            const [i, setI] = createSignal(0)
            const Component = (props: { i: number }) => {
                return (
                    <AnimatePresence mode="wait">
                        <Show when={String(props.i)} keyed>
                            {(key) => (
                                <motion.div
                                    initial={false}
                                    data-testid={key}
                                    exit={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.1 }}
                                >
                                    {key}
                                </motion.div>
                            )}
                        </Show>
                    </AnimatePresence>
                )
            }

            const { getByTestId } = render(() => <Component i={i()} />)
            setTimeout(() => {
                setI(1)
                flush()

                setTimeout(() => {
                    setI(2)
                    flush()
                    // wait for the exit animation to check the DOM again
                    setTimeout(() => {
                        resolve(getByTestId("2").textContent === "2")
                    }, 250)
                }, 50)
            }, 50)
        })

        return await expect(promise).resolves.toBeTruthy()
    })

    test("Fast animations with wait render the child content correctly (strict mode disabled)", async () => {
        await new Promise<boolean>((resolve) => {
            const [i, setI] = createSignal(0)
            const Component = (props: { i: number }) => {
                return (
                    <AnimatePresence mode="wait">
                        <Show when={String(props.i)} keyed>
                            {(key) => (
                                <motion.div
                                    data-testid={key}
                                    exit={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.1 }}
                                >
                                    {key}
                                </motion.div>
                            )}
                        </Show>
                    </AnimatePresence>
                )
            }

            // Port note: upstream passes `false` to disable StrictMode, which doesn't exist here.
            const { getByTestId } = render(() => <Component i={i()} />)
            setTimeout(() => {
                setI(1)
                flush()
            }, 50)
            setTimeout(() => {
                setI(2)
                flush()
                // wait for the exit animation to check the DOM again
                async function checkElement() {
                    await waitFor(() =>
                        expect(getByTestId("2").textContent === "2")
                    )
                    resolve(true)
                }

                checkElement()
            }, 200)
        })
    })

    test("Elements exit in sequence during fast renders", async () => {
        const [nums, setNums] = createSignal([0, 1, 2, 3])
        const Component = (props: { nums: number[] }) => {
            return (
                <AnimatePresence>
                    <For each={props.nums}>
                        {(i) => (
                            <motion.div
                                data-testid={i}
                                exit={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.01 }}
                            >
                                {i}
                            </motion.div>
                        )}
                    </For>
                </AnimatePresence>
            )
        }

        const { getAllByTestId } = render(() => <Component nums={nums()} />)

        const getTextContents = () => {
            return getAllByTestId(/./).flatMap((element) =>
                element.textContent !== null
                    ? parseInt(element.textContent)
                    : []
            )
        }

        await new Promise<void>((resolve) => {
            setTimeout(() => {
                setNums([1, 2, 3])
                flush()
                setTimeout(() => {
                    expect(getTextContents()).toEqual([1, 2, 3])
                }, 100)
            }, 100)
            setTimeout(() => {
                setNums([2, 3])
                flush()
                setTimeout(() => {
                    expect(getTextContents()).toEqual([2, 3])
                }, 100)
            }, 250)
            setTimeout(() => {
                setNums([3])
                flush()
                setTimeout(() => {
                    expect(getTextContents()).toEqual([3])
                    resolve()
                }, 100)
            }, 400)
        })
    })

    test("Exit variants are triggered with `AnimatePresence.custom`, not that of the element.", async () => {
        const variants: Variants = {
            enter: { x: 0, transition: { type: false } },
            exit: (i: number) => ({ x: i * 100, transition: { type: false } }),
        }

        const x = motionValue(0)
        const [isVisible, setIsVisible] = createSignal(true)

        const Component = (props: {
            isVisible: boolean
            onAnimationComplete?: () => void
        }) => {
            return (
                <AnimatePresence
                    custom={2}
                    onExitComplete={props.onAnimationComplete}
                >
                    <Show when={props.isVisible}>
                        <motion.div
                            custom={1}
                            variants={variants}
                            initial="exit"
                            animate="enter"
                            exit="exit"
                            style={{ x }}
                        />
                    </Show>
                </AnimatePresence>
            )
        }

        render(() => <Component isVisible={isVisible()} />)

        setIsVisible(false)
        flush()

        await nextFrame()

        expect(x.get()).toBe(200)
    })

    test("Exit propagates through variants", async () => {
        const variants: Variants = {
            enter: { opacity: 1, transition: { type: false } },
            exit: { opacity: 0, transition: { type: false } },
        }

        const promise = new Promise<number>(async (resolve) => {
            const opacity = motionValue(1)
            const [isVisible, setIsVisible] = createSignal(true)
            const Component = (props: { isVisible: boolean }) => {
                return (
                    <AnimatePresence>
                        <Show when={props.isVisible}>
                            <motion.div
                                initial="enter"
                                animate="enter"
                                exit="exit"
                                variants={variants}
                            >
                                <motion.div variants={variants}>
                                    <motion.div
                                        variants={variants}
                                        style={{ opacity }}
                                    />
                                </motion.div>
                            </motion.div>
                        </Show>
                    </AnimatePresence>
                )
            }

            render(() => <Component isVisible={isVisible()} />)

            setIsVisible(false)
            flush()

            await nextFrame()

            resolve(opacity.get())
        })

        return await expect(promise).resolves.toBe(0)
    })

    test("Handles external refs on a single child", async () => {
        const promise = new Promise((resolve) => {
            // Port note: React's `createRef()` becomes a variable set by a ref callback.
            const ref: { current: HTMLDivElement | null } = { current: null }
            const [id, setId] = createSignal(0)
            const Component = (props: { id: number }) => {
                return (
                    <AnimatePresence initial={false}>
                        <Show when={String(props.id)} keyed>
                            {(key) => (
                                <motion.div
                                    data-id={key}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    ref={(el: HTMLDivElement) =>
                                        (ref.current = el)
                                    }
                                />
                            )}
                        </Show>
                    </AnimatePresence>
                )
            }

            render(() => <Component id={id()} />)

            setTimeout(() => {
                setId(1)
                flush()
                setId(2)
                flush()

                resolve(ref.current)
            }, 30)
        })

        const result = await promise
        return expect(result).toHaveAttribute("data-id", "2")
    })

    test("popLayout mode with anchorY='bottom' preserves bottom positioning", async () => {
        const ref: { current: HTMLDivElement | null } = { current: null }
        const [isVisible, setIsVisible] = createSignal(true)

        const Component = (props: { isVisible: boolean }) => {
            return (
                <div
                    style={{
                        position: "relative",
                        height: "200px",
                        width: "200px",
                    }}
                >
                    <AnimatePresence mode="popLayout" anchorY="bottom">
                        <Show when={props.isVisible}>
                            <motion.div
                                ref={(el: HTMLDivElement) => (ref.current = el)}
                                style={{
                                    position: "absolute",
                                    bottom: 0,
                                    width: "50px",
                                    height: "50px",
                                }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                            />
                        </Show>
                    </AnimatePresence>
                </div>
            )
        }

        render(() => <Component isVisible={isVisible()} />)

        await nextFrame()

        // Get initial position (should be at bottom)
        const initialBottom =
            ref.current!.parentElement!.offsetHeight -
            ref.current!.offsetTop -
            ref.current!.offsetHeight

        setIsVisible(false)
        flush()

        await nextFrame()

        // After popLayout, element should still be at the same bottom position
        // Check that the injected style uses bottom positioning
        const computedStyle = window.getComputedStyle(ref.current!)
        expect(computedStyle.position).toBe("absolute")

        // The bottom position should be preserved (approximately 0)
        expect(initialBottom).toBeLessThanOrEqual(1)
    })

    test("Switching mode from wait to popLayout doesn't break animations", async () => {
        const opacity = motionValue(0)
        const [mode, setMode] = createSignal<"wait" | "popLayout">("wait")
        const Component = (props: { mode: "wait" | "popLayout" }) => (
            <AnimatePresence mode={props.mode}>
                <Show when="stable" keyed>
                    {(_key) => (
                        <motion.div
                            animate={{ opacity: 1 }}
                            transition={{ type: false }}
                            style={{ opacity }}
                        />
                    )}
                </Show>
            </AnimatePresence>
        )

        render(() => <Component mode={mode()} />)
        await nextFrame()

        expect(opacity.get()).toBe(1)

        setMode("popLayout")
        flush()
        await nextFrame()

        expect(opacity.get()).toBe(1)
    })

    test("Switching mode from popLayout to wait doesn't break animations", async () => {
        const opacity = motionValue(0)
        const [mode, setMode] = createSignal<"wait" | "popLayout">("popLayout")
        const Component = (props: { mode: "wait" | "popLayout" }) => (
            <AnimatePresence mode={props.mode}>
                <Show when="stable" keyed>
                    {(_key) => (
                        <motion.div
                            animate={{ opacity: 1 }}
                            transition={{ type: false }}
                            style={{ opacity }}
                        />
                    )}
                </Show>
            </AnimatePresence>
        )

        render(() => <Component mode={mode()} />)
        await nextFrame()

        expect(opacity.get()).toBe(1)

        setMode("wait")
        flush()
        await nextFrame()

        expect(opacity.get()).toBe(1)
    })

    test("Exiting children don't reorder present children (#3746)", async () => {
        const [ids, setIds] = createSignal(["a", "persist", "b"])
        const Component = (props: { ids: string[] }) => (
            <AnimatePresence>
                <For each={props.ids}>
                    {(id) => (
                        <motion.div
                            data-id={id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 10 }}
                        />
                    )}
                </For>
            </AnimatePresence>
        )

        const { container } = render(() => <Component ids={ids()} />)

        await nextFrame()
        flush()

        const persist = container.querySelector('[data-id="persist"]')

        // "a" and "b" exit, "c" and "d" enter, "persist" stays.
        setIds(["c", "d", "persist"])
        flush()
        await nextFrame()
        flush()

        const order = Array.from(container.querySelectorAll("[data-id]")).map(
            (el) => el.getAttribute("data-id")
        )

        /**
         * Each exiting child should hold its place relative to the children it
         * sat between: "a" led the list, "b" followed "persist". Exiting
         * children used to be spliced in at their index within the *previously*
         * rendered children, which indexes into the wrong list and interleaved
         * them with the entering children — ["a", "c", "b", "d", "persist"].
         */
        expect(order.indexOf("a")).toBe(0)
        expect(order.indexOf("b")).toBeGreaterThan(order.indexOf("persist"))

        // And the persisting child must be the same element, never remounted.
        expect(container.querySelector('[data-id="persist"]')).toBe(persist)
    })
})

describe("AnimatePresence with custom components", () => {
    test("Does nothing on initial render by default", async () => {
        const promise = new Promise((resolve) => {
            const x = motionValue(0)

            const CustomComponent = () => (
                <motion.div
                    animate={{ x: 100 }}
                    style={{ x }}
                    exit={{ x: 0 }}
                />
            )

            const Component = () => {
                setTimeout(() => resolve(x.get()), 75)
                return (
                    <AnimatePresence>
                        <CustomComponent />
                    </AnimatePresence>
                )
            }

            render(() => <Component />)
        })

        const x = await promise
        expect(x).not.toBe(0)
        expect(x).not.toBe(100)
    })

    test("Suppresses initial animation if `initial={false}`", async () => {
        const promise = new Promise((resolve) => {
            const CustomComponent = () => (
                <motion.div
                    initial={{ x: 0 }}
                    animate={{ x: 100 }}
                    exit={{ x: 0 }}
                />
            )

            const Component = () => {
                return (
                    <AnimatePresence initial={false}>
                        <CustomComponent />
                    </AnimatePresence>
                )
            }

            const { container } = render(() => <Component />)

            setTimeout(() => {
                resolve(container.firstChild as Element)
            }, 50)
        })

        const element = await promise
        expect(element).toHaveStyle("transform: translateX(100px)")
    })

    test("Animation controls children of initial={false} don't throw`", async () => {
        const promise = new Promise((resolve) => {
            const Component = () => {
                const controls = useAnimation()
                return (
                    <MotionConfig isStatic>
                        <AnimatePresence initial={false}>
                            <motion.div animate={controls} />
                        </AnimatePresence>
                    </MotionConfig>
                )
            }

            render(() => <Component />)

            resolve(true)
        })

        // Port note: Vitest requires `.resolves` to be awaited.

        await expect(promise).resolves.not.toThrowError()
    })

    test("Animates out a component when its removed", async () => {
        const opacity = motionValue(1)
        const [isVisible, setIsVisible] = createSignal(true)

        const CustomComponent = () => (
            <motion.div
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                style={{ opacity }}
            />
        )
        const Component = (props: { isVisible: boolean }) => {
            return (
                <AnimatePresence>
                    <Show when={props.isVisible}>
                        <CustomComponent />
                    </Show>
                </AnimatePresence>
            )
        }

        const { container } = render(() => (
            <Component isVisible={isVisible()} />
        ))
        setIsVisible(false)
        flush()

        await new Promise<void>((resolve) => {
            // Check it's animating out
            setTimeout(() => {
                expect(opacity.get()).not.toBe(1)
                expect(opacity.get()).not.toBe(0)
            }, 50)

            //  Resolve after the animation is expected to have completed
            setTimeout(() => {
                resolve()
            }, 150)
        })
        flush()

        expect(container.firstChild).toBeFalsy()
    })

    test("Can cycle through multiple components", async () => {
        const promise = new Promise<number>((resolve) => {
            const [i, setI] = createSignal(0)
            const CustomComponent = (_props: any) => (
                <motion.div
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                />
            )
            const Component = (props: { i: number }) => {
                return (
                    <AnimatePresence>
                        <Show when={String(props.i)} keyed>
                            {(key) => <CustomComponent i={key} />}
                        </Show>
                    </AnimatePresence>
                )
            }

            const { container } = render(() => <Component i={i()} />)
            setTimeout(() => {
                setI(1)
                flush()
            }, 50)
            setTimeout(() => {
                setI(2)
                flush()
            }, 200)

            setTimeout(() => {
                resolve(container.childElementCount)
            }, 750)
        })

        return await expect(promise).resolves.toBe(3)
    })

    test("Exit variants are triggered with `AnimatePresence.custom`, not that of the element.", async () => {
        const variants: Variants = {
            enter: { x: 0, transition: { type: false } },
            exit: (i: number) => ({ x: i * 100, transition: { type: false } }),
        }
        const x = motionValue(0)
        const [isVisible, setIsVisible] = createSignal(true)
        const CustomComponent = () => (
            <motion.div
                custom={1}
                variants={variants}
                initial="exit"
                animate="enter"
                exit="exit"
                style={{ x }}
            />
        )
        const Component = (props: {
            isVisible: boolean
            onAnimationComplete?: () => void
        }) => {
            return (
                <AnimatePresence
                    custom={2}
                    onExitComplete={props.onAnimationComplete}
                >
                    <Show when={props.isVisible}>
                        <CustomComponent />
                    </Show>
                </AnimatePresence>
            )
        }

        render(() => <Component isVisible={isVisible()} />)

        setIsVisible(false)
        flush()

        await nextFrame()

        expect(x.get()).toBe(200)
    })

    test("Exit variants are triggered with `AnimatePresence.custom` throughout the tree", async () => {
        const variants: Variants = {
            enter: { x: 0, transition: { type: false } },
            exit: (i: number) => {
                return { x: i * 100, transition: { type: false } }
            },
        }
        const xParent = motionValue(0)
        const xChild = motionValue(0)
        const [isVisible, setIsVisible] = createSignal(true)

        const CustomComponent = (props: {
            children?: JSX.Element
            x: any
            initial?: any
            animate?: any
            exit?: any
        }) => (
            <motion.div
                custom={1}
                variants={variants}
                style={{ x: props.x }}
                initial={props.initial}
                animate={props.animate}
                exit={props.exit}
            >
                {props.children}
            </motion.div>
        )
        const Component = (props: {
            isVisible: boolean
            onAnimationComplete?: () => void
        }) => {
            return (
                <AnimatePresence
                    custom={2}
                    onExitComplete={props.onAnimationComplete}
                >
                    <Show when={props.isVisible}>
                        <CustomComponent
                            x={xParent}
                            initial="exit"
                            animate="enter"
                            exit="exit"
                        >
                            <CustomComponent x={xChild} />
                        </CustomComponent>
                    </Show>
                </AnimatePresence>
            )
        }

        render(() => <Component isVisible={isVisible()} />)

        await nextFrame()

        setIsVisible(false)
        flush()

        await nextFrame()

        expect([xParent.get(), xChild.get()]).toEqual([200, 200])
    })

    test("Exit propagates through variants", async () => {
        const variants: Variants = {
            enter: { opacity: 1, transition: { type: false } },
            exit: { opacity: 0, transition: { type: false } },
        }
        const opacity = motionValue(1)
        const [isVisible, setIsVisible] = createSignal(true)

        const Component = (props: { isVisible: boolean }) => {
            return (
                <AnimatePresence>
                    <Show when={props.isVisible}>
                        <motion.div
                            initial="enter"
                            animate="enter"
                            exit="exit"
                            variants={variants}
                        >
                            <motion.div variants={variants}>
                                <motion.div
                                    variants={variants}
                                    style={{ opacity }}
                                />
                            </motion.div>
                        </motion.div>
                    </Show>
                </AnimatePresence>
            )
        }

        render(() => <Component isVisible={isVisible()} />)
        setIsVisible(false)
        flush()

        await nextFrame()

        expect(opacity.get()).toBe(0)
    })

    test("Sibling AnimatePresence wrapped in LayoutGroup remove exiting elements", async () => {
        const opacityA = motionValue(1)
        const opacityB = motionValue(1)
        const [isVisible, setIsVisible] = createSignal(true)

        const Component = (props: { isVisible: boolean }) => {
            return (
                <LayoutGroup>
                    <AnimatePresence>
                        <Show when={props.isVisible}>
                            <motion.div
                                data-testid="a"
                                exit={{ opacity: 0 }}
                                transition={{ type: false }}
                                style={{ opacity: opacityA }}
                            />
                        </Show>
                    </AnimatePresence>
                    <AnimatePresence>
                        <Show when={props.isVisible}>
                            <motion.div
                                data-testid="b"
                                exit={{ opacity: 0 }}
                                transition={{ type: false }}
                                style={{ opacity: opacityB }}
                            />
                        </Show>
                    </AnimatePresence>
                </LayoutGroup>
            )
        }

        const { queryByTestId } = render(() => (
            <Component isVisible={isVisible()} />
        ))

        setIsVisible(false)
        flush()

        await nextFrame()

        await new Promise<void>((resolve) => {
            setTimeout(() => {
                flush()
                expect(opacityA.get()).toBe(0)
                expect(opacityB.get()).toBe(0)
                expect(queryByTestId("a")).toBe(null)
                expect(queryByTestId("b")).toBe(null)
                resolve()
            }, 50)
        })
    })

    test("AnimatePresence - nested AnimatePresence should not animate exit", async () => {
        const outerOpacity = motionValue(1)
        const innerOpacity = motionValue(1)

        await new Promise<void>(async (resolve) => {
            let queryByTestId: (id: string) => HTMLElement | null

            async function complete() {
                await nextFrame()
                await nextFrame()
                flush()

                expect(outerOpacity.get()).toBe(0)
                expect(innerOpacity.get()).toBe(1)
                expect(queryByTestId("outer")).toBe(null)
                expect(queryByTestId("inner")).toBe(null)
                resolve()
            }

            const [isVisible, setIsVisible] = createSignal(true)
            const Component = (props: { isVisible: boolean }) => {
                return (
                    <AnimatePresence onExitComplete={complete}>
                        <Show when={props.isVisible}>
                            <motion.div
                                data-testid="outer"
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.1 }}
                                style={{ opacity: outerOpacity }}
                            >
                                <AnimatePresence>
                                    <motion.div
                                        data-testid="inner"
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.1 }}
                                        style={{ opacity: innerOpacity }}
                                    />
                                </AnimatePresence>
                            </motion.div>
                        </Show>
                    </AnimatePresence>
                )
            }
            queryByTestId = render(() => (
                <Component isVisible={isVisible()} />
            )).queryByTestId

            setIsVisible(false)
            flush()
        })
    })

    test("AnimatePresence - nested AnimatePresence should animate exit when propagate is true", async () => {
        const outerOpacity = motionValue(1)
        const innerOpacity = motionValue(1)

        await new Promise<void>(async (resolve) => {
            let queryByTestId: (id: string) => HTMLElement | null

            async function complete() {
                await nextFrame()
                await nextFrame()
                flush()

                expect(outerOpacity.get()).toBe(0)
                expect(innerOpacity.get()).toBe(0)
                expect(queryByTestId("outer")).toBe(null)
                expect(queryByTestId("inner")).toBe(null)
                resolve()
            }

            const [isVisible, setIsVisible] = createSignal(true)
            const Component = (props: { isVisible: boolean }) => {
                return (
                    <AnimatePresence onExitComplete={complete}>
                        <Show when={props.isVisible}>
                            <motion.div
                                data-testid="outer"
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.1 }}
                                style={{ opacity: outerOpacity }}
                            >
                                <AnimatePresence propagate>
                                    <motion.div
                                        data-testid="inner"
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.1 }}
                                        style={{ opacity: innerOpacity }}
                                    />
                                </AnimatePresence>
                            </motion.div>
                        </Show>
                    </AnimatePresence>
                )
            }
            queryByTestId = render(() => (
                <Component isVisible={isVisible()} />
            )).queryByTestId

            setIsVisible(false)
            flush()
        })
    })

    test("Removes exiting children during rapid key switches with dynamic custom variants", async () => {
        const variants: Variants = {
            enter: (custom: string) => ({
                ...(custom === "fade" ? { opacity: 0 } : { x: -100 }),
                transition: { duration: 0.1 },
            }),
            center: {
                opacity: 1,
                x: 0,
                transition: { duration: 0.1 },
            },
            exit: (custom: string) => ({
                ...(custom === "fade" ? { opacity: 0 } : { x: 100 }),
                transition: { duration: 0.1 },
            }),
        }

        const items = [
            { id: "a", transition: "fade" },
            { id: "b", transition: "slide" },
            { id: "c", transition: "fade" },
            { id: "d", transition: "slide" },
        ]

        const [active, setActive] = createSignal(0)

        const Component = (props: { active: number }) => {
            const item = () => items[props.active]
            return (
                <AnimatePresence custom={item().transition}>
                    <Show when={item().id} keyed>
                        {(id) => {
                            // Port note: the element keeps the props it was rendered with, like
                            // upstream's exiting element.
                            const current = items.find((i) => i.id === id)!
                            return (
                                <motion.div
                                    data-testid={id}
                                    variants={variants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    custom={current.transition}
                                />
                            )
                        }}
                    </Show>
                </AnimatePresence>
            )
        }

        const { container } = render(() => <Component active={active()} />)

        // Rapidly switch through all items
        setActive(1)
        flush()
        await Promise.resolve()
        setActive(2)
        flush()
        await Promise.resolve()
        setActive(3)
        flush()
        await Promise.resolve()

        // Wait for all exit animations to complete
        await new Promise((resolve) => setTimeout(resolve, 500))
        await nextFrame()
        await nextFrame()
        flush()

        // Only the last item should remain
        expect(container.childElementCount).toBe(1)
    })

    test("Fires onExitComplete during rapid key switches with dynamic custom variants", async () => {
        const variants: Variants = {
            enter: (custom: string) => ({
                ...(custom === "fade" ? { opacity: 0 } : { x: -100 }),
                transition: { duration: 0.1 },
            }),
            center: {
                opacity: 1,
                x: 0,
                transition: { duration: 0.1 },
            },
            exit: (custom: string) => ({
                ...(custom === "fade" ? { opacity: 0 } : { x: 100 }),
                transition: { duration: 0.1 },
            }),
        }

        const items = [
            { id: "a", transition: "fade" },
            { id: "b", transition: "slide" },
            { id: "c", transition: "fade" },
            { id: "d", transition: "slide" },
        ]

        let exitCompleteCount = 0
        const [active, setActive] = createSignal(0)

        const Component = (props: { active: number }) => {
            const item = () => items[props.active]
            return (
                <AnimatePresence
                    custom={item().transition}
                    onExitComplete={() => {
                        exitCompleteCount++
                    }}
                >
                    <Show when={item().id} keyed>
                        {(id) => {
                            const current = items.find((i) => i.id === id)!
                            return (
                                <motion.div
                                    variants={variants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    custom={current.transition}
                                />
                            )
                        }}
                    </Show>
                </AnimatePresence>
            )
        }

        render(() => <Component active={active()} />)

        // Rapidly switch through all items
        setActive(1)
        flush()
        await Promise.resolve()
        setActive(2)
        flush()
        await Promise.resolve()
        setActive(3)
        flush()
        await Promise.resolve()

        // Wait for all exit animations to complete
        await new Promise((resolve) => setTimeout(resolve, 500))
        await nextFrame()
        await nextFrame()
        flush()

        expect(exitCompleteCount).toBeGreaterThan(0)
    })

    test("Re-entering child replays enter animation when exit was complete", async () => {
        const enterCustomValues: number[] = []

        const variants: Variants = {
            enter: (direction: number) => {
                enterCustomValues.push(direction)
                return {
                    x: direction > 0 ? 1000 : -1000,
                    opacity: 0,
                }
            },
            center: {
                x: 0,
                opacity: 1,
            },
            exit: (direction: number) => ({
                x: direction < 0 ? 1000 : -1000,
                opacity: 0,
            }),
        }

        const [showA, setShowA] = createSignal(true)
        const [showB, setShowB] = createSignal(true)
        const [direction, setDirection] = createSignal(0)

        /**
         * Use two children with different exit durations.
         * Child "b" exits instantly (type: false), child "a" exits slowly (10s).
         * After one frame: b's exit is complete but a's isn't,
         * so isEveryExitComplete=false and b stays in the DOM.
         * Then b re-enters — a genuine re-entry of a completed-exit element.
         */
        const Component = (props: {
            showA: boolean
            showB: boolean
            direction: number
        }) => {
            return (
                <AnimatePresence initial={false} custom={props.direction}>
                    <Show when={props.showA}>
                        <motion.div
                            custom={props.direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 10 }}
                        />
                    </Show>
                    <Show when={props.showB}>
                        <motion.div
                            custom={props.direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: false }}
                        />
                    </Show>
                </AnimatePresence>
            )
        }

        // Render both children
        render(() => (
            <Component
                showA={showA()}
                showB={showB()}
                direction={direction()}
            />
        ))
        await nextFrame()

        // Remove both: a exits slowly (10s), b exits instantly
        setShowA(false)
        setShowB(false)
        setDirection(-1)
        flush()
        await nextFrame()
        flush()

        // b's exit completed (type:false = instant).
        // a's exit is still running (duration: 10s).
        // isEveryExitComplete = false, so both stay in the DOM.
        // Now re-add b with new direction — genuine re-entry.
        enterCustomValues.length = 0
        setShowB(true)
        setDirection(1)
        flush()
        await nextFrame()
        flush()

        // With fix: enter variant called with direction=1 (reset + replay)
        // Without fix: no enter animation replayed (element stuck at exit position)
        expect(enterCustomValues).toContain(1)
    })

    test("Re-entering child with object-form initial resets to initial values when exit was complete", async () => {
        const opacity = motionValue(1)
        const opacityChanges: number[] = []

        opacity.on("change", (v) => {
            opacityChanges.push(v)
        })

        const [showA, setShowA] = createSignal(true)
        const [showB, setShowB] = createSignal(true)

        const Component = (props: { showA: boolean; showB: boolean }) => {
            return (
                <AnimatePresence>
                    <Show when={props.showA}>
                        <motion.div
                            initial={{ x: 0 }}
                            animate={{ x: 100 }}
                            exit={{ x: -100 }}
                            transition={{ duration: 10 }}
                        />
                    </Show>
                    <Show when={props.showB}>
                        <motion.div
                            initial={{ opacity: 0.5 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ opacity }}
                            transition={{ type: false }}
                        />
                    </Show>
                </AnimatePresence>
            )
        }

        render(() => <Component showA={showA()} showB={showB()} />)
        await nextFrame()

        setShowA(false)
        setShowB(false)
        flush()
        await nextFrame()
        flush()

        expect(opacity.get()).toBe(0)

        opacityChanges.length = 0
        setShowB(true)
        flush()
        await nextFrame()
        flush()

        expect(opacityChanges.length).toBeGreaterThan(0)
        expect(opacityChanges[0]).toBe(0.5)
    })

    test("Does not get stuck when state changes cause rapid key alternation in mode='wait'", async () => {
        /**
         * Reproduction from #3141: A loading/loaded pattern where
         * useEffect immediately flips loading to false, causing
         * the key to change twice per selection (loading-N → document-N).
         * On mount, multiple selections are batched, and the component
         * gets stuck showing a stale child.
         */
        const Component = () => {
            const [selected, setSelected] = createSignal({
                key: 0,
                loading: true,
            })

            createEffect(
                () => selected(),
                (value) => {
                    if (value.loading === true) {
                        setSelected((prev) => ({ ...prev, loading: false }))
                    }
                }
            )

            onSettled(() => {
                // Rapidly cycle through keys on mount
                setSelected((prev) => ({
                    key: prev.key + 1,
                    loading: true,
                }))
                setSelected((prev) => ({
                    key: prev.key + 1,
                    loading: true,
                }))
                setSelected((prev) => ({
                    key: prev.key + 1,
                    loading: true,
                }))
                setSelected((prev) => ({
                    key: prev.key + 1,
                    loading: true,
                }))
            })

            const contentKey = () =>
                selected().loading
                    ? "loading-" + selected().key
                    : "document-" + selected().key

            return (
                <AnimatePresence mode="wait">
                    <Show when={contentKey()} keyed>
                        {(key) => (
                            <motion.div
                                data-testid="content"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.1 }}
                            >
                                {key}
                            </motion.div>
                        )}
                    </Show>
                </AnimatePresence>
            )
        }

        const { getByTestId } = render(() => <Component />)

        // Wait for all state changes and exit animations to settle
        await new Promise((resolve) => setTimeout(resolve, 1000))
        flush()
        await nextFrame()
        await nextFrame()
        flush()

        // The final state should be document-4 (4 increments, loading=false)
        const content = getByTestId("content")
        expect(content.textContent).toContain("document-")
        // Should NOT be stuck on a "loading-" key
        expect(content.textContent).not.toContain("loading-")
    })

    test("Shows latest child after rapid key switches in mode='wait'", async () => {
        /**
         * Simplified reproduction: rapidly change keys in mode="wait"
         * before exit animations complete. The last key should be
         * visible after all animations settle.
         */
        const [i, setI] = createSignal(0)
        const Component = (props: { i: number }) => {
            return (
                <AnimatePresence mode="wait">
                    <Show when={String(props.i)} keyed>
                        {(key) => (
                            <motion.div
                                data-testid="content"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.1 }}
                            >
                                {key}
                            </motion.div>
                        )}
                    </Show>
                </AnimatePresence>
            )
        }

        const { container, getByTestId } = render(() => <Component i={i()} />)

        // Rapidly switch keys without waiting for exit animations
        setI(1)
        flush()
        setI(2)
        flush()
        setI(3)
        flush()

        // Wait for exit animations to complete
        await new Promise((resolve) => setTimeout(resolve, 500))
        flush()
        await nextFrame()
        await nextFrame()
        flush()

        // Only the last item should remain
        expect(container.childElementCount).toBe(1)
        expect(getByTestId("content").textContent).toBe("3")
    })

    test("Removes child when nested variant children have exit matching current values", async () => {
        /**
         * Reproduction for #3078: When a child motion component uses
         * variants for enter animation and has exit={{ opacity: 1, scale: 1 }}
         * (same as animated values), AnimatePresence should still remove
         * the parent after exit completes. The bug was that
         * value.isAnimating (property access, always truthy) was used
         * instead of value.isAnimating() (method call), preventing the
         * skip check from ever working. Without the fix, the
         * exit animation starts a long tween that blocks removal.
         */
        const [isVisible, setIsVisible] = createSignal(true)
        const Component = (props: { isVisible: boolean }) => {
            return (
                <AnimatePresence mode="wait">
                    <Show when={props.isVisible}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: false }}
                        >
                            <motion.ul
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    hidden: {},
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.05,
                                        },
                                    },
                                }}
                            >
                                <motion.li
                                    variants={{
                                        hidden: {
                                            opacity: 0,
                                            scale: 0.5,
                                        },
                                        visible: {
                                            opacity: 1,
                                            scale: 1,
                                        },
                                    }}
                                    exit={{
                                        opacity: 1,
                                        scale: 1,
                                        transition: { duration: 100 },
                                    }}
                                    transition={{ type: false }}
                                />
                                <motion.li
                                    variants={{
                                        hidden: {
                                            opacity: 0,
                                            scale: 0.5,
                                        },
                                        visible: {
                                            opacity: 1,
                                            scale: 1,
                                        },
                                    }}
                                    exit={{
                                        opacity: 1,
                                        scale: 1,
                                        transition: { duration: 100 },
                                    }}
                                    transition={{ type: false }}
                                />
                            </motion.ul>
                        </motion.div>
                    </Show>
                </AnimatePresence>
            )
        }

        const { container } = render(() => (
            <Component isVisible={isVisible()} />
        ))

        // Wait for enter animations to complete (type: "tween", duration: 100s
        // applies to enter too, but the enter target values use variants
        // which have their own transition, not the component's transition prop)
        await new Promise((resolve) => setTimeout(resolve, 200))

        expect(container.childElementCount).toBe(1)

        // Trigger exit - children have exit targets matching their
        // current values. With the fix, the skip check detects the
        // values are at rest and skips animation. Without the fix,
        // a 100-second tween starts, blocking removal.
        setIsVisible(false)
        flush()

        await new Promise((resolve) => setTimeout(resolve, 500))
        flush()
        await nextFrame()
        await nextFrame()
        flush()

        // Child should have been removed after exit animation completes
        expect(container.childElementCount).toBe(0)
    })

    test("Removes child when motion components inside unmount during exit (#3243)", async () => {
        /**
         * Reproduction for #3243: when an exit animation has been
         * triggered for a child of AnimatePresence and the only motion
         * component inside that child then unmounts on a subsequent
         * render, the exit state should not get stuck. With no motion
         * components left to drive the exit animation, PresenceChild
         * should detect all children have unregistered and call
         * onExitComplete.
         */
        let setChildOpen: ((open: boolean) => void) | null = null

        const Child = () => {
            const [isOpen, setIsOpen] = createSignal(true)
            setChildOpen = setIsOpen
            // Port note: Solid's own `Show` stands in for upstream's ternary, which unmounts
            // the `motion.div` right away.
            return (
                <SolidShow
                    when={isOpen()}
                    fallback={<div data-testid="closed">closed</div>}
                >
                    <motion.div
                        data-testid="motion"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 10 }}
                    />
                </SolidShow>
            )
        }

        const [isVisible, setIsVisible] = createSignal(true)
        const Component = (props: { isVisible: boolean }) => (
            <AnimatePresence>
                <Show when={props.isVisible}>
                    <Child />
                </Show>
            </AnimatePresence>
        )

        const { container } = render(() => (
            <Component isVisible={isVisible()} />
        ))

        // Step 1: trigger exit. Child still renders motion.div, so
        // PresenceChild flips isPresent=false while a motion child is
        // still registered.
        setIsVisible(false)
        flush()

        // Step 2: child internally re-renders without the motion
        // component. Without the fix, PresenceChild never detects that
        // all motion children have unregistered, so onExitComplete is
        // never fired and the wrapper stays in the DOM forever.
        setChildOpen!(false)
        flush()

        await nextFrame()
        await nextFrame()
        flush()

        expect(container.childElementCount).toBe(0)
    })
})
