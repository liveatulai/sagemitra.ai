import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Trusted sources for quality images
const TRUSTED_SOURCES = [
  "wikipedia.org",
  "wikimedia.org",
  "britannica.com",
  "biography.com",
  "history.com",
  "getty",
  "alamy",
  "shutterstock",
  "official",
  "gov",
  "edu",
  "museum",
  "archive.org",
  "library",
  "national",
];

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]; // (exclude .gif)

function isImageUrl(url: string) {
  const lower = url.toLowerCase();
  if (lower.includes(".gif")) return false;
  if (lower.includes("wikipedia.org/wiki/file:")) return false;
  return IMAGE_EXTENSIONS.some((ext) => lower.includes(ext));
}

function isTrustedSource(url: string) {
  const lower = url.toLowerCase();
  return TRUSTED_SOURCES.some((source) => lower.includes(source));
}

function getSourceName(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "").split(".")[0];
  } catch {
    return "web";
  }
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    // @ts-ignore - caller may already use abort; this just provides a hard cap
    return await Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), ms),
      ),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, limit = 12, offset = 0, sourceFilter = "all" } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ success: false, error: "Search query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl not configured. Please connect Firecrawl in settings." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1) Fast search (no scraping)
    let searchQuery = `${query} portrait`;
    if (sourceFilter === "wikipedia") searchQuery = `${query} site:wikipedia.org`;
    if (sourceFilter === "official") searchQuery = `${query} official photo`;
    if (sourceFilter === "google") searchQuery = `${query} photo`;

    console.log("Image search (fast):", searchQuery, "limit:", limit, "offset:", offset);

    const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 8, // small for speed
      }),
    });

    if (!searchResp.ok) {
      const errorData = await searchResp.json().catch(() => ({}));
      console.error("Firecrawl search error:", searchResp.status, errorData);
      return new Response(JSON.stringify({ success: false, error: errorData.error || "Search failed" }), {
        status: searchResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchData = await searchResp.json();
    const results: any[] = Array.isArray(searchData?.data) ? searchData.data : [];

    const images: { url: string; source: string; trusted: boolean }[] = [];
    const seen = new Set<string>();

    // 2) Ultra-fast: use metadata og:image when present
    for (const r of results) {
      const og = r?.metadata?.ogImage;
      if (og && typeof og === "string" && !seen.has(og) && isImageUrl(og)) {
        seen.add(og);
        images.push({
          url: og,
          source: getSourceName(r.url || og),
          trusted: isTrustedSource(r.url || og),
        });
      }
      if (r?.url && typeof r.url === "string" && !seen.has(r.url) && isImageUrl(r.url)) {
        seen.add(r.url);
        images.push({ url: r.url, source: getSourceName(r.url), trusted: isTrustedSource(r.url) });
      }
    }

    // 3) If we still have too few images, scrape ONLY top pages (fast + bounded)
    // This restores results without going back to the slow scrape-everything approach.
    const wantAtLeast = Math.max(6, Math.min(12, limit + offset));
    if (images.length < wantAtLeast) {
      const topUrls = results
        .map((r) => r?.url)
        .filter((u) => typeof u === "string" && u.startsWith("http"))
        .slice(0, 3);

      console.log("Scraping top pages for image links:", topUrls.length);

      const scrapeOne = async (url: string) => {
        const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            formats: ["links"],
            onlyMainContent: true,
            // keep it fast; avoid JS waits
          }),
        });

        if (!resp.ok) return { url, links: [] as string[] };
        const d = await resp.json();
        const links = (d?.data?.links || d?.links || []) as string[];
        return { url, links: Array.isArray(links) ? links : [] };
      };

      const scrapeResults = await Promise.allSettled(
        topUrls.map((u) => withTimeout(scrapeOne(u), 3500)),
      );

      for (const settled of scrapeResults) {
        if (settled.status !== "fulfilled") continue;
        const { url, links } = settled.value;
        for (const link of links) {
          if (!link || typeof link !== "string") continue;
          if (!isImageUrl(link)) continue;
          if (seen.has(link)) continue;
          seen.add(link);
          images.push({
            url: link,
            source: getSourceName(link),
            trusted: isTrustedSource(url) || isTrustedSource(link),
          });
          if (images.length >= wantAtLeast + 10) break; // hard cap
        }
      }
    }

    // Sort: trusted first, then stable by host
    images.sort((a, b) => {
      if (a.trusted && !b.trusted) return -1;
      if (!a.trusted && b.trusted) return 1;
      return a.source.localeCompare(b.source);
    });

    const paginatedImages = images.slice(offset, offset + limit);
    const hasMore = images.length > offset + limit;

    console.log(`Returning ${paginatedImages.length} images (total found: ${images.length})`);

    return new Response(
      JSON.stringify({
        success: true,
        images: paginatedImages.map((img) => img.url),
        sources: paginatedImages,
        total: images.length,
        hasMore,
        query: searchQuery,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error searching for images:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Search failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
