import Markdown from "react-markdown";
import { camelCase, startCase } from "lodash";

import { FormattedDate, Link, Section, Title } from "@/components";

import { getProject } from "./action";
import { Article, Image, Links } from "./components";

export async function generateMetadata({ params: { slug } }) {
  return {
    title: `${startCase(camelCase(slug))} | Projects | Christopher Salinas Jr.`,
  };
}

export default async function Page({ params: { slug } }) {
  const {
    content,
    image: { url: src },
    link,
    name,
    updatedAt,
  } = await getProject(slug);
  return (
    <Section sx={{ gap: "2rem" }}>
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
    </Section>
  );
}
