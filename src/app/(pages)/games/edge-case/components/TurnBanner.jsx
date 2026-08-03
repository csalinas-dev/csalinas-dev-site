import styled from "@emotion/styled";

const Container = styled.div`
  align-items: center;
  background-color: var(--absentBackground);
  /* The colour bar. Four rem of solid slot colour running the width of the
     banner is the answer to "which one am I?" from across a table — a small
     swatch next to a name is not. */
  border-left: 0.4rem solid var(--slot);
  border-radius: 0.6rem;
  display: flex;
  flex-flow: row nowrap;
  gap: 0.75rem;
  min-height: 3.25rem;
  padding: 0.6rem 0.9rem;
  width: 100%;
`;

const Chip = styled.span`
  align-items: center;
  background-color: var(--slot);
  border-radius: 0.4rem;
  color: var(--background);
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 1.15rem;
  font-weight: 700;
  height: 2.1rem;
  justify-content: center;
  width: 2.1rem;
`;

const Copy = styled.div`
  display: flex;
  flex-flow: column nowrap;
  gap: 0.15rem;
  min-width: 0;
`;

const Headline = styled.div`
  color: var(--slot);
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.4rem;
`;

const Hint = styled.small`
  color: var(--absentForeground);
  font-size: 0.8rem;
  line-height: 1.05rem;
`;

/**
 * Whose turn it is, in their colour, at the size the question deserves.
 *
 * Rendered even after the game is over, because the engine leaves `turn` with
 * the final mover on purpose — the board must never be left without a valid
 * slot, and therefore never without a colour.
 */
export const TurnBanner = ({ hint, player, finished, extraTurn }) => (
  <Container role="status" style={{ "--slot": player.color }}>
    <Chip aria-hidden="true">{player.initial}</Chip>
    <Copy>
      <Headline>
        {finished ? `${player.name} closed the last box` : `${player.name} to move`}
      </Headline>
      <Hint>
        {hint ??
          (extraTurn
            ? "Box closed — go again."
            : "Claim the edge. Close the case.")}
      </Hint>
    </Copy>
  </Container>
);
