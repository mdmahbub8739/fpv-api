// api/index.js
// Vercel Production Server

const BASE_URL = "https://www.freepornvideos.xxx";

// Kotlin ফাইলে ব্যবহৃত হেডার
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Referer": BASE_URL
};

export default async function handler(req, res) {
    const { query } = req;
    const type = query.type;

    // ১. ফ্রন্টএন্ড (ওয়েবসাইট ইন্টারফেস)
    if (!type) {
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>FPV Player</title>
            <style>
                body { background: #121212; color: #eee; font-family: sans-serif; margin: 0; padding: 10px; }
                .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
                .card { background: #222; border-radius: 5px; overflow: hidden; }
                .card img { width: 100%; aspect-ratio: 16/9; object-fit: cover; }
                .card h4 { font-size: 12px; margin: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                #player { display:none; position: fixed; top:0; left:0; width:100%; height:100%; background:black; z-index:999; }
                video { width: 100%; height: 100%; }
                .close-btn { position:absolute; top:20px; right:20px; background:red; color:white; border:none; padding:5px 15px; z-index:1000; }
                button { width:100%; padding:10px; background:#e50914; color:white; border:none; margin-top:10px; font-weight:bold; }
            </style>
        </head>
        <body>
            <h3 style="text-align:center; color:#e50914;">My FPV Site</h3>
            <div id="grid" class="grid"></div>
            <button id="load-btn" onclick="loadMore()">Load More</button>

            <div id="player">
                <button class="close-btn" onclick="closePlayer()">Close</button>
                <video id="video" controls playsinline autoplay></video>
            </div>

            <script>
                let page = 1;
                async function loadMore() {
                    document.getElementById('load-btn').innerText = "Loading...";
                    try {
                        // Vercel API Call
                        const res = await fetch('/api?type=list&page=' + page);
                        const data = await res.json();
                        
                        const grid = document.getElementById('grid');
                        data.videos.forEach(v => {
                            const div = document.createElement('div');
                            div.className = 'card';
                            div.innerHTML = \`<img src="\${v.thumb}" loading="lazy"><h4>\${v.title}</h4>\`;
                            div.onclick = () => playVideo(v.link);
                            grid.appendChild(div);
                        });
                        page++;
                    } catch(e) { alert('Error loading'); }
                    document.getElementById('load-btn').innerText = "Load More";
                }

                async function playVideo(url) {
                    document.getElementById('player').style.display = 'block';
                    try {
                        const res = await fetch('/api?type=stream&url=' + encodeURIComponent(url));
                        const data = await res.json();
                        if(data.url) {
                            document.getElementById('video').src = data.url;
                        } else { alert('Link not found'); closePlayer(); }
                    } catch(e) { closePlayer(); }
                }

                function closePlayer() {
                    document.getElementById('player').style.display = 'none';
                    document.getElementById('video').src = "";
                }

                loadMore();
            </script>
        </body>
        </html>
        `);
    }

    // ২. ব্যাকএন্ড API (Kotlin লজিক)
    try {
        if (type === 'list') {
            const page = query.page || "1";
            const targetUrl = `${BASE_URL}/most-popular/week/${page}/`;
            
            const response = await fetch(targetUrl, { headers: HEADERS });
            const html = await response.text();
            
            const videos = [];
            const regex = /<div[^>]*class=["']item["'][^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*title=["']([^"']+)["'][\s\S]*?<img([^>]+)>/g;
            let match;
            
            while ((match = regex.exec(html)) !== null) {
                const href = match[1];
                const title = match[2];
                const imgAttr = match[3];

                let thumb = "";
                const dSrc = /data-src=["']([^"']+)["']/.exec(imgAttr);
                const lSrc = /data-lazy-src=["']([^"']+)["']/.exec(imgAttr);
                const sSrc = /src=["']([^"']+)["']/.exec(imgAttr);
                if(dSrc) thumb = dSrc[1]; else if(lSrc) thumb = lSrc[1]; else if(sSrc) thumb = sSrc[1];

                videos.push({
                    title: title,
                    link: href.startsWith("http") ? href : BASE_URL + href,
                    thumb: thumb.startsWith("http") ? thumb : BASE_URL + thumb
                });
            }
            return res.status(200).json({ videos });
        }

        if (type === 'stream') {
            const videoUrl = query.url;
            if(!videoUrl) return res.status(400).json({error: "No URL"});

            const pageRes = await fetch(videoUrl, { headers: HEADERS });
            const pageHtml = await pageRes.text();

            const srcMatch = /<source[^>]+src=["']([^"']+)["']/.exec(pageHtml);
            if (srcMatch) {
                const srcUrl = srcMatch[1];
                const check = await fetch(srcUrl, { method: 'HEAD', redirect: 'manual', headers: HEADERS });
                const finalUrl = check.headers.get('location') || srcUrl;
                return res.status(200).json({ url: finalUrl });
            }
            return res.status(404).json({ error: "No Source" });
        }

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
