import { useEffect, useState } from "react";

const breakpoints = [
  { name: "xl", query: "(min-width: 1280px)" },
  { name: "lg", query: "(min-width: 1024px)" },
  { name: "md", query: "(min-width: 768px)" },
  { name: "sm", query: "(min-width: 640px)" },
] as const;

export const useBreakpoint = (): string => {
  const [breakpoint, setBreakpoint] = useState(() => {
    if (typeof window === "undefined") return "xs";
    for (const bp of breakpoints) {
      if (window.matchMedia(bp.query).matches) return bp.name;
    }
    return "xs";
  });

  useEffect(() => {
    const listeners: Array<{ mql: MediaQueryList; handler: () => void }> = [];

    const update = () => {
      for (const bp of breakpoints) {
        if (window.matchMedia(bp.query).matches) {
          setBreakpoint(bp.name);
          return;
        }
      }
      setBreakpoint("xs");
    };

    for (const bp of breakpoints) {
      const mql = window.matchMedia(bp.query);
      const handler = () => update();
      mql.addEventListener("change", handler);
      listeners.push({ mql, handler });
    }

    return () => {
      for (const { mql, handler } of listeners) {
        mql.removeEventListener("change", handler);
      }
    };
  }, []);

  return breakpoint;
};
