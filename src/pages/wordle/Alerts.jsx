import { useContext, Fragment } from "react";
import styled from "@emotion/styled";

import { Context } from "./context";
import { useError } from "./hooks";
import { Clipboard, PlayAgain } from "./components";

const Container = styled.div`
  display: flex;
  justify-content: center;
  left: 0;
  padding: 1rem;
  position: fixed;
  right: 0;
  top: 25vh;
  z-index: 100;
`;

const Alert = styled.div`
  align-items: center;
  border-radius: 1rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5);
  display: flex;
  flex-flow: row nowrap;
  font-size: 1.25rem;
  justify-content: center;
  line-height: 1rem;
  max-width: 100vw;
  padding: 1rem 2rem;
  gap: 1rem;

  @media (min-width: 768px) {
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
    flex-flow: column nowrap;
  }

  &.win {
    background-color: var(--vscode);
    color: rgba(0, 0, 0, 0.87);
    flex-flow: column nowrap;
  }
`;

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
              <div>
                <i className="fa-solid fa-trophy"></i>YOU WON!
              </div>
              {title === null && <Clipboard />}
              <PlayAgain />
            </Alert>
          )}
        </Container>
      )}
    </Fragment>
  );
};

export default Alerts;
