"use client";

import { useState } from "react";
import styled from "@emotion/styled";
import { Tab, Tabs } from "@mui/material";

import { FormattedDate } from "@/components";

import AllTimeBoard from "./AllTimeBoard";
import TodayBoard from "./TodayBoard";

const TODAY = "today";
const ALL_TIME = "allTime";

const Caption = styled.p`
  color: var(--muted);
  font-size: 0.9rem;
  margin: 1rem 0 0;
  text-align: center;
`;

const Notice = styled.p`
  background-color: var(--absentBackground);
  border-radius: 4px;
  color: var(--muted);
  font-size: 0.9rem;
  margin: 0 0 1rem;
  padding: 0.5rem 0.75rem;
  text-align: center;
`;

/**
 * The two boards behind a pair of tabs.
 *
 * Both datasets arrive as props from the server component, so switching tabs
 * renders instantly and makes no request.
 * @param {Object} props - Component props
 * @param {String} props.date - Today's date, yyyy-mm-dd
 * @param {Boolean} props.signedIn - Whether anyone is signed in
 * @param {Boolean} props.optedIn - Whether the viewer is listed, null if unknown
 * @param {Array} props.today - TodayRow[]
 * @param {Array} props.allTime - AllTimeRow[]
 * @returns {JSX.Element} LeaderboardTabs component
 */
const LeaderboardTabs = ({ date, signedIn, optedIn, today, allTime }) => {
  const [tab, setTab] = useState(TODAY);

  return (
    <div>
      {/* Only when the setting was actually read as false — `optedIn` is null
          when the query failed, and "you are not listed" would be a guess. */}
      {signedIn && optedIn === false && (
        <Notice>
          You are not listed. Turn on &ldquo;Show me on the leaderboard&rdquo; to
          appear here.
        </Notice>
      )}
      <Tabs
        value={tab}
        onChange={(event, value) => setTab(value)}
        textColor="inherit"
        variant="fullWidth"
        sx={{ "& .MuiTabs-indicator": { backgroundColor: "var(--comment)" } }}
      >
        <Tab value={TODAY} label="Today" />
        <Tab value={ALL_TIME} label="All Time" />
      </Tabs>
      {tab === TODAY ? (
        <>
          <Caption>
            {/* Parse at local midnight — a bare yyyy-mm-dd is read as UTC and
                would render as the previous day west of Greenwich. */}
            <FormattedDate date={new Date(`${date}T00:00:00`)} />
          </Caption>
          <TodayBoard rows={today} />
        </>
      ) : (
        <AllTimeBoard rows={allTime} />
      )}
    </div>
  );
};

export default LeaderboardTabs;
