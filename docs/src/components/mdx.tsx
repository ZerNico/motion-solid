import { Link } from "@tanstack/solid-router"
import { Dynamic, type JSX } from "@solidjs/web"
import { CopyButton } from "./CopyButton"
import { Demo } from "./Demo"
import { InstallTabs } from "./InstallTabs"
import { Note } from "./Note"

function Anchor(props: JSX.AnchorHTMLAttributes<HTMLAnchorElement>) {
  // Links within the docs navigate without reloading the page.
  return typeof props.href === "string" && props.href.startsWith("/") ? (
    <Link to={props.href as "/"}>{props.children}</Link>
  ) : (
    <a {...props} />
  )
}

function CodeBlock(props: JSX.HTMLAttributes<HTMLPreElement>) {
  let pre!: HTMLPreElement
  return (
    <div class="code not-prose group relative my-6 rounded-xl border border-border">
      <pre ref={pre} {...props} />
      <div class="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <CopyButton text={() => pre.textContent ?? ""} />
      </div>
    </div>
  )
}

function heading(Tag: "h2" | "h3") {
  return (props: JSX.HTMLAttributes<HTMLHeadingElement>) => (
    <Dynamic component={Tag} id={props.id}>
      <a class="anchor" href={`#${props.id}`}>
        {props.children}
      </a>
    </Dynamic>
  )
}

export const mdxComponents = {
  h2: heading("h2"),
  h3: heading("h3"),
  Note,
  a: Anchor,
  pre: CodeBlock,
  Demo,
  InstallTabs,
}
