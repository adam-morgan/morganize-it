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
    const unmask = mask(maskText);
    fn()
      .pipe(take(1))
      .subscribe({
        next: callback,
        complete: unmask,
        error: (e) => {
          unmask();

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
