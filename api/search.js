export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey, query, city, cat, minReviews = 100, maxResults = 20 } = req.body;

  if (!apiKey || !query) {
    return res.status(400).json({ error: 'Faltan parámetros: apiKey y query son obligatorios' });
  }

  try {
    const params = new URLSearchParams({
      engine:  'google_maps',
      q:       query,
      type:    'search',
      hl:      'es',
      gl:      'ar',
      api_key: apiKey,
      num:     Math.min(maxResults, 60),
    });

    const serpRes = await fetch(`https://serpapi.com/search?${params}`);

    if (!serpRes.ok) {
      const errText = await serpRes.text();
      return res.status(serpRes.status).json({ error: `SerpAPI error: ${errText.slice(0, 200)}` });
    }

    const data = await serpRes.json();

    if (data.error) {
      return res.status(400).json({ error: data.error });
    }

    const raw = data.local_results ?? [];

    const filtered = raw
      .filter(place => parseReviews(place.reviews) >= minReviews)
      .slice(0, maxResults)
      .map(place => ({
        title:   place.title   ?? '',
        address: place.address ?? '',
        phone:   place.phone   ?? '',
        website: place.website ?? '',
        rating:  place.rating  ?? null,
        reviews: parseReviews(place.reviews),
        type:    place.type ?? place.types?.[0] ?? '',
        hours:   place.hours ?? '',
      }));

    return res.status(200).json({ results: filtered, total_raw: raw.length });

  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({ error: err.message });
  }
}

function parseReviews(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  return parseInt(String(val).replace(/[^0-9]/g, '')) || 0;
}