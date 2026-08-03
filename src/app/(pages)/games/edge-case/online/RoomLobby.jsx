"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";

import { absenceOf, absenceTag } from "@/lib/realtime/absence";

import { GRID_SIZES, MAX_PLAYERS, MIN_PLAYERS } from "../_lib";
import {
  Button,
  Panel,
  PanelActions,
  PanelError,
  PanelHeading,
  PanelText,
  PrimaryButton,
  VisuallyHidden,
} from "../components";
import { PLAYER_PALETTE, paletteFor } from "../players";
import { HOST_SLOT, setSize, start } from "../multiplayer";
import { sendRetrying } from "./actions";
import { rememberName } from "./preferences";
import { RoomCode } from "./RoomCode";
import { updateSeat } from "./seat";

// How long to wait after the last keystroke before telling the room a player's
// new name. Long enough that typing "Christopher" is one request rather than
// eleven; short enough that nobody notices the delay.
const NAME_DEBOUNCE_MS = 500;

const Card = styled.div`
  background-color: var(--absentBackground);
  border-radius: 0.75rem;
  display: flex;
  flex-flow: column nowrap;
  gap: 0.85rem;
  padding: 1rem;
  text-align: left;
  width: min(100%, 26rem);
`;

const Label = styled.label`
  color: var(--absentForeground);
  display: block;
  font-size: 0.8rem;
  padding-bottom: 0.35rem;
`;

const NameInput = styled.input`
  background-color: var(--selectionBackground);
  border: 1px solid var(--absentForeground);
  border-radius: 0.5rem;
  color: var(--foreground);
  font-family: inherit;
  font-size: 1rem;
  min-height: 2.75rem;
  padding: 0.5rem 0.75rem;
  width: 100%;

  &:focus-visible {
    outline: 2px solid var(--var);
    outline-offset: 2px;
  }
`;

const Swatches = styled.div`
  display: flex;
  flex-flow: row wrap;
  gap: 0.5rem;
`;

// A colour someone else holds is not hidden, it is shown as spoken for — the
// point of the lock is that everybody can see who has what.
const Swatch = styled.button`
  align-items: center;
  background-color: transparent;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  flex-flow: column nowrap;
  gap: 0.3rem;
  min-height: 3.5rem;
  padding: 0.4rem 0.55rem;

  .chip {
    background-color: var(--slot);
    border-radius: 0.35rem;
    height: 1.6rem;
    width: 2.4rem;
  }

  .caption {
    color: var(--absentForeground);
    font-size: 0.7rem;
    line-height: 0.85rem;
    max-width: 4.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &[aria-pressed="true"] {
    background-color: var(--selectionBackground);
    border-color: var(--slot);

    .caption {
      color: var(--slot);
    }
  }

  &:disabled {
    cursor: default;

    .chip {
      opacity: 0.3;
    }
  }

  &:focus-visible {
    outline: 2px solid var(--var);
    outline-offset: 2px;
  }
`;

