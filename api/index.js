// api/index.js
// Full Production Code (Frontend + Backend Proxy)

const BASE_URL = "https://www.freepornvideos.xxx";

// Kotlin ফাইল অনুযায়ী হেডার (মোবাইল সিমুলেশন)
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36",
    "Referer": BASE_URL,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
};

export default async function handler(req, res) {
    const { query } = req;
    const type = query.type;

    // =========================================================
    // ১. ফ্রন্টএন্ড (HTML UI) - এটাই ব্রাউজারে লোড হবে
    // =========================================================
    if (!type) {
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>FPV Pro</title>
            <style>
                body { background: #000; color: #fff; font-family: sans-serif; margin: 0; padding: 0; }
                header { background: #b71c1c; padding: 15px; text-align: center; font-weight: bold; position: sticky; top: 0; z-index: 10; }
                .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 8px; }
                .card { background: #1a1a1a; border-radius: 4px; overflow: hidden; position: relative; }
                .card img { width: 100%; aspect-ratio: 16/9; object-fit: cover; background: #333; }
                .card-info { padding: 8px; }
                .title { font-size: 13px; line-height: 1.3; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                
                /* ডিবাগ বক্স (সমস্যা হলে লাল কালিতে দেখাবে) */
                #debug { background: #330000; color: #ff5555; padding: 10px; font-size: 11px; display: none; border-bottom: 1px solid red; }

                #loader { text-align: center; padding: 20px; color: #888; }
                .btn { width: 90%; margin: 10px auto; display: block; padding: 12px; background: #e50914; color: white; border: none; font-weight: bold; border-radius: 4px; }
                
                /* প্লেয়ার স্টাইল */
                #player-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; z-index: 100; }
                video { width: 100%; height: 100%; object-fit: contain; }
                .close-btn { position: absolute; top: 15px; right: 15px; background: rgba(255,0,0,0.8); color: white; border: none; padding: 8px 15px; z-index: 101; border-radius: 4px; }
            </style>
        </head>
        <body>
            <header>FPV MOBILE</header>
            <div id="debug"></div>
            
            <div id="grid" class="grid"></div>
            <div id="loader">Loading...</div>
            <button class="btn" onclick="loadMore()" id="loadBtn" style="display:none">LOAD MORE</button>

            <div id="player-overlay">
                <button class="close-btn" onclick="closePlayer()">CLOSE</button>
                <video id="main-video" controls playsinline></video>
            </div>

            <script>
                let page = 1;
                const debugEl = document.getElementById('debug');

                function log(msg) {
                    debugEl.style.display = 'block';
                    debugEl.innerText += "LOG: " + msg + "\\n";
                }

                async function loadMore() {
                    document.getElementById('loader').style.display = 'block';
                    document.getElementById('loadBtn').style.display = 'none';

                    try {
                        // ব্যাকএন্ডে রিকোয়েস্ট (Proxy Request)
                        const res = await fetch('/api?type=list&page=' + page);
                        const data = await res.json();

                        if (data.error) {
                            log("Server Error: " + data.error);
                            return;
                        }

                        if (!data.videos || data.videos.length === 0) {
                            log("No videos parsed! Site structure might have changed.");
                        } else {
                            const grid = document.getElementById('grid');
                            data.videos.forEach(v => {
                                const div = document.createElement('div');
                                div.className = 'card';
                                div.innerHTML = \`
                                    <img src="\${v.thumb}" loading="lazy">
                                    <div class="card-info"><h3 class="title">\${v.title}</h3></div>
                                \`;
                                div.onclick = () => playVideo(v.link);
                                grid.appendChild(div);
                            });
                            page++;
                        }
                    } catch (e) {
                        log("Fetch Error: " + e.message);
                    }
                    document.getElementById('loader').style.display = 'none';
                    document.getElementById('loadBtn').style.display = 'block';
                }

                async function playVideo(url) {
                    const player = document.getElementById('player-overlay');
                    const video = document.getElementById('main-video');
                    
                    player.style.display = 'block';
                    video.src = ""; 

                    try {
                        const res = await fetch('/api?type=stream&url=' + encodeURIComponent(url));
                        const data = await res.json();
                        
                        if (data.url) {
                            video.src = data.url;
                            video.play();
                        } else {
                            alert("Video URL extraction failed!");
                            closePlayer();
                        }
                    } catch (e) {
                        alert("Stream Error");
                        closePlayer();
                    }
                }

                function closePlayer() {
                    document.getElementById('player-overlay').style.display = 'none';
                    document.getElementById('main-video').pause();
                    document.getElementById('main-video').src = "";
                }

                loadMore();
            </script>
        </body>
        </html>
        `);
    }

    // =========================================================
    // ২. ব্যাকএন্ড লজিক (Kotlin লজিক হুবহু কপি)
    // =========================================================
    try {
        if (type === 'list') {
            const page = query.page || "1";
            const targetUrl = `${BASE_URL}/most-popular/week/${page}/`;
            
            const response = await fetch(targetUrl, { headers: HEADERS });
            if (!response.ok) throw new Error(`Status ${response.status}`);
            
            const html = await response.text();
            const videos = [];

            // Kotlin Selector: #list_videos_common_videos_list_items > div.item
            // আমরা HTML স্প্লিট করে 'div.item' গুলো আলাদা করব, এটা Regex এর চেয়ে নিরাপদ
            const parts = html.split('class="item"');
            
            // প্রথম পার্ট বাদ (কারণ ওটা হেডার)
            for (let i = 1; i < parts.length; i++) {
                const part = parts[i];
                
                // ১. লিংক খোঁজা (href)
                const hrefMatch = /<a[^>]+href=["']([^"']+)["']/.exec(part);
                if (!hrefMatch) continue; // লিংক না থাকলে বাদ
                
                // ২. টাইটেল খোঁজা (Kotlin: strong.title)
                const titleMatch = /class=["']title["'][^>]*>(.*?)<\/strong>/.exec(part);
                
                // ৩. ইমেজ খোঁজা (Kotlin: getImageAttr logic)
                const imgTagMatch = /<img[^>]+>/.exec(part);
                
                if (hrefMatch && imgTagMatch) {
                    const rawLink = hrefMatch[1];
                    const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : "Video";
                    const imgTag = imgTagMatch[0];

                    // ইমেজ অ্যাট্রিবিউট চেক (Kotlin লজিক)
                    let thumb = "";
                    const dSrc = /data-src=["']([^"']+)["']/.exec(imgTag);
                    const lSrc = /data-lazy-src=["']([^"']+)["']/.exec(imgTag);
                    const sSrc = /src=["']([^"']+)["']/.exec(imgTag);

                    if (dSrc) thumb = dSrc[1];
                    else if (lSrc) thumb = lSrc[1];
                    else if (sSrc) thumb = sSrc[1];

                    // Full URL তৈরি
                    const fullLink = rawLink.startsWith("http") ? rawLink : BASE_URL + rawLink;
                    const fullThumb = thumb.startsWith("http") ? thumb : BASE_URL + thumb;

                    videos.push({
                        title: rawTitle,
                        link: fullLink,
                        thumb: fullThumb
                    });
                }
            }

            return res.status(200).json({ videos });
        }

        if (type === 'stream') {
            const videoUrl = query.url;
            if (!videoUrl) return res.status(400).json({ error: "Missing URL" });

            const pageRes = await fetch(videoUrl, { headers: HEADERS });
            const pageHtml = await pageRes.text();

            // Kotlin: document.select("video source")
            const srcMatch = /<source[^>]+src=["']([^"']+)["']/.exec(pageHtml);
            
            if (srcMatch) {
                let srcUrl = srcMatch[1];
                
                // Kotlin: allowRedirects = false এবং Location Header চেক
                try {
                    const check = await fetch(srcUrl, { 
                        method: 'HEAD', 
                        redirect: 'manual', 
                        headers: HEADERS 
                    });
                    
                    const location = check.headers.get('location');
                    if (location) {
                        srcUrl = location;
                    }
                } catch (e) {
                    // হেড রিকোয়েস্ট ফেইল করলে অরিজিনাল ইউআরএল-ই ব্যবহার করব
                }

                return res.status(200).json({ url: srcUrl });
            }
            
            return res.status(404).json({ error: "No video source found." });
        }

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
