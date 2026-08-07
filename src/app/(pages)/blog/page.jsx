import Image from "next/image";

import { FormattedDate, Section, Title } from "@/components";
import { posts } from "@/content/posts";

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

export const metadata = {
  title: "Blog | Christopher Salinas Jr.",
  description:
    "Project write-ups, engineering practice, AI workflows, and assorted tips and tricks from Christopher Salinas Jr.",
};

const Blog = () => (
  <Section sx={{ gap: 4 }}>
    <Title>Blog</Title>
    <Grid>
      {posts.map(
        ({ slug, title, description, date, category, cover, tags = [] }) => (
          <Card key={slug} href={"/blog/" + slug}>
            {cover ? (
              <Cover>
                <Image
                  alt=""
                  src={cover}
                  sizes="(min-width: 1200px) 33vw, (min-width: 720px) 50vw, 100vw"
                  placeholder="blur"
                />
              </Cover>
            ) : (
              <CoverFallback>&lt;/&gt;</CoverFallback>
            )}
            <Body>
              <Category>{category}</Category>
              <CardTitle>{title}</CardTitle>
              <Excerpt>{description}</Excerpt>
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

export default Blog;
