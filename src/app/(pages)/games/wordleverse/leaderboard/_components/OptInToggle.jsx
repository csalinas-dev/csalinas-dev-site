"use client";

import { useState, useTransition } from "react";
import styled from "@emotion/styled";
import { FormControlLabel, Switch } from "@mui/material";
import { useRouter } from "next/navigation";

import { setLeaderboardOptIn } from "../_actions/setLeaderboardOptIn";

const ToggleContainer = styled.div`
  align-items: center;
  display: flex;
  flex-flow: row wrap;
  gap: 0.5rem;
  justify-content: center;
`;

const ErrorMessage = styled.span`
  color: var(--invalid);
  font-size: 0.9rem;
`;

const FAILED = "Failed to update leaderboard setting";
// Every failure path puts the switch back where it was, so what is true
// afterwards is the state the click tried to leave. One shared sentence cannot
// say that: telling somebody whose opt-in failed that they are "still listed"
// asserts a publication that never happened.
const STILL_LISTED = "You are still listed on the leaderboard.";
const NOT_LISTED = "You have not been added to the leaderboard.";
const UNKNOWN =
  "Could not read your leaderboard setting. Reload to try again.";

/**
 * The opt-in switch. Listing is off by default, so this is the only way onto
 * the board — and off it.
 *
 * The switch is optimistic, which makes every failure path a privacy question:
 * a position that sticks without being saved tells a listed player they have
 * been removed while their name is still on both boards. So the only state that
 * survives an attempt is one the server confirmed, and anything else puts the
 * switch back and says why.
 * @param {Object} props - Component props
 * @param {Boolean} props.optedIn - The stored setting, or null when unreadable
 * @returns {JSX.Element} OptInToggle component
 */
const OptInToggle = ({ optedIn }) => {
  const router = useRouter();
  // Null means the page could not read the setting. Never guess at it: show the
  // switch off, refuse to act, and say so.
  const unknown = optedIn !== true && optedIn !== false;
  const [checked, setChecked] = useState(optedIn === true);
  const [error, setError] = useState(unknown ? UNKNOWN : null);
  const [saving, setSaving] = useState(false);
  const [pending, startTransition] = useTransition();

  const onChange = async (event) => {
    const next = event.target.checked;
    // Both failure paths below revert to `!next`, so this is what is true then.
    const unchanged = next ? NOT_LISTED : STILL_LISTED;

    // Move the switch immediately, put it back unless the server confirms it.
    setChecked(next);
    setError(null);
    setSaving(true);

    try {
      const result = await setLeaderboardOptIn(next);

      // Anything that is not an explicit stored boolean is a failure — a
      // returned { error }, or a shape this component does not recognise.
      if (typeof result?.optIn !== "boolean") {
        setChecked(!next);
        setError(`${result?.error ?? FAILED}. ${unchanged}`);
        return;
      }

      // Re-sync from what was stored rather than trusting the optimistic value.
      setChecked(result.optIn);
      startTransition(() => router.refresh());
    } catch (error) {
      // Reachable: a server action can throw before it reaches its own
      // try/catch, and React swallows the rejection of an async event handler.
      // Unhandled, that is the failure that publishes somebody who believes
      // they opted out.
      console.error("Error setting leaderboard opt-in:", error);
      setChecked(!next);
      setError(`${FAILED}. ${unchanged}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ToggleContainer>
      <FormControlLabel
        control={
          <Switch
            checked={checked}
            // `saving` is set before the await, so a second click during the
            // round trip finds the switch already disabled.
            disabled={pending || saving || unknown}
            onChange={onChange}
            sx={{
              "& .Mui-checked": { color: "var(--comment)" },
              "& .Mui-checked + .MuiSwitch-track": {
                backgroundColor: "var(--comment)",
              },
            }}
          />
        }
        label="Show me on the leaderboard"
      />
      {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
    </ToggleContainer>
  );
};

export default OptInToggle;
