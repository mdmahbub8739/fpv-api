const BASE_URL = "https://www.freepornvideos.xxx";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Referer": BASE_URL
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (path === "/" || path === "") {
        return new Response(JSON.stringify({
          status: "Online",
          usage: "Use /home?page=1 or /stream?url=..." 
        }), { headers: corsHeaders });
      }

      // === HOME PAGE LOGIC ===
      if (path === "/home") {
        const page = url.searchParams.get("page") || "1";
        const targetUrl = `${BASE_URL}/most-popular/week/${page}/`;

        const response = await fetch(targetUrl, { headers: HEADERS });
        if (!response.ok) throw new Error("Source fetch failed");

        const html = await response.text();
        const videos = [];
        
        // Regex to extract video details
        const itemRegex = /<div[^>]*class=["']item["'][^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*title=["']([^"']+)["'][\s\S]*?<img([^>]+)>/g;
        
        let match;
        while ((match = itemRegex.exec(html)) !== null) {
          const href = match[1];
          const title = match[2];
          const imgAttributes = match[3];

          // Image extraction logic
          let posterUrl = "";
          const dataSrc = /data-src=["']([^"']+)["']/.exec(imgAttributes);
          const lazySrc = /data-lazy-src=["']([^"']+)["']/.exec(imgAttributes);
          const src = /src=["']([^"']+)["']/.exec(imgAttributes);

          if (dataSrc) posterUrl = dataSrc[1];
          else if (lazySrc) posterUrl = lazySrc[1];
          else if (src) posterUrl = src[1];

          videos.push({
            title: title,
            link: href.startsWith("http") ? href : `${BASE_URL}${href}`,
            thumbnail: posterUrl.startsWith("http") ? posterUrl : `${BASE_URL}${posterUrl}`
          });
        }

        return new Response(JSON.stringify({ videos }), { headers: corsHeaders });
      }

      // === STREAM LOGIC ===
      if (path === "/stream") {
        const videoUrl = url.searchParams.get("url");
        if (!videoUrl) return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400, headers: corsHeaders });

        const pageResponse = await fetch(videoUrl, { headers: HEADERS });
        const pageHtml = await pageResponse.text();

        const sourceRegex = /<source[^>]+src=["']([^"']+)["'][^>]*label=["']([^"']*)["']?/g;
        let sourceMatch;
        
        // Find the first valid source
        if ((sourceMatch = sourceRegex.exec(pageHtml)) !== null) {
            const srcUrl = sourceMatch[1];
            
            // Bypass Redirect to get real link
            const redirectCheck = await fetch(srcUrl, {
                method: 'HEAD',
                redirect: 'manual',
                headers: HEADERS
            });

            const finalUrl = redirectCheck.headers.get('location') || srcUrl;
            
            return new Response(JSON.stringify({ stream_url: finalUrl }), { headers: corsHeaders });
        }
        
        return new Response(JSON.stringify({ error: "No video found" }), { status: 404, headers: corsHeaders });
      }

      return new Response("Invalid Endpoint", { status: 404, headers: corsHeaders });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
  }
