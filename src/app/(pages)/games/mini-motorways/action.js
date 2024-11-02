"use server";

import { gql } from "graphql-request";
import hygraph from "@/lib/hygraph";

export const getMiniMotorways = async () => {
  const query = gql`
    {
      miniMotorways(orderBy: order_ASC, stage: PUBLISHED, first: 100) {
        id
        city
        color {
          hex
        }
        classic
        challenge1Name
        challenge1Score
        challenge2Name
        challenge2Score
        challenge3Name
        challenge3Score
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
