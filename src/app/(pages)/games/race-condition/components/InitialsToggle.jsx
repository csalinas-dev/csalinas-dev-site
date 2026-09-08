import { useContext } from "react";
import styled from "@emotion/styled";

import { rememberPieceInitials } from "@/lib/pieceInitials";

import { Context } from "../context";

const Button = styled.button`
  background: none;
  border: none;
  color: var(--vscode);
  cursor: pointer;
  flex: 0 0 auto;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  /* The same tap target as the Restart button beside it. Text alone is 16px
     tall, which is under WCAG 2.2 SC 2.5.8 — a poor thing for the one control
     on this screen that exists for accessibility. It costs no layout: Restart
     already sets the toolbar's height. */
  min-height: 2rem;
  padding: 0;
  white-space: nowrap;

  &:focus-visible {
    outline: 2px solid var(--var);
    outline-offset: 2px;
  }

  /* Dim the icon when the initials are off, so the toolbar reads at a glance.
     The icon class itself never changes — the Font Awesome kit swaps <i> for
     <svg> after mount, and React can't reliably re-style a node it no longer
     owns. */
  &[aria-pressed="false"] i,
  &[aria-pressed="false"] svg {
    opacity: 0.4;
  }
`;

const State = styled.span`
  color: var(--foreground);
`;

// Shows or hides the initial on this browser's marbles, and nothing else. The
// preference is shared with Connect 404 and remembered per browser; it never
// reaches the room, so the other player's board does not move.
export const InitialsToggle = () => {
  const { setShowInitials, showInitials } = useContext(Context);

  const toggle = () => {
    const enabled = !showInitials;
    setShowInitials(enabled);
    rememberPieceInitials(enabled);
  };

  return (
    <Button
      aria-pressed={showInitials}
      onClick={toggle}
      title="Stamp each marble with its player's initial"
      type="button"
    >
      {/* The Font Awesome kit replaces this <i> with an <svg> after mount, so it
          lives in a wrapper React owns — otherwise unmounting a button React no
          longer recognises throws. */}
      <span>
        <i className="fa-solid fa-font" />
      </span>{" "}
      Initials <State>{showInitials ? "on" : "off"}</State>
    </Button>
  );
};
