import { useContext, Fragment } from "react";
import styled from "@emotion/styled";

import { Context } from "./context";
import { useError } from "./hooks";
import { Clipboard, PlayAgain } from "./components";

const Alert = styled.div`
  align-items: center;
  border-radius: 1rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5);
  display: flex;
  font-size: 2rem;
  justify-content: center;
  margin: 1rem;
  max-width: 100%;
  padding: 2rem 4rem;
  position: absolute;
  top: 25vh;

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
    gap: 2rem;
  }

  &.win {
    background-color: var(--vscode);
    color: rgba(0, 0, 0, 0.87);
    flex-flow: column nowrap;
    gap: 2rem;
  }
`;

const Alerts = () => {
  const {
    state: { word, win },
  } = useContext(Context);

  const error = useError();

  return (
    <Fragment>
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
          <div style={{ fontSize: "4rem" }}>{word}</div>
          <Clipboard />
          <PlayAgain />
        </Alert>
      )}
      {win === true && (
        <Alert className="win">
          <div>
            <i className="fa-solid fa-trophy"></i>YOU WON!
          </div>
          <Clipboard />
          <PlayAgain />
        </Alert>
      )}
    </Fragment>
  );
};

export default Alerts;
