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
  Flex,
  Image,
  ImageContainer,
  Info,
  Map,
  Score,
  Title,
} from "./styled";

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
            challenge1Name = null,
            challenge1Score = null,
            challenge2Name = null,
            challenge2Score = null,
            challenge3Name = null,
            challenge3Score = null,
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
                    <strong>Classic</strong>
                  </Selector>
                  <Flex />
                  <Numeric>{classic}</Numeric>
                </Score>
                {challenge1Name && (
                  <Score>
                    <strong>{challenge1Name}</strong>
                    <Flex />
                    <Numeric>{challenge1Score}</Numeric>
                  </Score>
                )}
                {challenge2Name && (
                  <Score>
                    <strong>{challenge2Name}</strong>
                    <Flex />
                    <Numeric>{challenge2Score}</Numeric>
                  </Score>
                )}
                {challenge3Name && (
                  <Score>
                    <strong>{challenge3Name}</strong>
                    <Flex />
                    <Numeric>{challenge3Score}</Numeric>
                  </Score>
                )}
                {expert && (
                  <Score>
                    <Regex>
                      <strong>Expert</strong>
                    </Regex>
                    <Flex />
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
