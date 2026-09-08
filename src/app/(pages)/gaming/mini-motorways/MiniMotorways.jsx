"use client";

import { Fragment } from "react";

import { Comment, Numeric, Parenthesis } from "@/components";

import {
  BarFill,
  BarTrack,
  Card,
  Challenges,
  CityName,
  Empty,
  Foot,
  Grid,
  Legend,
  Modes,
  Muted,
  Tile,
  Tiles,
} from "./styled";

/* Presentation only. Every figure arrives pre-derived and pre-formatted from
   `_lib/stats.js`, which is why this file holds no numbers of its own and never
   imports the JSON. It also uses no Font Awesome — its only graphics are the
   CSS bars — so there is no `<i>` for the kit script to swap out from under
   React. */

/* An unattempted score is the word `unbeaten`, not a colour and not a blank:
   `0` is a real score in this game and has to stay visibly different from "no
   score at all". That distinction is the whole point of the extractor emitting
   `null`. */
const Best = ({ value }) =>
  value === null ? (
    <span className="best unbeaten">unbeaten</span>
  ) : (
    <span className="best">{value}</span>
  );

/* The save stores challenges by index, not by name, and the names that used to
   sit beside them lived in a CMS that no longer answers. Rendering the index as
   code is honest about what the data actually holds instead of inventing a name
   the game would contradict. */
const ChallengeLabel = ({ index }) => (
  <span className="label">
    <Muted>challenge</Muted>
    <Parenthesis>[</Parenthesis>
    <Numeric>{index}</Numeric>
    <Parenthesis>]</Parenthesis>
  </span>
);

export const MiniMotorways = ({ savedAtDay, summary, cities }) => (
  <>
    <Legend>
      <Comment>
        every city&apos;s classic run, expert run and own challenges. bars are
        relative to my best in that mode. the save stores challenges by index,
        not by name.
      </Comment>
    </Legend>

    {cities.length === 0 ? (
      <Empty>
        <Comment>no stats yet — run the mini-motorways-stats skill</Comment>
      </Empty>
    ) : (
      <>
        <Tiles>
          <Tile>
            <div className="label">Cities</div>
            <div className="figure">{summary.cities}</div>
            <div className="caption">played</div>
          </Tile>
          <Tile>
            <div className="label">Best Classic</div>
            <div className="figure">{summary.bestClassic.score}</div>
            <div className="caption">{summary.bestClassic.city}</div>
          </Tile>
          <Tile>
            <div className="label">Best Expert</div>
            <div className="figure">{summary.bestExpert.score}</div>
            <div className="caption">{summary.bestExpert.city}</div>
          </Tile>
          <Tile>
            <div className="label">Challenges</div>
            <div className="figure">
              {summary.challengesBeaten}/{summary.challengesTotal}
            </div>
            <div className="caption">beaten</div>
          </Tile>
          <Tile>
            <div className="label">Achievements</div>
            <div className="figure">
              {summary.achievements.complete}/{summary.achievements.total}
            </div>
            <div className="caption">complete</div>
          </Tile>
        </Tiles>

        <Grid>
          {cities.map((city) => (
            <Card key={city.id}>
              <CityName>{city.name}</CityName>
              <Modes className="mode-grid">
                <span className="caption days">Days</span>
                <span className="caption best">Best</span>
                {city.modes.map((mode) => (
                  <Fragment key={mode.label}>
                    <span className="label">{mode.label}</span>
                    <div className="bar">
                      {/* The bar carries nothing the row's own figures do not,
                          so it is hidden from assistive tech; the mode's name
                          is on every row, so colour is never alone. */}
                      <BarTrack aria-hidden="true">
                        <BarFill
                          className={mode.label === "Expert" ? "expert" : undefined}
                          style={{ width: `${mode.barPct}%` }}
                        />
                      </BarTrack>
                    </div>
                    <span className="days">{mode.days}</span>
                    <Best value={mode.best} />
                  </Fragment>
                ))}
              </Modes>
              <Challenges className="challenge-grid">
                {city.challenges.map((challenge) => (
                  <Fragment key={challenge.index}>
                    <ChallengeLabel index={challenge.index} />
                    <Best value={challenge.best} />
                  </Fragment>
                ))}
              </Challenges>
            </Card>
          ))}
        </Grid>
      </>
    )}

    {/* Its own parent, so `Comment`'s `:first-of-type` gives it its own `// `
        rather than the legend keeping the only pair of slashes. */}
    <Foot>
      <Comment>stats as of {savedAtDay}, read from my local save</Comment>
    </Foot>
  </>
);
