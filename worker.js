export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. API: Save a new flower slug
    if (path === "/api/save" && request.method === "POST") {
      try {
        const { sender, recipient, data } = await request.json();
        if (!sender || !recipient || !data) {
          return new Response("Missing fields", { status: 400 });
        }

        // Generate base slug: sender+recipient (preserve case, clean symbols)
        // We replace characters that aren't letters, numbers or '+' with hyphens
        let baseSlug = `${sender.trim()}+${recipient.trim()}`
          .replace(/[^a-zA-Z0-9+]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-+|-+$/g, ""); // remove leading/trailing hyphens

        let slug = baseSlug;
        let counter = 0;

        // Collision handling: if slug exists, add an incremental number (1, 2, 3...)
        // We check against KV to see if this slug is already taken
        while (await env.KVC.get(slug)) {
          counter++;
          slug = `${baseSlug}${counter}`;
        }

        // Store slug -> flower data mapping
        await env.KVC.put(slug, data);

        return new Response(JSON.stringify({ slug }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response("Error saving: " + e.message, { status: 500 });
      }
    }

    // 2. API: Load flower data by slug
    if (path.startsWith("/api/load/")) {
      const slug = decodeURIComponent(path.split("/api/load/")[1]);
      const data = await env.KVC.get(slug);
      if (data) {
        return new Response(JSON.stringify({ data }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("Not found", { status: 404 });
    }

    // 3. Static Assets & Clean URL handling
    const isFile = path.includes(".");
    const isApi = path.startsWith("/api/");

    if (!isFile && !isApi && path !== "/") {
      // It's a clean URL like /Serkan+Mina
      // We serve index.html (the frontend will parse the slug from pathname)
      return fetch(request); 
    }

    return fetch(request);
  },
};
