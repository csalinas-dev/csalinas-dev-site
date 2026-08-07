import Image from "next/image";

import hashtag from "@/assets/hashtag.jpg";

// Decorative, like every other tile — see Wordleverse.jsx on the empty alt.
const HashtagArtwork = () => (
  <Image alt="" fill placeholder="blur" src={hashtag} />
);

export default HashtagArtwork;
