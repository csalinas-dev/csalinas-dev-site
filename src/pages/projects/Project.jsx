import { useParams } from "react-router-dom";
import { Section, Title } from "../../components";

export const Project = () => {
  const { slug } = useParams();
  return (
    <Section>
      <Title>Coming Soon.</Title>
      <div style={{ textAlign: "center", marginTop: "3rem" }}>{slug}</div>
    </Section>
  );
};
