import { useContext, useState, useEffect, useRef, useCallback } from "react";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { map } from "lodash";

import { Context } from "./_context";
import { useKeyboardInput } from "./_hooks";

// --- Timing constants (keep in sync with Alerts.jsx) ---
const LIVE_FLIP_HALF = 200;        // ms for each half of the flip (hide phase + show phase)
const LIVE_TILE_STAGGER = 75;      // ms between consecutive tiles on a live guess
const HISTORY_FLIP_HALF = 125;     // ms per half for history replay
const HISTORY_TILE_STAGGER = 75;   // ms between consecutive tiles on history replay
export const WIN_BOUNCE_DURATION = 600;
export const WIN_BOUNCE_STAGGER = 75;

// --- Keyframes ---
const tileShake = keyframes`
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
  20%, 40%, 60%, 80% { transform: translateX(6px); }
`;

// Phase 1: tile rotates to 90° (edge-on, invisible) — color is still default
const flipHide = keyframes`
  0% { transform: rotateX(0deg); }
  100% { transform: rotateX(-90deg); }
`;

// Phase 2: tile rotates from 90° back to 0° — color has already changed to status color
const flipShow = keyframes`
  0% { transform: rotateX(-90deg); }
  100% { transform: rotateX(0deg); }
`;

const tileBounce = keyframes`
  0%, 100% { transform: translateY(0); }
  30% { transform: translateY(-20px); }
  50% { transform: translateY(0); }
  70% { transform: translateY(-10px); }
  85% { transform: translateY(0); }
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

  /* Two-phase flip: hide (rotate to 90°) then show (rotate back to 0°) */
  &.flip-hide {
    animation: ${flipHide} var(--flip-half) ease-in forwards;
  }

  &.flip-show {
    animation: ${flipShow} var(--flip-half) ease-out forwards;
  }

  &.bouncing {
    animation: ${tileBounce} var(--bounce-duration) ease-in-out var(--bounce-delay) both;
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

  // Tiles that should display their actual status color (vs. default)
  const [revealedTiles, setRevealedTiles] = useState(new Set());
  // Tiles currently mid-animation: { [key]: 'hide' | 'show' }
  const [animPhase, setAnimPhase] = useState({});
  const [shakeRow, setShakeRow] = useState(null);
  const [bounceRow, setBounceRow] = useState(null);

  const prevBoardRef = useRef(board);
  const prevErrorRef = useRef(error);
  // Tracks whether the initial INITIALIZE_STATE load has been processed
  const isGameLoadedRef = useRef(false);

  // Animate a single row using two-phase flip
  const scheduleFlipAnimation = useCallback(
    (boardRow, rowIndex, isHistory, isWin) => {
      const halfDuration = isHistory ? HISTORY_FLIP_HALF : LIVE_FLIP_HALF;
      const stagger = isHistory ? HISTORY_TILE_STAGGER : LIVE_TILE_STAGGER;

      boardRow.forEach((tile, colIndex) => {
        if (tile.status === "default") return;
        const { key } = tile;
        const startAt = colIndex * stagger;

        // Phase 1: hide
        setTimeout(() => {
          setAnimPhase((prev) => ({ ...prev, [key]: "hide" }));
        }, startAt);

        // Phase 2: reveal status color + show
        setTimeout(() => {
          setRevealedTiles((prev) => new Set([...prev, key]));
          setAnimPhase((prev) => ({ ...prev, [key]: "show" }));
        }, startAt + halfDuration);

        // Done: clear animation phase
        setTimeout(() => {
          setAnimPhase((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }, startAt + halfDuration * 2 + 10);
      });

      // After last tile finishes, trigger win bounce if applicable
      if (isWin) {
        const lastStart = (boardRow.length - 1) * stagger;
        setTimeout(() => {
          setBounceRow(rowIndex);
          setTimeout(
            () => setBounceRow(null),
            WIN_BOUNCE_DURATION + WIN_BOUNCE_STAGGER * 4 + 100
          );
        }, lastStart + halfDuration * 2 + 50);
      }
    },
    []
  );

  // Shake on invalid guess
  useEffect(() => {
    if (!error || prevErrorRef.current === error) return;
    prevErrorRef.current = error;
    setShakeRow(row);
    setTimeout(() => setShakeRow(null), 600);
  }, [error, row]);

  useEffect(() => {
    if (!error) prevErrorRef.current = null;
  }, [error]);

  // Detect board changes: initial load vs. live guess
  useEffect(() => {
    const prevBoard = prevBoardRef.current;
    prevBoardRef.current = board;
    if (prevBoard === board) return;

    const hasNewlyCommitted = board.some((boardRow, rowIndex) =>
      boardRow.some(
        (tile, i) =>
          tile.status !== "default" && prevBoard[rowIndex][i].status === "default"
      )
    );

    if (!hasNewlyCommitted) return;

    if (!isGameLoadedRef.current) {
      // This is the INITIALIZE_STATE update (game just loaded)
      isGameLoadedRef.current = true;

      if (isPastGame) {
        // History replay: animate all committed tiles sequentially
        let idx = 0;
        board.forEach((boardRow) =>
          boardRow.forEach((tile) => {
            if (tile.status === "default") return;
            const { key } = tile;
            const startAt = idx++ * HISTORY_TILE_STAGGER;

            setTimeout(() => {
              setAnimPhase((prev) => ({ ...prev, [key]: "hide" }));
            }, startAt);

            setTimeout(() => {
              setRevealedTiles((prev) => new Set([...prev, key]));
              setAnimPhase((prev) => ({ ...prev, [key]: "show" }));
            }, startAt + HISTORY_FLIP_HALF);

            setTimeout(() => {
              setAnimPhase((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
              });
            }, startAt + HISTORY_FLIP_HALF * 2 + 10);
          })
        );
      } else {
        // Current game resumed: reveal all existing tiles immediately, no animation
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
    const phase = animPhase[key];
    const isRevealed = revealedTiles.has(key);
    const isBouncing = bounceRow === rowIndex;

    // Only show status color once revealed (prevents flash before animation)
    const displayStatus = isRevealed ? status : "default";

    const classNames = [displayStatus];
    const cssVars = { lineHeight: font + "px", fontSize: font + "px" };

    if (phase) {
      classNames.push(`flip-${phase}`);
      cssVars["--flip-half"] = (phase === "hide" ? LIVE_FLIP_HALF : LIVE_FLIP_HALF) + "ms";
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
