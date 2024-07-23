import Link from "next/link";
import { notFound } from "next/navigation";
import { gql } from "graphql-request";
import Markdown from "react-markdown";

import hygraph from "@/lib/hygraph";
import { FormattedDate, Title } from "@/components";

import { Article, Container, Image, Links } from "./components";

const getProject = async (slug) => {
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

export default async function Page({ params: { slug } }) {
  const {
    content,
    image: { url: src },
    link,
    name,
    updatedAt,
  } = await getProject(slug);
  return (
    <Container>
      <Links>
        <Link href="/projects">
          <i className="fas fa-chevron-left" /> Back to Projects
        </Link>
        {link && (
          <Link href={link} target="_blank" rel="noopener noreferrer">
            View Project <i className="fas fa-square-arrow-up-right" />
          </Link>
        )}
      </Links>
      <Title style={{ marginBottom: 0 }}>{name}</Title>
      <FormattedDate date={updatedAt} />
      <Image alt="Project Image" src={src} width={1200} height={800} />
      <Article>
        <Markdown>{content}</Markdown>
      </Article>
    </Container>
  );
}
