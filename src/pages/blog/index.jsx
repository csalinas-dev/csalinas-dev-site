import { useQuery, gql } from "@apollo/client";
import { Section } from "../../components";

const BLOG = gql`
  {
    posts {
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

export const Blog = () => {
  const { loading, error, data } = useQuery(BLOG);

  if (loading) return <Section>Loading...</Section>;
  if (error) return <Section>Error :(</Section>;

  return (
    <Section>
      {data.posts.map(({ id, title }) => (
        <div key={id}>
          <h1>{title}</h1>
        </div>
      ))}
    </Section>
  );
};
