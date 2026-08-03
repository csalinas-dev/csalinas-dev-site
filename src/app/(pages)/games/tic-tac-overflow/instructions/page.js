"use client";

import styled from "@emotion/styled";
import { map } from "lodash";

import { Comment, Link, Section, String, Title, Var } from "@/components";

import { Glyph } from "../components/Glyph";
import Mark from "../Mark";

const Container = styled(Section)`
  display: flex;
  flex-flow: column nowrap;
  gap: 2rem;

  & > * {
    margin: 0;
  }
`;

const Example = styled.div`
  align-items: center;
  display: flex;
  flex-flow: row wrap;
  gap: 1.5rem;

  & + & {
    margin-top: 1rem;
  }

  p {
    flex: 1 1 16rem;
    font-size: 1.25rem;
    margin: 0;
  }
`;

const Board = styled.div`
  aspect-ratio: 1 / 1;
  display: grid;
  flex: 0 0 auto;
  gap: 0.25rem;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  width: 9rem;

  > div {
    align-items: center;
    aspect-ratio: 1 / 1;
    background-color: var(--selectionBackground);
    border-radius: 10%;
    display: flex;
    justify-content: center;
    padding: 16%;
  }

  .expiring {
    border: 2px dashed var(--absentForeground);

    svg {
      opacity: 0.35;
    }
  }

  .winning {
    background-color: var(--comment);
  }
`;

// [mark, modifier] per cell, reading left to right and top to bottom.
const beforeExpiry = [
  [Mark.X, "expiring"],
  [Mark.O],
  [],
  [],
  [Mark.X],
  [Mark.O],
  [Mark.X],
  [Mark.O],
  [],
];

const afterExpiry = [
  [],
  [Mark.O],
  [Mark.X, "winning"],
  [],
  [Mark.X, "winning"],
  [Mark.O],
  [Mark.X, "winning"],
  [Mark.O],
  [],
];

const ExampleBoard = ({ cells }) => (
  <Board aria-hidden="true">
    {map(cells, ([mark, modifier], index) => (
      <div className={modifier} key={index}>
        {mark && <Glyph mark={mark} />}
      </div>
    ))}
  </Board>
);

export const TicTacOverflowInstructions = () => (
  <Container>
    <Link href="/games/tic-tac-overflow">
      <i className="fas fa-chevron-left" /> Back to Tic-Tac-Overflow
    </Link>
    <Title>Tic-Tac-Overflow</Title>
    <Comment as="h2">How To Play</Comment>
    <String as="h3">
      Tic-tac-toe that never ends in a draw — you only ever own three marks.
    </String>
    {/* The generic names for this variant, kept as visible copy so searches
        for them land here. */}
    <Comment as="p">
      Also known as infinite tic-tac-toe or continuous tic-tac-toe.
    </Comment>
    <ul>
      <li>
        Two players share one device. <strong>X</strong> always moves first,
        then the turn alternates.
      </li>
      <li>
        Each player may keep at most <strong>three</strong> marks on the board.
        Placing a fourth clears that player&apos;s <strong>oldest</strong> mark
        — your opponent&apos;s marks are never touched.
      </li>
      <li>
        The mark that is about to expire is faded and outlined, so you always
        know what your next move costs you. Once you have the hang of it, turn{" "}
        <strong>Hint</strong> off in the toolbar — tracking your own oldest
        mark from memory is the real game.
      </li>
      <li>
        Win by lining up your three surviving marks in a row, column or
        diagonal. There are always empty cells, so nobody can be stalemated —
        play continues until someone wins.
      </li>
      <li>
        Click or tap a cell to play. From the keyboard, tab to the board, move
        with the arrow keys and place with enter or space.
      </li>
    </ul>
    <Var as="h4">Examples</Var>
    <Example>
      <ExampleBoard cells={beforeExpiry} />
      <p>
        It is <strong>X</strong>&apos;s turn and X already has three marks
        down. The faded, outlined mark in the top left is X&apos;s oldest — it
        disappears the moment X plays again.
      </p>
    </Example>
    <Example>
      <ExampleBoard cells={afterExpiry} />
      <p>
        X plays the top right. The old top-left mark vanishes and the three
        surviving <strong>X</strong>s line up on the diagonal, so X wins.
        Nothing <strong>O</strong> owns was disturbed.
      </p>
    </Example>
  </Container>
);

export default TicTacOverflowInstructions;
