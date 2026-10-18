import {
    frame,
    microtask,
    globalProjectionState,
    type VisualElement,
} from "motion-dom"
import type { LayoutGroupContextProps } from "../../../context/LayoutGroupContext"
import type { SwitchLayoutGroupContext } from "../../../context/SwitchLayoutGroupContext"
import type { MotionProps } from "../../types"

interface MeasureContextProps {
    layoutGroup: LayoutGroupContextProps
    switchLayoutGroup?: SwitchLayoutGroupContext
    isPresent: boolean
    safeToRemove?: VoidFunction | null
}

export type MeasureProps = MotionProps &
    MeasureContextProps & { visualElement: VisualElement }

/**
 * Track whether we've taken any snapshots yet. If not,
 * we can safely skip notification of didUpdate.
 *
 * Difficult to capture in a test but to prevent flickering
 * we must set this to true either on update or unmount.
 * Running `next-env/layout-id` in Safari will show this behaviour if broken.
 */
let hasTakenAnySnapshot = false

/**
 * Port note: upstream is a class component rendered by the motion component, for access to
 * `getSnapshotBeforeUpdate`. Here it's a plain class with the same lifecycle methods, which the
 * motion component calls: `getSnapshotBeforeUpdate` when an update commits, before the DOM writes
 * (`projection/layout-commit.ts`), immediately followed by `componentDidUpdate`, which schedules
 * the measurement after the flush. `props` is set by the motion component before each call.
 */
export class MeasureLayout {
    constructor(public props: MeasureProps) {}

    /**
     * Port note: upstream doesn't remove its `animationComplete` listener (a projection node
     * lives as long as its component). Here the measurement is mounted and unmounted when
     * `layout`/`drag` are toggled on the same node, so the listener is removed on unmount.
     */
    private removeAnimationCompleteListener?: VoidFunction

    /**
     * This only mounts projection nodes for components that
     * need measuring, we might want to do it for all components
     * in order to incorporate transforms
     */
    componentDidMount() {
        const { visualElement, layoutGroup, switchLayoutGroup, layoutId } =
            this.props
        const { projection } = visualElement

        if (projection) {
            if (layoutGroup.group) layoutGroup.group.add(projection)

            if (switchLayoutGroup && switchLayoutGroup.register && layoutId) {
                switchLayoutGroup.register(projection)
            }

            if (hasTakenAnySnapshot) {
                projection.root!.didUpdate()
            }

            this.removeAnimationCompleteListener = projection.addEventListener(
                "animationComplete",
                () => {
                    this.safeToRemove()
                }
            )
            projection.setOptions({
                ...projection.options,
                layoutDependency: this.props.layoutDependency,
                onExitComplete: () => this.safeToRemove(),
            })
        }

        globalProjectionState.hasEverUpdated = true
    }

    getSnapshotBeforeUpdate(prevProps: MeasureProps) {
        const { layoutDependency, visualElement, drag, isPresent } = this.props
        const { projection } = visualElement

        if (!projection) return null

        /**
         * TODO: We use this data in relegate to determine whether to
         * promote a previous element. There's no guarantee its presence data
         * will have updated by this point - if a bug like this arises it will
         * have to be that we markForRelegation and then find a new lead some other way,
         * perhaps in didUpdate
         */
        projection.isPresent = isPresent

        if (prevProps.layoutDependency !== layoutDependency) {
            projection.setOptions({
                ...projection.options,
                layoutDependency,
            })
        }

        hasTakenAnySnapshot = true

        if (
            drag ||
            prevProps.layoutDependency !== layoutDependency ||
            layoutDependency === undefined ||
            prevProps.isPresent !== isPresent
        ) {
            projection.willUpdate()
        } else {
            this.safeToRemove()
        }

        if (prevProps.isPresent !== isPresent) {
            if (isPresent) {
                projection.promote()
            } else if (!projection.relegate()) {
                /**
                 * If there's another stack member taking over from this one,
                 * it's in charge of the exit animation and therefore should
                 * be in charge of the safe to remove. Otherwise we call it here.
                 */
                frame.postRender(() => {
                    const stack = projection.getStack()
                    if (!stack || !stack.members.length) {
                        this.safeToRemove()
                    }
                })
            }
        }

        return null
    }

    componentDidUpdate() {
        const { visualElement, layoutAnchor } = this.props
        const { projection } = visualElement
        if (projection) {
            projection.options.layoutAnchor = layoutAnchor

            projection.root!.didUpdate()

            microtask.postRender(() => {
                if (!projection.currentAnimation && projection.isLead()) {
                    this.safeToRemove()
                }
            })
        }
    }

    componentWillUnmount() {
        const {
            visualElement,
            layoutGroup,
            switchLayoutGroup: promoteContext,
        } = this.props
        const { projection } = visualElement

        hasTakenAnySnapshot = true

        this.removeAnimationCompleteListener?.()
        this.removeAnimationCompleteListener = undefined

        if (projection) {
            projection.scheduleCheckAfterUnmount()
            if (layoutGroup && layoutGroup.group)
                layoutGroup.group.remove(projection)
            if (promoteContext && promoteContext.deregister)
                promoteContext.deregister(projection)
        }
    }

    safeToRemove() {
        const { safeToRemove } = this.props
        safeToRemove && safeToRemove()
    }
}
