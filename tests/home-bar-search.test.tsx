// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import Home from "@/app/[locale]/page";

const api = vi.hoisted(() => ({ searchMenus: vi.fn(), searchBars: vi.fn() }));
vi.mock("@/lib/api", () => ({ api }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

async function type(text: string) {
  const input = container.querySelector("input")!;
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    setValue.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function pressEnter() {
  const form = container.querySelector("input")!.closest("form")!;
  await act(async () => form.requestSubmit());
}

beforeEach(async () => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <Home />
      </NextIntlClientProvider>
    );
  });
  const start = [...container.querySelectorAll("button")].find(
    (button) => button.textContent === messages.home.startCounting
  )!;
  await act(async () => start.click());
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

describe("home bar step search", () => {
  it("typing searches our menus only; Enter searches OpenStreetMap near a ~1 km position", async () => {
    api.searchMenus.mockResolvedValue({ menus: [] });
    api.searchBars.mockResolvedValue({ results: [] });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) =>
          success({ coords: { latitude: 41.38512, longitude: 2.17349 } } as GeolocationPosition),
      },
    });

    await type("paradiso");
    await vi.waitFor(() => expect(api.searchMenus).toHaveBeenCalledWith("paradiso"));
    expect(api.searchBars).not.toHaveBeenCalled();
    expect(container.querySelector("input")!.getAttribute("enterkeyhint")).toBe("search");
    expect(container.textContent).not.toContain(messages.bar.noResultsPhoto); // nothing searched yet

    await pressEnter();
    await vi.waitFor(() => expect(api.searchBars).toHaveBeenCalledTimes(1));
    expect(String(api.searchBars.mock.calls[0][0])).toBe("q=paradiso&lat=41.39&lng=2.17");
    await vi.waitFor(() => expect(container.textContent).toContain(messages.bar.noResultsPhoto));
  });

  it("shows places found on Enter even when a saved menu matches", async () => {
    api.searchMenus.mockResolvedValue({
      menus: [{ id: "1", barName: "Paradiso", items: [{ name: "pastis", category: "spirit" }] }],
    });
    api.searchBars.mockResolvedValue({
      results: [{ name: "Paradiso", address: "Carrer de Rere Palau, Barcelona" }],
    });

    await type("paradiso");
    await vi.waitFor(() => expect(container.textContent).toContain("1 item"));
    await pressEnter();

    await vi.waitFor(() => expect(container.textContent).toContain("Carrer de Rere Palau"));
    expect(container.textContent).toContain("1 item");
  });

  it("drops a slow menus response for an older query", async () => {
    const older = deferred<{ menus: unknown[] }>();
    const latest = deferred<{ menus: unknown[] }>();
    api.searchMenus.mockReturnValueOnce(older.promise).mockReturnValueOnce(latest.promise);
    api.searchBars.mockResolvedValue({ results: [] });
    const menu = (barName: string) => ({ id: barName, barName, items: [] });

    await type("pas");
    await vi.waitFor(() => expect(api.searchMenus).toHaveBeenCalledTimes(1));
    await type("paradiso");
    await vi.waitFor(() => expect(api.searchMenus).toHaveBeenCalledTimes(2));
    await act(async () => latest.resolve({ menus: [menu("Paradiso")] }));
    await act(async () => older.resolve({ menus: [menu("Pastis Bar")] }));

    expect(container.textContent).toContain("Paradiso");
    expect(container.textContent).not.toContain("Pastis Bar");
  });
});
