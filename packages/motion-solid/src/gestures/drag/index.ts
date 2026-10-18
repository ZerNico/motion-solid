import { Feature, type VisualElement } from "motion-dom"
import { noop } from "motion-utils"
import { VisualElementDragControls } from "./VisualElementDragControls"

export class DragGesture extends Feature<HTMLElement> {
    controls: VisualElementDragControls

    removeGroupControls: Function = noop
    removeListeners: Function = noop

    constructor(node: VisualElement<HTMLElement>) {
        super(node)
        this.controls = new VisualElementDragControls(node)
    }

    mount() {
        // If we've been provided a DragControls for manual control over the drag gesture,
        // subscribe this component to it on mount.
        const { dragControls } = this.node.getProps()

        if (dragControls) {
            this.removeGroupControls = dragControls.subscribe(this.controls)
        }

        this.removeListeners = this.controls.addListeners() || noop
    }

    update() {
        const { dragControls } = this.node.getProps()
        const { dragControls: prevDragControls } = this.node.prevProps || {}

        if (dragControls !== prevDragControls) {
            this.removeGroupControls()
            if (dragControls) {
                this.removeGroupControls = dragControls.subscribe(this.controls)
            }
        }
    }

    unmount() {
        this.removeGroupControls()
        this.removeListeners()
        /**
         * Port note: upstream keeps the pan session while dragging, because React 19 can
         * unmount and remount a component during a list reorder while it's being dragged. A
         * Solid component's disposal is final: keeping the session would leak its window
         * listeners and the drag lock (no other element could start a drag) until the pointer
         * is released. So the drag ends here (without `onDragEnd` or a momentum animation).
         */
        this.controls.endDragOnUnmount()
    }
}
