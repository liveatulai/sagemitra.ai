import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

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

    // Search for portrait images of the person with high accuracy
    const searchQuery = `${query} official portrait photo high quality`;
    console.log('Searching for reference images:', searchQuery);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 10,
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
    const images: string[] = [];
    const seenUrls = new Set<string>();

    // Common image extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const isImageUrl = (url: string) => {
      const lower = url.toLowerCase();
      return imageExtensions.some(ext => lower.includes(ext));
    };

    // Process search results to find image URLs
    if (data.data && Array.isArray(data.data)) {
      for (const result of data.data) {
        // Check links from scraped pages
        if (result.links && Array.isArray(result.links)) {
          for (const link of result.links) {
            if (isImageUrl(link) && !seenUrls.has(link) && images.length < 12) {
              // Filter for likely portrait/face images
              const lower = link.toLowerCase();
              if (lower.includes('portrait') || lower.includes('photo') || 
                  lower.includes('face') || lower.includes('image') ||
                  lower.includes('wiki') || lower.includes('thumb')) {
                seenUrls.add(link);
                images.push(link);
              }
            }
          }
        }
        
        // Also check metadata for og:image
        if (result.metadata?.ogImage && !seenUrls.has(result.metadata.ogImage)) {
          seenUrls.add(result.metadata.ogImage);
          images.push(result.metadata.ogImage);
        }
      }
    }

    // If we didn't find many images, also try to construct Wikipedia image URLs
    if (images.length < 3) {
      // Try common Wikipedia/Wikimedia patterns
      const wikiQuery = query.replace(/\s+/g, '_');
      const wikiImages = [
        `https://upload.wikimedia.org/wikipedia/commons/thumb/${wikiQuery}`,
        `https://en.wikipedia.org/wiki/File:${wikiQuery}.jpg`,
      ];
      // These are just patterns, they may not work
    }

    console.log(`Found ${images.length} reference images`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        images: images.slice(0, 12),
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
