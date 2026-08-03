import styled from "@emotion/styled";

const Container = styled.div`
  align-items: center;
  display: flex;
  flex-flow: row nowrap;
  gap: 0.4rem;
  justify-content: flex-end;
  padding-top: 0.5rem;
`;

const Readout = styled.span`
  color: var(--absentForeground);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  margin-right: auto;
`;

const Button = styled.button`
  align-items: center;
  background-color: var(--selectionBackground);
  border: none;
  border-radius: 0.4rem;
  color: var(--foreground);
  cursor: pointer;
  display: inline-flex;
  font-size: 0.85rem;
  height: 2.25rem;
  justify-content: center;
  min-width: 2.25rem;
  padding: 0 0.6rem;

  &:disabled {
    cursor: default;
    opacity: 0.35;
  }

  &:focus-visible {
    outline: 2px solid var(--var);
    outline-offset: 2px;
  }
`;

/**
 * Zoom by button as well as by gesture.
 *
 * Pinch and scroll cover the two common cases, but neither is reachable from a
 * keyboard and neither exists on a trackpad-less desktop with a wheel-less
 * mouse. These are the fallback, and they double as the only obvious signal
 * that the board zooms at all.
 */
export const ZoomControls = ({
  canZoomIn,
  canZoomOut,
  onReset,
  onZoomIn,
  onZoomOut,
  scale,
}) => (
  <Container>
    <Readout aria-hidden="true">
      {scale > 1 ? `${scale.toFixed(1)}x — drag to pan` : "pinch or scroll to zoom"}
    </Readout>
    <Button
      aria-label="Zoom out"
      disabled={!canZoomOut}
      onClick={onZoomOut}
      type="button"
    >
      {/* Wrapped because the Font Awesome kit swaps the <i> for an <svg> after
          mount, and React must own the node it later unmounts. */}
      <span>
        <i className="fa-solid fa-minus" />
      </span>
    </Button>
    <Button
      aria-label="Reset zoom"
      disabled={!canZoomOut}
      onClick={onReset}
      type="button"
    >
      Fit
    </Button>
    <Button
      aria-label="Zoom in"
      disabled={!canZoomIn}
      onClick={onZoomIn}
      type="button"
    >
      <span>
        <i className="fa-solid fa-plus" />
      </span>
    </Button>
  </Container>
);
