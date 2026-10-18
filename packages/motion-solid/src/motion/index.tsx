import { Dynamic, isServer, type JSX } from "@solidjs/web"
import { invariant, noop, warning } from "motion-utils"
import {
    isMotionValue,
    optimizedAppearDataAttribute,
    visualElementStore,
    type Feature,
    type PresenceContextProps as MotionDOMPresenceContextProps,
    type VisualElement,
} from "motion-dom"
import {
    children as resolveChildren,
    createEffect,
    createMemo,
    createRenderEffect,
    getOwner,
    onCleanup,
    runWithOwner,
    untrack,
    useContext,
    type Component,
} from "solid-js"
import { LayoutGroupContext } from "../context/LayoutGroupContext"
import { LazyContext, type LazyContextProps } from "../context/LazyContext"
import { MotionConfigContext } from "../context/MotionConfigContext"
import { MotionContext } from "../context/MotionContext"
import { useCreateMotionContext } from "../context/MotionContext/create"
import { PresenceContext } from "../context/PresenceContext"
import { SwitchLayoutGroupContext } from "../context/SwitchLayoutGroupContext"
import {
    createLayoutTrigger,
    getCommitId,
    guard,
    onLayoutCommit,
} from "../projection/layout-commit"
import {
    LayoutScope,
    LayoutScopeContext,
    registerSharedLayoutMember,
    snapshotSharedLayout,
    useLayoutScope,
    type LayoutParticipant,
    type SharedLayoutMember,
} from "../projection/layout-scope"
import { filterProps } from "../render/dom/utils/filter-props"
import { isSVGComponent } from "../render/dom/utils/is-svg-component"
import { normalizeStyleKeys } from "../render/dom/utils/style"
import { makeHTMLVisualState } from "../render/html/use-html-visual-state"
import { createHTMLProps } from "../render/html/use-props"
import { makeSVGVisualState } from "../render/svg/use-svg-visual-state"
import { createSVGProps } from "../render/svg/use-props"
import type { CreateVisualElement, ResolvedValues } from "../render/types"
import { peek } from "../utils/access"
import { reactiveProps } from "../utils/reactive-props"
import { getInitializedFeatureDefinitions } from "./features/definitions"
import {
    MeasureLayout,
    type MeasureProps,
} from "./features/layout/MeasureLayout"
import { loadFeatures } from "./features/load-features"
import type { FeatureBundle, FeaturePackages } from "./features/types"
import type { MotionComponentBaseProps, MotionProps } from "./types"
import { toConstraintsRef } from "./utils/drag-constraints"
import { isLayoutAffectingChange } from "./utils/layout-props"
import { motionComponentSymbol } from "./utils/symbol"
import { createProjectionNode } from "./utils/use-visual-element"

export interface MotionComponentConfig<TagName extends string = "div"> {
    preloadedFeatures?: FeatureBundle
    createVisualElement?: CreateVisualElement
    Component: TagName | Component<any>
    forwardMotionProps?: boolean
}

export type MotionComponentProps<Props> = {
    [K in Exclude<keyof Props, keyof MotionProps>]?: Props[K]
} & MotionComponentBaseProps

export type MotionComponent<P extends Record<string, any>> = Component<
    MotionComponentProps<P>
>

export interface MotionComponentOptions {
    forwardMotionProps?: boolean
    /**
     * Specify whether the component renders an HTML or SVG element.
     * This is useful when wrapping custom SVG components that need
     * SVG-specific attribute handling (like viewBox animation).
     * By default, Motion auto-detects based on the component name,
     * but custom components are always treated as HTML.
     */
    type?: "html" | "svg"
}

type Instance = HTMLElement | SVGElement

type ConfigAndProps = MotionProps & Record<string, any>

/**
 * What a motion component's updates depend on.
 */
interface MotionState {
    props: ConfigAndProps
    isPresent: boolean
    /**
     * Inherited variant labels.
     */
    initial: unknown
    animate: unknown
}

/**
 * Props that aren't motion props: read by the motion component itself.
 */
const notMotionProps = new Set(["children", "ref"])

/**
 * Create a `motion` component.
 *
 * This function accepts a Component argument, which can be either a string (ie "div"
 * for `motion.div`), or an actual Solid component.
 *
 * Port note: upstream drives the `VisualElement` from React's render and effect phases. A Solid
 * component runs once, so the lifecycle maps to Solid's phases instead (see PORTING.md):
 *
 * - creation (component body): the `VisualElement` and projection node are created, not mounted,
 * - in the document (after the flush that inserts it): the `VisualElement` mounts, then features
 *   and the layout
 *   measurement. Initial animations start once every component of the flush has mounted
 *   (Solid settles parents first, React runs child effects first),
 * - updates: a layout trigger (`projection/layout-commit.ts`) snapshots the layout when the
 *   update commits, before the DOM writes, then updates the `VisualElement` and its features,
 *   and an effect runs `animateChanges`,
 * - disposal: snapshot, then unmount. Children of Solid's own control flow inside an
 *   `AnimatePresence` hand their element over instead, to exit without an owner.
 */
