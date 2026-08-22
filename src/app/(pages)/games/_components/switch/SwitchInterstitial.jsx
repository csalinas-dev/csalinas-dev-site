"use client";

import styled from "@emotion/styled";

// The screen between two games.
//
// A switch is one action on the room, and every other client learns about it
// from the stream — so somebody who pressed nothing is about to have their page
// replaced. Nobody's screen may change without saying why, which is the whole
// job of this component. It is an explanation, not a confirmation: there is no
// button, and it unmounts as the destination route arrives underneath it.
//
// Deliberately unnamed ("the room switched", never "Ada switched"). At game
// over any seated player may do this, and carrying an actor through the payload
// would add a field to the core for one sentence; in a lobby the only person
// who can is the host, whose name is already on the roster above.
//
// Shaped like each game's `Panel` so the layout does not shift on the way in.

const Screen = styled.div`
  align-items: center;
  display: flex;
  flex: 1 1 auto;
  flex-flow: column nowrap;
  gap: 1.25rem;
  justify-content: center;
  padding: 3.5rem 1.5rem 1.5rem;
  text-align: center;
  width: 100%;
`;

const Art = styled.span`
  display: block;
  height: 4rem;
  width: 4rem;

  svg {
    display: block;
    height: 100%;
    width: 100%;
  }
`;

const Heading = styled.h2`
  font-size: 1.5rem;
  font-weight: 400;
  line-height: 2rem;
  margin: 0;

  @media (min-width: 600px) {
    font-size: 1.75rem;
  }
`;

const Text = styled.p`
  color: var(--absentForeground);
  line-height: 1.5rem;
  margin: 0;
  max-width: 30rem;
`;

const Code = styled.strong`
  color: var(--parenthesis);
  font-weight: 700;
  letter-spacing: 0.15em;
`;

/**
 * @param {object} props
 * @param {object} props.to   a `presentation()` entry for the destination
 * @param {string} props.code the room code, which comes with you
 */
export const SwitchInterstitial = ({ code, to }) => {
  const { Artwork } = to;

  return (
    <Screen role="status">
      <Art aria-hidden="true">
        <Artwork />
      </Art>
      <Heading>Moving to {to.title}</Heading>
      <Text>
        The room switched games. <Code>{code}</Code> comes with you.
      </Text>
    </Screen>
  );
};

export default SwitchInterstitial;
