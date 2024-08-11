"use server";

import { notFound } from "next/navigation";
import { gql } from "graphql-request";

import hygraph from "@/lib/hygraph";

export const getProject = async (slug) => {
  const query = gql`
    query Project($slug: String!) {
      project(where: { slug: $slug }) {
        id
        updatedAt
        name
        link
        content
        image {
          url
        }
      }
    }
  `;

  const { project } = await hygraph.request(query, { slug });

  if (!project) {
    notFound();
  }

  return project;
};