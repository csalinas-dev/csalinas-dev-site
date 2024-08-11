"use server";

import { gql } from "graphql-request";
import hygraph from "@/lib/hygraph";

export const getProjects = async () => {
  const query = gql`
    {
      projects(orderBy: updatedAt_DESC) {
        id
        updatedAt
        slug
        name
        thumbnail {
          url
        }
      }
    }
  `;

  const { projects } = await hygraph.request(query);
  return projects;
};
