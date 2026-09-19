import { Channel } from '../src/types';

/**
 * Parses raw M3U / M3U8 playlist strings into structured Nivotv Channel models.
 * Handles single-line playlists, multi-line playlists, and embedded tags.
 */
export function parseM3UPlaylist(content: string, defaultProxy: boolean = true): Channel[] {
  const channels: Channel[] = [];
  if (!content) return channels;

  // Split by #EXTINF:
  const items = content.split(/#EXTINF:/i);
  let orderIndex = 1;

  for (let i = 1; i < items.length; i++) {
    const rawChunk = items[i].trim();
    if (!rawChunk) continue;

    // Attributes like tvg-name="...", tvg-logo="...", group-title="..."
    const nameMatch = rawChunk.match(/tvg-name=["']([^"']+)["']/i);
    const logoMatch = rawChunk.match(/tvg-logo=["']([^"']+)["']/i);
    const groupMatch = rawChunk.match(/group-title=["']([^"']+)["']/i);

    let channelName = '';
    let streamUrl = '';

    const lastComma = rawChunk.lastIndexOf(',');
    if (lastComma !== -1) {
      const after = rawChunk.slice(lastComma + 1).trim();
      const urlMatch = after.match(/https?:\/\/[^\s"',<>\\]+$/i);
      if (urlMatch) {
        streamUrl = urlMatch[0].trim();
        channelName = after.replace(/https?:\/\/[^\s"',<>\\]+$/i, '').trim();
      } else {
        // Multi-line scenario
        const lines = after.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length >= 2) {
          channelName = lines[0];
          streamUrl = lines[1];
        } else if (lines.length === 1) {
          if (lines[0].startsWith('http')) {
            streamUrl = lines[0];
          } else {
            channelName = lines[0];
          }
        }
      }
    }

    // Fallback: look for stream URL that is not the logo
    if (!streamUrl) {
      const allUrls = rawChunk.match(/https?:\/\/[^\s"',<>\\]+/gi) || [];
      const logoUrl = logoMatch ? logoMatch[1] : '';
      const candidate = allUrls.filter(u => u !== logoUrl).pop();
      if (candidate) {
        streamUrl = candidate;
      }
    }

    if (!streamUrl) continue;

    if (!channelName && nameMatch) {
      channelName = nameMatch[1].trim();
    }
    if (!channelName) {
      channelName = `Channel ${orderIndex}`;
    }

    const groupTitle = groupMatch ? groupMatch[1].trim() : 'Live TV';
    const logo = logoMatch ? logoMatch[1].trim() : 'https://i.postimg.cc/L5N2hjfc/teleghor.png';

    // Heuristic for VIP channels (sports, premium movies, or 4K/FHD in title)
    const isVip = /spor|sports|cricket|football|cinema|movie|vip|premium|hbo|beIN|t sports/i.test(channelName) ||
                  /sports|movies|cinema/i.test(groupTitle);

    channels.push({
      id: `ch_gen_${orderIndex}_${Math.random().toString(36).substring(2, 6)}`,
      name: channelName,
      logo: logo || 'https://i.postimg.cc/L5N2hjfc/teleghor.png',
      groupTitle: groupTitle || 'Live TV',
      url: streamUrl,
      useProxy: defaultProxy,
      isVip,
      status: 'active',
      order: orderIndex++,
      streamHealth: 'online',
      pingMs: Math.floor(Math.random() * 80) + 70, // Simulated real-world latency
      viewers: Math.floor(Math.random() * 150) + 20,
    });
  }

  return channels;
}

/**
 * Serializes channels back to an M3U format for export.
 */
export function generateM3U(channels: Channel[]): string {
  let m3u = '#EXTM3U\n';
  for (const ch of channels) {
    m3u += `#EXTINF:-1 tvg-id="${ch.id}" tvg-name="${ch.name}" tvg-logo="${ch.logo}" group-title="${ch.groupTitle}",${ch.name}\n${ch.url}\n`;
  }
  return m3u;
}
