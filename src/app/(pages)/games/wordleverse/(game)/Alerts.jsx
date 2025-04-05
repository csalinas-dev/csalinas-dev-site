import { useContext, Fragment } from "react";
import styled from "@emotion/styled";

import Stats from "@wordleverse-history/_components/Stats";

import { Clipboard } from "./_components/Clipboard";
import { PlayAgain } from "./_components/PlayAgain";
import { Context, dismissAlert } from "./_context";
import { useError } from "./_hooks";

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

  &.error {
    background-color: var(--invalid);
    color: rgba(255, 255, 255, 0.87);
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
    state: { word, win, title },
  } = useContext(Context);

  const error = useError();
  const show = error !== null || win !== null;
  return (
    <Fragment>
      {show && (
        <Container>
          {error && (
            <Alert className="error">
              <i className="fa-solid fa-triangle-exclamation"></i> {error}
            </Alert>
          )}
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
              <Stats compact={true} />
            </Alert>
          )}
        </Container>
      )}
    </Fragment>
  );
};

export default Alerts;
