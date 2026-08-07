/**
 * Remark plugins for the blog's MDX pipeline. Wired in next.config.mjs.
 * Kept dependency-free on purpose: the tree walk below is all these need,
 * and the blog ships no new packages.
 */

const walk = (node, type, fn) => {
  if (!node || typeof node !== "object") return;
  if (node.type === type) fn(node);
  for (const child of node.children ?? []) walk(child, type, fn);
};

const WORDS_PER_MINUTE = 200;

/**
 * Injects `export const readingTime = <minutes>` into every compiled post, from
 * the word count of the mdast text nodes — i.e. the prose, not the frontmatter
 * ESM and not the contents of code fences (those are `code.value`, never `text`
 * children). The estree is hand-built because @mdx-js serializes an mdxjsEsm
 * node from `data.estree`, not from `value`.
 */
export const remarkReadingTime = () => (tree) => {
  let words = 0;
  walk(tree, "text", (n) => {
    words += n.value.split(/\s+/).filter(Boolean).length;
  });
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));

  tree.children.push({
    type: "mdxjsEsm",
    value: `export const readingTime = ${minutes};`,
    data: {
      estree: {
        type: "Program",
        sourceType: "module",
        body: [
          {
            type: "ExportNamedDeclaration",
            specifiers: [],
            source: null,
            declaration: {
              type: "VariableDeclaration",
              kind: "const",
              declarations: [
                {
                  type: "VariableDeclarator",
                  id: { type: "Identifier", name: "readingTime" },
                  init: { type: "Literal", value: minutes },
                },
              ],
            },
          },
        ],
      },
    },
  });
};

/**
 * mdast-util-to-hast drops a fence's meta string, so ```ts title="x.ts" would
 * otherwise be unreachable from React. hProperties survives the transform and
 * lands as a prop on the <code> element, which the `pre` component reads.
 */
export const remarkCodeMeta = () => (tree) => {
  walk(tree, "code", (node) => {
    if (!node.meta) return;
    node.data = {
      ...node.data,
      hProperties: { ...node.data?.hProperties, meta: node.meta },
    };
  });
};
