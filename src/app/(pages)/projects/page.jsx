import { FormattedDate, Title } from "@/components";

import { getProjects } from "./action";
import { Container, Name, Project } from "./components";

export const dynamic = "force-dynamic";
export const metadata = { title: "Projects | Christopher Salinas Jr." };

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
