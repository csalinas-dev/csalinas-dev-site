import NextImage from "next/image";
import { highlight } from "sugar-high";

import { CopyButton, Link } from "@/components";
// Shared with `withHeadingIds`, which does the same job for synced posts.
import { slugifyHeading } from "@/lib/blog/headings";

// This module must stay a server module — no "use client". @next/mdx aliases
// next-mdx-import-source-file to src/mdx-components in an src/-rooted repo, and
// the components it returns are rendered inside server-rendered post bodies.
// It may still *import* client components (CopyButton); that is a normal
// server-imports-client boundary, not a directive on this file.

const Code = ({ className, meta, children, ...props }) => {
  // `meta` is the fence's meta string, put on the element by remarkCodeMeta and
  // read by Pre below. It is destructured out here so it never reaches the DOM
  // as a stray attribute.
  //
  // Fenced blocks arrive as <pre><code class="language-x">; inline code has no
  // className and is styled by the Article prose theme instead.
  if (!/^language-/.test(className ?? "")) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  // An empty fence has no children at all, so String(children) would render the
  // literal word "undefined".
  // Safe: the input is repo-authored MDX compiled at build time, never user input.
  return (
    <code
      className={className}
      {...props}
      dangerouslySetInnerHTML={{
        __html: highlight(String(children ?? "").trimEnd()),
      }}
    />
  );
};

// Wraps a fenced block in a bordered container with a header bar: the filename
// from ```lang title="x.ts" on the left, a copy button on the right.
const Pre = ({ children, ...props }) => {
  const code = children?.props ?? {};
  const title = /title="([^"]*)"/.exec(code.meta ?? "")?.[1] ?? null;
  const raw = String(code.children ?? "");
  return (
    <div className="code-block">
      <div className="code-block-bar">
        {/* The empty span keeps the copy button right-aligned under
            justify-content: space-between when there is no filename. */}
        {title ? <span className="code-block-name">{title}</span> : <span />}
        <CopyButton text={raw} />
      </div>
      <pre {...props}>{children}</pre>
    </div>
  );
};

// Children can be an array containing elements (a heading with inline code in
// it), which is why this recurses rather than reading `children` directly.
const toText = (node) =>
  typeof node === "string" || typeof node === "number"
    ? String(node)
    : Array.isArray(node)
      ? node.map(toText).join("")
      : node?.props?.children
        ? toText(node.props.children)
        : "";

// Gives headings the ids the post's table of contents links to. An incoming id
// wins: remark-gfm's footnotes section arrives as <h2 id="footnote-label"> and
// has to keep it. Two identical headings in one post would collide; no post
// does that.
const Heading2 = ({ id, children, ...props }) => (
  <h2 id={id ?? slugifyHeading(toText(children))} {...props}>
    {children}
  </h2>
);

const Anchor = ({ href = "", children, ...props }) => {
  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
};

// Exposed so a post body can write <Image src={shot} alt="…" /> after importing
// the file, without importing the component. MDX resolves unknown component
// names through this provider. Plain markdown images still render as <img>.
const Image = ({ alt = "", src, ...props }) => (
  <NextImage
    alt={alt}
    src={src}
    sizes="(min-width: 900px) 900px, 100vw"
    placeholder={typeof src === "object" && src.blurDataURL ? "blur" : "empty"}
    style={{ width: "100%", height: "auto" }}
    {...props}
  />
);

// An image with a caption under it. `alt` falls back to the caption, which is
// almost always the right description.
const Figure = ({ src, caption, alt, ...props }) => (
  <figure className="figure">
    <Image src={src} alt={alt ?? caption ?? ""} {...props} />
    {caption && <figcaption>{caption}</figcaption>}
  </figure>
);

// A two-panel before/after block. Markup only — the colours, divider and radius
// live in the Article prose theme with the rest of the post styling.
const Compare = ({ before, after }) => (
  <div className="compare">
    <div className="compare-before">− {before}</div>
    <div className="compare-after">+ {after}</div>
  </div>
);

export function useMDXComponents(components) {
  return {
    ...components,
    code: Code,
    pre: Pre,
    h2: Heading2,
    a: Anchor,
    Image,
    Figure,
    Compare,
  };
}
