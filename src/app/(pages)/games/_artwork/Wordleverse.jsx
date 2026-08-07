import Image from "next/image";

import wordleverse from "@/assets/wordleverse.jpg";

// The alt is empty on purpose: the card's own text already says "Play
// Wordleverse", so describing the screenshot only announces the tile twice.
const WordleverseArtwork = () => (
  <Image alt="" fill placeholder="blur" src={wordleverse} />
);

export default WordleverseArtwork;
