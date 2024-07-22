import {
  Comment,
  Const,
  Function,
  Module,
  Numeric,
  Parenthesis,
  Section,
  String,
  Var,
} from "components";

export const About = () => {
  const birthdate = new Date(1995, 6, 13);
  const ageDate = new Date(Date.now() - birthdate);
  const age = Math.abs(ageDate.getUTCFullYear() - 1970);

  return (
    <Section id="about">
      <div>
        <Comment as="h3">
          <strong>
            Crafting Digital Experiences, One Line of Code at a Time
          </strong>
        </Comment>
        <p>
          Hello, I'm <String>Christopher Salinas Jr.</String>, a dedicated{" "}
          <Const>software engineer</Const> based in{" "}
          <Function>Albuquerque, NM</Function>. My fascination with computers
          began at the young age of <Numeric>7</Numeric>, and since then, I've
          been on a continuous quest to unlock the potential of technology. Now,
          at <Numeric>{age}</Numeric>, with a rich history in the field since{" "}
          <Numeric>July 2014</Numeric>, my journey is a testament to passion and
          perseverance.
        </p>
      </div>

      <div>
        <Comment as="h3">Expertise & Innovation</Comment>
        <p>
          Since joining{" "}
          <a
            href="https://iteam.consulting"
            target="_blank"
            rel="noreferrer noopener"
          >
            iTEAM Consulting
          </a>{" "}
          in <Numeric>October 2015</Numeric>, my professional path has been a
          blend of innovation and mastery. My toolbox, filled with technologies
          like <Function>ASP.NET</Function> <Parenthesis>(</Parenthesis>
          <Var>C#</Var>
          <Parenthesis>)</Parenthesis>, <Function>ReactJS</Function>{" "}
          <Parenthesis>(</Parenthesis>
          <Var>TypeScript</Var>
          <Parenthesis>)</Parenthesis>, <Var>GraphQL</Var>, and <Var>SQL</Var>,
          is complemented by my proficiency in essential tools such as{" "}
          <Module>Git</Module>, <Module>GitHub</Module>, <Module>Azure</Module>,
          and <Module>VS Code</Module>. Alongside these, I also skillfully
          navigate the creative realms with the <Module>Adobe Suite</Module>.
          Each tool, whether it's for coding efficiency or creative expression,
          is wielded with a blend of precision and enthusiasm, reflecting my
          holistic approach to software development.
        </p>
      </div>

      <div>
        <Comment as="h3">A Lens on the World</Comment>
        <p>
          Beyond the world of coding, I pursue my passion for photography,
          capturing life's fleeting moments and transforming them into eternal
          memories. You can witness this artistic journey at{" "}
          <a
            href="https://thischristography.com"
            target="_blank"
            rel="noreferrer noopener"
          >
            ThisChristography
          </a>
          . This pursuit complements my technical skills, reflecting a balance
          between precision and creativity.
        </p>
      </div>

      <div>
        <Comment as="h3">A Journey Through Education & Experience</Comment>
        <p>
          My academic path culminated with a <String>Bachelor's degree</String>{" "}
          in <Const>Computer Science</Const> from the{" "}
          <Function>University of New Mexico</Function> in{" "}
          <Numeric>December 2020</Numeric>, a milestone achieved amid the global
          challenges of the pandemic. This achievement not only represents my
          academic prowess but also my ability to adapt and thrive in changing
          circumstances.
        </p>
        <p>
          At{" "}
          <a
            href="https://iteam.consulting"
            target="_blank"
            rel="noreferrer noopener"
          >
            iTEAM
          </a>
          , I have not only contributed to the team but also spearheaded the
          development of bots that automate tedious tasks, especially for a
          mortgage company, showcasing my knack for creating efficient and
          innovative solutions.
        </p>
      </div>

      <div>
        <Comment as="h3">Current Ventures</Comment>
        <p>
          Presently, I am immersed in an ambitious project - developing
          construction management software for a bank. This venture is not just
          about tracking homes being built; it's about laying the foundation for
          future innovations and making a tangible impact in the construction
          process.
        </p>
      </div>

      <div>
        <Comment as="h3">Join My Journey</Comment>
        <p>
          My story is one of continuous learning, adapting, and pushing the
          boundaries of what's possible with technology. Join me on this
          exciting journey as I continue to explore, create, and innovate, one
          project at a time.
        </p>
      </div>
    </Section>
  );
};
