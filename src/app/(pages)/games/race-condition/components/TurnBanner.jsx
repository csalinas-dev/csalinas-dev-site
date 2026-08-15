import styled from "@emotion/styled";

import { DrawReason } from "../_lib";

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

  /* A draw belongs to nobody, so the chip stops belonging to somebody. Filled
     with var(--slot) it wore the last mover's colour under a headline saying
     nobody won — the one element left contradicting it. Hollow rather than a
     neutral fill: --absentForeground is translucent and would not carry the
     dark text a filled chip uses. */
  &.draw {
    background-color: transparent;
    border: 0.125rem solid var(--absentForeground);
    color: var(--absentForeground);
  }
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
 * Whose turn it is, in their colour, and which beat of it they are on.
 *
 * A turn here is two decisions, not one — slide an opponent's marble, then place
 * your own — and the sub-line is where the player is told which of them the
 * board is waiting for. That is the difference between a board that teaches the
 * game and one that has to be read about first.
 *
 * Rendered after the game as well as during it, because the engine leaves `turn`
 * with the player who ended it on purpose: the board must never be left without
 * a valid slot, and therefore never without a colour.
 *
 * WHICH IS WHY `player` IS NOT THE WINNER. `player` is only whoever the engine
 * left holding the turn; the winner is read off the board and arrives in
 * `outcome`, derived once in `Game.jsx` and shared with the endgame panel. This
 * banner is the loudest thing on the screen, and it used to take the winner's
 * name, colour and initial from `player` — which is the losing player in the
 * 38.5% of decided games where the press, not the placement, completed the line.
 *
 * A draw is the third case and is said plainly: nobody won, and the banner does
 * not get to imply otherwise by leaving a name up in somebody's colour — chip
 * included.
 *
 * @param {Object} props
 * @param {Object} props.game - The engine state
 * @param {Object} props.player - The player on the clock (or who ended it)
 * @param {Object} props.outcome - `{ winner, lastMover, orbitedIn }`, the shared
 *   reading of how the game ended. All null/false while it is still running.
 * @param {?Object} props.opponent - Whose marbles the mover may slide
 * @param {Object} props.draft - The staged turn, from `useTurnDraft`
 * @param {Boolean} props.spinning - The board is mid-orbit
 * @param {String} [props.hint] - Overrides the sub-line. An online room (#144)
 *   puts "waiting for Alex…" here.
 */
export const TurnBanner = ({
  draft,
  game,
  hint,
  opponent,
  outcome,
  player,
  spinning,
}) => {
  const { lastMover, orbitedIn, winner } = outcome;

  // Whose name, colour and initial the banner wears: the winner once there is
  // one, and until then whoever is on the clock.
  const named = winner ?? player;

  const headline = game.draw
    ? "Draw"
    : winner !== null
      ? `${winner.name} wins`
      : `${player.name} to move`;

  const beat = () => {
    if (game.draw) {
      return game.drawReason === DrawReason.Simultaneous
        ? "Both lines completed on the same press."
        : "The board filled and nothing was found.";
    }

    // The same sentence the panel eight lines below is about to give, from the
    // same `orbitedIn`. Two ways of saying it would be two chances to disagree.
    if (winner !== null) {
      return orbitedIn
        ? `${lastMover.name} turned the board into ${winner.name}'s line.`
        : "Four in a row, after the press.";
    }

    if (spinning) return "The board is turning…";
    if (draft.move !== null) return "Now place your marble.";
    if (draft.source !== null) return "Choose where to slide it.";
    if (draft.moves.length > 0) {
      return `Slide one of ${opponent?.name ?? "your opponent"}'s marbles, or just place.`;
    }

    return "Place a marble.";
  };

  return (
    <Container
      className={game.draw ? "draw" : undefined}
      role="status"
      style={{ "--slot": named.color }}
    >
      <Chip aria-hidden="true" className={game.draw ? "draw" : undefined}>
        {game.draw ? "—" : named.initial}
      </Chip>
      <Copy>
        <Headline style={game.draw ? { color: "var(--foreground)" } : undefined}>
          {headline}
        </Headline>
        <Hint>{hint ?? beat()}</Hint>
      </Copy>
    </Container>
  );
};
