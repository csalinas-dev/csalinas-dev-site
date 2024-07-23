import { About } from "./About";
import { GitHub } from "./GitHub";
import { Splash } from "./Splash";

export default function Home() {
  return (
    <main>
      <Splash />
      <About />
      <GitHub />
    </main>
  );
}
