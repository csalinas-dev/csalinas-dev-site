import { useEffect, useState, useRef } from "react";

export const useResponsiveTile = () => {
  const ref = useRef(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    const resize = () => {
      if (ref.current) {
        setSize(ref.current.offsetHeight);
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [ref, setSize]);

  return { ref, size };
};
