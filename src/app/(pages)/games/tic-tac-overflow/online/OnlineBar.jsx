import { useContext } from "react";
import styled from "@emotion/styled";

import { Glyph } from "../components";
import { Context } from "../context";

// The per-player strip above the board: which room this is, which mark is
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

const Chip = styled.span`
  display: inline-flex;
  height: 1.1rem;
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

// Reconnecting is ordinary and a rejected move is not, but both are the same
// kind of interruption to a player: something is wrong and it is not the board.
const Warning = styled.div`
  color: var(--invalid);
`;

export const OnlineBar = ({ onLeave }) => {
  const { online } = useContext(Context);
  const { code, connected, mark, notice, opponent, spectating } = online;

  return (
    <Container>
      <Row>
        <Item>
          Room <Code>{code}</Code>
        </Item>
        {spectating ? (
          <Item>Watching — this room is full</Item>
        ) : (
          <>
            <Item>
              You are
              <Chip>
                <Glyph mark={mark} />
              </Chip>
            </Item>
            <Item>vs {opponent}</Item>
          </>
        )}
        <Item>
          <Leave onClick={onLeave} type="button">
            Leave
          </Leave>
        </Item>
      </Row>
      {!connected && <Warning role="status">Reconnecting…</Warning>}
      {notice !== null && <Warning role="alert">{notice}</Warning>}
    </Container>
  );
};
