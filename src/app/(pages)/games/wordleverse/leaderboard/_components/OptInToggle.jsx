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

/**
 * The opt-in switch. Listing is off by default, so this is the only way onto
 * the board — and off it.
 * @param {Object} props - Component props
 * @param {Boolean} props.optedIn - The stored setting
 * @returns {JSX.Element} OptInToggle component
 */
const OptInToggle = ({ optedIn }) => {
  const router = useRouter();
  const [checked, setChecked] = useState(optedIn);
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  const onChange = async (event) => {
    const next = event.target.checked;

    // Move the switch immediately, put it back if the server disagrees.
    setChecked(next);
    setError(null);

    const result = await setLeaderboardOptIn(next);
    if (result?.error) {
      setChecked(!next);
      setError(result.error);
      return;
    }

    startTransition(() => router.refresh());
  };

  return (
    <ToggleContainer>
      <FormControlLabel
        control={
          <Switch
            checked={checked}
            disabled={pending}
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
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </ToggleContainer>
  );
};

export default OptInToggle;
