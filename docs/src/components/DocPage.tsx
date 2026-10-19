import type { JSX } from "@solidjs/web"
import { For, Show } from "solid-js"
import type { TocEntry } from "../mdx/remark-toc"
import { Pager } from "./Pager"

export function DocPage(props: { toc: TocEntry[]; children: JSX.Element }) {
  return (
    <>
      <main class="min-w-0 flex-1 py-10">
        <article class="prose">{props.children}</article>
        <Pager />
      </main>
      <Show when={props.toc.length}>
        <aside class="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-48 shrink-0 overflow-y-auto py-10 xl:block">
          <h2 class="mb-2 text-xs font-semibold tracking-wide text-fg-muted uppercase">
            On this page
          </h2>
          <ul class="space-y-1 text-sm">
            <For each={props.toc}>
              {(entry) => (
                <li class={entry.depth === 3 ? "pl-3" : undefined}>
                  <a
                    href={`#${entry.id}`}
                    class="block py-0.5 text-fg-muted hover:text-fg"
                  >
                    {entry.title}
                  </a>
                </li>
              )}
            </For>
          </ul>
        </aside>
      </Show>
    </>
  )
}
