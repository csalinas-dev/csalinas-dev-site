import styled from "@emotion/styled";

import { absenceTag } from "@/lib/realtime/absence";

import { VisuallyHidden } from "./VisuallyHidden";

const List = styled.ul`
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;

  /* Two columns suits two players and four (as a 2x2) at every width — four
     across a phone-width column truncates every name to "Pur…". Three is the
     odd one out: it gets its own row once there is width for it, rather than
     leaving an orphan on a second line. */
  &.three {
    @media (min-width: 480px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
`;

const Player = styled.li`
  align-items: center;
  background-color: var(--absentBackground);
  border-radius: 0.6rem;
  /* A transparent border, not none: the active player gains a coloured one and
     nothing may shift when they do. */
  border: 2px solid transparent;
  display: flex;
  flex-flow: row nowrap;
  gap: 0.5rem;
  min-width: 0;
  padding: 0.5rem 0.65rem;

  &.active {
    background-color: var(--selectionBackground);
    border-color: var(--slot);
  }
`;

// Colour plus letter, everywhere a player is named — the same pairing the board
// stamps on a claimed box, so the two are matched at a glance.
const Chip = styled.span`
  align-items: center;
  background-color: var(--slot);
  border-radius: 0.35rem;
  color: var(--background);
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 0.9rem;
  font-weight: 700;
  height: 1.6rem;
  justify-content: center;
  width: 1.6rem;
`;

const Name = styled.span`
  color: var(--slot);
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// "away" or "left", beside the name of a player the rest of the table is
// waiting on. Small and grey in both cases — the scoreboard's job is to answer
// "why has nothing happened?" at a glance, not to make an announcement of it.
// Online only: a hotseat player is by definition sitting right there, and their
// descriptors carry no `absence` at all.
const Absence = styled.span`
  color: var(--absentForeground);
  flex: 0 0 auto;
  font-size: 0.75rem;
`;

const Score = styled.span`
  color: var(--foreground);
  flex: 0 0 auto;
  font-size: 1.15rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;

  /* Withheld during the endgame reveal — see below. */
  &.withheld {
    color: var(--absentForeground);
  }
`;

/**
 * Live score, one row per player, in join order.
 *
 * Join order rather than rank: the running order is information too — it is how
 * a player works out who moves after them — and a list that reshuffles itself
 * mid-game is a list nobody can read.
 *
 * Once the board is full this stops printing numbers. The endgame overlay
 * counts every player up from zero at the same rate so the longest-running
 * counter is visibly the winner — and that reveal is worth nothing if the final
 * scores are already sitting above the board. The overlay owns the numbers from
 * the moment the last edge is drawn until the next game starts.
 */
export const Scoreboard = ({ game, players }) => (
  <List aria-label="Scores" className={players.length === 3 ? "three" : undefined}>
    {players.map((player) => {
      const active = game.turn === player.slot;
      const score = game.scores[player.slot] ?? 0;
      const absence = absenceTag(player.absence);

      if (game.finished) {
        return (
          <Player key={player.slot} style={{ "--slot": player.color }}>
            <Chip aria-hidden="true">{player.initial}</Chip>
            <Name>{player.name}</Name>
            {absence && <Absence>{absence}</Absence>}
            {/* Aria-hidden, not just visually muted: the overlay announces the
                full standings once the count lands, and a screen reader should
                not hear a placeholder dash in the meantime. */}
            <Score aria-hidden="true" className="withheld">
              —
            </Score>
          </Player>
        );
      }

      return (
        <Player
          className={active ? "active" : undefined}
          key={player.slot}
          style={{ "--slot": player.color }}
        >
          <Chip aria-hidden="true">{player.initial}</Chip>
          <Name>
            {player.name}
            {active && <VisuallyHidden>, to move</VisuallyHidden>}
          </Name>
          {absence && <Absence>{absence}</Absence>}
          <Score>
            {score}
            <VisuallyHidden> {score === 1 ? "box" : "boxes"}</VisuallyHidden>
          </Score>
        </Player>
      );
    })}
  </List>
);
