import styled from "@emotion/styled";
import { range } from "lodash";

import { GRID_SIZES, MAX_PLAYERS, MIN_PLAYERS } from "../_lib";
import { PLAYER_PALETTE } from "../players";

const Panel = styled.div`
  background-color: var(--absentBackground);
  border-radius: 0.6rem;
  display: flex;
  flex-flow: column nowrap;
  gap: 0.85rem;
  padding: 0.9rem;
  width: 100%;
`;

const Field = styled.fieldset`
  align-items: center;
  border: none;
  display: flex;
  flex-flow: row wrap;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
`;

const Legend = styled.legend`
  color: var(--absentForeground);
  font-size: 0.8rem;
  padding: 0 0 0.35rem;
`;

const Choice = styled.button`
  background-color: transparent;
  border: 1px solid var(--absentForeground);
  border-radius: 0.4rem;
  color: var(--foreground);
  cursor: pointer;
  font-size: 0.9rem;
  min-height: 2.25rem;
  padding: 0.35rem 0.7rem;

  &[aria-pressed="true"] {
    background-color: var(--selectionBackground);
    border-color: var(--component);
    color: var(--component);
  }

  &:focus-visible {
    outline: 2px solid var(--var);
    outline-offset: 2px;
  }
`;

const Swatches = styled.span`
  display: inline-flex;
  gap: 0.2rem;
  margin-left: 0.35rem;
  vertical-align: middle;
`;

const Swatch = styled.span`
  background-color: var(--slot);
  border-radius: 0.15rem;
  display: inline-block;
  height: 0.6rem;
  width: 0.6rem;
`;

const Warning = styled.p`
  color: var(--absentForeground);
  font-size: 0.8rem;
  margin: 0;
`;

/**
 * Board size and player count for a game round one device.
 *
 * Both controls start a new game the moment they change, which is why the panel
 * is behind a toggle rather than sitting over the board: it is a destructive
 * control, and it should take a deliberate act to reach it.
 *
 * Sizes are quoted in dots, the unit the engine's `createState` takes and the
 * unit a player counts when they look at the board. The box count comes along
 * in brackets so the difference is never a surprise.
 */
export const Setup = ({ onChange, playerCount, size }) => (
  <Panel>
    <Field>
      <Legend>Players</Legend>
      {range(MIN_PLAYERS, MAX_PLAYERS + 1).map((count) => (
        <Choice
          aria-pressed={count === playerCount}
          key={count}
          onClick={() => onChange({ playerCount: count })}
          type="button"
        >
          {count}
          <Swatches aria-hidden="true">
            {PLAYER_PALETTE.slice(0, count).map(({ color, colorName }) => (
              <Swatch key={colorName} style={{ "--slot": color }} />
            ))}
          </Swatches>
        </Choice>
      ))}
    </Field>

    <Field>
      <Legend>Board</Legend>
      {GRID_SIZES.map((dots) => (
        <Choice
          aria-pressed={dots === size}
          key={dots}
          onClick={() => onChange({ size: dots })}
          type="button"
        >
          {dots}&times;{dots} dots
          <span aria-hidden="true">
            {" "}
            ({dots - 1}&times;{dots - 1})
          </span>
        </Choice>
      ))}
    </Field>

    <Warning>Changing either starts a new game.</Warning>
  </Panel>
);
