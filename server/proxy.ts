import { Request, Response } from 'express';
import http from 'http';
import https from 'https';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// Agent with keep-alive
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });

/**
 * Streaming proxy handler for HLS manifest (.m3u8), AES keys, and video segments (.ts/.m4s)
 */
export async function handleStreamProxy(req: Request, res: Response) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(204).end();
  }

  // Extract targetUrl: support obfuscated 'seg' parameter or standard 'url'
  let targetUrl = '';
  if (req.query.seg) {
    try {
      targetUrl = Buffer.from(String(req.query.seg), 'base64url').toString('utf-8');
    } catch {
      targetUrl = '';
    }
  }

  if (!targetUrl) {
    if (req.url.includes('?url=')) {
      const rawUrlPart = req.url.slice(req.url.indexOf('?url=') + 5);
      try {
        targetUrl = decodeURIComponent(rawUrlPart);
      } catch {
        targetUrl = rawUrlPart;
      }
    } else if (req.query.url) {
      targetUrl = String(req.query.url);
    }
  }

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing stream parameters' });
  }

  // Handle IPTV pipe format: http://host/stream.m3u8|User-Agent=XYZ&Referer=ABC
  let customUA = DEFAULT_USER_AGENT;
  let customReferer = '';
  if (targetUrl.includes('|')) {
    const pipeIdx = targetUrl.indexOf('|');
    const pipeOptions = targetUrl.slice(pipeIdx + 1);
    targetUrl = targetUrl.slice(0, pipeIdx).trim();

    if (pipeOptions.includes('User-Agent=')) {
      customUA = pipeOptions.split('User-Agent=')[1].split('&')[0] || DEFAULT_USER_AGENT;
    }
    if (pipeOptions.includes('Referer=')) {
      customReferer = pipeOptions.split('Referer=')[1].split('&')[0] || '';
    }
  }

  let parsedTarget: URL;
  try {
    parsedTarget = new URL(targetUrl);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid URL provided', details: String(err) });
  }

  // Set permissive CORS headers for media player consumption
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

  try {
    const forwardHeaders: Record<string, string> = {
      'User-Agent': customUA,
      'Accept': '*/*',
      'Connection': 'keep-alive',
    };

    // If client requested range, forward it
    if (req.headers.range) {
      forwardHeaders['Range'] = req.headers.range;
    }

    // Set Referer matching origin of stream
    forwardHeaders['Referer'] = customReferer || `${parsedTarget.protocol}//${parsedTarget.host}/`;
    forwardHeaders['Origin'] = `${parsedTarget.protocol}//${parsedTarget.host}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    req.on('close', () => {
      controller.abort();
    });

    const response = await fetch(targetUrl, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: forwardHeaders,
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    const isM3U8 =
      targetUrl.includes('.m3u8') ||
      contentType.includes('mpegurl') ||
      contentType.includes('application/x-mpegurl') ||
      contentType.includes('vnd.apple.mpegurl');

    // If it's an HLS manifest, we parse and rewrite sub-URLs to pass through proxy
    if (isM3U8) {
      const manifestText = await response.text();

      // Check if it really starts with or contains #EXTM3U
      if (manifestText.includes('#EXTM3U')) {
        const rewrittenManifest = rewriteManifest(manifestText, targetUrl);
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.status(200).send(rewrittenManifest);
      } else {
        // Fallback: send text directly
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        return res.status(200).send(manifestText);
      }
    }

    // Otherwise it is a media segment (.ts, .aac, .m4s) or encryption key
    res.status(response.status);

    // Forward relevant headers
    if (contentType) res.setHeader('Content-Type', contentType);
    const contentLength = response.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    const contentRange = response.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);
    const acceptRanges = response.headers.get('accept-ranges');
    if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);

    if (response.body) {
      // @ts-ignore Node 18+ Web ReadableStream to Node stream conversion
      const { Readable } = await import('stream');
      // @ts-ignore
      Readable.fromWeb(response.body).pipe(res);
    } else {
      res.end();
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      // Client closed or timeout
      return;
    }
    console.error(`Proxy stream error for ${targetUrl}:`, error.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Proxy Gateway Error',
        message: error.message || 'Failed to fetch stream segment',
        targetUrl,
      });
    }
  }
}

function buildProxiedUrl(target: string): string {
  // Obfuscate segment target URL so external streaming origins are hidden from user network inspector
  const token = Buffer.from(target, 'utf-8').toString('base64url');
  return `/api/proxy/stream?seg=${token}`;
}

/**
 * Rewrites URLs in an HLS m3u8 playlist so all child playlists, media segments,
 * and AES-128 encryption key URIs pass through the Nivotv server proxy.
 */
export function rewriteManifest(manifest: string, basePlaylistUrl: string): string {
  const lines = manifest.split(/\r?\n/);
  const rewrittenLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      rewrittenLines.push('');
      continue;
    }

    // Don't rewrite if already rewritten
    if (line.startsWith('/api/proxy/stream')) {
      rewrittenLines.push(line);
      continue;
    }

    // Handle AES-128 Key URI rewriting:
    // e.g., #EXT-X-KEY:METHOD=AES-128,URI="https://stream.server/key.bin"
    if (line.startsWith('#EXT-X-KEY:')) {
      const keyUriMatch = line.match(/URI=["']([^"']+)["']/i);
      if (keyUriMatch) {
        const rawKeyUri = keyUriMatch[1];
        try {
          const resolvedKeyUrl = new URL(rawKeyUri, basePlaylistUrl).toString();
          const proxiedKeyUrl = buildProxiedUrl(resolvedKeyUrl);
          const rewrittenKeyLine = line
            .replace(`URI="${rawKeyUri}"`, `URI="${proxiedKeyUrl}"`)
            .replace(`URI='${rawKeyUri}'`, `URI="${proxiedKeyUrl}"`);
          rewrittenLines.push(rewrittenKeyLine);
          continue;
        } catch {
          // keep original
        }
      }
      rewrittenLines.push(line);
      continue;
    }

    // Handle #EXT-X-MAP:URI="..." for fMP4 init segments
    if (line.startsWith('#EXT-X-MAP:')) {
      const mapUriMatch = line.match(/URI=["']([^"']+)["']/i);
      if (mapUriMatch) {
        const rawMapUri = mapUriMatch[1];
        try {
          const resolvedMapUrl = new URL(rawMapUri, basePlaylistUrl).toString();
          const proxiedMapUrl = buildProxiedUrl(resolvedMapUrl);
          const rewrittenMapLine = line
            .replace(`URI="${rawMapUri}"`, `URI="${proxiedMapUrl}"`)
            .replace(`URI='${rawMapUri}'`, `URI="${proxiedMapUrl}"`);
          rewrittenLines.push(rewrittenMapLine);
          continue;
        } catch {
          // keep original
        }
      }
      rewrittenLines.push(line);
      continue;
    }

    // Handle #EXT-X-MEDIA:TYPE=AUDIO/SUBTITLES...,URI="..."
    if (line.startsWith('#EXT-X-MEDIA:')) {
      const mediaUriMatch = line.match(/URI=["']([^"']+)["']/i);
      if (mediaUriMatch) {
        const rawMediaUri = mediaUriMatch[1];
        try {
          const resolvedMediaUrl = new URL(rawMediaUri, basePlaylistUrl).toString();
          const proxiedMediaUrl = buildProxiedUrl(resolvedMediaUrl);
          const rewrittenMediaLine = line
            .replace(`URI="${rawMediaUri}"`, `URI="${proxiedMediaUrl}"`)
            .replace(`URI='${rawMediaUri}'`, `URI="${proxiedMediaUrl}"`);
          rewrittenLines.push(rewrittenMediaLine);
          continue;
        } catch {
          // keep original
        }
      }
      rewrittenLines.push(line);
      continue;
    }

    // If comment or tag, keep unchanged
    if (line.startsWith('#')) {
      rewrittenLines.push(line);
      continue;
    }

    // This is a media segment or sub-playlist URL
    try {
      const resolvedSegmentUrl = new URL(line, basePlaylistUrl).toString();
      const proxiedSegmentUrl = buildProxiedUrl(resolvedSegmentUrl);
      rewrittenLines.push(proxiedSegmentUrl);
    } catch {
      rewrittenLines.push(line);
    }
  }

  return rewrittenLines.join('\n');
}

/**
 * Quick ping / check of stream health
 */
export async function checkStreamHealth(url: string): Promise<{
  status: 'online' | 'degraded' | 'offline';
  pingMs: number;
  httpStatus?: number;
  details?: string;
}> {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        'Range': 'bytes=0-1024',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latency = Date.now() - startTime;

    if (response.ok || response.status === 206) {
      return {
        status: latency < 1500 ? 'online' : 'degraded',
        pingMs: latency,
        httpStatus: response.status,
        details: 'Stream reachable and responding',
      };
    } else {
      return {
        status: 'offline',
        pingMs: latency,
        httpStatus: response.status,
        details: `HTTP error ${response.status}`,
      };
    }
  } catch (err: any) {
    return {
      status: 'offline',
      pingMs: Date.now() - startTime,
      details: err.name === 'AbortError' ? 'Connection timeout' : err.message,
    };
  }
}
