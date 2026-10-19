import { createSignal, Show } from "solid-js"
import { NavList } from "./SideNav"

/**
 * The navigation on small screens, where the sidebar is hidden.
 */
export function MobileNav() {
    const [isOpen, setIsOpen] = createSignal(false)

    return (
        <div class="md:hidden">
            <button
                type="button"
                class="rounded-md px-2 py-1 text-sm text-fg-muted hover:text-fg"
                aria-expanded={isOpen() ? "true" : "false"}
                onClick={() => setIsOpen((open) => !open)}
            >
                Menu
            </button>
            <Show when={isOpen()}>
                <nav class="fixed inset-x-0 top-14 bottom-0 overflow-y-auto border-t border-border bg-bg px-6 py-6">
                    <NavList onNavigate={() => setIsOpen(false)} />
                </nav>
            </Show>
        </div>
    )
}
