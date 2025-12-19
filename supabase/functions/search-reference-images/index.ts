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
        limit: Math.min(limit + 5, 15),
        scrapeOptions: {
          formats: ['links'],
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
    console.log('Firecrawl search response:', JSON.stringify(data).substring(0, 800));

    // Extract image URLs from search results
    const images: { url: string; source: string; trusted: boolean }[] = [];
    const seenUrls = new Set<string>();

    // Supported image extensions (excluding GIF which Gemini doesn't support)
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const isDirectImageUrl = (url: string) => {
      const lower = url.toLowerCase();
      // Check for image extension in URL
      const hasImageExt = imageExtensions.some(ext => lower.includes(ext));
      const isWikiFilePage = lower.includes('wikipedia.org/wiki/file:');
      const isGif = lower.includes('.gif');
      return hasImageExt && !isWikiFilePage && !isGif;
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

    // Helper to extract image URLs from text content
    const extractImageUrls = (text: string) => {
      if (!text) return [];
      const urlRegex = /https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp)(\?[^\s"'<>]*)?/gi;
      const matches = text.match(urlRegex) || [];
      return matches.filter(url => !url.toLowerCase().includes('.gif'));
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

        // Extract images from markdown content
        if (result.markdown) {
          const markdownImages = extractImageUrls(result.markdown);
          for (const imgUrl of markdownImages) {
            if (!seenUrls.has(imgUrl)) {
              seenUrls.add(imgUrl);
              images.push({
                url: imgUrl,
                source: getSourceName(imgUrl),
                trusted: isTrustedSource(imgUrl)
              });
            }
          }
        }

        // Check links from scraped pages
        if (result.links && Array.isArray(result.links)) {
          for (const link of result.links) {
            if (isDirectImageUrl(link) && !seenUrls.has(link)) {
              seenUrls.add(link);
              images.push({
                url: link,
                source: getSourceName(link),
                trusted: isTrustedSource(link)
              });
            }
          }
        }

        // If still no images, try to construct Wikipedia/Wikimedia image URLs from the page URL
        if (result.url && result.url.includes('wikipedia.org')) {
          // Try common Wikipedia image patterns
          const wikiTitle = result.url.split('/wiki/')[1];
          if (wikiTitle) {
            const potentialImageUrl = `https://upload.wikimedia.org/wikipedia/commons/thumb/${wikiTitle.charAt(0).toLowerCase()}/${wikiTitle.substring(0, 2).toLowerCase()}/${encodeURIComponent(wikiTitle)}.jpg/400px-${encodeURIComponent(wikiTitle)}.jpg`;
            // We won't add this since it's unreliable, but log for debugging
            console.log('Wikipedia page found:', result.url);
          }
        }
      }
    }

    // If no images found from scraping, try a direct image search approach
    if (images.length === 0) {
      console.log('No images from scrape, trying image-specific search...');
      
      // Try a more image-focused query
      const imageSearchQuery = `${query} image filetype:jpg OR filetype:png`;
      const imageResponse = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: imageSearchQuery,
          limit: 10,
        }),
      });

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        console.log('Image-specific search response:', JSON.stringify(imageData).substring(0, 500));
        
        if (imageData.data && Array.isArray(imageData.data)) {
          for (const result of imageData.data) {
            // Check og:image from these results
            if (result.metadata?.ogImage && !seenUrls.has(result.metadata.ogImage)) {
              const url = result.metadata.ogImage;
              if (!url.toLowerCase().includes('.gif')) {
                seenUrls.add(url);
                images.push({
                  url,
                  source: getSourceName(result.url || url),
                  trusted: isTrustedSource(result.url || url)
                });
              }
            }
            
            // Also check if the URL itself is an image
            if (result.url && isDirectImageUrl(result.url) && !seenUrls.has(result.url)) {
              seenUrls.add(result.url);
              images.push({
                url: result.url,
                source: getSourceName(result.url),
                trusted: isTrustedSource(result.url)
              });
            }
          }
        }
      }
    }

    console.log(`Extracted ${images.length} images from search results`);

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
