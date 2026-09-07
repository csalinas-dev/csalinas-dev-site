import data from "@/data/mini-motorways.json";
import { Section, Title } from "@/components";

import { buildStats } from "./_lib/stats";
import { MiniMotorways } from "./MiniMotorways";

export const metadata = {
  title: "Mini Motorways Stats | Christopher Salinas Jr.",
  description:
    "Every Mini Motorways city I have played: the best Classic run, the best Expert run and each city's own challenges, read straight out of my save file.",
  keywords: [
    "Mini Motorways",
    "Mini Motorways stats",
    "Mini Motorways high scores",
    "Mini Motorways challenges",
    "Dinosaur Polo Club",
  ],
  openGraph: {
    title: "Mini Motorways Stats",
    description:
      "Every city's Classic run, Expert run and own challenges, read straight out of my save file.",
    type: "website",
  },
};

/* A server component on purpose. The JSON is imported at build time and reduced
   to display-ready props here, so the raw artifact — `totals`, the Endless
   rows, the daily and weekly challenges — never enters the client bundle. There
   is nothing to fetch and nothing to load: if this route ever shows as `ƒ`
   rather than `○ (Static)` in the build output, something made it dynamic and
   the file has stopped being a build-time artifact. */
export default function Page() {
  return (
    <Section>
      <Title>Mini Motorways</Title>
      <MiniMotorways {...buildStats(data)} />
    </Section>
  );
}
