import { Section, Title } from "@/components";

import { GameCard, GameGrid } from "./_components/GameCard";
import { GAMES } from "./games";

export default function Page() {
  return (
    <Section>
      <Title>Games</Title>
      <GameGrid>
        {GAMES.map(({ slug, title, href, Artwork }) => (
          <GameCard href={href} key={slug} title={title}>
            <Artwork />
          </GameCard>
        ))}
      </GameGrid>
    </Section>
  );
}
