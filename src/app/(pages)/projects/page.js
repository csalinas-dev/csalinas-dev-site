import Link from "next/link";
import { gql } from "graphql-request";

import { FormattedDate, Title } from "@/components";
import hygraph from "@/lib/hygraph";

import { Container, Name, Project } from "./components";

export const dynamic = "force-dynamic";
export const metadata = { title: "Projects | Christopher Salinas Jr." };

const getProjects = async () => {
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

const Projects = async () => {
  const projects = await getProjects();
  return (
    <Container>
      <Title>Projects</Title>
      {projects.map(({ id, slug, name, updatedAt, thumbnail: { url } }) => (
        <Project key={id} href={"/projects/" + slug} src={url}>
          <Name>{name}</Name>
          <FormattedDate date={updatedAt} />
        </Project>
      ))}
    </Container>
  );
};

export default Projects;
