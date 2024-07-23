"use client";

import styled from "@emotion/styled";
import { Link } from "react-router-dom";
import { Fragment } from "react";

import {
  Comment,
  Function,
  Parenthesis,
  Section,
  String,
  Title,
  Var,
} from "@/components";

import correct from "./correct.png";
import present from "./present.png";
import absent from "./absent.png";
import doublePresent from "./double-present.png";
import doubleAbsent from "./double-absent.png";
import concede from "./concede.png";

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

export const WordleverseInstructions = () => (
  <Fragment>
    <Container>
      <Link to="/wordleverse">
        <i className="fas fa-chevron-left" /> Back to Wordleverse
      </Link>
      <Title>Wordleverse</Title>
      <Comment as="h2">How To Play</Comment>
      <String as="h3">Guess the word within 6 attempts.</String>
      <ul>
        <li>Each guess must be a valid 5-letter word.</li>
        <li>
          The color of the tiles will change to show how close your guess was to
          the correct word.
        </li>
        <li>A new puzzle is released daily at midnight.</li>
      </ul>
      <Var as="h4">Examples</Var>
      <Example>
        <img
          src={correct}
          alt="Example of a correct letter within a Wordleverse guess."
        />
        <p>
          The <strong>A</strong> is in the word and in the correct position.
        </p>
      </Example>
      <Example>
        <img
          src={present}
          alt="Example of a letter that is present in a Wordleverse guess."
        />
        <p>
          The <strong>U</strong> is in the word but in the wrong spot.
        </p>
      </Example>
      <Example>
        <img
          src={absent}
          alt="Example of a letter that not in a Wordleverse guess."
        />
        <p>
          The <strong>A</strong> is not in the word in any spot.
        </p>
      </Example>
      <Example>
        <img
          src={doublePresent}
          alt="Example of double letters, one correct and one in the wrong spot."
        />
        <p>
          The word contains two <strong>S</strong>'s. The first is correct, the
          second is in the wrong spot.
        </p>
      </Example>
      <Example>
        <img
          src={doubleAbsent}
          alt="Example of double letters, one correct and one absent."
        />
        <p>
          The word contains only one <strong>S</strong>. The first{" "}
          <strong>S</strong> is in the correct position, the second{" "}
          <strong>S</strong> is not in the word (because there's only one{" "}
          <strong>S</strong>).
        </p>
      </Example>
    </Container>
    <Container>
      <Comment as="h2">Expert Mode</Comment>
      <p>
        Before submitting your first guess, you may enable or disable{" "}
        <String>Expert Mode</String>. To toggle, click on the expert mode
        function (in yellow) at the top of the screen. It looks like this:
      </p>
      <div style={{ marginLeft: "3rem" }}>
        <Function>expertMode</Function>
        <Parenthesis>{"("}</Parenthesis>
        <span>true</span>
        <Parenthesis>{")"}</Parenthesis>
      </div>
      <String as="h3">What is Expert Mode?</String>
      <p>
        Expert mode requires that every guessed word uses all of the previous
        hints revealed from prior guesses. This mode will not let you submit a
        guess unless each letter is valid and the word is still in the
        dictionary.
      </p>
      <Var as="h4">What is a valid letter?</Var>
      <ul>
        <li>
          If the letter was previously revealed <String>absent</String>, it
          cannot be used in any further guesses.
        </li>
        <li>
          If the letter was previously revealed <String>correct</String>, it
          must be placed in that same correct position for every guess
          thereafter.
        </li>
        <li>
          If the letter was previously revealed <String>present</String>,
          further guesses must contain that letter, but it cannot be placed in
          the same position as before.
        </li>
      </ul>
      <String as="h3">I give up!</String>
      <p>
        This game mode can be difficult. If at any point, you cannot think of
        any more words and you wish to concede, just type:
      </p>
      <Example>
        <img
          src={concede}
          alt="If you wish to concede, type IQUIT to forfeit and reveal the word."
        />
      </Example>
    </Container>
  </Fragment>
);
