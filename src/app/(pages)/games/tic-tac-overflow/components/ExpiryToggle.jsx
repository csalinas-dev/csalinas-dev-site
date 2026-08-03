import { useContext } from "react";
import styled from "@emotion/styled";

import { Context, EXPIRY_PREVIEW_KEY, setExpiryPreview } from "../context";

const Button = styled.button`
  background: none;
  border: none;
  color: var(--vscode);
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  padding: 0;

  &:focus-visible {
    outline: 2px solid var(--var);
    outline-offset: 2px;
  }

  /* Dim the icon when the preview is off, so the toolbar reads at a glance.
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

export const ExpiryToggle = () => {
  const {
    state: { showExpiring },
    dispatch,
  } = useContext(Context);

  const toggle = () => {
    const enabled = !showExpiring;
    dispatch(setExpiryPreview(enabled));
    localStorage.setItem(EXPIRY_PREVIEW_KEY, String(enabled));
  };

  return (
    <Button
      aria-pressed={showExpiring}
      onClick={toggle}
      title="Fade the mark that disappears on the next move"
      type="button"
    >
      <span>
        <i className="fa-regular fa-eye" />
      </span>{" "}
      Hint <State>{showExpiring ? "on" : "off"}</State>
    </Button>
  );
};
