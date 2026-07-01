export type VideoInfo = {
  youtubeId: string
  title: string
  thumbnailUrl: string | null
}

// Parse a YouTube video ID from any common URL format
export function parseYouTubeId(input: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const re of patterns) {
    const m = input.match(re)
    if (m) return m[1]
  }
  // bare 11-char id
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim()
  return null
}

// Fetch video metadata via YouTube oEmbed — no API key required
export async function fetchVideoInfo(youtubeId: string): Promise<VideoInfo | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    return {
      youtubeId,
      title: data.title ?? 'Unknown title',
      thumbnailUrl: data.thumbnail_url ?? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    }
  } catch {
    return null
  }
}

export type SearchResult = {
  youtubeId: string
  title: string
  thumbnailUrl: string
  channelTitle: string
}

// Search YouTube — requires NEXT_PUBLIC_YOUTUBE_API_KEY
export async function searchYouTube(query: string): Promise<SearchResult[]> {
  const key = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
  if (!key) return []
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodeURIComponent(query)}&key=${key}`
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.items ?? []).map((item: any) => ({
    youtubeId: item.id.videoId,
    title: item.snippet.title,
    thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? '',
    channelTitle: item.snippet.channelTitle,
  }))
}
