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
    console.log("Search response preview:", JSON.stringify(searchData).substring(0, 1000));
    
    const results: any[] = Array.isArray(searchData?.data) ? searchData.data : [];

    const images: { url: string; source: string; trusted: boolean }[] = [];
    const seen = new Set<string>();

    // Helper to add image if valid
    const addImage = (url: string, sourceUrl?: string) => {
      if (!url || typeof url !== "string" || seen.has(url)) return;
      if (!isImageUrl(url)) return;
      seen.add(url);
      images.push({
        url,
        source: getSourceName(sourceUrl || url),
        trusted: isTrustedSource(sourceUrl || url),
      });
    };

    // 2) Extract from search results: og:image, image field, and url
    for (const r of results) {
      // og:image from metadata
      if (r?.metadata?.ogImage) addImage(r.metadata.ogImage, r.url);
      if (r?.metadata?.image) addImage(r.metadata.image, r.url);
      // Direct image URLs
      if (r?.url) addImage(r.url);
      // Some results have thumbnail
      if (r?.thumbnail) addImage(r.thumbnail, r.url);
    }

    console.log(`Images from metadata: ${images.length}`);

    // 3) If we still have too few images, scrape top pages for links
    const wantAtLeast = Math.max(6, Math.min(12, limit + offset));
    if (images.length < wantAtLeast && results.length > 0) {
      const topUrls = results
        .map((r) => r?.url)
        .filter((u): u is string => typeof u === "string" && u.startsWith("http") && !isImageUrl(u))
        .slice(0, 3);

      console.log("Scraping pages for image links:", topUrls);

      const scrapeOne = async (pageUrl: string) => {
        try {
          const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: pageUrl,
              formats: ["links", "markdown"],
            }),
          });

          if (!resp.ok) {
            console.log(`Scrape failed for ${pageUrl}: ${resp.status}`);
            return [];
          }
          
          const d = await resp.json();
          console.log(`Scrape response for ${pageUrl}:`, JSON.stringify(d).substring(0, 500));
          
          // Extract links from response - try multiple paths
          const links: string[] = [];
          if (d?.data?.links) links.push(...d.data.links);
          if (d?.links) links.push(...d.links);
          
          // Also extract image URLs from markdown content
          if (d?.data?.markdown || d?.markdown) {
            const md = d?.data?.markdown || d?.markdown || "";
            const imgRegex = /https?:\/\/[^\s"'<>\)]+\.(jpg|jpeg|png|webp)(\?[^\s"'<>\)]*)?/gi;
            const matches = md.match(imgRegex) || [];
            links.push(...matches);
          }
          
          return links.filter((l): l is string => typeof l === "string");
        } catch (e) {
          console.log(`Scrape error for ${pageUrl}:`, e);
          return [];
        }
      };

      // Run scrapes in parallel with timeout
      const scrapePromises = topUrls.map((u) => 
        Promise.race([
          scrapeOne(u),
          new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 4000))
        ])
      );
      
      const scrapeResults = await Promise.all(scrapePromises);

      for (const links of scrapeResults) {
        for (const link of links) {
          addImage(link);
          if (images.length >= wantAtLeast + 10) break;
        }
      }
    }

    // Sort: trusted first
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
