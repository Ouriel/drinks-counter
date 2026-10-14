import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

// Minimal renderHook (jsdom env): mounts a probe component and exposes the hook's latest value.
// ponytail: no rerender/unmount/wrapper support; switch to @testing-library/react if tests need them.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export function renderHook<T>(hook: () => T) {
  const result = { current: undefined as T };
  function Probe() {
    result.current = hook();
    return null;
  }
  act(() => createRoot(document.createElement("div")).render(createElement(Probe)));
  return { result };
}
