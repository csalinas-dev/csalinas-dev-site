"use client";

import { Box, Stack, Typography, styled } from "@mui/material";

import {
  Comment,
  Const,
  Function,
  Link,
  Module,
  Numeric,
  String,
  Var,
} from "@/components";

const AboutSection = styled(Stack)`
  padding: 8rem 0;

  h3,
  p {
    font-size: 1.5rem !important;
  }
`;

const Title = ({ children }) => (
  <Typography variant="h4" component="h2" gutterBottom>
    <Comment style={{ fontWeight: "bold" }}>{children}</Comment>
  </Typography>
);

export const About = () => {
  const birthdate = new Date(1995, 6, 13);
  const ageDate = new Date(Date.now() - birthdate);
  const age = Math.abs(ageDate.getUTCFullYear() - 1970);

  return (
    <AboutSection id="about" direction="column" spacing={4}>
      <Box>
        <Title>Crafting Digital Experiences, One Line of Code at a Time</Title>
        <Typography variant="body1">
          Hello, I&apos;m <String>Christopher Salinas Jr.</String>, a dedicated{" "}
          <Const>software engineer</Const> based in{" "}
          <Function>Albuquerque, NM</Function>. My fascination with computers
          began at the young age of <Numeric>7</Numeric>, and since then,
          I&apos;ve been on a continuous quest to unlock the potential of
          technology. Now, at <Numeric>{age}</Numeric>, with a rich history in
          the field since <Numeric>July 2014</Numeric>, my journey is a
          testament to passion and perseverance.
        </Typography>
      </Box>

      <Box>
        <Title>Expertise & Innovation</Title>
        <Typography variant="body1">
          Since joining{" "}
          <Link
            href="https://iteam.consulting"
            target="_blank"
            rel="noreferrer noopener"
          >
            iTEAM Consulting
          </Link>{" "}
          in <Numeric>October 2015</Numeric>, my professional path has been a
          blend of innovation and mastery. My toolbox, filled with technologies
          like <Function>ASP.NET</Function>, <Var>C#</Var>,{" "}
          <Function>NextJS</Function>, <Function>ReactJS</Function>,{" "}
          <Var>JavaScript</Var>, <Var>TypeScript</Var>, <Var>GraphQL</Var>, and{" "}
          <Var>SQL</Var>, is complemented by my proficiency in essential tools
          like <Module>Git</Module>, <Module>GitHub</Module>,{" "}
          <Module>Azure</Module>, <Module>Visual Studio</Module>, and{" "}
          <Module>VS Code</Module>. Alongside these, I also skillfully navigate
          the creative realms with <Module>Adobe Creative Cloud</Module>. Each
          tool, whether it&apos;s for coding efficiency or creative expression,
          is wielded with a blend of precision and enthusiasm, reflecting my
          holistic approach to software development.
        </Typography>
      </Box>

      <Box>
        <Title>A Lens on the World</Title>
        <Typography variant="body1">
          Beyond the world of coding, I pursue my passion for photography,
          capturing life&apos;s fleeting moments and transforming them into
          eternal memories. You can witness this artistic journey at{" "}
          <Link
            href="https://thischristography.com"
            target="_blank"
            rel="noreferrer noopener"
          >
            ThisChristography
          </Link>
          . This pursuit complements my technical skills, reflecting a balance
          between precision and creativity.
        </Typography>
      </Box>

      <Box>
        <Title>A Journey Through Education & Experience</Title>
        <Typography variant="body1">
          My academic path culminated with a{" "}
          <String>Bachelor&apos;s degree</String> in{" "}
          <Const>Computer Science</Const> from the{" "}
          <Function>University of New Mexico</Function> in{" "}
          <Numeric>December 2020</Numeric>, a milestone achieved amid the global
          challenges of the pandemic. This achievement not only represents my
          academic prowess but also my ability to adapt and thrive in changing
          circumstances.
        </Typography>
        <Typography variant="body1">
          At{" "}
          <Link
            href="https://iteam.consulting"
            target="_blank"
            rel="noreferrer noopener"
          >
            iTEAM
          </Link>
          , I have not only contributed to the team but also spearheaded the
          development of bots that automate tedious tasks, especially for a
          mortgage company, showcasing my knack for creating efficient and
          innovative solutions.
        </Typography>
      </Box>

      <Box>
        <Title>Join My Journey</Title>
        <Typography variant="body1">
          My story is one of continuous learning, adapting, and pushing the
          boundaries of what&apos;s possible with technology. Join me on this
          exciting journey as I continue to explore, create, and innovate, one
          project at a time.
        </Typography>
      </Box>
    </AboutSection>
  );
};
