import { motion, toMotionProps } from "@motion-s/solid"
import { Menu } from "base-ui-solid/menu"

export default function PressTrigger() {
  return (
    <Menu.Root>
      <Menu.Trigger
        render={(props) => (
          <motion.button
            {...toMotionProps(props)}
            class="rounded-full border border-border bg-bg px-4 py-2 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileTap={{ scale: 0.9 }}
          />
        )}
      >
        Open menu
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8}>
          <Menu.Popup class="rounded-lg border border-border bg-bg p-1 text-sm shadow-lg outline-none">
            <Menu.Item class="rounded-md px-3 py-1.5 data-highlighted:bg-surface">
              Duplicate
            </Menu.Item>
            <Menu.Item class="rounded-md px-3 py-1.5 data-highlighted:bg-surface">
              Delete
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
