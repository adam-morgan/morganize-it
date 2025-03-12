import { Observable, take } from "rxjs";
import { useEffectOnMount } from "./useEffectOnMount";

export const useReactiveQuery = <T>(fn: () => Observable<T>, callback: (resp: T) => void) => {
  useEffectOnMount(() => fn().pipe(take(1)).subscribe(callback));
};