export function createMotionComponent<Props extends Record<string, any> = {}>(
    Component: string | Component<Props>,
    { forwardMotionProps = false, type }: MotionComponentOptions = {},
    preloadedFeatures?: FeaturePackages,
    createVisualElement?: CreateVisualElement
): MotionComponent<Props> {
    preloadedFeatures && loadFeatures(preloadedFeatures)

    /**
     * Determine whether to use SVG or HTML rendering based on:
     * 1. Explicit `type` option (highest priority)
     * 2. Auto-detection via `isSVGComponent`
     */
    const isSVG = type ? type === "svg" : isSVGComponent(Component)
    const makeVisualState = isSVG ? makeSVGVisualState : makeHTMLVisualState

    function MotionDOMComponent(
        props: MotionComponentProps<Props> & Record<string, any>
    ): JSX.Element {
        const motionConfig = useContext(MotionConfigContext)
        const layoutGroup = useContext(LayoutGroupContext)
        const switchLayoutGroup = useContext(SwitchLayoutGroupContext)
        const presence = useContext(PresenceContext)
        const parentContext = useContext(MotionContext)
        const lazyContext = useContext(LazyContext)
        const parentScope = useLayoutScope()
        const scope = new LayoutScope(parentScope)

        const isPresentNow = () => (presence ? presence.isPresent() : true)

        /**
         * Port note: upstream's `AnimatePresence` keeps rendering an exiting child with its last
         * props (a cloned element). Solid keeps them live, so every read of them is frozen while
         * exiting: the motion props, the rendered style, the forwarded DOM props and the
         * contexts. A prop change would otherwise restart the `animate` target and stop the
         * exit, and props derived from what removed the element (`when={record()}`,
         * `animate={{ x: record()!.x }}`) would throw. Frozen memos don't read their sources,
         * so they unsubscribe until the element is present again.
         */
        const whilePresent = <T,>(read: () => T) =>
            createMemo((previous?: T) =>
                isPresentNow() || previous === undefined ? read() : previous
            )

        /**
         * The component's props, read into a plain object (everything but `children` and
         * `ref`, which the component renders itself).
         */
        const readRawProps = () => {
            const values: Record<string, any> = {}
            for (const key of Object.keys(props)) {
                if (!notMotionProps.has(key)) values[key] = props[key]
            }
            return values
        }
        const rawProps = whilePresent(readRawProps)

        /**
         * The current motion props, like upstream's `configAndProps`: the `MotionConfig` values,
         * overridden by the component's props, with the `layoutId` scoped to the `LayoutGroup`.
         * Only read from this component's own computations: another component reading them
         * could run into getters of a branch that's being disposed.
         */
        const getConfigAndProps = (
            componentProps = rawProps()
        ): ConfigAndProps => {
            const configAndProps: Record<string, any> = {
                ...motionConfig,
                ...componentProps,
            }
            if (configAndProps.style) {
                configAndProps.style = normalizeStyleKeys(configAndProps.style)
            }
            if (configAndProps.dragConstraints) {
                configAndProps.dragConstraints = toConstraintsRef(
                    configAndProps.dragConstraints
                )
            }
            configAndProps.layoutId = getLayoutId(
                layoutGroup.id,
                configAndProps.layoutId
            )
            return configAndProps
        }

        const motionProps = whilePresent(() => getConfigAndProps())

        /**
         * Port note: read from the props themselves, not through `motionProps`. Since Solid 2
         * RC.14, an untracked read of a memo created here doesn't wake the component when a
         * pending prop resolves (the surrounding `Loading` keeps its fallback), and reads
         * `undefined` while a held update is in flight.
         */
        const initialProps = untrack(() => getConfigAndProps(readRawProps()))
        const { isStatic, isValidProp } = initialProps as MotionProps & {
            isStatic?: boolean
            isValidProp?: (key: string) => boolean
        }

        const context = useCreateMotionContext<Instance>(motionProps)

        const visualState = untrack(() =>
            makeVisualState(initialProps, parentContext, presence)
        )

        const state = createMemo(
            (): MotionState => ({
                // Frozen while exiting (`whilePresent`).
                props: motionProps(),
                isPresent: isPresentNow(),
                initial: context.initial,
                animate: context.animate,
            })
        )

        let visualElement: VisualElement<Instance> | undefined
        let element: Instance | undefined
        /**
         * Moves a mounted `VisualElement` to a new element (see `ref`).
         */
        let rebindElement: VoidFunction | undefined

        if (!isStatic && !isServer) {
            useStrictMode(lazyContext, preloadedFeatures, initialProps)

            /**
             * Without preloaded features (`m` components), the renderer comes from `LazyMotion`.
             * Port note: if it's loading, the `VisualElement` is set up once it has loaded
             * (upstream re-renders), and animates on mount like upstream.
             */
            const renderer =
                createVisualElement ?? untrack(lazyContext.renderer)

            if (renderer) {
                visualElement = setupVisualElement(renderer, false)
            } else {
                const owner = getOwner()
                createEffect(
                    lazyContext.renderer,
                    (loaded) => {
                        if (!loaded || visualElement) return
                        runWithOwner(owner, () => {
                            visualElement = setupVisualElement(loaded, true)
                            context.visualElement = visualElement
                        })
                    },
                    clientOnly
                )
            }
        }

        onCleanup(() => scope.dispose())

        context.visualElement = visualElement

        const createVisualProps = (
            stateProps: MotionProps,
            latestValues: ResolvedValues
        ) =>
            isSVG
                ? createSVGProps(stateProps, latestValues, Component as string)
                : createHTMLProps(stateProps, latestValues)

        const getVisualProps = createVisualProps(
            initialProps,
            visualState.latestValues
        )

        /**
         * Port note: in a static context (`MotionConfig isStatic`), upstream rebuilds the visual
         * state on every render, so `initial` and `style` changes show. Here, when they change.
         */
        const buildVisualProps = (current: ConfigAndProps) => {
            if (!isStatic) return getVisualProps(current)
            const latestValues = makeVisualState(
                current,
                parentContext,
                presence
            ).latestValues
            return createVisualProps(current, latestValues)(current)
        }

        /**
         * Port note: React renders no `style` attribute for an empty style object, Solid's server
         * renders `style=""`. So an empty style isn't rendered until the element has had one. After
         * that it stays an object: Solid removes the whole attribute for a missing style,
         * including the values motion-dom writes directly.
         */
        let hasRenderedStyle = false
        const visualProps = reactiveProps(
            createMemo(() => {
                const built: Record<string, any> = buildVisualProps(
                    motionProps()
                )
                const { style, ...rest } = built
                if (style && Object.keys(style).length) hasRenderedStyle = true
                return hasRenderedStyle ? built : rest
            })
        )
        const forwardedProps = filterProps(
            reactiveProps(rawProps),
            typeof Component === "string",
            forwardMotionProps,
            isValidProp
        )

        const ref = (instance: Instance) => {
            const previous = element
            element = instance
            visualState.onMount?.(instance)
            /**
             * A custom component forwarding its ref to something that isn't an element: mount
             * right away, so motion-dom's actionable error is thrown during render, like
             * upstream.
             */
            if (
                visualElement &&
                typeof Node !== "undefined" &&
                !(instance instanceof Node)
            ) {
                visualElement.mount(instance)
            } else if (previous !== instance) {
                /**
                 * Port note: a custom component that renders another root element calls its
                 * ref with the new one. React calls the ref with `null`, then the new element,
                 * which unmounts the `VisualElement` and mounts it on the new element. That's
                 * also the case for its first element, when it mounted without one.
                 */
                rebindElement?.()
            }
            applyRef(
                untrack(() => props.ref),
                instance
            )
        }

        /**
         * Rendered as a component under the providers, so its children see this component's
         * contexts, and rendering it isn't tracked.
         */
        const Element = () => {
            if (typeof Component !== "string") return <CustomElement />

            const children = resolveChildren(() => props.children)

            /**
             * Port note: adding, removing or reordering children (e.g. a `<For>`) can move them
             * and their siblings. Upstream re-renders them with their parent, which snapshots
             * their layout: this component's siblings, and its whole subtree.
             */
            createLayoutTrigger(children, () => {
                if (!visualElement?.current) return
                parentScope.snapshot()
                scope.snapshot(true)
            })

            /**
             * If handed a motion value as its child, render its initial value: the
             * `VisualElement` updates the text content when it changes.
             */
            const renderChildren = (): JSX.Element => {
                const child = children()
                return (
                    isMotionValue(child) ? untrack(() => child.get()) : child
                ) as JSX.Element
            }

            /**
             * Port note: upstream passes a motion value child to the `VisualElement`, which
             * updates the text content when it changes. Children aren't motion props here, so
             * this subscribes itself.
             */
            createEffect(children, (child) => {
                if (!isMotionValue(child)) return
                return child.on("change", subscribeToTextContent)
            })

            return (
                <Dynamic
                    component={Component as any}
                    {...forwardedProps}
                    {...visualProps}
                    ref={ref}
                >
                    {renderChildren()}
                </Dynamic>
            )
        }

        const subscribeToTextContent = (latest: unknown) => {
            if (element) element.textContent = `${latest}`
        }

        /**
         * Port note: a custom component (`motion.create(Component)`) gets its children
         * unresolved, like upstream: they're created where it renders them (under its own
         * contexts), and only if it does. So they aren't seen here: adding or reordering them
         * doesn't snapshot the layout of this component's subtree.
         */
        const CustomElement = () => {
            const renderChildren = (): JSX.Element => {
                const child = props.children
                if (!isMotionValue(child)) return child as JSX.Element
                if (getOwner()) {
                    onCleanup(child.on("change", subscribeToTextContent))
                }
                return untrack(() => child.get()) as JSX.Element
            }

            return (
                <Dynamic
                    component={Component as any}
                    {...forwardedProps}
                    {...visualProps}
                    ref={ref}
                >
                    {renderChildren()}
                </Dynamic>
            )
        }

        return (
            <MotionContext value={context}>
                <LayoutScopeContext value={scope}>
                    <Element />
                </LayoutScopeContext>
            </MotionContext>
        )

        function setupVisualElement(
            createRenderer: CreateVisualElement,
            isLate: boolean
        ) {
            const presenceId = nextClientId()
            const fallback = presence?.fallback

            let committed = peek(state)
            let isMounted = false
            let isDisposed = false

            /**
             * Exits when handed over to the `AnimatePresence` fallback (see
             * `context/PresenceContext.ts`): what has to finish first, like upstream's
             * `PresenceChild` registry.
             */
            const fallbackRegistry = new Map<string | number, boolean>()
            let fallbackExit: VoidFunction | undefined
            let isFallbackExiting = false

            const completeFallbackExit = () => {
                if (!fallbackExit) return
                for (const isComplete of fallbackRegistry.values()) {
                    if (!isComplete) return
                }
                const resolve = fallbackExit
                fallbackExit = undefined
                resolve()
            }

            const isPresent = (value: MotionState) =>
                value.isPresent && !isFallbackExiting

            /**
             * The presence data the `VisualElement` sees, upstream's shape.
             */
            const getPresenceContext = (
                isPresentNow: boolean
            ): MotionDOMPresenceContextProps | null =>
                presence
                    ? {
                          id: presenceId,
                          isPresent: isPresentNow,
                          initial: presence.initial,
                          custom: untrack(presence.custom),
                          register: (childId) => {
                              fallbackRegistry.set(childId, false)
                              const unregister = presence.register(childId)
                              return () => {
                                  fallbackRegistry.delete(childId)
                                  unregister()
                                  completeFallbackExit()
                              }
                          },
                          onExitComplete: (childId) => {
                              fallbackRegistry.set(childId, true)
                              presence.onExitComplete(childId)
                              completeFallbackExit()
                          },
                      }
                    : null

            let presenceContext = getPresenceContext(isPresent(committed))

            /**
             * Whether an optimised appear animation (`startOptimizedAppearAnimation`, started
             * before hydration) is running for this element, to hand off from. Read when the
             * component is created, like upstream.
             */
            const appearId = committed.props[
                optimizedAppearDataAttribute as keyof MotionProps
            ] as string | undefined
            const wantsHandoff =
                Boolean(appearId) &&
                !window.MotionHandoffIsComplete?.(appearId!) &&
                Boolean(window.MotionHasOptimisedAnimation?.(appearId!))

            const node = createRenderer(Component as any, {
                visualState,
                parent: parentContext.visualElement,
                props: committed.props,
                presenceContext,
                blockInitialAnimation: presence
                    ? presence.initial === false
                    : false,
                reducedMotionConfig: committed.props.reducedMotion,
                skipAnimations: committed.props.skipAnimations,
                isSVG,
            })

            /**
             * Set up after the component was created and rendered (lazy features): animate on
             * mount (upstream: features loaded after the component has mounted).
             */
            if (isLate) node.manuallyAnimateOnMount = true

            const featureDefinitions = getInitializedFeatureDefinitions()
            const layoutFeature = featureDefinitions.layout
            const dragFeature = featureDefinitions.drag
            const ProjectionNode =
                layoutFeature?.ProjectionNode ?? dragFeature?.ProjectionNode

            if (
                !node.projection &&
                ProjectionNode &&
                (node.type === "html" || node.type === "svg")
            ) {
                createProjectionNode(
                    node,
                    committed.props,
                    ProjectionNode,
                    switchLayoutGroup
                )
            }

            /**
             * Layout measurement, for components that need it (upstream renders `MeasureLayout`).
             */
            let measureLayout: MeasureLayout | undefined
            let unregisterLayoutPresence: VoidFunction | undefined
            const layoutPresenceId = nextClientId()

            const getMeasureProps = (value: MotionState): MeasureProps => {
                const isPresentNow = isPresent(value)
                return {
                    ...value.props,
                    visualElement: node,
                    layoutGroup,
                    switchLayoutGroup,
                    isPresent: isPresentNow,
                    safeToRemove:
                        !isPresentNow && presenceContext
                            ? () =>
                                  presenceContext!.onExitComplete!(
                                      layoutPresenceId
                                  )
                            : null,
                }
            }

            /**
             * Upstream's `getSnapshotBeforeUpdate(prevProps)` with `value` as the next props,
             * followed by `componentDidUpdate`, which schedules the measurement of the new
             * layout after the flush.
             */
            const snapshot = (value: MotionState) => {
                if (!measureLayout) return
                const committedProps = measureLayout.props
                measureLayout.props = getMeasureProps(value)
                measureLayout.getSnapshotBeforeUpdate(committedProps)
                measureLayout.componentDidUpdate()
                measureLayout.props = committedProps
            }

            /**
             * The commit in which the layout trigger took this element's snapshot with its next
             * props and presence. Snapshots from scopes in the same commit would otherwise
             * re-snapshot it with its committed (previous) props, e.g. reset an exiting
             * element to present.
             */
            let ownSnapshotCommit = -1
            const snapshotCommitted = () => {
                if (ownSnapshotCommit !== getCommitId()) snapshot(committed)
            }

            const participant: LayoutParticipant = {
                snapshot: snapshotCommitted,
            }

            /**
             * Snapshot with the other members of this component's `layoutId` stack (see
             * `projection/layout-scope.ts`): this element and its subtree.
             */
            let sharedSnapshotCommit = -1
            const sharedMember: SharedLayoutMember = {
                layoutId: () => committed.props.layoutId,
                snapshot: () => {
                    const commit = getCommitId()
                    if (sharedSnapshotCommit === commit) return
                    sharedSnapshotCommit = commit
                    snapshotCommitted()
                    scope.snapshot()
                },
            }
            let unregisterSharedMember: VoidFunction | undefined

            const isMeasureEnabled = (value: MotionState) =>
                Boolean(
                    node.projection &&
                        (layoutFeature?.isEnabled(value.props) ||
                            dragFeature?.isEnabled(value.props))
                )

            /**
             * Mount or unmount the layout measurement when it's enabled or disabled.
             */
            const reconcileMeasureLayout = (value: MotionState) => {
                if (isMeasureEnabled(value)) {
                    syncLayoutOptions(value)
                    if (measureLayout) {
                        measureLayout.props = getMeasureProps(value)
                        return
                    }
                    measureLayout = new MeasureLayout(getMeasureProps(value))
                    measureLayout.componentDidMount()
                    parentScope.participants.add(participant)
                    if (presenceContext && !unregisterLayoutPresence) {
                        unregisterLayoutPresence =
                            presenceContext.register(layoutPresenceId)
                    }
                } else {
                    if (measureLayout || unregisterLayoutPresence) {
                        unmountMeasureLayout()
                    }
                    syncLayoutOptions(value)
                }
            }

            /**
             * Whether the projection node was mounted with its layout animation handler (only
             * added when it's mounted with `layout` or `layoutId`).
             */
            let hasLayoutHandler = false

            const checkLayoutHandler = () => {
                const options = node.projection?.options
                hasLayoutHandler = Boolean(
                    options &&
                        options.animate !== false &&
                        (options.layout || options.layoutId)
                )
            }

            /**
             * Port note: upstream sets the projection's `layout`/`layoutId` when it's created
             * only. Here they follow the props, so `layout` turned on later (also with `drag`,
             * which keeps the measurement) animates, and turned off doesn't. motion-dom reads
             * them when the projection node mounts (its layout animation handler, its
             * `layoutId` stack), so the projection node is mounted again when they need it.
             */
            const syncLayoutOptions = (value: MotionState) => {
                const { projection } = node
                if (!projection) return
                const { layout, layoutId } = value.props
                const needsMount =
                    Boolean(projection.instance) &&
                    (projection.options.layoutId !== layoutId ||
                        (!hasLayoutHandler && Boolean(layout || layoutId)))
                if (
                    !needsMount &&
                    projection.options.layout === layout &&
                    projection.options.layoutId === layoutId
                ) {
                    return
                }
                const setOptions = () =>
                    projection.setOptions({
                        ...projection.options,
                        layout,
                        layoutId,
                        animationType:
                            typeof layout === "string" ? layout : "both",
                    })
                if (needsMount) remountProjection(setOptions)
                else setOptions()
            }

            /**
             * Mount the projection node again on its element, with new options. Only the
             * projection node: the gestures (an ongoing drag, hover) keep going. Unmounting it
             * removes its listeners: the layout measurement's are added again by
             * `reconcileMeasureLayout`, drag's here.
             */
            const remountProjection = (setOptions: VoidFunction) => {
                const projection = node.projection!
                const instance = projection.instance!
                const previousLayoutId = projection.options.layoutId
                unmountMeasureLayout(true)
                projection.unmount()
                setOptions()
                projection.mount(instance)
                checkLayoutHandler()

                const drag = getFeatures().drag as any
                if (drag?.isMounted) {
                    drag.removeListeners()
                    drag.removeListeners = drag.controls.addListeners() || noop
                }

                /**
                 * Leaving a `layoutId` stack promoted its previous member, to animate from this
                 * element. Joining the new stack replaced this element's snapshot with the
                 * new stack's previous lead's: the previous member keeps animating from the
                 * snapshot it took over.
                 */
                if (previousLayoutId === undefined) return
                const lead = (projection.root as any)?.sharedNodes?.get(
                    previousLayoutId
                )?.lead
                if (lead?.resumeFrom === projection && lead.snapshot) {
                    lead.resumeFrom = Object.create(projection, {
                        snapshot: { value: lead.snapshot, writable: true },
                    })
                }
            }

            /**
             * @param keepPresence - Keep its presence registration: it's mounted again, so the
             * exit it's part of doesn't complete in between.
             */
            const unmountMeasureLayout = (keepPresence = false) => {
                if (measureLayout) {
                    measureLayout.componentWillUnmount()
                    measureLayout = undefined
                    parentScope.participants.delete(participant)
                }
                if (keepPresence) return
                unregisterLayoutPresence?.()
                unregisterLayoutPresence = undefined
            }

            /**
             * Update the `VisualElement` with committed props and presence.
             */
            const update = (value: MotionState) => {
                flushPendingAnimations()
                const isPresentNow = isPresent(value)
                if (
                    !presenceContext ||
                    presenceContext.isPresent !== isPresentNow
                ) {
                    presenceContext = getPresenceContext(isPresentNow)
                }
                node.update(value.props, presenceContext)
                node.updateFeatures()
                node.scheduleRenderMicrotask()
                reconcileMeasureLayout(value)
            }

            /**
             * The fallback presence member: exit and re-enter while handed over.
             */
            const exit = () =>
                new Promise<void>((resolve) => {
                    fallbackExit = resolve
                    isFallbackExiting = true
                    fallbackRegistry.forEach((_, key) =>
                        fallbackRegistry.set(key, false)
                    )
                    snapshot(committed)
                    update(committed)
                    completeFallbackExit()
                })

            const enter = () => {
                if (!isFallbackExiting) return
                isFallbackExiting = false
                fallbackExit = undefined
                snapshot(committed)
                update(committed)
            }

            const getFeatures = (): Record<string, Feature | undefined> =>
                (node as any).features

            const mountNode = (instance: Instance) => {
                node.mount(instance)
                checkLayoutHandler()
            }

            /**
             * Unmount the `VisualElement`, and its projection node only if it's mounted
             * (unmounting a projection node with a `layoutId` starts an update of its tree).
             */
            const unmountNode = () => {
                const { projection } = node
                if (projection?.instance) {
                    node.unmount()
                    return
                }
                node.projection = undefined
                node.unmount()
                node.projection = projection
            }

            /**
             * Moved to a new element (`rebindElement`), waiting to mount on it. Holds the exit
             * the component is part of (a registration of its own), until it's mounted again.
             */
            let isRebinding = false
            let releaseRebind: VoidFunction | undefined
            const rebindPresenceId = nextClientId()

            /**
             * Mounted again on a new element while exiting: the exit and the layout
             * measurement's part of it start again, as if it had just stopped being present.
             */
            const restartExit = () => {
                node.prevPresenceContext = getPresenceContext(true)
                node.updateFeatures()
                if (!measureLayout) return
                const { props } = measureLayout
                measureLayout.getSnapshotBeforeUpdate({
                    ...props,
                    isPresent: true,
                })
                measureLayout.componentDidUpdate()
            }

            let unregisterFallback: VoidFunction | undefined
            let cancelWaitForDocument: VoidFunction | undefined

            const mount = () => {
                if (isDisposed || isMounted) return

                window.MotionIsMounted = true
                isMounted = true

                if (!element) {
                    /**
                     * A component that doesn't render its element with our `ref`
                     * (`motion.create`): like upstream, its features and animations still run,
                     * e.g. to drive variant children.
                     */
                    node.updateFeatures()
                    scheduleAnimateChanges(node)
                    return
                }

                /**
                 * Upstream's `MeasureLayout` mounts before the element's ref, so the projection
                 * node has its `layoutDependency` when mounting promotes it in its shared stack
                 * (`NodeStack.promote` compares it with the previous lead's).
                 */
                if (node.projection && isMeasureEnabled(committed)) {
                    node.projection.setOptions({
                        ...node.projection.options,
                        layoutDependency: committed.props.layoutDependency,
                    })
                }
                /**
                 * Port note: mounting a `VisualElement` again resets its values to `initial`
                 * (upstream: for a component that remounts). Moved to a new element, its
                 * values carry over.
                 */
                if (isRebinding) (node as any).hasBeenMounted = false
                mountNode(element)
                unregisterSharedMember =
                    registerSharedLayoutMember(sharedMember)
                if (committed.props !== node.getProps()) update(committed)
                else {
                    node.updateFeatures()
                    node.scheduleRenderMicrotask()
                    reconcileMeasureLayout(committed)
                }

                if (isRebinding) {
                    /**
                     * Its animations start again on the new element, from the values they
                     * reached: the exit too.
                     */
                    isRebinding = false
                    if (isPresent(committed)) scheduleAnimateChanges(node)
                    else restartExit()
                    releaseRebind?.()
                    releaseRebind = undefined
                } else if (wantsHandoff) {
                    /**
                     * An optimised appear animation is running: hand off from it right away,
                     * so its values never jump (upstream: in a layout effect).
                     */
                    node.animationState?.animateChanges()
                    node.enteringChildren = undefined
                    queueMicrotask(() => {
                        window.MotionHandoffMarkAsComplete?.(appearId!)
                    })
                } else {
                    scheduleAnimateChanges(node)
                }

                if (fallback) {
                    unregisterFallback = fallback.register(element, {
                        exit,
                        enter,
                    })
                }
            }

            /**
             * Creating this component can move the elements around it. Upstream re-renders its
             * siblings with the parent that renders it. Taken at the commit of the update that
             * creates it, before it's inserted (when async work holds that update, at its
             * landing).
             */
            onLayoutCommit(() => {
                if (isDisposed) return
                parentScope.snapshot()
                snapshotSharedLayout(committed.props.layoutId)
            }, clientOnly)

            /**
             * Mount once the element is in the document, never while it's detached (a
             * `<Reveal>` or `mode="wait"` can build it before inserting it):
             *
             * - after the flush that inserts it. This follows the render effects, which write
             *   the DOM: effects (and `onSettled`) of an action's optimistic update wait for the
             *   action to settle, while the element is already shown,
             * - otherwise when it's inserted later: the `AnimatePresence` fallback tells, or it's
             *   checked every frame.
             */
            const tryMount = () => {
                if (isMounted || isDisposed) return true
                if (!element?.isConnected) return false
                cancelWaitForDocument?.()
                mount()
                return true
            }

            createRenderEffect(
                () => true,
                () => {
                    schedulePendingMount(tryMount)
                },
                clientOnly
            )

            const waitForDocument = () => {
                if (tryMount() || cancelWaitForDocument) return
                if (!element) return mount()
                if (fallback) {
                    cancelWaitForDocument = fallback.whenConnected(
                        element,
                        tryMount
                    )
                    return
                }
                let frameId = requestAnimationFrame(function check() {
                    if (!tryMount()) frameId = requestAnimationFrame(check)
                })
                cancelWaitForDocument = () => cancelAnimationFrame(frameId)
            }

            createEffect(() => true, waitForDocument, clientOnly)

            /**
             * The element was replaced: unmount, and mount on the new element once it's in the
             * document, like upstream (which unmounts and mounts the `VisualElement` when the
             * ref changes).
             */
            rebindElement = () => {
                if (!isMounted || isDisposed) return
                unregisterFallback?.()
                unregisterFallback = undefined
                unregisterSharedMember?.()
                unregisterSharedMember = undefined
                if (presenceContext && !releaseRebind) {
                    releaseRebind = presenceContext.register(rebindPresenceId)
                }
                const previous = node.current
                if (previous && visualElementStore.get(previous) === node) {
                    visualElementStore.delete(previous)
                }
                unmountMeasureLayout()
                unmountNode()
                isRebinding = true
                isMounted = false
                cancelWaitForDocument?.()
                cancelWaitForDocument = undefined
                schedulePendingMount(() => {
                    waitForDocument()
                    return true
                })
            }

            createLayoutTrigger(
                state,
                (next) => {
                    if (!isMounted) return
                    if (
                        !isLayoutAffectingChange(committed, next) &&
                        isPresent(committed) === isPresent(next)
                    ) {
                        return
                    }
                    ownSnapshotCommit = getCommitId()

                    /**
                     * `layout`/`layoutId` turned on by this update: motion-dom only snapshots a
                     * node with one of them, so it's snapshot with `layout` already.
                     */
                    const { projection } = node
                    if (
                        projection?.instance &&
                        !projection.options.layout &&
                        projection.options.layoutId === undefined &&
                        (next.props.layout || next.props.layoutId !== undefined)
                    ) {
                        projection.setOptions({
                            ...projection.options,
                            layout: next.props.layout || true,
                        })
                        if (!measureLayout) projection.willUpdate()
                    }

                    snapshot(next)
                    parentScope.snapshot()
                    snapshotSharedLayout(committed.props.layoutId, sharedMember)
                    if (next.props.layoutId !== committed.props.layoutId) {
                        snapshotSharedLayout(next.props.layoutId, sharedMember)
                    }
                },
                (value) => {
                    committed = value
                    if (isMounted) update(value)
                },
                clientOnly
            )

            createEffect(
                state,
                () => {
                    if (!isMounted) return
                    flushPendingAnimations()
                    node.animationState?.animateChanges()
                    node.enteringChildren = undefined
                },
                { defer: true, ...clientOnly }
            )

            onCleanup(() => {
                isDisposed = true
                cancelWaitForDocument?.()

                if (!isMounted) {
                    // Waiting to mount on a new element (`rebindElement`).
                    guard(unmountMeasureLayout)
                    releaseRebind?.()
                    return
                }

                const finish = () => {
                    unregisterSharedMember?.()
                    guard(unmountMeasureLayout)
                    unregisterFallback?.()
                    unmountedNodes.add(node)
                    unmountNode()
                }

                /**
                 * Removing this component can move the elements around it. It's still in the
                 * document at this point.
                 */
                if (element?.isConnected) {
                    parentScope.snapshot()
                    snapshotSharedLayout(committed.props.layoutId, sharedMember)
                }

                if (fallback && element) {
                    fallback.release(element, finish)
                } else {
                    finish()
                }
            })

            return node
        }
    }

    ;(MotionDOMComponent as any)[motionComponentSymbol] = Component

    return MotionDOMComponent as MotionComponent<Props>
}

