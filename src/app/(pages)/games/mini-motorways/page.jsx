import Link from "next/link";
import { gql } from "graphql-request";

import { Section, Title as PageTitle } from "@/components";
import hygraph from "@/lib/hygraph";

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

export const dynamic = "force-dynamic";

const getMiniMotorways = async () => {
  const query = gql`
    {
      miniMotorways(orderBy: order_ASC, stage: PUBLISHED, first: 100) {
        id
        city
        color {
          hex
        }
        classic
        expert
        image {
          url
        }
      }
    }
  `;

  const { miniMotorways } = await hygraph.request(query);
  return miniMotorways;
};

export default async function Page() {
  const miniMotorways = await getMiniMotorways();
  return (
    <Section>
      <Link href="/" style={{ marginBottom: "2rem" }}>
        <i className="fas fa-chevron-left" /> Back to Home
      </Link>
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
                    <Image fill src={image.url} alt={"Thumbnail for " + city} />
                  )}
                </ImageContainer>
                <Title>{city}</Title>
              </Map>
              <Info>
                <h3 style={{ margin: 0 }}>Best Scores</h3>
                <Score>
                  <strong>Classic:</strong> {classic}
                </Score>
                {expert && (
                  <Score>
                    <strong>Expert:</strong> {expert}
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
