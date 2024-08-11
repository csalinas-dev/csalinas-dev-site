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