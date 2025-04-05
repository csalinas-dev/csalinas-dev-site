import dynamic from "next/dynamic";
const Game = dynamic(() => import("./Game"), { ssr: false });

export const metadata = {
  title: "Wordleverse | Christopher Salinas Jr.",
};

export default function Wordleverse() {
  return <Game />;
}
