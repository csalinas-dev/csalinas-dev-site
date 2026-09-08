"use client";

import { Empty, Player, Table } from "./Board";

/**
 * Every opted-in player who has finished at least one puzzle, most wins first.
 *
 * Purely presentational — every row arrives ranked and formatted from
 * `_lib/rank.js`, and nothing here re-derives a rule. Average guesses and max
 * streak are hidden by CSS on a narrow screen rather than dropped from the
 * data, so nothing about the payload depends on the viewport.
 * @param {Object} props - Component props
 * @param {Array} props.rows - AllTimeRow[] from rankAllTime
 * @returns {JSX.Element} AllTimeBoard component
 */
const AllTimeBoard = ({ rows }) => {
  if (rows.length === 0) {
    return <Empty>No games on the board yet.</Empty>;
  }

  return (
    <Table>
      <thead>
        <tr>
          <th className="rank">#</th>
          <th>Player</th>
          <th className="numeric">Wins</th>
          <th className="numeric">Win %</th>
          <th className="numeric hide-narrow">Avg</th>
          <th className="numeric">Streak</th>
          <th className="numeric hide-narrow">Max</th>
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
            <td className="numeric">{row.wins}</td>
            <td className="numeric">{row.winPct}%</td>
            <td className="numeric hide-narrow">
              {row.avgGuesses === null ? "—" : row.avgGuesses}
            </td>
            <td className="numeric">{row.streak}</td>
            <td className="numeric hide-narrow">{row.maxStreak}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default AllTimeBoard;
