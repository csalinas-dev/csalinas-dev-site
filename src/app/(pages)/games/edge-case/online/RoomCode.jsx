"use client";

import { useCallback, useState } from "react";
import styled from "@emotion/styled";

import { Button } from "../components";

// The code is the whole invitation, so it is the biggest thing on the screen
// and it is spelled out for a screen reader one letter at a time — "K7F2" read
// as a word helps nobody.

const Container = styled.div`
  align-items: center;
  display: flex;
  flex-flow: column nowrap;
  gap: 0.75rem;
`;

const Code = styled.div`
  color: var(--parenthesis);
  font-size: clamp(3rem, 18vw, 5rem);
  font-weight: 700;
  letter-spacing: 0.3em;
  line-height: 1.1;
  /* letter-spacing pads the right of the final glyph too; pull the block back
     by the same amount so the code still reads as centred. */
  text-indent: 0.3em;
`;

/** The URL a QR code or a copied link points at: this page, in this room. */
export const joinUrl = (code) => {
  if (typeof window === "undefined") return "";
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?room=${code}`;
};

export const RoomCode = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(joinUrl(code));
      setCopied(true);
    } catch {
      // Clipboard access can be refused outright (an insecure origin, a
      // permission prompt dismissed). The code is on screen either way, which
      // is the part that actually matters.
      setCopied(false);
    }
  }, [code]);

  return (
    <Container>
      <Code aria-label={`Game code ${[...code].join(" ")}`} role="img">
        {code}
      </Code>
      <Button onClick={copy} type="button">
        <span>
          <i className="fa-regular fa-copy" />
        </span>{" "}
        {copied ? "Link copied!" : "Copy invite link"}
      </Button>
    </Container>
  );
};
