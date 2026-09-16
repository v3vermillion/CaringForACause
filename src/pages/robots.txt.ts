import type { APIRoute } from "astro";

// Link-preview fetchers. Some (X, LinkedIn) respect robots.txt, and iMessage
// identifies as facebookexternalhit and Twitterbot, so they stay allowed while
// search engines are blocked. Previews still need the page to be reachable.
const previewBots = [
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "LinkedInBot",
  "Slackbot",
  "Slackbot-LinkExpanding",
  "Discordbot",
  "WhatsApp",
  "TelegramBot",
];

// Blocks all other crawlers unless PUBLIC_ALLOW_INDEXING is exactly "true".
export const GET: APIRoute = () => {
  const allow = import.meta.env.PUBLIC_ALLOW_INDEXING === "true";
  const body = allow
    ? "User-agent: *\nAllow: /\n"
    : [
        ...previewBots.map((bot) => `User-agent: ${bot}`),
        "Allow: /",
        "",
        "User-agent: *",
        "Disallow: /",
        "",
      ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
