import type { APIRoute } from "astro";

// Blocks all crawlers unless PUBLIC_ALLOW_INDEXING is exactly "true".
export const GET: APIRoute = () => {
  const allow = import.meta.env.PUBLIC_ALLOW_INDEXING === "true";
  const body = allow ? "User-agent: *\nAllow: /\n" : "User-agent: *\nDisallow: /\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
