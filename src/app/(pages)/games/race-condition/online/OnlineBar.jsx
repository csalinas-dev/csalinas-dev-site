import { useContext } from "react";
import styled from "@emotion/styled";

import { AWAY, LEFT, absenceSentence } from "@/lib/realtime/absence";

import { Button } from "../components";
import { Context } from "../context";
import { playerFor } from "../players";

// The per-player strip above the board: which room this is, which colour is
// yours, who you are playing, and anything the connection wants to admit to.
// Everything it needs is already on the context, so it is rendered as <Game>'s
// banner from inside the provider and takes no props but the way out.

const Container = styled.div`
  align-items: center;
  display: flex;
  flex-flow: column nowrap;
  font-size: 0.9rem;
  gap: 0.35rem;
  line-height: 1.25rem;
  text-align: center;
`;

const Row = styled.div`
  align-items: center;
  column-gap: 1rem;
  display: flex;
  flex-flow: row wrap;
  justify-content: center;
  row-gap: 0.25rem;
`;

const Item = styled.span`
  align-items: center;
  color: var(--absentForeground);
  display: inline-flex;
  gap: 0.4rem;
`;

const Code = styled.span`
  color: var(--parenthesis);
  font-weight: 700;
  letter-spacing: 0.15em;
`;

// The marble the board will place for you, at the size of a word — and the
// colour is named beside it, because "the cyan one" is not a description a
// monochrome screen or a protanope can act on. The initial is on it for the
// same reason it is on every marble: sixteen of them touch on a 4x4.
const Chip = styled.span`
  align-items: center;
  background-color: ${({ color }) => color};
  border-radius: 50%;
  color: var(--background);
  display: inline-flex;
  font-size: 0.7rem;
  font-weight: 700;
  height: 1.1rem;
  justify-content: center;
  width: 1.1rem;
`;

const Leave = styled.button`
  background: none;
  border: none;
  color: var(--vscode);
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  padding: 0;

  &:focus-visible {
    outline: 2px solid var(--var);
    outline-offset: 2px;
  }
`;

// Reconnecting is ordinary and a refused turn is not, but both are the same
// kind of interruption to a player: something is wrong and it is not the board.
const Warning = styled.div`
  color: var(--invalid);
`;

// The opponent, not the connection — so deliberately not a Warning. Nothing is
// broken here; somebody is either briefly away or has gone home, and the two
// are told apart by tone as much as by wording.
const Absence = styled.div`
  align-items: center;
  display: flex;
  flex-flow: column nowrap;
  gap: 0.5rem;

  /* A blink. Said once, quietly, in the same voice as the rest of the strip. */
  &.away {
    color: var(--absentForeground);
  }

  /* Final. Worth a colour, because the board below it will never move again. */
  &.left {
    color: var(--string);
  }
`;

const Ending = styled(Button)`
  font-size: 0.9rem;
  padding: 0.35rem 0.9rem;
`;

export const OnlineBar = ({ onLeave }) => {
  const { online, state } = useContext(Context);
  const { absence, code, connected, notice, opponent, spectating, youSlot } =
    online;

  // The same descriptor the board draws your marbles from, so the strip and the
  // board cannot end up disagreeing about what colour you are.
  const you = spectating ? null : playerFor(state.players, youSlot);

  return (
    <Container>
      <Row>
        <Item>
          Room <Code>{code}</Code>
        </Item>
        {you ? (
          <>
            <Item>
              You are{" "}
              <Chip aria-hidden="true" color={you.color}>
                {you.initial}
              </Chip>
              {you.colorName}
            </Item>
            <Item>vs {opponent}</Item>
          </>
        ) : (
          <Item>Watching — this room is full</Item>
        )}
        <Item>
          <Leave onClick={onLeave} type="button">
            Leave
          </Leave>
        </Item>
      </Row>
      {absence !== null && (
        // `role="status"` for both: neither is an emergency, and an assertive
        // alert would cut across whatever a screen reader was in the middle of
        // saying about the board.
        <Absence className={absence} role="status">
          <span>{absenceSentence(opponent, absence)}</span>
          {absence === AWAY && (
            <span>The board picks up where it left off.</span>
          )}
          {absence === LEFT && (
            <Ending onClick={onLeave} type="button">
              Back to the menu
            </Ending>
          )}
        </Absence>
      )}
      {!connected && <Warning role="status">Reconnecting…</Warning>}
      {notice !== null && <Warning role="alert">{notice}</Warning>}
    </Container>
  );
};
