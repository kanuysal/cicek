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

        // Generate base slug: sender&recipient (lowercase, clean)
        let baseSlug = `${sender.trim().toLowerCase()}&${recipient.trim().toLowerCase()}`
          .replace(/[^a-z0-9&]/g, "-") // basic cleaning
          .replace(/-+/g, "-");

        let slug = baseSlug;
        let counter = 0;

        // Collision handling
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
      // It's a clean URL like /serkan&mina
      // We serve index.html (the frontend will parse the slug from pathname)
      // In Cloudflare Pages or similar, we might just return the index.html directly
      return fetch(request); 
    }

    return fetch(request);
  },
};
