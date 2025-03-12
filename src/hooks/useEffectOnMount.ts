import { useEffect, useRef } from "react";

export const useEffectOnMount = (fn: () => void) => {
  const ref = useRef<boolean>(false);

  useEffect(() => {
    if (!ref.current) {
      ref.current = true;
      fn();
    }
  }, []);
};
