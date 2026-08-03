import { useContext } from "react";
import styled from "@emotion/styled";

import { LEFT, absenceSentence } from "@/lib/realtime/absence";

import { Context } from "../context";

// The per-player strip above the board: which room this is, which colour is
// yours, and anything the connection wants to admit to. Everything it needs is
// already on the context, so it is rendered as <Game>'s banner from inside the
// provider and takes no props but the way out.

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

const You = styled.span`
  align-items: center;
  color: var(--slot);
  display: inline-flex;
  font-weight: 700;
  gap: 0.35rem;

  .chip {
    background-color: var(--slot);
    border-radius: 0.25rem;
    display: inline-block;
    height: 0.85rem;
    width: 0.85rem;
  }
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

// Reconnecting is ordinary and a rejected move is not, but to a player both are
// the same kind of interruption: something is wrong and it is not the board.
const Warning = styled.div`
  color: var(--invalid);
`;

// Somebody else, not the connection — so deliberately not a Warning. Nothing is
// broken; one of the players is briefly away, or has gone home, and the two are
// told apart by tone as much as by wording.
const Absence = styled.div`
  color: var(--absentForeground);

  /* Final, and the board will not move again on its own. */
  &.left {
    color: var(--string);
  }
`;

export const OnlineBar = ({ onLeave }) => {
  const { online, state } = useContext(Context);
  const { code, connected, notice, you, youSlot } = online;

  // Everybody but you who is not here. The turn banner says why the board has
  // stopped when it is the mover; this is for the rest — the third player who
  // dropped two turns ago and will not be answering when their turn comes.
  const absent = (state?.players ?? []).filter(
    (player) => player.slot !== youSlot && player.absence
  );

  return (
    <Container>
      <Row>
        <Item>
          Room <Code>{code}</Code>
        </Item>
        <Item>
          You are{" "}
          <You style={{ "--slot": you.color }}>
            <span aria-hidden="true" className="chip" />
            {you.name}
          </You>
        </Item>
        <Item>
          <Leave onClick={onLeave} type="button">
            Leave
          </Leave>
        </Item>
      </Row>
      {absent.map((player) => (
        // `role="status"` rather than an alert: neither piece of news is an
        // emergency, and an assertive announcement would cut across whatever a
        // screen reader was in the middle of saying about the board.
        <Absence
          className={player.absence === LEFT ? "left" : undefined}
          key={player.slot}
          role="status"
        >
          {absenceSentence(player.name, player.absence)}
        </Absence>
      ))}
      {!connected && <Warning role="status">Reconnecting…</Warning>}
      {notice !== null && <Warning role="alert">{notice}</Warning>}
    </Container>
  );
};