const Roster = styled.ul`
  display: flex;
  flex-flow: column nowrap;
  gap: 0.4rem;
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Seat = styled.li`
  align-items: center;
  display: flex;
  flex-flow: row nowrap;
  gap: 0.6rem;

  .chip {
    align-items: center;
    background-color: var(--slot);
    border-radius: 0.35rem;
    color: var(--background);
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.9rem;
    font-weight: 700;
    height: 1.7rem;
    justify-content: center;
    width: 1.7rem;
  }

  .name {
    color: var(--slot);
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tag {
    color: var(--absentForeground);
    flex: 0 0 auto;
    font-size: 0.8rem;
  }

  /* Somebody whose phone locked itself. Dimmed, never struck through or
     reddened: they are almost always back before anybody has finished reading
     this, and a lobby is where people are *expected* to be doing something
     else. */
  &.away .name {
    opacity: 0.55;
  }
`;

// The host's only lever, and it is deliberately small and grey until it is
// needed. Removing somebody is rare — it exists for a seat stranded by a second
// device, not as a way to run the room.
const SeatAction = styled.button`
  background: none;
  border: 1px solid transparent;
  border-radius: 0.4rem;
  color: var(--absentForeground);
  cursor: pointer;
  flex: 0 0 auto;
  font-family: inherit;
  font-size: 0.8rem;
  min-height: 1.9rem;
  padding: 0.2rem 0.5rem;

  &:hover {
    border-color: var(--absentForeground);
    color: var(--foreground);
  }

  &:focus-visible {
    outline: 2px solid var(--var);
    outline-offset: 2px;
  }

  /* The one that actually does it, once it has been asked for. */
  &.confirm {
    border-color: var(--invalid);
    color: var(--invalid);
  }
`;

const Confirm = styled.div`
  align-items: center;
  display: flex;
  flex: 1 1 auto;
  flex-flow: row wrap;
  gap: 0.4rem;
  justify-content: flex-end;
  min-width: 0;

  .question {
    color: var(--foreground);
    flex: 1 1 auto;
    font-size: 0.85rem;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Sizes = styled.div`
  display: flex;
  flex-flow: row wrap;
  gap: 0.4rem;
`;

const SizeChoice = styled(Button)`
  font-size: 0.9rem;
  min-height: 2.5rem;
  padding: 0.35rem 0.7rem;

  &[aria-pressed="true"] {
    border-color: var(--component);
    color: var(--component);
  }
`;

const Waiting = styled(PanelText)`
  font-size: 0.9rem;
`;

/**
 * One seat in the roster: who they are, whether they are still there, and — for
 * the host, and never for anybody else — a way to clear the seat.
 *
 * The confirm is inline rather than a `window.confirm`, and it is two taps in
 * two places rather than one: removing a player is destructive, this list is
 * thumb-sized on a phone, and "Remove" sits a few millimetres from the name of
 * the person whose game is about to end. The server checks host-ness and lobby-
 * ness again regardless — this control is a convenience, not the rule.
 */
const RosterSeat = ({ canRemove, host, me, onRemove, player }) => {
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef(null);
  const palette = paletteFor(player.color);
  const absence = absenceOf(player);
  const tag = absenceTag(absence);

  // Move the keyboard to the button that does the thing being asked about;
  // otherwise the question appears somewhere a screen reader is not looking.
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  return (
    <Seat
      className={absence ?? undefined}
      style={{ "--slot": palette?.color ?? "var(--foreground)" }}
    >
      <span aria-hidden="true" className="chip">
        {player.name.trim().charAt(0).toUpperCase() || "?"}
      </span>

      {confirming ? (
        <Confirm>
          <span className="question">Remove {player.name}?</span>
          <SeatAction
            className="confirm"
            onClick={() => {
              setConfirming(false);
              onRemove(player);
            }}
            ref={confirmRef}
            type="button"
          >
            Remove
          </SeatAction>
          <SeatAction onClick={() => setConfirming(false)} type="button">
            Keep
          </SeatAction>
        </Confirm>
      ) : (
        <>
          <span className="name">{player.name}</span>
          {host && <span className="tag">host</span>}
          {me && <span className="tag">you</span>}
          {/* Said in words, not only by the dimmed name — a colour and an
              opacity are nothing to a screen reader. */}
          {tag && <span className="tag">{tag}</span>}
          {canRemove && (
            <SeatAction onClick={() => setConfirming(true)} type="button">
              Remove
              <VisuallyHidden> {player.name} from this game</VisuallyHidden>
            </SeatAction>
          )}
        </>
      )}
    </Seat>
  );
};

/**
 * The room before the game: who is here, what they are called, what colour they
 * took, and — for the host alone — how big the board is and when to begin.
 *
 * The host presses Start because nothing else can know when everybody has
 * arrived. Two players is enough to play and four is the most that fit, so
 * "wait until it is full" would strand every three-player game, and "start when
 * the second player joins" would slam the door on the third.
 */
export const RoomLobby = ({
  code,
  connected,
  me,
  onLeave,
  onRemove,
  players,
  refresh,
  send,
  size,
}) => {
  // Seeded once, then owned by the input. Re-seeding it from the snapshot on
  // every stream update would fight the cursor of whoever is typing.
  const [draft, setDraft] = useState(me.name);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const committed = useRef(me.name);

  const host = me.slot === HOST_SLOT;
  const enough = players.length >= MIN_PLAYERS;

  const commit = useCallback(
    async (next) => {
      const { name = draft, color } = next ?? {};
      committed.current = name;
      rememberName(name.trim());

      const result = await updateSeat(code, { name, color });
      if (!result.ok) {
        setNotice(result.message ?? "Could not save that. Try again.");
        return;
      }
      setNotice(null);
      // The stream carries this within a second anyway; asking now is what
      // makes a colour tap feel like a button rather than a suggestion.
      refresh();
    },
    [code, draft, refresh]
  );

  // Debounced, so a name is one request rather than one per keystroke.
  useEffect(() => {
    if (draft === committed.current) return undefined;
    const timer = setTimeout(() => commit({ name: draft }), NAME_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [commit, draft]);

  const taken = new Map(
    players
      .filter((player) => player.slot !== me.slot && player.color)
      .map((player) => [player.color, player.name])
  );

  const choose = useCallback(
    (color) => commit({ name: draft, color }),
    [commit, draft]
  );

  const chooseSize = useCallback(
    async (dots) => {
      const result = await sendRetrying(send, setSize(dots));
      setNotice(result.ok ? null : result.message ?? null);
    },
    [send]
  );

  // The seat goes, the revision bumps, and everybody else's stream carries the
  // shortened roster within the second — including the removed player's, which
  // is how they get told.
  const remove = useCallback(
    async (player) => {
      const result = await onRemove(player.slot);
      setNotice(
        result.ok ? null : (result.message ?? `Could not remove ${player.name}.`)
      );
      if (result.ok) refresh();
    },
    [onRemove, refresh]
  );

  const begin = useCallback(async () => {
    setBusy(true);
    // Whatever is in the name field goes with them into the game — a player who
    // typed a name and never left the field should not lose it to the debounce.
    if (draft !== committed.current) await commit({ name: draft });

    const result = await sendRetrying(send, start());
    if (!result.ok) {
      setBusy(false);
      setNotice(result.message ?? "Could not start the game.");
    }
    // On success this component unmounts — the room's status has left "lobby".
  }, [commit, draft, send]);

  return (
    <Panel>
      <PanelHeading>Edge Case</PanelHeading>
      <PanelText>
        Read the code out, or send the link. Up to {MAX_PLAYERS} play.
      </PanelText>

      <RoomCode code={code} />

      <Card>
        <div>
          <Label htmlFor="edge-case-name">Your name</Label>
          <NameInput
            autoComplete="off"
            id="edge-case-name"
            maxLength={24}
            onBlur={() => draft !== committed.current && commit({ name: draft })}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Short is better"
            value={draft}
          />
        </div>

        <div>
          <Label as="span" id="edge-case-colour">
            Your colour
          </Label>
          <Swatches aria-labelledby="edge-case-colour" role="group">
            {PLAYER_PALETTE.map(({ choice, color, colorName }) => {
              const holder = taken.get(choice);
              const mine = me.color === choice;

              return (
                <Swatch
                  aria-pressed={mine}
                  disabled={Boolean(holder)}
                  key={choice}
                  onClick={() => choose(choice)}
                  style={{ "--slot": color }}
                  type="button"
                >
                  <span aria-hidden="true" className="chip" />
                  <span className="caption">
                    {holder ?? colorName}
                    <VisuallyHidden>
                      {holder
                        ? `${colorName}, taken by ${holder}`
                        : `${colorName}${mine ? ", yours" : ""}`}
                    </VisuallyHidden>
                  </span>
                </Swatch>
              );
            })}
          </Swatches>
        </div>
      </Card>

      <Card>
        <Label as="h2" style={{ fontSize: "0.8rem", margin: 0 }}>
          In this game ({players.length}/{MAX_PLAYERS})
        </Label>
        <Roster>
          {players.map((player) => (
            <RosterSeat
              /* The host's own seat is not removable here — standing up is what
                 the Leave button is for, and it would read as a way to hand the
                 room over, which it is not. */
              canRemove={host && player.slot !== me.slot}
              host={player.slot === HOST_SLOT}
              key={player.slot}
              me={player.slot === me.slot}
              onRemove={remove}
              player={player}
            />
          ))}
        </Roster>
      </Card>

      {host ? (
        <Card>
          <div>
            <Label as="span" id="edge-case-size">
              Board
            </Label>
            <Sizes aria-labelledby="edge-case-size" role="group">
              {GRID_SIZES.map((dots) => (
                <SizeChoice
                  aria-pressed={dots === size}
                  key={dots}
                  onClick={() => chooseSize(dots)}
                  type="button"
                >
                  {dots}&times;{dots} dots
                  <span aria-hidden="true">
                    {" "}
                    ({dots - 1}&times;{dots - 1})
                  </span>
                </SizeChoice>
              ))}
            </Sizes>
          </div>

          <PrimaryButton disabled={!enough || busy} onClick={begin} type="button">
            {busy ? "Starting…" : "Start game"}
          </PrimaryButton>
          {!enough && (
            <Waiting>Edge Case needs at least {MIN_PLAYERS} players.</Waiting>
          )}
        </Card>
      ) : (
        <Waiting role="status">
          {size}&times;{size} dots. Waiting for the host to start…
        </Waiting>
      )}

      {!connected && <PanelError role="status">Reconnecting…</PanelError>}
      {notice && <PanelError role="alert">{notice}</PanelError>}

      <PanelActions>
        <Button onClick={onLeave} type="button">
          Leave
        </Button>
      </PanelActions>
    </Panel>
  );
};

export default RoomLobby;
