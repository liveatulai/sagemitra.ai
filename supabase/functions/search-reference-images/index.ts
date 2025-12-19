import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Trusted sources for quality images
const TRUSTED_SOURCES = [
  'wikipedia.org',
  'wikimedia.org',
  'britannica.com',
  'biography.com',
  'history.com',
  'getty',
  'alamy',
  'shutterstock',
  'official',
  'gov',
  'edu',
  'museum',
  'archive.org',
  'library',
  'national',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 12, offset = 0, sourceFilter = 'all' } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Search query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured. Please connect Firecrawl in settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search query based on source filter
    let searchQuery = `${query} portrait photo high quality`;
    if (sourceFilter === 'wikipedia') {
      searchQuery = `${query} site:wikipedia.org OR site:wikimedia.org portrait photo`;
    } else if (sourceFilter === 'official') {
      searchQuery = `${query} official portrait photo`;
    } else if (sourceFilter === 'google') {
      searchQuery = `${query} portrait photo image`;
    }
    
    console.log('Searching for reference images:', searchQuery, 'limit:', limit, 'offset:', offset);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: Math.min(limit + offset + 10, 30), // Fetch more to filter
        scrapeOptions: {
          formats: ['links']
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Firecrawl search error:', response.status, errorData);
      return new Response(
        JSON.stringify({ success: false, error: errorData.error || 'Search failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Firecrawl search response:', JSON.stringify(data).substring(0, 500));

    // Extract image URLs from search results
    const images: { url: string; source: string; trusted: boolean }[] = [];
    const seenUrls = new Set<string>();

    // Common image extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const isDirectImageUrl = (url: string) => {
      const lower = url.toLowerCase();
      // Must have image extension AND not be a Wikipedia file page
      const hasImageExt = imageExtensions.some(ext => lower.includes(ext));
      const isWikiFilePage = lower.includes('wikipedia.org/wiki/file:');
      return hasImageExt && !isWikiFilePage;
    };

    // Check if URL is from a trusted source
    const isTrustedSource = (url: string) => {
      const lower = url.toLowerCase();
      return TRUSTED_SOURCES.some(source => lower.includes(source));
    };

    // Get source name from URL
    const getSourceName = (url: string) => {
      try {
        const hostname = new URL(url).hostname;
        return hostname.replace('www.', '').split('.')[0];
      } catch {
        return 'unknown';
      }
    };

    // Process search results to find image URLs
    if (data.data && Array.isArray(data.data)) {
      for (const result of data.data) {
        // Check metadata for og:image first (usually high quality)
        if (result.metadata?.ogImage && !seenUrls.has(result.metadata.ogImage)) {
          const url = result.metadata.ogImage;
          if (isDirectImageUrl(url)) {
            seenUrls.add(url);
            images.push({
              url,
              source: getSourceName(result.url || url),
              trusted: isTrustedSource(result.url || url)
            });
          }
        }

        // Check links from scraped pages
        if (result.links && Array.isArray(result.links)) {
          for (const link of result.links) {
            if (isDirectImageUrl(link) && !seenUrls.has(link)) {
              // Filter for likely portrait/face images
              const lower = link.toLowerCase();
              if (lower.includes('portrait') || lower.includes('photo') || 
                  lower.includes('face') || lower.includes('image') ||
                  lower.includes('wiki') || lower.includes('thumb') ||
                  lower.includes('upload') || lower.includes('media')) {
                seenUrls.add(link);
                images.push({
                  url: link,
                  source: getSourceName(link),
                  trusted: isTrustedSource(link)
                });
              }
            }
          }
        }
      }
    }

    // Sort: trusted sources first, then by source name
    images.sort((a, b) => {
      if (a.trusted && !b.trusted) return -1;
      if (!a.trusted && b.trusted) return 1;
      return a.source.localeCompare(b.source);
    });

    // Apply offset and limit
    const paginatedImages = images.slice(offset, offset + limit);
    const hasMore = images.length > offset + limit;

    console.log(`Found ${images.length} total images, returning ${paginatedImages.length} (offset: ${offset})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        images: paginatedImages.map(img => img.url),
        sources: paginatedImages.map(img => ({ url: img.url, source: img.source, trusted: img.trusted })),
        total: images.length,
        hasMore,
        query: searchQuery
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error searching for images:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Search failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
