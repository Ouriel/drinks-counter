import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Returns `false` during SSR and the first client render, then `true` after hydration —
 * without a setState-in-effect. Use to gate UI whose value would otherwise differ between
 * the server render and the client (theme-derived styles, `Date.now()`-based values) and
 * trigger a React hydration mismatch (#418).
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
