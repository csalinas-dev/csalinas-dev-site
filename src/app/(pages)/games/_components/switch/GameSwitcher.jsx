"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import styled from "@emotion/styled";

import { switchOptions } from "./catalog";

// One picker, two homes: framed as its own card in a lobby (the host's, beside
// the other setup decisions) and toggled open under the bar at game over (any
// seated player's). Whoever may start the next game may choose which game it
// is, and `switching.js` is the one place that rule is written — this component
// only draws what `switchOptions` hands it.
//
// Every dimension below is quoted from `edge-case/online/RoomLobby.jsx`'s
// `Card`, `Swatch` and `SizeChoice`, so the picker reads as a control these
// lobbies already had rather than as a new kind of thing.

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

const Bare = styled.div`
  display: flex;
  flex-flow: column nowrap;
  gap: 0.85rem;
  text-align: left;
  width: 100%;
`;

const Label = styled.span`
  color: var(--absentForeground);
  display: block;
  font-size: 0.8rem;
  padding-bottom: 0.35rem;
`;

// The tiles key off THIS box, never off the viewport: the same component
// renders inside a `min(100%, 26rem)` card in one place and inside the bar's
// full-width strip in another, and it must not care which.
const Tiles = styled.div`
  container-type: inline-size;
  width: 100%;
`;

const Row = styled.div`
  align-items: stretch;
  display: flex;
  flex-flow: row wrap;
  gap: 0.5rem;
`;

const Tile = styled.button`
  align-items: center;
  background-color: transparent;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  color: inherit;
  cursor: pointer;
  display: flex;
  flex-flow: column nowrap;
  font-family: inherit;
  gap: 0.35rem;
  min-height: 4.25rem;
  padding: 0.55rem 0.65rem;

  .art {
    display: block;
    flex: 0 0 auto;
    height: 2.5rem;
    width: 2.5rem;
  }

  .art svg {
    display: block;
    height: 100%;
    width: 100%;
  }

  .text {
    align-items: center;
    display: flex;
    flex: 1 1 auto;
    flex-flow: column nowrap;
    gap: 0.35rem;
    max-width: 100%;
    min-width: 0;
  }

  /* Names are fixed strings from the presentation table, never user input, so
     one line and an ellipsis is the whole of the long-name story. */
  .title {
    color: var(--foreground);
    font-size: 0.85rem;
    line-height: 1rem;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* \`margin-top: auto\` is load-bearing: the row stretches the tiles to a
     common height, and this is what puts the captions on one baseline across
     it rather than at three heights under three different titles. */
  .capacity {
    color: var(--absentForeground);
    font-size: 0.7rem;
    line-height: 0.85rem;
    margin-top: auto;
  }

  &:hover:not(:disabled) {
    background-color: var(--selectionBackground);
  }

  &:disabled {
    cursor: default;
  }

  &.busy {
    border-color: var(--component);

    .title {
      color: var(--component);
    }
  }

  &:focus-visible {
    outline: 2px solid var(--var);
    outline-offset: 2px;
  }

  /* Narrow: one full-width row per game, artwork on the left. 3.5rem matches
     \`Swatch\`'s thumb-sized minimum, so the target stays tappable. */
  @container (max-width: 22rem) {
    align-items: center;
    flex-flow: row nowrap;
    gap: 0.6rem;
    min-height: 3.5rem;
    text-align: left;
    width: 100%;

    .art {
      height: 2rem;
      width: 2rem;
    }

    .text {
      align-items: flex-start;
      gap: 0.15rem;
    }

    .capacity {
      margin-top: 0;
    }
  }
`;

const Notice = styled.p`
  color: var(--invalid);
  font-size: 0.8rem;
  line-height: 1.1rem;
  margin: 0;
`;

/**
 * @param {object} props
 * @param {object} props.room     the room payload, straight from `useRoom`
 * @param {(to: string) => Promise<object>} props.onSwitch  `useRoom().switchTo`
 * @param {boolean} [props.framed]     draw the card, or let the caller own it
 * @param {string}  [props.labelId]    an existing group label, when unframed
 * @param {boolean} [props.connected]  false disables every tile
 * @param {boolean} [props.autoFocus]  put the keyboard on the first tile
 * @param {() => void} [props.onClose] present when the picker is dismissible
 */
export const GameSwitcher = ({
  autoFocus = false,
  connected = true,
  framed = true,
  labelId,
  onClose,
  onSwitch,
  room,
}) => {
  const [pending, setPending] = useState(null);
  const [notice, setNotice] = useState(null);
  const firstTile = useRef(null);
  const ownLabelId = useId();

  useEffect(() => {
    if (autoFocus) firstTile.current?.focus();
  }, [autoFocus]);

  const choose = useCallback(
    async (id) => {
      setPending(id);
      setNotice(null);

      let result = await onSwitch(id);

      // 409 means somebody else moved the room between the render we tapped and
      // the request we sent. `switchTo` has already applied what we missed, so
      // the same tap is worth exactly one more try against it — and only one.
      if (!result.ok && result.error === "stale-revision") {
        result = await onSwitch(id);
      }

      if (result.ok) {
        // The interstitial and the route change own the screen from here; the
        // picker is about to unmount, so nothing is cleared.
        return;
      }

      setPending(null);
      setNotice(
        result.error === "stale-revision"
          ? "The room moved on — pick again."
          : (result.message ?? "Could not change the game. Try again."),
      );
    },
    [onSwitch],
  );

  // The list is re-derived on every render rather than memoized, because it has
  // to re-filter the instant a 409 or a 422 body changes the roster.
  const options = switchOptions(room);
  if (options.length === 0) return null;

  const Frame = framed ? Card : Bare;
  const groupId = labelId ?? ownLabelId;

  return (
    <Frame
      onKeyDown={
        onClose
          ? (event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                onClose();
              }
            }
          : undefined
      }
    >
      {!labelId && <Label id={groupId}>Switch game</Label>}
      <Tiles>
        <Row aria-labelledby={groupId} role="group">
          {options.map((option, index) => {
            const busy = pending === option.id;
            const { Artwork } = option;

            return (
              <Tile
                aria-busy={busy || undefined}
                className={busy ? "busy" : undefined}
                disabled={!connected || pending !== null}
                key={option.id}
                onClick={() => choose(option.id)}
                ref={index === 0 ? firstTile : undefined}
                type="button"
              >
                <span aria-hidden="true" className="art">
                  <Artwork />
                </span>
                <span className="text">
                  <span className="title">{option.title}</span>
                  <span className="capacity">
                    {busy ? "Switching…" : option.capacity}
                  </span>
                </span>
              </Tile>
            );
          })}
        </Row>
      </Tiles>
      {notice && (
        <Notice role="alert">{notice}</Notice>
      )}
    </Frame>
  );
};

export default GameSwitcher;
