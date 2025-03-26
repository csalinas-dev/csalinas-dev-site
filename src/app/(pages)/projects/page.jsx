import { FormattedDate, Section, Title } from "@/components";

import { Name, Project } from "./components";
import { getProjects } from "./action";

export const dynamic = "force-dynamic";
export const metadata = { title: "Projects | Christopher Salinas Jr." };

const Projects = async () => {
  const projects = await getProjects();
  return (
    <Section sx={{ gap: 5}}>
      <Title>Projects</Title>
      {projects.map(({ id, slug, name, updatedAt, thumbnail: { url } }) => (
        <Project key={id} href={"/projects/" + slug} src={url}>
          <Name>{name}</Name>
          <FormattedDate date={updatedAt} />
        </Project>
      ))}
    </Section>
  );
};

export default Projects;
