"use client";

import { useEffect, useRef, useState } from "react";

const RESET_MS = 1500;

// A text label, not a Font Awesome icon: the FA kit swaps <i> for <svg> in the
// DOM, so an <i> that React later unmounts throws NotFoundError on removeChild
// — and a button that changes its face on click is exactly that shape.
export const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const timeout = useRef(null);

  useEffect(() => () => clearTimeout(timeout.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard access is denied outside a secure context; nothing to
      // recover, and a failed copy should not blow up the post.
      return;
    }
    setCopied(true);
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setCopied(false), RESET_MS);
  };

  // Styled by the Article prose theme's `.copy` descendant rule — this carries
  // no styles of its own so the whole theme stays in one file.
  return (
    <button type="button" className="copy" onClick={copy}>
      {copied ? "copied" : "copy"}
    </button>
  );
};
