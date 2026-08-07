"use client";

import styled from "@emotion/styled";
import { Avatar } from "@mui/material";

/**
 * Table chrome shared by both boards, so the two tables cannot drift apart.
 *
 * Cell classes:
 * - `rank`        right-aligned, muted rank column
 * - `numeric`     right-aligned figure that must not wrap
 * - `hide-narrow` hidden under 700px — the column is still in the data, it is
 *                 only not drawn, so nothing downstream has to know about it
 */
export const Table = styled.table`
  border-collapse: collapse;
  width: 100%;

  th,
  td {
    padding: 0.5rem 0.75rem;
    text-align: left;
  }

  th {
    color: var(--muted);
    font-size: 0.75rem;
    font-weight: normal;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  thead tr,
  tbody tr {
    border-bottom: 1px solid var(--absentBackground);
  }

  tbody tr.you {
    background-color: var(--selectionBackground);
  }

  .rank,
  .numeric {
    text-align: right;
    white-space: nowrap;
  }

  .rank {
    color: var(--muted);
    width: 3.5rem;
  }

  @media (max-width: 700px) {
    .hide-narrow {
      display: none;
    }

    th,
    td {
      padding: 0.5rem 0.35rem;
    }
  }
`;

const PlayerCell = styled.div`
  align-items: center;
  display: flex;
  flex-flow: row nowrap;
  gap: 0.5rem;
  min-width: 0;
`;

// A definite max-width is what lets the ellipsis engage — a long OAuth display
// name must not be allowed to widen the table.
const Name = styled.span`
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 700px) {
    max-width: 7rem;
  }
`;

const You = styled.span`
  color: var(--muted);
  flex: 0 0 auto;
  font-size: 0.8rem;
`;

/**
 * A player's avatar and name.
 *
 * Initials rather than an OAuth avatar image: `next.config.mjs` only allows
 * `media.graphassets.com` as a remote image host, and the leaderboard makes no
 * other third-party request.
 * @param {Object} props - Component props
 * @param {String} props.name - Display name
 * @param {String} props.initials - Up to two initials
 * @param {Boolean} props.isYou - Whether this row is the viewer's
 * @returns {JSX.Element} Player component
 */
export const Player = ({ name, initials, isYou }) => (
  <PlayerCell>
    <Avatar
      sx={{
        backgroundColor: "var(--absentBackground)",
        color: "var(--foreground)",
        fontSize: "0.75rem",
        height: 28,
        width: 28,
      }}
    >
      {initials}
    </Avatar>
    <Name title={name}>{name}</Name>
    {isYou && <You>(you)</You>}
  </PlayerCell>
);

export const Empty = styled.p`
  color: var(--muted);
  margin: 2rem 0;
  text-align: center;
`;
