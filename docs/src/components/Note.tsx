import type { JSX } from "@solidjs/web"

/**
 * A remark set apart from the text: `<Note>` for context, `<Note type="warning">` for pitfalls.
 */
export function Note(props: {
  type?: "note" | "warning"
  title?: string
  children: JSX.Element
}) {
  return (
    <aside
      class={[
        "note my-6 rounded-xl border px-4 py-3 text-sm",
        props.type === "warning"
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-accent/30 bg-accent/5",
      ]}
    >
      {props.title && <p class="font-semibold">{props.title}</p>}
      {props.children}
    </aside>
  )
}
