import { useEffect, useState, useRef } from "react";

export const useResponsiveTiles = () => {
  const tileRef = useRef(null);
  const [tileSize, setTileSize] = useState(0);

  useEffect(() => {
    const updateTileSize = () => {
      if (tileRef.current) {
        let tileHeight = tileRef.current.offsetHeight;
        if (window.innerWidth < tileHeight * 6) {
          tileHeight = window.innerWidth / 6;
        }
        setTileSize(tileHeight);
      }
    };

    window.addEventListener("resize", updateTileSize);
    updateTileSize();

    return () => {
      window.removeEventListener("resize", updateTileSize);
    };
  }, []);

  return [tileRef, tileSize];
};
