import { useEffect, useRef } from "react";
import { Observable, take } from "rxjs";

export const useReactiveQuery = <T>(fn: () => Observable<T>, callback: (resp: T) => void) => {
  const ref = useRef<boolean>(false);

  useEffect(() => {
    if (!ref.current) {
      ref.current = true;

      fn().pipe(take(1)).subscribe(callback);
    }
  }, []);
};