/**
 * The `VisualElement` lifecycle only runs in the browser: its computations don't take part in
 * hydration ids, so the server-rendered markup still matches (Solid's `transparent`).
 */
const clientOnly = { transparent: true }

/**
 * Ids for the client-only lifecycle (`createUniqueId` would take a hydration id).
 */
let clientId = 0
const nextClientId = () => `motion-${clientId++}`

/**
 * Initial animations of the components mounted in a flush. Solid settles parents before their
 * children, and a parent's initial animation animates the variant children that have mounted, so
 * they start once every component of the flush has mounted.
 */
/**
 * Mounts waiting for the end of the flush that inserts their element.
 */
let pendingMounts: Array<() => boolean> = []

function schedulePendingMount(tryMount: () => boolean) {
    if (!pendingMounts.length) queueMicrotask(flushPendingMounts)
    pendingMounts.push(tryMount)
}

/**
 * Mount the motion components whose element is in the document, right away. Imperative APIs
 * (`useAnimationControls`) call it, so that they see the components that were inserted by the
 * update that's running their effect, like upstream (React mounts children before it runs the
 * effects of their parents).
 */
export function flushPendingMounts() {
    const mounts = pendingMounts
    pendingMounts = []
    for (const tryMount of mounts) tryMount()
}

let pendingAnimations: VisualElement[] = []
const unmountedNodes = new WeakSet<VisualElement>()

