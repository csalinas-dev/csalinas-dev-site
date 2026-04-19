import { useContext, useState, useEffect, useRef, useCallback } from "react";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { map } from "lodash";

import { Context } from "./_context";
import { useKeyboardInput } from "./_hooks";

// --- Timing constants (keep in sync with Alerts.jsx) ---
const LIVE_FLIP_DURATION = 400;
const LIVE_TILE_STAGGER = 75;
const HISTORY_FLIP_DURATION = 250;
const HISTORY_TILE_STAGGER = 75;
export const WIN_BOUNCE_DURATION = 600;
export const WIN_BOUNCE_STAGGER = 75;

// --- Keyframes ---
const tileShake = keyframes`
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
  20%, 40%, 60%, 80% { transform: translateX(6px); }
`;

// Each flip keyframe embeds the background-color change at the midpoint so
// the color swap happens while the tile is edge-on (invisible).
const flipAbsent = keyframes`
  0%   { transform: rotateX(0deg);   background-color: var(--selectionBackground); color: var(--foreground); }
  40%  { transform: rotateX(-90deg); background-color: var(--selectionBackground); color: var(--foreground); }
  60%  { transform: rotateX(-90deg); background-color: var(--absentBackground);    color: rgba(204, 204, 204, 0.54); }
  100% { transform: rotateX(0deg);   background-color: var(--absentBackground);    color: rgba(204, 204, 204, 0.54); }
`;

const flipPresent = keyframes`
  0%   { transform: rotateX(0deg);   background-color: var(--selectionBackground); color: var(--foreground); }
  40%  { transform: rotateX(-90deg); background-color: var(--selectionBackground); color: var(--foreground); }
  60%  { transform: rotateX(-90deg); background-color: var(--selector);            color: var(--background); }
  100% { transform: rotateX(0deg);   background-color: var(--selector);            color: var(--background); }
`;

const flipCorrect = keyframes`
  0%   { transform: rotateX(0deg);   background-color: var(--selectionBackground); color: var(--foreground); }
  40%  { transform: rotateX(-90deg); background-color: var(--selectionBackground); color: var(--foreground); }
  60%  { transform: rotateX(-90deg); background-color: var(--comment);             color: var(--foreground); }
  100% { transform: rotateX(0deg);   background-color: var(--comment);             color: var(--foreground); }
`;

const tileBounce = keyframes`
  0%, 100% { transform: translateY(0); }
  30%       { transform: translateY(-20px); }
  50%       { transform: translateY(0); }
  70%       { transform: translateY(-10px); }
  85%       { transform: translateY(0); }
`;

// --- Styled components ---
const Board = styled.div`
  aspect-ratio: 365 / 438;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Row = styled.div`
  display: grid;
  flex: 1;
  gap: 0.5rem;
  grid-template-columns: repeat(5, 1fr);

  &.shaking {
    animation: ${tileShake} 500ms ease-in-out;
  }
`;

const Tile = styled.div`
  align-items: center;
  aspect-ratio: 1 / 1;
  background-color: var(--selectionBackground);
  border-radius: 10%;
  box-shadow: 0.025rem 0.05rem 0.2rem rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  overflow: hidden;
  text-shadow: 1px 1px var(--background);
  user-select: none;

  &.absent {
    background-color: var(--absentBackground);
    color: rgba(204, 204, 204, 0.54);
  }

  &.present {
    background-color: var(--selector);
    color: var(--background);
  }

  &.correct {
    background-color: var(--comment);
  }

  /*
   * Flip animations: longhand properties so CSS custom properties work reliably.
   * fill-mode: both = use 0% keyframe during delay (shows default bg before flip)
   *                  + use 100% keyframe after animation (holds status color until
   *                    the CSS class takes over seamlessly).
   */
  &.flipping-absent {
    animation-name: ${flipAbsent};
    animation-duration: var(--flip-duration);
    animation-timing-function: ease-in-out;
    animation-delay: var(--flip-delay);
    animation-fill-mode: both;
  }

  &.flipping-present {
    animation-name: ${flipPresent};
    animation-duration: var(--flip-duration);
    animation-timing-function: ease-in-out;
    animation-delay: var(--flip-delay);
    animation-fill-mode: both;
  }

  &.flipping-correct {
    animation-name: ${flipCorrect};
    animation-duration: var(--flip-duration);
    animation-timing-function: ease-in-out;
    animation-delay: var(--flip-delay);
    animation-fill-mode: both;
  }

  &.bouncing {
    animation-name: ${tileBounce};
    animation-duration: var(--bounce-duration);
    animation-timing-function: ease-in-out;
    animation-delay: var(--bounce-delay);
    animation-fill-mode: both;
  }
