import { useQuery, gql } from "@apollo/client";
import styled from "@emotion/styled";
import { Link } from "react-router-dom";

import { FormattedDate, Section, Title } from "components";

const PROJECTS = gql`
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

const Container = styled(Section)`
  display: flex;
  flex-flow: column nowrap;
  gap: 2rem;
`;

const Name = styled.h1`
  color: white;
  margin: 0;
`;

const Project = styled(Link)`
  align-items: end;
  aspect-ratio: 2 / 2;
  border-radius: 2rem;
  box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14),
    0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  overflow: hidden;
  padding: 2.5rem;
  position: relative;
  user-select: none;
  width: 100%;

  @media (min-width: 696px) {
    aspect-ratio: 3 / 2;
  }

  @media (min-width: 896px) {
    aspect-ratio: 4 / 2;
  }

  @media (min-width: 1296px) {
    aspect-ratio: 5 / 2;
  }

  h1,
  span {
    text-align: right;
    text-shadow: rgba(0, 0, 0, 0.75) 1px 2px 4px;
    user-select: none;
    z-index: 1;
  }

  h1 {
    font-size: 2rem;

    @media (min-width: 696px) {
      font-size: 2.5rem;
    }

    @media (min-width: 896px) {
      font-size: 3.5rem;
    }

    @media (min-width: 1296px) {
      font-size: 4rem;
    }
  }

  span {
    font-size: 1.5rem;

    @media (min-width: 896px) {
      font-size: 1.75rem;
    }

    @media (min-width: 1296px) {
      font-size: 2rem;
    }
  }

  &:before {
    background-color: var(--selectionBackground);
    background-image: ${(props) => `url(${props.src})`};
    background-position: center;
    background-size: cover;
    bottom: 0;
    content: "";
    left: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
    top: 0;
    transition: transform ease-in-out 350ms;
    z-index: 0;
  }

  &:hover:before {
    transform: scale(1.05);
  }
`;

export const Projects = () => {
  const { loading, error, data } = useQuery(PROJECTS);

  let content;

  if (loading) {
    content = (
      <Project to="#">
        <Name>Loading...</Name>
      </Project>
    );
  } else if (error) {
    content = (
      <Project to="#">
        <Name>Error :(</Name>
      </Project>
    );
  } else {
    content = data.projects.map(
      ({ id, slug, name, updatedAt, thumbnail: { url } }) => (
        <Project key={id} to={slug} src={url}>
          <Name>{name}</Name>
          <FormattedDate date={updatedAt} />
        </Project>
      )
    );
  }

  return (
    <Container>
      <Link to="/">
        <i className="fas fa-chevron-left" /> Back to Home
      </Link>
      <Title>Projects</Title>
      {content}
    </Container>
  );
};

export * from "./Project";
