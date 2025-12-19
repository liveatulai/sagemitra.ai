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

    // Build optimized search query - focus on finding pages with images
    let searchQuery = `${query} portrait`;
    if (sourceFilter === 'wikipedia') {
      searchQuery = `${query} site:wikipedia.org`;
    } else if (sourceFilter === 'official') {
      searchQuery = `${query} official photo`;
    } else if (sourceFilter === 'google') {
      searchQuery = `${query} photo`;
    }
    
    console.log('Fast image search:', searchQuery);

    // Single fast API call without scraping
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 10, // Keep small for speed
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Search error:', response.status);
      return new Response(
        JSON.stringify({ success: false, error: errorData.error || 'Search failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    // Extract image URLs quickly
    const images: { url: string; source: string; trusted: boolean }[] = [];
    const seenUrls = new Set<string>();

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const isImageUrl = (url: string) => {
      const lower = url.toLowerCase();
      return imageExtensions.some(ext => lower.includes(ext)) && !lower.includes('.gif');
    };

    const isTrustedSource = (url: string) => {
      const lower = url.toLowerCase();
      return TRUSTED_SOURCES.some(source => lower.includes(source));
    };

    const getSourceName = (url: string) => {
      try {
        return new URL(url).hostname.replace('www.', '').split('.')[0];
      } catch {
        return 'web';
      }
    };

    // Process results - prioritize og:image for speed
    if (data.data && Array.isArray(data.data)) {
      for (const result of data.data) {
        // og:image is the fastest source - already in metadata
        if (result.metadata?.ogImage) {
          const url = result.metadata.ogImage;
          if (!seenUrls.has(url) && !url.toLowerCase().includes('.gif')) {
            seenUrls.add(url);
            images.push({
              url,
              source: getSourceName(result.url || url),
              trusted: isTrustedSource(result.url || url)
            });
          }
        }

        // Check if result URL itself is an image
        if (result.url && isImageUrl(result.url) && !seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          images.push({
            url: result.url,
            source: getSourceName(result.url),
            trusted: isTrustedSource(result.url)
          });
        }
      }
    }

    console.log(`Found ${images.length} images`);

    // Sort: trusted first
    images.sort((a, b) => (b.trusted ? 1 : 0) - (a.trusted ? 1 : 0));

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
