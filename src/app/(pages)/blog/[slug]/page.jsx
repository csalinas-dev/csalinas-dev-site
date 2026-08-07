import { notFound } from "next/navigation";

import { FormattedDate, Link } from "@/components";
import { getAdjacentPosts, getPost, getPostSlugs } from "@/content/posts";

import { PostBody } from "./PostBody";
import {
  Article,
  Description,
  Footer,
  FooterLink,
  FooterTitle,
  Grid,
  Header,
  Hero,
  Kicker,
  // Aliased: this module's default export is the route's `Page`.
  Page as PostPage,
  PostTitle,
  Rail,
  RailCategory,
  RailTag,
  RailTags,
  ReadTime,
  TitleColon,
  TitleTail,
} from "./components";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

// Editorial titles are "Lead: tail"; the tail drops to a light weight on its
// own line. Only the first colon splits — a title without one renders whole.
const splitTitle = (title) => {
  const at = title.indexOf(":");
  if (at === -1) return { lead: title, tail: null };
  return { lead: title.slice(0, at), tail: title.slice(at + 1).trim() };
};

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
    description,
    date,
    category,
    cover,
    hero,
    link,
    linkLabel,
    readingTime,
    tags = [],
    Content,
  } = post;
  const external = /^https?:\/\//.test(link ?? "");
  const { lead, tail } = splitTitle(title);
  const { previous, next } = getAdjacentPosts(slug);

  return (
    <PostPage>
      <Header>
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
      </Header>
      <Grid>
        <Rail>
          <RailCategory>{category}</RailCategory>
          {/* Local midnight, or a YYYY-MM-DD parses as UTC and renders a day early
              west of Greenwich — same as the Wordleverse header. */}
          <FormattedDate date={new Date(date + "T00:00:00")} />
          <ReadTime>{readingTime} min read</ReadTime>
          {tags.length > 0 && (
            <RailTags>
              {tags.map((tag) => (
                <RailTag key={tag}>{tag}</RailTag>
              ))}
            </RailTags>
          )}
        </Rail>
        <div>
          <PostTitle>
            {lead}
            {tail !== null && (
              <>
                <TitleColon>:</TitleColon>
                <TitleTail>{tail}</TitleTail>
              </>
            )}
          </PostTitle>
          <Description>{description}</Description>
        </div>
      </Grid>
      <Hero alt={title} src={hero ?? cover} placeholder="blur" priority />
      <PostBody>
        <Article>
          <Content />
        </Article>
      </PostBody>
      <Footer>
        {previous && (
          <FooterLink href={`/blog/${previous.slug}`}>
            <Kicker>← Previous</Kicker>
            <FooterTitle>{previous.title}</FooterTitle>
          </FooterLink>
        )}
        {next && (
          <FooterLink href={`/blog/${next.slug}`} className="next">
            <Kicker>Next →</Kicker>
            <FooterTitle>{next.title}</FooterTitle>
          </FooterLink>
        )}
      </Footer>
    </PostPage>
  );
}
