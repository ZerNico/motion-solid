import { ProgressTimeline } from "motion-dom"
import { ScrollOptionsWithDefaults } from "../types"

declare class ScrollTimeline implements ProgressTimeline {
    constructor(options: ScrollOptions)

    currentTime: null | { value: number }

    cancel?: VoidFunction
}

declare class ViewTimeline implements ProgressTimeline {
    constructor(options: { subject: Element; axis?: string })

    currentTime: null | { value: number }

    cancel?: VoidFunction
}

/**
 * Port note: upstream caches in `Map`s, which keep every container and target alive. Weak maps
 * (with the timeline without a target kept per container) let them be collected.
 */
interface ContainerTimelines {
    self: Record<string, ProgressTimeline>
    targets: WeakMap<Element, Record<string, ProgressTimeline>>
}

const timelineCache = new WeakMap<Element, ContainerTimelines>()

/**
 * Native timelines are only attached to WAAPI animations. Offsets are
 * applied to each animation as a range, so a timeline is shared by every
 * offset.
 */
export function getTimeline({
    container,
    target,
    axis,
}: ScrollOptionsWithDefaults): ProgressTimeline {
    let containerCache = timelineCache.get(container)
    if (!containerCache) {
        containerCache = { self: {}, targets: new WeakMap() }
        timelineCache.set(container, containerCache)
    }

    let targetCache = containerCache.self
    if (target) {
        targetCache = containerCache.targets.get(target)!
        if (!targetCache) {
            targetCache = {}
            containerCache.targets.set(target, targetCache)
        }
    }

    return (targetCache[axis] ||= target
        ? new ViewTimeline({ subject: target, axis })
        : new ScrollTimeline({ source: container, axis } as any))
}
