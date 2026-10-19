/**
 * MDX's map of default components holds tag names as strings, which React accepts as components.
 * Solid needs functions for member JSX tags, so each one is wrapped. MDX also spells some
 * attributes the React way, even with Solid as the JSX import source.
 */
export function recmaSolidComponents() {
  return (tree: unknown) => walk(tree)
}

const attributeNames: Record<string, string> = {
  className: "class",
  htmlFor: "for",
  tabIndex: "tabindex",
}

function walk(node: any) {
  if (!node || typeof node !== "object") return
  if (node.type === "JSXAttribute" && node.name.type === "JSXIdentifier") {
    node.name.name = attributeNames[node.name.name] ?? node.name.name
  }
  if (
    node.type === "VariableDeclarator" &&
    node.id?.name === "_components" &&
    node.init?.type === "ObjectExpression"
  ) {
    for (const property of node.init.properties) {
      if (
        property.type === "Property" &&
        typeof property.value?.value === "string"
      ) {
        property.value = nativeComponent(property.value.value)
      }
    }
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(walk)
    else walk(value)
  }
}

/**
 * `(props) => <tag {...props} />`
 */
const nativeComponent = (tag: string) => ({
  type: "ArrowFunctionExpression",
  params: [{ type: "Identifier", name: "props" }],
  expression: true,
  async: false,
  body: {
    type: "JSXElement",
    openingElement: {
      type: "JSXOpeningElement",
      name: { type: "JSXIdentifier", name: tag },
      selfClosing: true,
      attributes: [
        {
          type: "JSXSpreadAttribute",
          argument: { type: "Identifier", name: "props" },
        },
      ],
    },
    closingElement: null,
    children: [],
  },
})
