import { useEffect, useState, useRef } from "react";

export const useResponsiveBoards = () => {
  const container = useRef(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const resize = () => {
      if (container.current) {
        setHeight(container.current.offsetHeight);
      }
      setWidth(window.innerWidth - 32);
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("dispatch", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("dispatch", resize);
    };
  }, [container, setHeight, setWidth]);

  return { container, width, height };
};
