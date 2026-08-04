import styled from "@emotion/styled";

const Container = styled.div`
  align-items: center;
  background-color: var(--absentBackground);
  /* The colour bar. A strip of solid slot colour running the height of the
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

  &.draw {
    border-left-color: var(--absentForeground);
  }
`;

const Chip = styled.span`
  align-items: center;
  background-color: var(--slot);
  border-radius: 50%;
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
 * Rendered after the game as well as during it, because the engine leaves
 * `turn` with the player who ended it on purpose — the board must never be left
 * without a valid slot, and therefore never without a colour.
 *
 * A draw is the exception and is said plainly. Nobody won; the banner does not
 * get to imply otherwise by leaving the last mover's name up in their colour.
 *
 * @param {Object} props
 * @param {Object} props.player - The player on the clock (or who ended it)
 * @param {Object} props.game - The engine state
 * @param {String} [props.hint] - Overrides the sub-line. An online room puts
 *   "waiting for Alex…" here.
 */
export const TurnBanner = ({ game, hint, player }) => {
  const headline = game.draw
    ? "Draw"
    : game.winner !== null
      ? `${player.name} wins`
      : `${player.name} to move`;

  return (
    <Container
      className={game.draw ? "draw" : undefined}
      role="status"
      style={{ "--slot": player.color }}
    >
      <Chip aria-hidden="true">{game.draw ? "—" : player.initial}</Chip>
      <Copy>
        <Headline style={game.draw ? { color: "var(--foreground)" } : undefined}>
          {headline}
        </Headline>
        <Hint>
          {hint ??
            (game.draw
              ? "Forty-two pieces, no line."
              : game.winner !== null
                ? `${game.winningLine.length} in a row.`
                : "Four in a row. Nothing found.")}
        </Hint>
      </Copy>
    </Container>
  );
};
