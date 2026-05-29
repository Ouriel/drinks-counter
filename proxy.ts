import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlProxy = createMiddleware(routing);

export function proxy(...args: Parameters<typeof intlProxy>) {
  return intlProxy(...args);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
