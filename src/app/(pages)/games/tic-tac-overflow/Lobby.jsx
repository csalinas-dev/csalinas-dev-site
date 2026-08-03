"use client";

import { useCallback, useState } from "react";
import styled from "@emotion/styled";

import { Link } from "@/components";
import { isValidCode, normalizeCode } from "@/lib/realtime/codes";
import { CODE_LENGTH } from "@/lib/realtime/constants";
import { createRoom } from "@/lib/realtime/useRoom";

import {
  Button,
  Panel,
  PanelActions,
  PanelError,
  PanelHeading,
  PanelText,
} from "./components";
import { TTO_GAME_ID } from "./multiplayer";

// The front door. Two ways to play and nothing else on screen, because the
// only decision here is whether the other player is sitting next to you.
//
// Nothing on this screen touches the network until somebody chooses Online —
// "Same device" is a state change and not a request, which is what keeps the
// game that already shipped working with no server at all.

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

export const Lobby = ({ onOnline, onSameDevice }) => {
  // "pick" is the two-way choice; "join" is the code form. Creating a room has
  // no screen of its own — it is one request and then you are in the room.
  const [view, setView] = useState("pick");
  const [entry, setEntry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const create = useCallback(async () => {
    setBusy(true);
    setError(null);

    const result = await createRoom({ game: TTO_GAME_ID });
    if (result.ok) {
      onOnline(result.code);
      return;
    }

    setBusy(false);
    setError(result.message ?? "Could not start a game. Try again in a moment.");
  }, [onOnline]);

  const join = useCallback(
    (event) => {
      event.preventDefault();
      const code = normalizeCode(entry);
      if (!isValidCode(code)) {
        setError(`A game code is ${CODE_LENGTH} letters and numbers.`);
        return;
      }
      // Whether the room is actually there is the room screen's question; it
      // already has to answer it for a game that expires mid-session.
      onOnline(code);
    },
    [entry, onOnline],
  );

  if (view === "join") {
    return (
      <Panel>
        <PanelHeading>Join a game</PanelHeading>
        <PanelText>Type the code the other player is looking at.</PanelText>
        <Form onSubmit={join}>
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
          {error && <PanelError>{error}</PanelError>}
          <PanelActions>
            <Button
              onClick={() => {
                setView("pick");
                setError(null);
              }}
              type="button"
            >
              Back
            </Button>
            <Button disabled={entry.length < CODE_LENGTH} type="submit">
              Join game
            </Button>
          </PanelActions>
        </Form>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeading>Tic-Tac-Overflow</PanelHeading>
      <PanelText>
        Three marks each. Place a fourth and your oldest one disappears, so
        nobody ever draws.
      </PanelText>

      <Choices>
        <Choice onClick={onSameDevice} type="button">
          <ChoiceTitle>
            <span>
              <i className="fa-solid fa-mobile-screen" />
            </span>{" "}
            Same device
          </ChoiceTitle>
          <ChoiceHint>Pass it back and forth. No connection needed.</ChoiceHint>
        </Choice>
        <Choice disabled={busy} onClick={create} type="button">
          <ChoiceTitle>
            <span>
              <i className="fa-solid fa-globe" />
            </span>{" "}
            {busy ? "Starting…" : "Play online"}
          </ChoiceTitle>
          <ChoiceHint>
            Get a code to share with somebody anywhere else.
          </ChoiceHint>
        </Choice>
      </Choices>

      {error && <PanelError>{error}</PanelError>}

      <PanelActions>
        <Button onClick={() => setView("join")} type="button">
          I have a code
        </Button>
      </PanelActions>

      <PanelText as="div">
        <Link href="/games/tic-tac-overflow/instructions">
          <i className="fa-regular fa-circle-question" /> How to Play
        </Link>
      </PanelText>
    </Panel>
  );
};

export default Lobby;
