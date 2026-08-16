import { notFound } from "next/navigation";

import { FormattedDate, Link } from "@/components";
import { getAdjacentPosts, getPost } from "@/lib/blog";
// Directly, NOT `@/lib/substack`: the index statically re-exports ./sync, which
// would pull sanitize-html and fast-xml-parser into this route's bundle and run
// auditAllowlist() on the render path.
import { scheduleSubstackRefresh } from "@/lib/substack/refresh";

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
  RemoteHero,
  TitleColon,
  TitleTail,
} from "./components";

// A synced post may arrive between deploys, so the slug set is not knowable at
// build time — and the Docker image runs `next build` before the deploy runs
// `prisma db push`, so nothing here may query then either. Hence no
// `generateStaticParams` and no `dynamicParams`. See src/lib/blog/README.md.
export const dynamic = "force-dynamic";

// Editorial titles are "Lead: tail"; the tail drops to a light weight on its
// own line. Only the first colon splits — a title without one renders whole.
const splitTitle = (title) => {
  const at = title.indexOf(":");
  if (at === -1) return { lead: title, tail: null };
  return { lead: title.slice(0, at), tail: title.slice(at + 1).trim() };
};

// An MDX cover carries its intrinsic size; a synced one is only a URL. No
// canonical is emitted for a synced post: this site owns the URL and the
// metadata, and pointing one at substack.com hands the post's SEO away.
const ogImages = (cover) => {
  if (!cover) return undefined;

  return typeof cover === "string"
    ? [{ url: cover }]
    : [{ url: cover.src, width: cover.width, height: cover.height }];
};

export async function generateMetadata({ params }) {
  // Here as well as in Page: a link to a post that has not synced yet is exactly
  // the case where the trigger matters, and this can notFound() before Page runs.
  // Calling it twice in one request is free — the gate collapses the second call
  // onto the first's promise. See src/lib/substack/refresh.js.
  scheduleSubstackRefresh();

  const { slug } = await params;
  const post = await getPost(slug);

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
      images: ogImages(cover),
    },
  };
}

export default async function Page({ params }) {
  scheduleSubstackRefresh();

  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const {
    title,
    description,
    date,
    category,
    hero,
    link,
    linkLabel,
    readingTime,
    tags = [],
    Content,
    contentHtml,
  } = post;
  const external = /^https?:\/\//.test(link ?? "");
  const { lead, tail } = splitTitle(title);
  const { previous, next } = await getAdjacentPosts(slug);

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
          {category && <RailCategory>{category}</RailCategory>}
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
          {description && <Description>{description}</Description>}
        </div>
      </Grid>
      {hero &&
        (typeof hero === "string" ? (
          <RemoteHero alt={title} src={hero} />
        ) : (
          <Hero alt={title} src={hero} placeholder="blur" priority />
        ))}
      <PostBody>
        {Content ? (
          <Article>
            <Content />
          </Article>
        ) : (
          /* On <Article> ITSELF, never a wrapper div: the drop cap is
             `> p:first-of-type::first-letter` in components.jsx, a direct-child
             selector, and a wrapper would silently kill it. The HTML is the
             artefact src/lib/substack/sanitize.js already produced — there is no
             second sanitization pass here and nothing is relaxed. */
          <Article dangerouslySetInnerHTML={{ __html: contentHtml }} />
        )}
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
