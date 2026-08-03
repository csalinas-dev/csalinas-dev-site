import { useContext } from "react";
import styled from "@emotion/styled";

import { Comment } from "@/components";

import { Context, getExpiringCell } from "../context";
import { Glyph } from "./Glyph";

const Container = styled.div`
  align-items: center;
  display: flex;
  flex-flow: column nowrap;
  gap: 0.5rem;
  min-height: 3.5rem;
  text-align: center;
`;

const Headline = styled.div`
  align-items: center;
  display: flex;
  flex-flow: row nowrap;
  font-size: 1.25rem;
  gap: 0.75rem;
  justify-content: center;
  line-height: 1.75rem;

  @media (min-width: 600px) {
    font-size: 1.5rem;
  }

  &.winner {
    color: var(--function);
  }
`;

const Chip = styled.span`
  display: inline-flex;
  height: 1.5rem;
  width: 1.5rem;
`;

const Hint = styled(Comment)`
  font-size: 0.85rem;
  line-height: 1.25rem;
`;

export const Status = () => {
  const { state } = useContext(Context);
  const { turn, winner } = state;
  const expiring = getExpiringCell(state);

  return (
    <Container aria-live="polite" role="status">
      {winner === null ? (
        <>
          <Headline>
            <Chip>
              <Glyph mark={turn} />
            </Chip>
            to move
          </Headline>
          {expiring !== null && (
            <Hint as="small">
              the faded {turn} disappears on this move
            </Hint>
          )}
        </>
      ) : (
        <Headline className="winner">
          {/* The Font Awesome kit swaps this <i> for an <svg> after mount, so
              it needs a wrapper React can safely unmount when the game
              restarts. */}
          <span>
            <i className="fa-solid fa-trophy" />
          </span>
          <Chip>
            <Glyph mark={winner} />
          </Chip>
          wins!
        </Headline>
      )}
    </Container>
  );
};
