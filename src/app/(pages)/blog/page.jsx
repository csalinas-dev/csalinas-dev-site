import Image from "next/image";

import { FormattedDate, Section, Title } from "@/components";
import { getPosts } from "@/lib/blog";

import {
  Body,
  Card,
  CardTitle,
  Category,
  Cover,
  CoverFallback,
  Excerpt,
  Grid,
  Tag,
  Tags,
} from "./components";

// The listing reads MySQL, and the Docker image runs `next build` before the
// deploy runs `prisma db push` — same reason the Wordleverse leaderboard is
// dynamic. See src/lib/blog/README.md.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Blog | Christopher Salinas Jr.",
  description:
    "Project write-ups, engineering practice, AI workflows, and assorted tips and tricks from Christopher Salinas Jr.",
};

const Blog = async () => {
  const posts = await getPosts();

  return (
    <Section sx={{ gap: 4 }}>
      <Title>Blog</Title>
      <Grid>
        {posts.map(
          ({ slug, title, description, date, category, cover, tags = [] }) => (
            <Card key={slug} href={"/blog/" + slug}>
              {cover ? (
                <Cover>
                  {/* A synced cover is a remote URL string; Cover already sizes
                      any descendant img, so both branches look identical. Not
                      next/image on purpose — see src/lib/blog/README.md. */}
                  {typeof cover === "string" ? (
                    <img alt="" src={cover} loading="lazy" />
                  ) : (
                    <Image
                      alt=""
                      src={cover}
                      sizes="(min-width: 1200px) 33vw, (min-width: 720px) 50vw, 100vw"
                      placeholder="blur"
                    />
                  )}
                </Cover>
              ) : (
                <CoverFallback>&lt;/&gt;</CoverFallback>
              )}
              <Body>
                {category && <Category>{category}</Category>}
                <CardTitle>{title}</CardTitle>
                {description && <Excerpt>{description}</Excerpt>}
                {/* Local midnight, or a YYYY-MM-DD parses as UTC and renders a
                    day early west of Greenwich — same as the Wordleverse header. */}
                <FormattedDate date={new Date(date + "T00:00:00")} />
                {tags.length > 0 && (
                  <Tags>
                    {tags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </Tags>
                )}
              </Body>
            </Card>
          )
        )}
      </Grid>
    </Section>
  );
};

export default Blog;
