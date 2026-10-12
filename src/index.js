// Allowed users/organisations
const ALLOWED_PREFIXES = ["/alydevs/", "/qstxiv/", "/punishxiv/"];
// Allowed path extensions
const ALLOWED_EXTS = [".json", ".png", ".md", ".zip", ".js"];
// Common manifest json path
const MANIFEST_PATH = "/punishxiv/questionable/releases/download/paths-latest/manifest-latest.json";
// User agent for requests to github
const USER_AGENT = "questionable-mirror";
// Redirect url for invalid requests
const REDIR_URL = "https://github.com/PunishXIV/Questionable";

export default {
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname.toLowerCase();

    const ok =
      ALLOWED_PREFIXES.some((p) => path.startsWith(p)) &&
      ALLOWED_EXTS.some((e) => path.endsWith(e));
    if (!ok) return Response.redirect(REDIR_URL, 302);

    const isManifest = path === MANIFEST_PATH;

    const res = await fetch("https://github.com" + url.pathname, {
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
      },
      // short TTL for the manifest so it doesn't lag behind the zip (see below)
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: { "200-299": isManifest ? 60 : 300, "404": 10, "500-599": 0 },
      },
    });

    if (isManifest && res.ok) {
      const data = await res.json();
      if (typeof data.bundleUrl === "string") {
        const u = new URL(data.bundleUrl);
        if (u.hostname === "github.com") {
          u.hostname = url.hostname; // keeps path, drops nothing else
          data.bundleUrl = u.toString();
        }
      }
      const headers = new Headers(res.headers);
      headers.delete("content-length");
      headers.delete("content-encoding");
      headers.delete("content-disposition");
      headers.set("content-type", "application/json; charset=utf-8");
      return new Response(JSON.stringify(data), { status: res.status, headers });
    }

    return new Response(res.body, { status: res.status, headers: res.headers });
  },
};
