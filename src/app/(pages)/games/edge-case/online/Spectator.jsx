"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";

import { getResult, MAX_PLAYERS } from "../_lib";
import { Board } from "../board";
import { Announcer, Endgame, QrCode } from "../components";
import { createPlayers, paletteFor, playerFor } from "../players";
import { joinUrl } from "./RoomCode";

/**
 * The television.
 *
 * This is the "Jackbox on the big screen" view: the whole board, the names in
 * their colours at a size that reads from a sofa, the code, and a QR that drops
 * a phone straight into the game. No controls at all — not a move, not a zoom
 * button, not a rematch. Whoever is looking at this screen is not holding
 * anything they can press it with.
 *
 * It takes no seat. `useRoom({ spectate: true })` watches without joining, so a
 * TV never eats one of the four places, and a player who arrives at a full or
 * already-started room lands here too rather than at an error.
 */

// The board asks for a handler; a spectator's board can never call it, because
// every edge is rendered with `interactive={false}`.
const noop = () => {};

const Screen = styled.div`
  display: flex;
  flex-flow: column nowrap;
  gap: 1rem;
  min-height: 100%;
  padding: 3.5rem 1rem 1rem;
  width: 100%;

  @media (min-width: 900px) {
    padding: 3.5rem 2rem 2rem;
  }
`;

const Layout = styled.div`
  align-items: start;
  display: grid;
  gap: 1.25rem;
  grid-template-columns: 1fr;
  width: 100%;

  /* Board and side panel, side by side, once there is room. The board takes
     whatever is left after the panel, and the panel is sized so a QR is still
     scannable across a living room. */
  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 1fr) 20rem;
  }
`;

const Stage = styled.div`
  margin: 0 auto;
  max-width: min(100%, 78vh);
  width: 100%;
`;

const Side = styled.div`
  display: flex;
  flex-flow: column nowrap;
  gap: 1rem;
  width: 100%;
`;

const Invite = styled.div`
  align-items: center;
  background-color: var(--absentBackground);
  border-radius: 0.75rem;
  display: flex;
  flex-flow: column nowrap;
  gap: 0.6rem;
  padding: 1rem;
  text-align: center;
`;

const Code = styled.div`
  color: var(--parenthesis);
  font-size: clamp(2.5rem, 7vw, 4rem);
  font-weight: 700;
  letter-spacing: 0.28em;
  line-height: 1.1;
  text-indent: 0.28em;
`;

const Caption = styled.p`
  color: var(--absentForeground);
  font-size: 0.95rem;
  line-height: 1.35rem;
  margin: 0;
`;

const Headline = styled.h1`
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  font-weight: 400;
  line-height: 1.2;
  margin: 0;
  text-align: center;

  .slot {
    color: var(--slot);
    font-weight: 700;
  }
`;

const Standings = styled.ul`
  display: flex;
  flex-flow: column nowrap;
  gap: 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Standing = styled.li`
  align-items: center;
  background-color: var(--absentBackground);
  border: 3px solid transparent;
  border-radius: 0.7rem;
  display: flex;
  flex-flow: row nowrap;
  gap: 0.75rem;
  min-width: 0;
  padding: 0.6rem 0.8rem;

  &.active {
    background-color: var(--selectionBackground);
    border-color: var(--slot);
  }

  .chip {
    align-items: center;
    background-color: var(--slot);
    border-radius: 0.45rem;
    color: var(--background);
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 1.4rem;
    font-weight: 700;
    height: 2.4rem;
    justify-content: center;
    width: 2.4rem;
  }

  .name {
    color: var(--slot);
    flex: 1 1 auto;
    font-size: clamp(1.1rem, 2.5vw, 1.6rem);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .score {
    flex: 0 0 auto;
    font-size: clamp(1.3rem, 3vw, 2rem);
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }
`;

const Waiting = styled.div`
  align-items: center;
  display: flex;
  flex: 1 1 auto;
  flex-flow: column nowrap;
  gap: 1rem;
  justify-content: center;
  text-align: center;
`;

/** The QR and the code, with the sentence that tells a room what to do with them. */
const Join = ({ code }) => {
  // `window.location` after mount only: this page is prerendered, and the first
  // client render has to produce the markup the server did.
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(joinUrl(code)), [code]);

  return (
    <Invite>
      <Caption>Scan to join, or go to this site and enter</Caption>
      <Code aria-label={`Game code ${[...code].join(" ")}`} role="img">
        {code}
      </Code>
      {url && <QrCode label={`Scan to join game ${code}`} value={url} />}
    </Invite>
  );
};

export const Spectator = ({ code, players, state }) => {
  const lobby = state?.phase !== "playing" || !state?.game;
  const game = state?.game ?? null;

  // The room's seats, in join order, wearing the names and colours the players
  // actually chose. `createPlayers` is the same builder the hotseat game uses,
  // so the board is handed exactly the shape it already knows.
  const cast = useMemo(
    () =>
      createPlayers(
        players.map((player) => player.slot),
        {
          names: players.map((player) => player.name),
          colors: players.map((player) => player.color),
        }
      ),
    [players]
  );

  const result = useMemo(() => (game ? getResult(game) : null), [game]);

  if (lobby) {
    return (
      <Screen>
        <Waiting>
          <Headline>Edge Case</Headline>
          <Caption>Claim the edge. Close the case.</Caption>
          <Join code={code} />
          <Standings aria-label="Players">
            {players.map((player) => {
              const palette = paletteFor(player.color);

              return (
                <Standing
                  key={player.slot}
                  style={{ "--slot": palette?.color ?? "var(--foreground)" }}
                >
                  <span aria-hidden="true" className="chip">
                    {player.name.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                  <span className="name">{player.name}</span>
                </Standing>
              );
            })}
          </Standings>
          <Caption role="status">
            {players.length === 0
              ? `Waiting for players — up to ${MAX_PLAYERS}.`
              : `${players.length} of ${MAX_PLAYERS} in. Waiting for the host to start…`}
          </Caption>
        </Waiting>
      </Screen>
    );
  }

  const mover = playerFor(cast, game.turn);

  return (
    <Screen>
      <Headline style={{ "--slot": mover.color }}>
        {game.finished ? (
          <>Game over</>
        ) : (
          <>
            <span className="slot">{mover.name}</span> to move
          </>
        )}
      </Headline>

      <Layout>
        <Stage>
          <Board
            controls={false}
            game={game}
            interactive={false}
            onDraw={noop}
            overlay={
              result.finished ? (
                <Endgame game={game} players={cast} result={result} />
              ) : null
            }
            players={cast}
          />
        </Stage>

        <Side>
          <Standings aria-label="Scores">
            {cast.map((player) => (
              <Standing
                className={game.turn === player.slot ? "active" : undefined}
                key={player.slot}
                style={{ "--slot": player.color }}
              >
                <span aria-hidden="true" className="chip">
                  {player.initial}
                </span>
                <span className="name">{player.name}</span>
                <span className="score">{game.scores[player.slot] ?? 0}</span>
              </Standing>
            ))}
          </Standings>

          <Join code={code} />
          <Caption>
            {result.claimed} of {result.boxes} boxes closed
          </Caption>
        </Side>
      </Layout>

      <Announcer game={game} players={cast} result={result} />
    </Screen>
  );
};

export default Spectator;
