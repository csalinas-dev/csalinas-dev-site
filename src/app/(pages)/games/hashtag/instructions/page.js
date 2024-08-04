"use client";

import Link from "next/link";
import Image from "next/image";
import styled from "@emotion/styled";

import { Comment, Section, String, Title, Var } from "@/components";

import correct from "./correct.png";
import present from "./present.png";
import absent from "./absent.png";

const Container = styled(Section)`
  display: flex;
  flex-flow: column nowrap;
  gap: 2rem;

  & > * {
    margin: 0;
  }
`;

const Example = styled.div`
  & + & {
    margin-top: 1rem;
  }

  img {
    max-width: 100%;
  }

  p {
    margin: 0;
  }
`;

export const HashtagInstructions = () => (
  <Container>
    <Link href="/hashtag">
      <i className="fas fa-chevron-left" /> Back to Hashtag
    </Link>
    <Title>Hashtag</Title>
    <Comment as="h2">How To Play</Comment>
    <String as="h3">
      You have 20 moves to complete the four words and win the game.
    </String>
    <ul>
      <li>Make a move by dragging and dropping tiles to swap them.</li>
      <li>
        The color of the tiles will change to show which letters are close or
        correct.
      </li>
      <li>A new puzzle is released daily at midnight.</li>
    </ul>
    <Var as="h4">Examples</Var>
    <Example>
      <Image
        placeholder="blur"
        src={correct}
        alt="Example of a correct letter within the Hashtag grid."
      />
      <p>
        The <strong>A</strong> is in the word and in the correct position.
      </p>
    </Example>
    <Example>
      <Image
        placeholder="blur"
        src={present}
        alt="Example of a letter that is present in the Hashtag word but in the wrong position."
      />
      <p>
        The <strong>U</strong> is part of that word but in the wrong spot.
      </p>
    </Example>
    <Example>
      <Image
        placeholder="blur"
        src={absent}
        alt="Example of a letter that not in that Hashtag word."
      />
      <p>
        The <strong>A</strong> is not part of those word(s) in any spot.
      </p>
    </Example>
  </Container>
);

export default HashtagInstructions;