`;

// --- Component ---
const Gameboard = ({ width, height }) => {
  const {
    state: { board, row, error, win, isPastGame },
  } = useContext(Context);
  useKeyboardInput();

  const tileSize = width ? (width - 32) / 5 : (height - 40) / 6;
  const font = tileSize * 0.75;

  // Tiles currently animating: { [key]: { duration, delay } }
  const [animatingTiles, setAnimatingTiles] = useState({});
  // Tiles whose status color should be visible (either revealed by animation or shown immediately)
  const [revealedTiles, setRevealedTiles] = useState(new Set());
  const [shakeRow, setShakeRow] = useState(null);
  const [bounceRow, setBounceRow] = useState(null);

  const prevBoardRef = useRef(board);
  const prevErrorRef = useRef(error);
  // False until the first board change (INITIALIZE_STATE) has been processed.
  // Live guesses only animate when this is true.
  const isGameLoadedRef = useRef(false);

  const scheduleFlipAnimation = useCallback(
    (boardRow, rowIndex, isHistory, isWin) => {
      const duration = isHistory ? HISTORY_FLIP_DURATION : LIVE_FLIP_DURATION;
      const stagger = isHistory ? HISTORY_TILE_STAGGER : LIVE_TILE_STAGGER;

      const newAnims = {};
      boardRow.forEach((tile, colIndex) => {
        if (tile.status === "default") return;
        newAnims[tile.key] = { duration, delay: colIndex * stagger };
      });
      setAnimatingTiles((prev) => ({ ...prev, ...newAnims }));

      // After each tile's animation completes: hand off from animation to CSS class
      boardRow.forEach((tile, colIndex) => {
        if (tile.status === "default") return;
        setTimeout(() => {
          setRevealedTiles((prev) => new Set([...prev, tile.key]));
          setAnimatingTiles((prev) => {
            const next = { ...prev };
            delete next[tile.key];
            return next;
          });
        }, colIndex * stagger + duration);
      });

      if (isWin) {
        const lastTileEnd = (boardRow.length - 1) * stagger + duration;
        setTimeout(() => {
          setBounceRow(rowIndex);
          setTimeout(
            () => setBounceRow(null),
            WIN_BOUNCE_DURATION + WIN_BOUNCE_STAGGER * 4 + 100
          );
        }, lastTileEnd + 50);
      }
    },
    []
  );

  // Shake the current row when an invalid guess is submitted
  useEffect(() => {
    if (!error || prevErrorRef.current === error) return;
    prevErrorRef.current = error;
    setShakeRow(row);
    setTimeout(() => setShakeRow(null), 600);
  }, [error, row]);

  useEffect(() => {
    if (!error) prevErrorRef.current = null;
  }, [error]);

  // Handle board changes: distinguish initial load (INITIALIZE_STATE) from live guesses
  useEffect(() => {
    const prevBoard = prevBoardRef.current;
    prevBoardRef.current = board;
    if (prevBoard === board) return;

    if (!isGameLoadedRef.current) {
      // First board change is always INITIALIZE_STATE (game loading complete).
      // Mark loaded and set up initial tile visibility — then stop.
      isGameLoadedRef.current = true;

      if (isPastGame) {
        // Animate all committed tiles in reading order (W1L1 → W1L2 → … → W6L5)
        let idx = 0;
        const newAnims = {};
        board.forEach((boardRow) =>
          boardRow.forEach((tile) => {
            if (tile.status === "default") return;
            newAnims[tile.key] = {
              duration: HISTORY_FLIP_DURATION,
              delay: idx++ * HISTORY_TILE_STAGGER,
            };
          })
        );
        setAnimatingTiles(newAnims);

        // Hand off each tile after its animation ends
        let i = 0;
        board.forEach((boardRow) =>
          boardRow.forEach((tile) => {
            if (tile.status === "default") return;
            const delay = i++ * HISTORY_TILE_STAGGER;
            setTimeout(() => {
              setRevealedTiles((prev) => new Set([...prev, tile.key]));
              setAnimatingTiles((prev) => {
                const next = { ...prev };
                delete next[tile.key];
                return next;
              });
            }, delay + HISTORY_FLIP_DURATION);
          })
        );
      } else {
        // Resumed current game: show all committed tiles immediately, no animation
        const toReveal = new Set();
        board.forEach((boardRow) =>
          boardRow.forEach((tile) => {
            if (tile.status !== "default") toReveal.add(tile.key);
          })
        );
        setRevealedTiles(toReveal);
      }
      return;
    }

    // Live guess: find the newly committed row and animate it
    board.forEach((boardRow, rowIndex) => {
      const isNewlyCommitted = boardRow.some(
        (tile, i) =>
          tile.status !== "default" && prevBoard[rowIndex][i].status === "default"
      );
      if (isNewlyCommitted) {
        scheduleFlipAnimation(boardRow, rowIndex, false, win === true);
      }
    });
  }, [board, win, isPastGame, scheduleFlipAnimation]);

  const letterToTile = (tile, rowIndex, colIndex) => {
    const { key, letter, status } = tile;
    const anim = animatingTiles[key];
    const isRevealed = revealedTiles.has(key);
    const isBouncing = bounceRow === rowIndex;

    // Show default color until the animation reveals the tile
    const displayStatus = isRevealed ? status : "default";

    const classNames = [displayStatus];
    const cssVars = { lineHeight: font + "px", fontSize: font + "px" };

    if (anim) {
      // Use the actual status for the animation keyframe class even though
      // displayStatus is "default" — the keyframe handles the color reveal
      classNames.push(`flipping-${status}`);
      cssVars["--flip-duration"] = anim.duration + "ms";
      cssVars["--flip-delay"] = anim.delay + "ms";
    } else if (isBouncing) {
      classNames.push("bouncing");
      cssVars["--bounce-duration"] = WIN_BOUNCE_DURATION + "ms";
      cssVars["--bounce-delay"] = colIndex * WIN_BOUNCE_STAGGER + "ms";
    }

    return (
      <Tile key={key} className={classNames.join(" ")} style={cssVars}>
        {letter}
      </Tile>
    );
  };

  return (
    <Board style={{ width, height }}>
      {map(board, (rowTiles, rowIndex) => (
        <Row
          key={rowIndex}
          className={shakeRow === rowIndex ? "shaking" : undefined}
        >
          {rowTiles.map((tile, colIndex) => letterToTile(tile, rowIndex, colIndex))}
        </Row>
      ))}
    </Board>
  );
};

export default Gameboard;
