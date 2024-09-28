import {
  Section,
  Title as PageTitle,
  Module,
  Selector,
  Numeric,
  Regex,
} from "@/components";

import { getMiniMotorways } from "./action";
import {
  Card,
  Container,
  Image,
  ImageContainer,
  Info,
  Map,
  Score,
  Title,
} from "./styled";

export const dynamic = "force-dynamic"; // This should make it dynamic, but it's not querying the data every time the page loads :( why doesn't Render do that?

export default async function Page() {
  const miniMotorways = await getMiniMotorways();
  return (
    <Section>
      <PageTitle style={{ marginBottom: "2rem" }}>Mini Motorways</PageTitle>
      <Container>
        {miniMotorways.map(
          ({
            id,
            city,
            color: { hex: backgroundColor },
            classic,
            expert,
            image,
          }) => (
            <Card key={id}>
              <Map style={{ backgroundColor }}>
                <ImageContainer>
                  {image && (
                    <Image
                      fill
                      src={image.url}
                      alt={"Thumbnail for " + city}
                      sizes="(min-width: 696px) 33vw, (min-width: 896px) 50vw, (min-width: 1296px) 33vw, (min-width: 1596px) 33vw, 100vw"
                      quality={100}
                    />
                  )}
                </ImageContainer>
                <Title>{city}</Title>
              </Map>
              <Info>
                <h3 style={{ margin: 0 }}>
                  <Module>Best Score{expert && "s"}</Module>
                </h3>
                <Score>
                  <Selector>
                    <strong>Classic:</strong>
                  </Selector>{" "}
                  <Numeric>{classic}</Numeric>
                </Score>
                {expert && (
                  <Score>
                    <Regex>
                      <strong>Expert:</strong>
                    </Regex>{" "}
                    <Numeric>{expert}</Numeric>
                  </Score>
                )}
              </Info>
            </Card>
          )
        )}
      </Container>
    </Section>
  );
}
