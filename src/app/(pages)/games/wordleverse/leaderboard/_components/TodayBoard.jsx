"use client";

import styled from "@emotion/styled";

import { Empty, Player, Table } from "./Board";

const Result = styled.span`
  color: ${(props) => (props.win ? "var(--comment)" : "var(--muted)")};
  font-weight: bold;
`;

const ExpertBadge = styled.span`
  background-color: var(--absentBackground);
  border-radius: 3px;
  color: var(--module);
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  margin-left: 0.5rem;
  padding: 0.1rem 0.3rem;
  vertical-align: middle;
`;

/**
 * Today's finishers, best result first.
 *
 * Purely presentational — every row arrives ranked and formatted from
 * `_lib/rank.js`, and nothing here re-derives a rule.
 * @param {Object} props - Component props
 * @param {Array} props.rows - TodayRow[] from rankToday
 * @returns {JSX.Element} TodayBoard component
 */
const TodayBoard = ({ rows }) => {
  if (rows.length === 0) {
    return <Empty>No one has finished today&apos;s puzzle yet.</Empty>;
  }

  return (
    <Table>
      <thead>
        <tr>
          <th className="rank">#</th>
          <th>Player</th>
          <th className="numeric">Result</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className={row.isYou ? "you" : undefined}>
            <td className="rank">{row.rank}</td>
            <td>
              <Player
                name={row.name}
                initials={row.initials}
                isYou={row.isYou}
              />
            </td>
            <td className="numeric">
              <Result win={row.win}>
                {row.win ? `${row.guessCount}/6` : "X/6"}
              </Result>
              {row.expert && <ExpertBadge>EXPERT</ExpertBadge>}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default TodayBoard;
