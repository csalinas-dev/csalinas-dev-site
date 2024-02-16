import { useQuery, gql } from "@apollo/client";
import styled from "@emotion/styled";
import { Link } from "react-router-dom";

import { FormattedDate, Section, Title } from "../../components";

const PROJECTS = gql`
  {
    posts(orderBy: updatedAt_DESC) {
      id
      updatedAt
      slug
      title
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
`;

const Name = styled.h1`
  color: white;
  font-size: 3rem;
  line-height: 3rem;
  margin: 0;
`;

const Project = styled(Link)`
  align-items: end;
  aspect-ratio: 5 / 2;
  border-radius: 2rem;
  box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14),
    0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  overflow: hidden;
  padding: 2.5rem;
  position: relative;
  width: 100%;
  text-decoration: none;
  text-decoration-style: initial;
  text-decoration-thickness: initial;
  text-decoration-color: initial;

  h1,
  span {
    text-shadow: 4px 8px 32px rgba(0, 0, 0, 0.5);
    user-select: none;
    z-index: 1;
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
    content = data.posts.map(
      ({ id, slug, title, updatedAt, image: { url } }) => (
        <Project key={id} to={`${slug}`} src={url}>
          <Name>{title}</Name>
          <FormattedDate date={Date.parse(updatedAt)} />
        </Project>
      )
    );
  }

  return (
    <Container>
      <Title>Projects</Title>
      {content}
    </Container>
  );
};

export * from "./Project";
