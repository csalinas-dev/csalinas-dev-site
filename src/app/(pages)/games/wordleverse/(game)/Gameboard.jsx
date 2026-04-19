import { useContext, useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { map } from "lodash";

import { Context } from "./_context";
import { useKeyboardInput } from "./_hooks";

// --- Timing constants (keep in sync with Alerts.jsx) ---
const LIVE_FLIP_DURATION = 400;
const LIVE_TILE_STAGGER = 280;
const HISTORY_FLIP_DURATION = 250;
const HISTORY_TILE_STAGGER = 80;
export const WIN_BOUNCE_DURATION = 600;
export const WIN_BOUNCE_STAGGER = 80;

// --- Keyframes ---
const tileShake = keyframes`
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
  20%, 40%, 60%, 80% { transform: translateX(6px); }
`;

const flipAbsent = keyframes`
  0% {
    transform: rotateX(0deg);
    background-color: var(--selectionBackground);
    color: var(--foreground);
  }
  40% {
    transform: rotateX(-90deg);
    background-color: var(--selectionBackground);
    color: var(--foreground);
  }
  60% {
    transform: rotateX(-90deg);
    background-color: var(--absentBackground);
    color: rgba(204, 204, 204, 0.54);
  }
  100% {
    transform: rotateX(0deg);
    background-color: var(--absentBackground);
    color: rgba(204, 204, 204, 0.54);
  }
`;

const flipPresent = keyframes`
  0% {
    transform: rotateX(0deg);
    background-color: var(--selectionBackground);
    color: var(--foreground);
  }
  40% {
    transform: rotateX(-90deg);
    background-color: var(--selectionBackground);
    color: var(--foreground);
  }
  60% {
    transform: rotateX(-90deg);
    background-color: var(--selector);
    color: var(--background);
  }
  100% {
    transform: rotateX(0deg);
    background-color: var(--selector);
    color: var(--background);
  }
`;

const flipCorrect = keyframes`
  0% {
    transform: rotateX(0deg);
    background-color: var(--selectionBackground);
    color: var(--foreground);
  }
  40% {
    transform: rotateX(-90deg);
    background-color: var(--selectionBackground);
    color: var(--foreground);
  }
  60% {
    transform: rotateX(-90deg);
    background-color: var(--comment);
    color: var(--foreground);
  }
  100% {
    transform: rotateX(0deg);
    background-color: var(--comment);
    color: var(--foreground);
  }
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

  &.shaking > .shake-row {
    animation: ${tileShake} 500ms ease-in-out;
  }
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

  /* Flip reveal animations — use CSS vars for per-tile timing */
  &.flipping-absent {
    animation: ${flipAbsent} var(--flip-duration) ease-in-out var(--flip-delay) backwards;
  }

  &.flipping-present {
    animation: ${flipPresent} var(--flip-duration) ease-in-out var(--flip-delay) backwards;
  }

  &.flipping-correct {
    animation: ${flipCorrect} var(--flip-duration) ease-in-out var(--flip-delay) backwards;
  }

  &.bouncing {
    animation: ${tileBounce} var(--bounce-duration) ease-in-out var(--bounce-delay) both;
  }
`;

// --- Component ---
const Gameboard = ({ width, height }) => {
  const {
    state: { board, row, error, win, loading, isPastGame },
  } = useContext(Context);
  useKeyboardInput();

  const tileSize = width ? (width - 32) / 5 : (height - 40) / 6;
  const font = tileSize * 0.75;

  // { [tile.key]: { duration, delay } }
  const [animatingTiles, setAnimatingTiles] = useState({});
  const [shakeRow, setShakeRow] = useState(null);
  const [bounceRow, setBounceRow] = useState(null);

  const prevBoardRef = useRef(board);
  const prevLoadingRef = useRef(loading);
  const prevErrorRef = useRef(error);

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

      const maxTime = 4 * stagger + duration + 50;
      setTimeout(() => {
        setAnimatingTiles((prev) => {
          const next = { ...prev };
          boardRow.forEach((tile) => delete next[tile.key]);
          return next;
        });

        if (isWin) {
          setBounceRow(rowIndex);
          setTimeout(
            () => setBounceRow(null),
            WIN_BOUNCE_DURATION + WIN_BOUNCE_STAGGER * 4 + 100
          );
        }
      }, maxTime);
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

  // Flip reveal when a valid guess is committed
  useEffect(() => {
    const prevBoard = prevBoardRef.current;
    prevBoardRef.current = board;
    if (prevBoard === board) return;

    board.forEach((boardRow, rowIndex) => {
      const isNewlyCommitted = boardRow.some(
        (tile, i) =>
          tile.status !== "default" && prevBoard[rowIndex][i].status === "default"
      );
      if (isNewlyCommitted) {
        scheduleFlipAnimation(boardRow, rowIndex, false, win === true);
      }
    });
  }, [board, win, scheduleFlipAnimation]);

  // History replay: animate all committed tiles when a past game first loads
  useLayoutEffect(() => {
    if (!loading && prevLoadingRef.current && isPastGame) {
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

      if (idx > 0) {
        setAnimatingTiles(newAnims);
        const maxTime = (idx - 1) * HISTORY_TILE_STAGGER + HISTORY_FLIP_DURATION + 50;
        setTimeout(() => setAnimatingTiles({}), maxTime);
      }
    }
    prevLoadingRef.current = loading;
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const letterToTile = (tile, rowIndex, colIndex) => {
    const { key, letter, status } = tile;
    const anim = animatingTiles[key];
    const isBouncing = bounceRow === rowIndex;

    const classNames = [status];
    const cssVars = {
      lineHeight: font + "px",
      fontSize: font + "px",
    };

    if (anim) {
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
