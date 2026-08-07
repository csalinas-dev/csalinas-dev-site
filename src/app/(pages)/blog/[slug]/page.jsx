import { notFound } from "next/navigation";

import { FormattedDate, Link, Section, Title } from "@/components";
import { getPost, getPostSlugs } from "@/content/posts";

import { Article, Category, Image, Links, Tag, Tags } from "./components";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    notFound();
  }

  const { title, description, date, cover } = post;
  return {
    title: `${title} | Blog | Christopher Salinas Jr.`,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      publishedTime: date,
      images: [{ url: cover.src, width: cover.width, height: cover.height }],
    },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    notFound();
  }

  const {
    title,
    date,
    category,
    cover,
    hero,
    link,
    linkLabel,
    tags = [],
    Content,
  } = post;
  const external = /^https?:\/\//.test(link ?? "");

  return (
    <Section sx={{ gap: "2rem" }}>
      <Links>
        <Link href="/blog">
          <i className="fas fa-chevron-left" /> Back to Blog
        </Link>
        {link && (
          <Link
            href={link}
            {...(external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {linkLabel ?? "View Project"}{" "}
            <i className="fas fa-square-arrow-up-right" />
          </Link>
        )}
      </Links>
      <Category>{category}</Category>
      <Title style={{ marginBottom: 0 }}>{title}</Title>
      {/* Local midnight, or a YYYY-MM-DD parses as UTC and renders a day early
          west of Greenwich — same as the Wordleverse header. */}
      <FormattedDate date={new Date(date + "T00:00:00")} />
      {tags.length > 0 && (
        <Tags>
          {tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Tags>
      )}
      <Image alt={title} src={hero ?? cover} placeholder="blur" />
      <Article>
        <Content />
      </Article>
    </Section>
  );
}
