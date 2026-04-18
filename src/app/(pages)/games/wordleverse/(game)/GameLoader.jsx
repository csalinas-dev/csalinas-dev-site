"use client";

import dynamic from "next/dynamic";

// ssr: false must live in a Client Component in Next.js 15+
const Game = dynamic(() => import("./Game"), { ssr: false });

export default function GameLoader() {
  return <Game />;
}
