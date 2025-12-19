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
  "commons.wikimedia.org",
  "britannica.com",
  "biography.com",
  "history.com",
  "getty",
  "museum",
  "archive.org",
  "library",
  "national",
  "gov",
  "edu",
];

// Sources that frequently return irrelevant / blocked results (and/or are hard to scrape)
const BLOCKED_HOST_HINTS = [
  "pinterest.",
  "instagram.",
  "facebook.",
  "tiktok.",
  "youtube.",
  "adobe.com",
  "shutterstock.",
  "istockphoto.",
  "depositphotos.",
  "alamy.",
];

const BLOCKED_TITLE_HINTS = [
  "jewelry",
  "piercing",
  "shop",
  "buy",
  "song",
  "lyrics",
  "official video",
  "video",
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
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
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
        JSON.stringify({
          success: false,
          error: "Firecrawl not configured. Please connect Firecrawl in settings.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fast + robust search strategy
    // - Keep query as-is (user requested)
    // - Bias to Wikipedia/Wikimedia to avoid irrelevant brand collisions (e.g. "Buddha" jewelry/song)
    // - Make pagination stable by fetching more results as offset grows

    const baseQuery = `${query}`.trim();
    const fetchLimit = Math.min(50, Math.max(12, offset + limit + 12));

    const isBlockedResult = (r: any) => {
      const url = `${r?.url || ""}`.toLowerCase();
      const title = `${r?.title || ""}`.toLowerCase();
      return (
        BLOCKED_HOST_HINTS.some((h) => url.includes(h)) ||
        BLOCKED_TITLE_HINTS.some((h) => title.includes(h))
      );
    };

    const runSearch = async (q: string) => {
      const resp = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: q, limit: fetchLimit }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        console.error("Firecrawl search error:", resp.status, errorData);
        throw new Error(errorData.error || `Search failed (${resp.status})`);
      }

      const d = await resp.json();
      const arr: any[] = Array.isArray(d?.data) ? d.data : [];
      return arr.filter((r) => !isBlockedResult(r));
    };

    const queries: string[] = [];

    if (sourceFilter === "wikipedia") {
      queries.push(`${baseQuery} site:wikipedia.org`);
    } else if (sourceFilter === "official") {
      queries.push(`${baseQuery} official`);
      // extra bias to prevent brand-name collisions
      queries.push(`${baseQuery} site:wikipedia.org`);
    } else {
      // "all" or "google"
      queries.push(`${baseQuery} site:wikipedia.org`);
      queries.push(`${baseQuery} site:wikimedia.org`);
      queries.push(baseQuery);
    }

    console.log("Image search queries:", queries, "limit:", limit, "offset:", offset, "fetchLimit:", fetchLimit);

    const settled = await Promise.allSettled(queries.map((q) => runSearch(q)));
    const results: any[] = [];
    for (const s of settled) {
      if (s.status === "fulfilled") results.push(...s.value);
    }

    // De-dup results by URL
    const seenResultUrl = new Set<string>();
    const uniqueResults = results.filter((r) => {
      const u = `${r?.url || ""}`;
      if (!u) return false;
      if (seenResultUrl.has(u)) return false;
      seenResultUrl.add(u);
      return true;
    });

    const images: { url: string; source: string; trusted: boolean }[] = [];
    const seenImage = new Set<string>();

    const addImage = (url: string, sourceUrl?: string) => {
      if (!url || typeof url !== "string" || seenImage.has(url)) return;
      if (!isImageUrl(url)) return;

      const lower = url.toLowerCase();
      if (BLOCKED_HOST_HINTS.some((h) => lower.includes(h))) return;

      seenImage.add(url);
      images.push({
        url,
        source: getSourceName(sourceUrl || url),
        trusted: isTrustedSource(sourceUrl || url),
      });
    };

    // Extract images from metadata/thumbnail/direct urls
    for (const r of uniqueResults) {
      if (r?.metadata?.ogImage) addImage(r.metadata.ogImage, r.url);
      if (r?.metadata?.image) addImage(r.metadata.image, r.url);
      if (r?.thumbnail) addImage(r.thumbnail, r.url);
      if (r?.url) addImage(r.url, r.url);
    }

    console.log(`Images from metadata: ${images.length}`);

    // Lightweight fallback: scrape ONLY the first Wikipedia/Wikimedia page
    const wantAtLeast = Math.max(6, Math.min(18, offset + limit));
    if (images.length < wantAtLeast) {
      const preferredPage = uniqueResults
        .map((r) => r?.url)
        .find((u: any) =>
          typeof u === "string" &&
          u.startsWith("http") &&
          (u.includes("wikipedia.org/") || u.includes("wikimedia.org/")) &&
          !isImageUrl(u),
        );

      if (preferredPage) {
        console.log("Scraping preferred page for images:", preferredPage);

        try {
          const scrapeResp = await withTimeout(
            fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url: preferredPage,
                formats: ["links", "markdown"],
                onlyMainContent: true,
              }),
            }),
            4500,
          );

          if (!scrapeResp.ok) {
            console.log(`Scrape failed for ${preferredPage}: ${scrapeResp.status}`);
          } else {
            const d = await scrapeResp.json();

            const links: string[] = [];
            if (d?.data?.links) links.push(...d.data.links);
            if (d?.links) links.push(...d.links);

            const md = d?.data?.markdown || d?.markdown || "";
            if (typeof md === "string" && md.length) {
              const imgRegex = /https?:\/\/[^\s"'<>\)]+\.(jpg|jpeg|png|webp)(\?[^\s"'<>\)]*)?/gi;
              links.push(...(md.match(imgRegex) || []));
            }

            for (const l of links) {
              addImage(l, preferredPage);
              if (images.length >= wantAtLeast + 12) break;
            }

            console.log(`Images after preferred scrape: ${images.length}`);
          }
        } catch (e) {
          console.log("Preferred scrape error:", e);
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
        query: baseQuery,
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
