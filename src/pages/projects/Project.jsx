import { useQuery, gql } from "@apollo/client";
import styled from "@emotion/styled";
import { Link, useParams } from "react-router-dom";
import Markdown from "react-markdown";

import { Section, Title } from "../../components";

const PROJECT = gql`
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

const Container = styled(Section)`
  display: flex;
  flex-flow: column nowrap;
  gap: 2rem;

  & > * {
    margin: 0;
  }
`;

const Image = styled.img`
  aspect-ratio: 3 / 2;
  border-radius: 2rem;
  box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14),
    0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2);
  object-fit: cover;
  width: 100%;
`;

const Article = styled.article`
  h2 {
    color: var(--comment);

    &:before {
      content: "// ";
    }
  }

  h3 {
    color: var(--function);
  }

  strong {
    color: var(--var);
  }
`;

export const Project = () => {
  const { slug } = useParams();
  const { loading, error, data } = useQuery(PROJECT, { variables: { slug } });

  if (loading) {
    return <Section>Loading...</Section>;
  }

  if (error) {
    return <Section>Error 😟</Section>;
  }

  const { name, image, content } = data.project;

  return (
    <Container>
      <Link to="..">
        <i className="fas fa-chevron-left" /> Back to Projects
      </Link>
      <Title>{name}</Title>
      <Image alt="" src={image.url} />
      <Article>
        <Markdown>{content}</Markdown>
      </Article>
    </Container>
  );
};
