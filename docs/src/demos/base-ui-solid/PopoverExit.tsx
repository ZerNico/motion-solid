import { motion, toMotionProps } from "@motion-s/solid"
import { Popover } from "base-ui-solid/popover"

export default function PopoverExit() {
  return (
    <Popover.Root>
      <Popover.Trigger class="rounded-full border border-border bg-bg px-4 py-2 text-sm">
        Show popover
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8}>
          <Popover.Popup
            render={(props, state) => (
              <motion.div
                {...toMotionProps(props)}
                class="w-56 origin-(--transform-origin) rounded-xl border border-border bg-bg p-4 text-sm shadow-lg outline-none"
                initial={{ opacity: 0, transform: "scale(0.9)" }}
                animate={
                  state.open
                    ? { opacity: 1, transform: "scale(1)" }
                    : { opacity: 0, transform: "scale(0.9)" }
                }
              />
            )}
          >
            <Popover.Title class="font-medium">Notifications</Popover.Title>
            <Popover.Description class="mt-1 text-fg-muted">
              You're all caught up.
            </Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
