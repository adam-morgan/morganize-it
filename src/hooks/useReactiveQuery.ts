import { Observable, take } from "rxjs";
import { useAlertSlice, useMaskSlice } from "@/features/app";

export const useReactiveQuery =
  () =>
  <T>(fn: () => Observable<T>, callback: (resp: T) => void, onError?: (error: any) => void) => {
    fn()
      .pipe(take(1))
      .subscribe({
        next: callback,
        error: (e) => {
          if (onError) {
            onError(e);
          }
        },
      });
  };

const MASK_DELAY_MS = 250;
const MASK_MIN_VISIBLE_MS = 400;

export const useReactiveQueryWithMask = () => {
  const { mask } = useMaskSlice();
  const { errorAlert } = useAlertSlice();

  return <T>(
    fn: () => Observable<T>,
    maskText: string,
    callback: (resp: T) => void,
    onError?: (error: any) => void,
    suppressErrorAlert?: boolean
  ) => {
    let completed = false;
    let unmaskFn: (() => void) | null = null;
    let maskShownAt = 0;

    const delayTimer = setTimeout(() => {
      if (!completed) {
        unmaskFn = mask(maskText);
        maskShownAt = Date.now();
      }
    }, MASK_DELAY_MS);

    const cleanup = () => {
      completed = true;
      clearTimeout(delayTimer);

      if (unmaskFn) {
        const remaining = MASK_MIN_VISIBLE_MS - (Date.now() - maskShownAt);
        if (remaining > 0) {
          setTimeout(unmaskFn, remaining);
        } else {
          unmaskFn();
        }
      }
    };

    fn()
      .pipe(take(1))
      .subscribe({
        next: callback,
        complete: cleanup,
        error: (e) => {
          cleanup();

          if (!suppressErrorAlert) {
            errorAlert(e.message);
          }

          if (onError) {
            onError(e);
          }
        },
      });
  };
};
