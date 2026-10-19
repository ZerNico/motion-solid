import { Link } from "@tanstack/solid-router"
import { For } from "solid-js"
import { pagePath, sections } from "../pages"

/**
 * The pages of the docs, by section.
 */
export function NavList(props: { onNavigate?: () => void }) {
    return (
        <For each={sections}>
            {(section) => (
                <div class="mb-6">
                    <h2 class="mb-2 text-xs font-semibold tracking-wide text-fg-muted uppercase">
                        {section.title}
                    </h2>
                    <ul class="space-y-0.5">
                        <For each={section.pages}>
                            {(page) => (
                                <li>
                                    <Link
                                        to={pagePath(page)}
                                        class="block rounded-md px-2 py-1 text-sm text-fg-muted hover:bg-surface hover:text-fg"
                                        activeProps={{
                                            class: "bg-surface text-fg font-medium",
                                        }}
                                        onClick={() => props.onNavigate?.()}
                                    >
                                        {page.title}
                                    </Link>
                                </li>
                            )}
                        </For>
                    </ul>
                </div>
            )}
        </For>
    )
}

export function SideNav() {
    return (
        <nav class="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-52 shrink-0 overflow-y-auto py-10 md:block">
            <NavList />
        </nav>
    )
}
