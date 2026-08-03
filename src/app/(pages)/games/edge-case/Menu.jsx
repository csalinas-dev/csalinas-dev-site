"use client";

import { useCallback, useEffect, useState } from "react";
import styled from "@emotion/styled";

import { isValidCode, normalizeCode } from "@/lib/realtime/codes";
import { CODE_LENGTH } from "@/lib/realtime/constants";
import { createRoom } from "@/lib/realtime/useRoom";

import { MAX_PLAYERS } from "./_lib";
import {
  Button,
  Panel,
  PanelActions,
  PanelError,
  PanelHeading,
  PanelText,
  PrimaryButton,
} from "./components";
import { EDGE_CASE_GAME_ID } from "./multiplayer";
// Straight from the module rather than the `online` barrel: the menu should not
// drag the room screens into its chunk to remember a nickname.
import { readName, rememberName } from "./online/preferences";

// The front door. Four ways in and nothing else on screen:
//
//   same device  the hotseat game, unchanged — a state change, not a request
//   play online  create a room and get a code to share
//   have a code  join somebody else's
//   watch        the same code, on a television, without taking a seat
//
// Nothing here touches the network until one of the last three is chosen, which
// is what keeps the game that already shipped playable with no server at all.

const Choices = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
  width: min(100%, 26rem);

  @media (min-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Choice = styled(Button)`
  display: flex;
  flex-flow: column nowrap;
  gap: 0.35rem;
  padding: 1.25rem 1rem;
  text-align: center;
`;

const ChoiceTitle = styled.span`
  font-size: 1.1rem;
`;

const ChoiceHint = styled.span`
  color: var(--absentForeground);
  font-size: 0.85rem;
  line-height: 1.15rem;
`;

const Form = styled.form`
  align-items: center;
  display: flex;
  flex-flow: column nowrap;
  gap: 1rem;
  width: min(100%, 22rem);
`;

const CodeInput = styled.input`
  background-color: var(--selectionBackground);
  border: 1px solid var(--absentForeground);
  border-radius: 0.5rem;
  color: var(--parenthesis);
  font-family: inherit;
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  padding: 0.5rem 0 0.5rem 0.3em;
  text-align: center;
  text-transform: uppercase;
  width: min(100%, 15rem);

  &:focus-visible {
    outline: 2px solid var(--var);
    outline-offset: 2px;
  }
`;

const NameField = styled.label`
  color: var(--absentForeground);
  display: block;
  font-size: 0.85rem;
  text-align: left;
  width: 100%;

  input {
    background-color: var(--selectionBackground);
    border: 1px solid var(--absentForeground);
    border-radius: 0.5rem;
    color: var(--foreground);
    display: block;
    font-family: inherit;
    font-size: 1rem;
    margin-top: 0.35rem;
    min-height: 2.75rem;
    padding: 0.5rem 0.75rem;
    width: 100%;
  }

  input:focus-visible {
    outline: 2px solid var(--var);
    outline-offset: 2px;
  }
`;

const NameInput = ({ onChange, value }) => (
  <NameField>
    Your name
    <input
      autoComplete="off"
      maxLength={24}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Short is better"
      value={value}
    />
  </NameField>
);

export const Menu = ({ onSameDevice, onSpectate, onPlay }) => {
  const [view, setView] = useState("pick");
  const [entry, setEntry] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Read after mount: the page is prerendered, so the first client render has
  // to produce exactly the markup the server did.
  useEffect(() => setName(readName()), []);

  const go = useCallback(
    (code) => {
      rememberName(name.trim());
      onPlay(code, name.trim());
    },
    [name, onPlay]
  );

  const create = useCallback(async () => {
    setBusy(true);
    setError(null);

    const result = await createRoom({
      game: EDGE_CASE_GAME_ID,
      name: name.trim() || undefined,
    });

    if (result.ok) {
      go(result.code);
      return;
    }

    setBusy(false);
    setError(result.message ?? "Could not start a game. Try again in a moment.");
  }, [go, name]);

  const submitCode = useCallback(
    (event) => {
      event.preventDefault();
      const code = normalizeCode(entry);
      if (!isValidCode(code)) {
        setError(`A game code is ${CODE_LENGTH} letters and numbers.`);
        return;
      }
      // Whether the room is actually there is the room screen's question — it
      // already has to answer it for a game that expires mid-session.
      if (view === "watch") {
        onSpectate(code);
        return;
      }
      go(code);
    },
    [entry, go, onSpectate, view]
  );

  const back = useCallback(() => {
    setView("pick");
    setError(null);
  }, []);

  if (view === "create") {
    return (
      <Panel>
        <PanelHeading>Start a game</PanelHeading>
        <PanelText>
          You get a four-character code to read out. You pick the board size and
          press start once everybody is in.
        </PanelText>
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            create();
          }}
        >
          <NameInput onChange={setName} value={name} />
          {error && <PanelError>{error}</PanelError>}
          <PanelActions>
            <Button onClick={back} type="button">
              Back
            </Button>
            <PrimaryButton disabled={busy} type="submit">
              {busy ? "Starting…" : "Create game"}
            </PrimaryButton>
          </PanelActions>
        </Form>
      </Panel>
    );
  }

  if (view === "join" || view === "watch") {
    const watching = view === "watch";

    return (
      <Panel>
        <PanelHeading>{watching ? "Watch a game" : "Join a game"}</PanelHeading>
        <PanelText>
          {watching
            ? "Put the board on the big screen. You get the whole game and a code for everybody else to scan."
            : "Type the code the host is looking at."}
        </PanelText>
        <Form onSubmit={submitCode}>
          <CodeInput
            aria-label="Game code"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            autoFocus
            maxLength={CODE_LENGTH}
            onChange={(event) => {
              setEntry(normalizeCode(event.target.value));
              setError(null);
            }}
            spellCheck="false"
            value={entry}
          />
          {!watching && <NameInput onChange={setName} value={name} />}
          {error && <PanelError>{error}</PanelError>}
          <PanelActions>
            <Button onClick={back} type="button">
              Back
            </Button>
            <PrimaryButton disabled={entry.length < CODE_LENGTH} type="submit">
              {watching ? "Watch" : "Join game"}
            </PrimaryButton>
          </PanelActions>
        </Form>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeading>Edge Case</PanelHeading>
      <PanelText>
        Claim the edge. Close the case. Draw a line between two dots; close a box
        and it is yours — and you go again.
      </PanelText>

      <Choices>
        <Choice onClick={onSameDevice} type="button">
          <ChoiceTitle>
            <span>
              <i className="fa-solid fa-mobile-screen" />
            </span>{" "}
            Same device
          </ChoiceTitle>
          <ChoiceHint>
            Two to {MAX_PLAYERS} passing one screen. No connection needed.
          </ChoiceHint>
        </Choice>
        <Choice onClick={() => setView("create")} type="button">
          <ChoiceTitle>
            <span>
              <i className="fa-solid fa-globe" />
            </span>{" "}
            Play online
          </ChoiceTitle>
          <ChoiceHint>
            Get a code to share with anybody, anywhere else.
          </ChoiceHint>
        </Choice>
      </Choices>

      {error && <PanelError>{error}</PanelError>}

      <PanelActions>
        <Button onClick={() => setView("join")} type="button">
          I have a code
        </Button>
        <Button onClick={() => setView("watch")} type="button">
          <span>
            <i className="fa-solid fa-tv" />
          </span>{" "}
          Watch on a TV
        </Button>
      </PanelActions>
    </Panel>
  );
};

export default Menu;
