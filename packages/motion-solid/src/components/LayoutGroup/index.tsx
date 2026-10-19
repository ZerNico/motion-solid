import type { JSX } from "@solidjs/web"
import { nodeGroup } from "motion-dom"
import {
    children as resolveChildren,
    onCleanup,
    untrack,
    useContext,
} from "solid-js"
import {
    LayoutGroupContext,
    type LayoutGroupContextProps,
} from "../../context/LayoutGroupContext"
import { createLayoutTrigger } from "../../projection/layout-commit"
import {
    LayoutScope,
    LayoutScopeContext,
    useLayoutScope,
} from "../../projection/layout-scope"

type InheritOption = boolean | "id"

export interface Props {
    id?: string
    inherit?: InheritOption
    children?: JSX.Element
}

const shouldInheritGroup = (inherit: InheritOption) => inherit === true
const shouldInheritId = (inherit: InheritOption) =>
    shouldInheritGroup(inherit === true) || inherit === "id"

/**
 * Port note: upstream also provides `forceRender`, which re-renders the group when a child of an
 * `AnimatePresence` inside it has exited, so its siblings take a layout snapshot. Layout snapshots
 * don't depend on rendering here (see `projection/layout-scope.ts`): the group is a layout scope,
 * and adding, removing or reordering its children snapshots it. The `id` and `inherit` props are
 * read once, like upstream.
 */
export function LayoutGroup(props: Props) {
    const layoutGroupContext = useContext(LayoutGroupContext)
    const scope = new LayoutScope(
        useLayoutScope(),
        !shouldInheritGroup(untrack(() => props.inherit) ?? true)
    )
    onCleanup(() => scope.dispose())

    const context = untrack((): LayoutGroupContextProps => {
        const inherit = props.inherit ?? true
        let id = props.id

        const upstreamId = layoutGroupContext.id
        if (shouldInheritId(inherit) && upstreamId) {
            id = id ? upstreamId + "-" + id : upstreamId
        }

        return {
            id,
            group: shouldInheritGroup(inherit)
                ? layoutGroupContext.group || nodeGroup()
                : nodeGroup(),
        }
    })

    const Children = () => {
        const children = resolveChildren(() => props.children)
        createLayoutTrigger(children, () => scope.snapshot(), undefined, {
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.LayoutGroup.layout"
                    : undefined,
        })
        return children as unknown as JSX.Element
    }

    return (
        <LayoutGroupContext value={context}>
            <LayoutScopeContext value={scope}>
                <Children />
            </LayoutScopeContext>
        </LayoutGroupContext>
    )
}
