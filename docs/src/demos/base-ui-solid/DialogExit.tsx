import { motion, toMotionProps } from "@motion-s/solid"
import { Dialog } from "base-ui-solid/dialog"

export default function DialogExit() {
  return (
    <Dialog.Root>
      <Dialog.Trigger class="rounded-full border border-border bg-bg px-4 py-2 text-sm">
        Open dialog
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop
          render={(props, state) => (
            <motion.div
              {...toMotionProps(props)}
              class="fixed inset-0 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: state.open ? 1 : 0 }}
            />
          )}
        />
        <Dialog.Popup
          render={(props, state) => (
            <motion.div
              {...toMotionProps(props)}
              class="fixed top-1/2 left-1/2 w-80 -translate-1/2 rounded-xl bg-bg p-6 text-sm shadow-xl outline-none"
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={
                state.open
                  ? { opacity: 1, filter: "blur(0px)" }
                  : { opacity: 0, filter: "blur(4px)" }
              }
            />
          )}
        >
          <Dialog.Title class="text-base font-medium">
            Delete project?
          </Dialog.Title>
          <Dialog.Description class="mt-2 text-fg-muted">
            This can't be undone.
          </Dialog.Description>
          <div class="mt-6 flex justify-end">
            <Dialog.Close class="rounded-full border border-border px-4 py-2">
              Cancel
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