function scheduleAnimateChanges(node: VisualElement) {
    if (!pendingAnimations.length) queueMicrotask(flushPendingAnimations)
    pendingAnimations.push(node)
}

/**
 * Also called before any later update, so it never runs against an animation state that hasn't
 * had its initial render.
 */
function flushPendingAnimations() {
    const nodes = pendingAnimations
    pendingAnimations = []
    for (const pending of nodes) {
        if (unmountedNodes.has(pending)) continue
        guard(() => pending.animationState?.animateChanges())
        pending.enteringChildren = undefined
    }
}

function useStrictMode(
    lazyContext: LazyContextProps,
    preloadedFeatures: FeaturePackages | undefined,
    props: MotionProps & { ignoreStrict?: boolean }
) {
    /**
     * If we're in development mode, check to make sure we're not rendering a motion component
     * as a child of LazyMotion, as this will break the file-size benefits of using it.
     */
    if (
        process.env.NODE_ENV !== "production" &&
        preloadedFeatures &&
        lazyContext.strict
    ) {
        const strictMessage =
            "You have rendered a `motion` component within a `LazyMotion` component. This will break tree shaking. Import and render a `m` component instead."
        props.ignoreStrict
            ? warning(false, strictMessage, "lazy-strict-mode")
            : invariant(false, strictMessage, "lazy-strict-mode")
    }
}

function getLayoutId(layoutGroupId: string | undefined, layoutId?: string) {
    return layoutGroupId && layoutId !== undefined
        ? layoutGroupId + "-" + layoutId
        : layoutId
}

function applyRef(ref: unknown, instance: Instance) {
    if (typeof ref === "function") {
        ref(instance)
    } else if (Array.isArray(ref)) {
        for (const r of ref) applyRef(r, instance)
    }
}

declare global {
    interface Window {
        MotionIsMounted?: boolean
    }
}
