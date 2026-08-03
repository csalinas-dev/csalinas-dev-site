"use client";

import { useEffect, useId, useState } from "react";
import styled from "@emotion/styled";
import { Box, Typography } from "@mui/material";

import { Comment, Link, Numeric } from "@/components";

// Results pulled from my 16Personalities profile (Turbulent Advocate, INFJ-T).
// `pct` is the dominant pole's share; the opposing pole gets the remainder.
// Aspect names follow 16Personalities' current wording (Energy is the
// Introverted/Extraverted axis, Mind is the Intuitive/Observant one).
//
// `detail` describes what the characteristic means in general, not what it
// says about me — the numbers are the personal part, and they speak for
// themselves.
const TRAITS = [
  {
    aspect: "Energy",
    trait: "Introverted",
    opposite: "Extraverted",
    pct: 81,
    color: "var(--var)",
    detail:
      "Introverted people recharge in the quiet and tend to prefer a handful of deep conversations to a room full of small talk.",
  },
  {
    aspect: "Mind",
    trait: "Intuitive",
    opposite: "Observant",
    pct: 51,
    color: "var(--function)",
    detail:
      "Intuitive people are imaginative and open-minded, drawn to hidden meanings and distant possibilities over what is immediately in front of them.",
  },
  {
    aspect: "Nature",
    trait: "Feeling",
    opposite: "Thinking",
    pct: 53,
    color: "var(--type)",
    detail:
      "Feeling people weigh empathy, harmony, and how a decision lands on people right alongside the cold logic of it.",
  },
  {
    aspect: "Tactics",
    trait: "Judging",
    opposite: "Prospecting",
    pct: 75,
    color: "var(--module)",
    detail:
      "Judging people are decisive, thorough, and organized — they plan the work, work the plan, and prefer closure to open loops.",
  },
  {
    aspect: "Identity",
    trait: "Turbulent",
    opposite: "Assertive",
    pct: 60,
    color: "var(--regex)",
    detail:
      "Turbulent people are success-driven perfectionists, more self-conscious and more sensitive to stress than their Assertive counterparts.",
  },
];

const ADVOCATE_URL = "https://www.16personalities.com/infj-personality";

const Title = ({ children }) => (
  <Typography variant="h4" component="h2" gutterBottom>
    <Comment style={{ fontWeight: "bold" }}>{children}</Comment>
  </Typography>
);

const Traits = styled.div`
  display: flex;
  flex-flow: column nowrap;
  gap: 0.5rem;
  margin: 2rem 0 1rem;
`;

const Trait = styled.div`
  border: 1px solid transparent;
  border-radius: 0.5rem;
  transition: background-color 150ms ease-in-out, border-color 150ms ease-in-out;

  &[data-open="true"] {
    background-color: var(--selectionBackground);
    border-color: rgba(255, 255, 255, 0.08);
  }
`;

// The whole bar is the hit target: hover, tap and keyboard focus all reveal the
// detail panel below it, so the copy is never hover-only.
const Toggle = styled.button`
  appearance: none;
  background: none;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: block;
  font: inherit;
  padding: 0.75rem;
  text-align: left;
  width: 100%;

  &:focus-visible {
    border-radius: 0.5rem;
    outline: 2px solid var(--component);
    outline-offset: -2px;
  }
`;

const Heading = styled.span`
  align-items: baseline;
  display: flex;
  flex-flow: row wrap;
  font-size: 1rem;
  gap: 0.25rem 1rem;
  justify-content: space-between;
`;

const Score = styled.span`
  display: inline-flex;
  gap: 0.5rem;
  white-space: nowrap;
`;

const Track = styled.span`
  background-color: var(--selectionBackground);
  border-radius: 999px;
  display: block;
  height: 0.625rem;
  margin: 0.625rem 0 0.375rem;
  overflow: hidden;
  width: 100%;
`;

const Fill = styled.span`
  border-radius: inherit;
  display: block;
  height: 100%;
  transition: width 800ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Poles = styled.span`
  display: flex;
  font-size: 0.8125rem;
  gap: 1rem;
  justify-content: space-between;
`;

const Opposite = styled.span`
  color: var(--muted);
  text-align: right;
`;

// Deliberately a div, not a p — the parent About section forces every p to
// 1.5rem, which is far too loud for a supporting caption.
const Detail = styled.div`
  color: var(--muted);
  font-size: 1rem;
  line-height: 1.5;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  padding: 0 0.75rem;
  transition: max-height 250ms ease-in-out, opacity 200ms ease-in-out,
    padding-bottom 250ms ease-in-out;

  &[data-open="true"] {
    max-height: 16rem;
    opacity: 1;
    padding-bottom: 0.75rem;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const TraitBar = ({ aspect, trait, opposite, pct, color, detail, grown }) => {
  const detailId = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Tapping pins the panel open so touch users aren't stuck chasing :hover.
  const [pinned, setPinned] = useState(false);
  const open = hovered || focused || pinned;

  return (
    <Trait
      data-open={open}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Toggle
        type="button"
        aria-controls={detailId}
        aria-expanded={open}
        onBlur={() => setFocused(false)}
        onClick={() => setPinned((prev) => !prev)}
        // Only keyboard focus opens the panel; a mouse click that happens to
        // focus the button would otherwise fight the pin toggle.
        onFocus={(e) => setFocused(e.currentTarget.matches(":focus-visible"))}
      >
        <Heading>
          <Comment>{aspect}</Comment>
          <Score>
            <span style={{ color }}>{trait}</span>
            <Numeric>{pct}%</Numeric>
          </Score>
        </Heading>
        <Track>
          <Fill
            style={{ backgroundColor: color, width: grown ? `${pct}%` : 0 }}
          />
        </Track>
        <Poles>
          <span style={{ color }}>{trait}</span>
          <Opposite>
            {opposite} {100 - pct}%
          </Opposite>
        </Poles>
      </Toggle>
      <Detail data-open={open} id={detailId}>
        {detail}
      </Detail>
    </Trait>
  );
};

export const Personality = () => {
  // Bars start empty and grow once mounted, so the fill animates in.
  const [grown, setGrown] = useState(false);

  useEffect(() => setGrown(true), []);

  return (
    <Box>
      <Title>Advocate (INFJ-T)</Title>
      <Traits>
        {TRAITS.map((trait) => (
          <TraitBar key={trait.aspect} grown={grown} {...trait} />
        ))}
      </Traits>
      <Typography variant="body1">
        <Comment>Hover, tap or tab a trait for what it means.</Comment>
      </Typography>
      <Typography variant="body1">
        <Link href={ADVOCATE_URL} target="_blank" rel="noopener noreferrer">
          Read more about Advocates
        </Link>
      </Typography>
    </Box>
  );
};
