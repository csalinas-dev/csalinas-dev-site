import NextImage from "next/image";
import { highlight } from "sugar-high";

import { Link } from "@/components";

// This module must stay a server module — no "use client". @next/mdx aliases
// next-mdx-import-source-file to src/mdx-components in an src/-rooted repo, and
// the components it returns are rendered inside server-rendered post bodies.

const Code = ({ className, children, ...props }) => {
  // Fenced blocks arrive as <pre><code class="language-x">; inline code has no
  // className and is styled by the Article prose theme instead.
  if (!/^language-/.test(className ?? "")) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  // Safe: the input is repo-authored MDX compiled at build time, never user input.
  return (
    <code
      className={className}
      {...props}
      dangerouslySetInnerHTML={{ __html: highlight(String(children).trimEnd()) }}
    />
  );
};

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

export function useMDXComponents(components) {
  return {
    ...components,
    code: Code,
    a: Anchor,
    Image,
  };
}
