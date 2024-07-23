import dynamic from 'next/dynamic'

import { ContextProvider } from "./context";
const Game = dynamic(() => import('./Game'), { ssr: false })

export const metadata = {
  title: "Wordleverse | Christopher Salinas Jr.",
};

export default function Wordleverse() {
  return (
    <ContextProvider>
      <Game />
    </ContextProvider>
  );
}
