import { useContext, Fragment, useState, useEffect, useRef } from "react";
import styled from "@emotion/styled";

import Stats from "@wordleverse-history/_components/Stats";

import { Clipboard } from "./_components/Clipboard";
import { PlayAgain } from "./_components/PlayAgain";
import { Context, dismissAlert } from "./_context";
import { useError } from "./_hooks";

// Keep in sync with Gameboard.jsx timing constants
const LIVE_FLIP_DURATION = 750;
const LIVE_TILE_STAGGER = 500;
const WIN_BOUNCE_DURATION = 750;
const WIN_BOUNCE_STAGGER = 250;
const HISTORY_FLIP_DURATION = 300;
const HISTORY_TILE_STAGGER = 50;
const MODAL_PAUSE_DELAY = 2000;

// Total time from guess submit until all live flip animations finish
const LIVE_FLIP_TOTAL = LIVE_TILE_STAGGER * 4 + LIVE_FLIP_DURATION;
// Total time from guess submit until win bounce finishes (+50ms matches Gameboard bounce start offset)
const WIN_ANIMATION_TOTAL =
  LIVE_FLIP_TOTAL + 50 + WIN_BOUNCE_STAGGER * 4 + WIN_BOUNCE_DURATION;

const Container = styled.div`
  bottom: 0;
  display: flex;
  justify-content: center;
  left: 0;
  position: fixed;
  right: 0;
  top: 0;
  z-index: 100;

  @media (min-width: 500px) and (min-height: 1000px) {
    padding: 1rem;
    bottom: initial;
    top: 50vh;
    transform: translateY(-50%);
  }
`;

const Alert = styled.div`
  align-items: center;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5);
  display: flex;
  flex-flow: column nowrap;
  font-size: 1.25rem;
  gap: 1rem;
  justify-content: flex-start;
  line-height: 1rem;
  height: 100%;
  width: 100%;
  overflow-y: auto;
  padding: 5rem 2rem 1rem;
  position: relative;

  @media (min-width: 500px) and (min-height: 1000px) {
    padding: 1rem 2rem;
    border-radius: 1rem;
    width: auto;
    height: auto;
    max-height: 75vh;
    max-width: 100vw;
  }

  @media (min-width: 768px) and (min-height: 1000px) {
    font-size: 2rem;
    gap: 2rem;
    padding: 2rem 4rem;
  }

  svg {
    margin-right: 1rem;
  }

  &.loss {
    background-color: var(--module);
    color: rgba(0, 0, 0, 0.87);
  }

  &.win {
    background-color: var(--vscode);
    color: rgba(0, 0, 0, 0.87);
  }
`;

const DismissContainer = styled.span`
  position: absolute;
  top: 5rem;
  right: 2rem;
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1.5rem;
  height: 1.5rem;

  svg {
    margin: 0 !important;
    padding: 0 3px;
  }

  @media (min-width: 768px) and (min-height: 1000px) {
    top: 0.5rem;
    right: 0.5rem;
  }
`;

const Dismiss = () => {
  const { dispatch } = useContext(Context);
  const onClick = () => dispatch(dismissAlert());
  return (
    <DismissContainer onClick={onClick}>
      <i className="fas fa-times" />
    </DismissContainer>
  );
};

const Alerts = () => {
  const {
    state: { word, win, row, title, board, isPastGame },
  } = useContext(Context);

  useError();

  const [showAlert, setShowAlert] = useState(false);
  const timerRef = useRef(null);
  const prevWinRef = useRef(win);

  useEffect(() => {
    if (win === null) {
      setShowAlert(false);
      prevWinRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Only trigger once when win first becomes non-null
    if (prevWinRef.current !== null) return;
    prevWinRef.current = win;

    let delay;
    if (isPastGame) {
      const committedCount = board.flat().filter((t) => t.status !== "default").length;
      delay =
        (committedCount - 1) * HISTORY_TILE_STAGGER + HISTORY_FLIP_DURATION + MODAL_PAUSE_DELAY;
    } else if (win) {
      delay = WIN_ANIMATION_TOTAL + MODAL_PAUSE_DELAY;
    } else {
      delay = LIVE_FLIP_TOTAL + MODAL_PAUSE_DELAY;
    }

    timerRef.current = setTimeout(() => {
      setShowAlert(true);
      timerRef.current = null;
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [win, board, isPastGame]);

  return (
    <Fragment>
      {showAlert && win !== null && (
        <Container>
          {win === false && (
            <Alert className="loss">
              <Dismiss />
              <div>
                <i className="fa-solid fa-face-frown-open"></i>Better luck next
                time!
              </div>
              <div style={{ fontSize: "1.5em", lineHeight: "1em" }}>{word}</div>
              {title === null && <Clipboard />}
              <PlayAgain />
            </Alert>
          )}
          {win === true && (
            <Alert className="win">
              <Dismiss />
              <div>
                <i className="fa-solid fa-trophy"></i>YOU WON!
              </div>
              {title === null && <Clipboard />}
              <PlayAgain />
              <Stats compact={true} currentGame={{ win: true, guessCount: row + 1 }} />
            </Alert>
          )}
        </Container>
      )}
    </Fragment>
  );
};

export default Alerts;
