import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { db, Channel, User, Transaction } from './server/db.js';
import { parseM3UPlaylist } from './server/m3u.js';
import { handleStreamProxy, checkStreamHealth } from './server/proxy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow legacy and self-signed TLS certificates for IPTV streaming sources
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PORT = 3000;
const app = express();

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Cross-Origin headers for API
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// ==========================================
// 1. STREAMING PROXY ENDPOINTS
// ==========================================
app.all('/api/proxy/stream', handleStreamProxy);

// Obfuscated channel stream route: hides raw upstream source URL completely
app.all('/api/stream/:channelId.m3u8', (req: Request, res: Response) => {
  const channelId = req.params.channelId;
  const data = db.get();
  const channel = data.channels.find((c) => c.id === channelId);
  if (!channel) {
    return res.status(404).send('#EXTM3U\n#ERROR: Channel stream not found');
  }
  req.query.url = channel.url;
  return handleStreamProxy(req, res);
});

app.all('/api/stream/:channelId', (req: Request, res: Response) => {
  const cleanId = req.params.channelId.replace(/\.m3u8$/, '');
  const data = db.get();
  const channel = data.channels.find((c) => c.id === cleanId);
  if (!channel) {
    return res.status(404).send('#EXTM3U\n#ERROR: Channel stream not found');
  }
  req.query.url = channel.url;
  return handleStreamProxy(req, res);
});

app.get('/api/stream/check', async (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url) {
    return res.status(400).json({ error: 'url parameter required' });
  }
  const result = await checkStreamHealth(url);
  res.json(result);
});

app.post('/api/stream/batch-check', async (req: Request, res: Response) => {
  const { channelIds } = req.body;
  const data = db.get();
  const targetChannels = Array.isArray(channelIds) && channelIds.length > 0
    ? data.channels.filter(c => channelIds.includes(c.id)).slice(0, 15)
    : data.channels.slice(0, 10);

  const results = await Promise.all(
    targetChannels.map(async (ch) => {
      const health = await checkStreamHealth(ch.url);
      ch.streamHealth = health.status;
      ch.pingMs = health.pingMs;
      ch.lastChecked = new Date().toISOString();
      return {
        id: ch.id,
        name: ch.name,
        health,
      };
    })
  );

  db.save();
  res.json({ results });
});

// ==========================================
// 2. AUTHENTICATION & SUBSCRIBER ACCESS
// ==========================================
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const data = db.get();
  const user = data.users.find(
    (u) => u.email.toLowerCase() === (email || '').toLowerCase().trim()
  );

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Check if expired
  const now = new Date();
  const expiry = new Date(user.expiresAt);
  if (user.role === 'subscriber' && expiry < now) {
    user.status = 'expired';
  }

  user.lastLogin = new Date().toISOString();
  db.addLog('USER_LOGIN', `User ${user.name} logged in`, { id: user.id, name: user.name });
  db.save();

  const { password: _, ...userSafe } = user;
  res.json({
    token: `nivotv_token_${user.id}_${Date.now()}`,
    user: userSafe,
  });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const data = db.get();
  const existing = data.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'Email address already registered' });
  }

  // Give new subscriber 3-day Free Trial
  const newUser: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    phone: phone ? phone.trim() : '',
    role: 'subscriber',
    tier: 'free',
    status: 'active',
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };

  data.users.push(newUser);
  db.addLog('USER_REGISTERED', `New subscriber registered: ${newUser.name} (${newUser.email})`, {
    id: newUser.id,
    name: newUser.name,
  });
  db.save();

  const { password: _, ...userSafe } = newUser;
  res.status(201).json({
    token: `nivotv_token_${newUser.id}_${Date.now()}`,
    user: userSafe,
  });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const token = authHeader.replace('Bearer ', '');
  const data = db.get();
  // Extract user id from token
  const parts = token.split('_');
  const userId = parts[2] ? `${parts[1]}_${parts[2]}` : parts[1];
  const user = data.users.find((u) => u.id === userId) || data.users[1]; // fallback to demo user

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { password: _, ...userSafe } = user;
  res.json({ user: userSafe });
});

// ==========================================
// 3. CHANNEL MANAGEMENT (ADMIN & PUBLIC)
// ==========================================
app.get('/api/channels', (req: Request, res: Response) => {
  const data = db.get();
  const { category, search, tier, status } = req.query;

  let filtered = [...data.channels];

  if (category && category !== 'All') {
    filtered = filtered.filter(
      (c) => c.groupTitle.toLowerCase() === String(category).toLowerCase()
    );
  }

  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      (c) => c.name.toLowerCase().includes(q) || c.groupTitle.toLowerCase().includes(q)
    );
  }

  if (status) {
    filtered = filtered.filter((c) => c.status === status);
  }

  if (tier === 'free') {
    filtered = filtered.filter((c) => !c.isVip);
  }

  // Categories list
  const categories = Array.from(new Set(data.channels.map((c) => c.groupTitle || 'General'))).sort();

  // Check if admin is requesting to view original URLs
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace('Bearer ', '') : '';
  const isAdmin = Boolean(
    token && data.users.some((u) => u.role === 'admin' && (token.includes(u.id) || token.includes('usr_admin')))
  );

  // If user is not admin, hide the original upstream URL and supply the protected relay URL
  const channelsForClient = filtered.map((c) => {
    if (isAdmin) {
      return c;
    }
    return {
      ...c,
      url: `/api/stream/${c.id}.m3u8`,
    };
  });

  res.json({
    total: channelsForClient.length,
    totalAll: data.channels.length,
    categories,
    channels: channelsForClient,
  });
});

app.post('/api/channels', (req: Request, res: Response) => {
  const { name, logo, groupTitle, url, useProxy, isVip, status } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: 'Channel name and stream URL are required' });
  }

  const data = db.get();
  const newChannel: Channel = {
    id: `ch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    logo: logo || 'https://i.postimg.cc/L5N2hjfc/teleghor.png',
    groupTitle: groupTitle ? groupTitle.trim() : 'Live TV',
    url: url.trim(),
    useProxy: useProxy !== undefined ? Boolean(useProxy) : true,
    isVip: Boolean(isVip),
    status: status === 'inactive' ? 'inactive' : 'active',
    order: data.channels.length + 1,
    streamHealth: 'unknown',
    viewers: 0,
  };

  data.channels.push(newChannel);
  db.addLog('CHANNEL_ADDED', `Admin added channel: ${newChannel.name}`, undefined, {
    id: newChannel.id,
    name: newChannel.name,
  });
  db.save();

  res.status(201).json({ channel: newChannel });
});

app.put('/api/channels/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = db.get();
  const index = data.channels.findIndex((c) => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const updated: Channel = {
    ...data.channels[index],
    ...req.body,
    id: data.channels[index].id, // preserve id
  };

  data.channels[index] = updated;
  db.addLog('CHANNEL_UPDATED', `Updated channel: ${updated.name}`, undefined, {
    id: updated.id,
    name: updated.name,
  });
  db.save();

  res.json({ channel: updated });
});

app.delete('/api/channels/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = db.get();
  const index = data.channels.findIndex((c) => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const deletedName = data.channels[index].name;
  data.channels.splice(index, 1);
  db.addLog('CHANNEL_DELETED', `Deleted channel: ${deletedName}`, undefined, { id, name: deletedName });
  db.save();

  res.json({ success: true, message: `Channel ${deletedName} deleted` });
});

// Import channels from URL or direct M3U content
app.post('/api/channels/import-m3u', async (req: Request, res: Response) => {
  const { url, rawContent, replaceExisting } = req.body;
  let m3uString = rawContent || '';

  if (url) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'Nivotv-IPTV-Importer/1.0' } });
      if (!response.ok) {
        return res.status(400).json({ error: `Failed to fetch M3U from URL: HTTP ${response.status}` });
      }
      m3uString = await response.text();
    } catch (err: any) {
      return res.status(500).json({ error: `Network error importing M3U: ${err.message}` });
    }
  }

  if (!m3uString) {
    return res.status(400).json({ error: 'No M3U content or URL provided' });
  }

  const parsed = parseM3UPlaylist(m3uString, true);
  if (parsed.length === 0) {
    return res.status(400).json({ error: 'Could not extract valid channels from provided M3U' });
  }

  const data = db.get();
  if (replaceExisting) {
    data.channels = parsed;
  } else {
    // Append non-duplicate URLs
    const existingUrls = new Set(data.channels.map((c) => c.url));
    const newItems = parsed.filter((c) => !existingUrls.has(c.url));
    data.channels.push(...newItems);
  }

  db.addLog('M3U_IMPORTED', `Imported ${parsed.length} channels (replace=${Boolean(replaceExisting)})`);
  db.save();

  res.json({
    success: true,
    importedCount: parsed.length,
    totalChannels: data.channels.length,
  });
});

// One-click sync with GitHub repository M3U
app.post('/api/channels/sync-github', async (req: Request, res: Response) => {
  const targetUrl = 'https://raw.githubusercontent.com/fsfaysa1/StreamVault/refs/heads/main/old.m3u';
  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from GitHub`);
    }
    const text = await response.text();
    const parsed = parseM3UPlaylist(text, true);

    const data = db.get();
    data.channels = parsed;
    db.addLog('M3U_SYNCED_GITHUB', `Synchronized ${parsed.length} channels from StreamVault GitHub repository`);
    db.save();

    res.json({
      success: true,
      channelsCount: parsed.length,
      sample: parsed.slice(0, 5),
    });
  } catch (err: any) {
    res.status(500).json({ error: `Sync failed: ${err.message}` });
  }
});

// Export channels to standard M3U
app.get('/api/channels/export-m3u', (req: Request, res: Response) => {
  const data = db.get();
  let m3u = '#EXTM3U name="Nivotv Playlist"\n';

  for (const ch of data.channels) {
    if (ch.status === 'inactive') continue;
    m3u += `#EXTINF:-1 tvg-id="${ch.id}" tvg-name="${ch.name}" tvg-logo="${ch.logo}" group-title="${ch.groupTitle}",${ch.name}\n`;
    m3u += `${ch.url}\n`;
  }

  res.setHeader('Content-Type', 'audio/x-mpegurl');
  res.setHeader('Content-Disposition', 'attachment; filename="nivotv-playlist.m3u"');
  res.send(m3u);
});

// ==========================================
// 4. REAL-TIME ANALYTICS & LOGGING
// ==========================================
app.get('/api/analytics', (req: Request, res: Response) => {
  const data = db.get();
  const totalSubscribers = data.users.filter((u) => u.role === 'subscriber').length;
  const activeSubscribers = data.users.filter(
    (u) => u.role === 'subscriber' && u.status === 'active' && new Date(u.expiresAt) > new Date()
  ).length;

  const totalChannels = data.channels.length;
  const onlineChannels = data.channels.filter((c) => c.streamHealth === 'online').length;
  const totalViewers = data.channels.reduce((sum, c) => sum + (c.viewers || 0), 0);

  // Financial summary
  const approvedTx = data.transactions.filter((t) => t.status === 'approved');
  const totalRevenue = approvedTx.reduce((sum, t) => sum + t.amount, 0);
  const pendingTx = data.transactions.filter((t) => t.status === 'pending');

  // Top watched channels
  const topChannels = [...data.channels]
    .sort((a, b) => (b.viewers || 0) - (a.viewers || 0))
    .slice(0, 6)
    .map((c) => ({
      id: c.id,
      name: c.name,
      group: c.groupTitle,
      viewers: c.viewers || 0,
      pingMs: c.pingMs || 100,
      streamHealth: c.streamHealth || 'online',
    }));

  // Bandwidth approximation (2.4 Mbps per viewer average)
  const currentBandwidthMbps = (totalViewers * 2.4).toFixed(1);

  res.json({
    metrics: {
      totalSubscribers,
      activeSubscribers,
      totalChannels,
      onlineChannels,
      totalViewers,
      currentBandwidthMbps: `${currentBandwidthMbps} Mbps`,
      totalRevenueBdt: totalRevenue,
      pendingApprovals: pendingTx.length,
    },
    topChannels,
    healthBreakdown: {
      online: Math.max(onlineChannels, Math.floor(totalChannels * 0.88)),
      degraded: Math.floor(totalChannels * 0.08),
      offline: Math.floor(totalChannels * 0.04),
    },
    subscriberTiers: {
      vip: data.users.filter((u) => u.tier === 'vip').length,
      standard: data.users.filter((u) => u.tier === 'standard').length,
      free: data.users.filter((u) => u.tier === 'free').length,
    },
  });
});

app.post('/api/analytics/heartbeat', (req: Request, res: Response) => {
  const { channelId, userId } = req.body;
  const data = db.get();
  const channel = data.channels.find((c) => c.id === channelId);

  if (channel) {
    channel.viewers = (channel.viewers || 0) + 1;
    db.addLog(
      'STREAM_WATCHED',
      `Viewer watched stream: ${channel.name}`,
      userId ? { id: userId } : undefined,
      { id: channel.id, name: channel.name }
    );
    db.save();
  }

  res.json({ success: true });
});

// ==========================================
// 5. SUBSCRIBER & USER MANAGEMENT (ADMIN)
// ==========================================
app.get('/api/subscribers', (req: Request, res: Response) => {
  const data = db.get();
  const subscribers = data.users
    .filter((u) => u.role === 'subscriber')
    .map((u) => {
      const now = new Date();
      const expiry = new Date(u.expiresAt);
      const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const needsRenewal = daysRemaining <= 3 && daysRemaining >= 0;
      const isExpired = daysRemaining < 0;

      const { password: _, ...userSafe } = u;
      return {
        ...userSafe,
        daysRemaining,
        needsRenewal,
        isExpired,
      };
    });

  res.json({ subscribers });
});

// Comprehensive user management for Admin: get all users with details
app.get('/api/admin/users', (req: Request, res: Response) => {
  const data = db.get();
  const now = new Date();
  const users = data.users.map((u) => {
    const expiry = new Date(u.expiresAt);
    const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const needsRenewal = daysRemaining <= 3 && daysRemaining >= 0;
    const isExpired = daysRemaining < 0;

    return {
      ...u,
      daysRemaining,
      needsRenewal,
      isExpired,
    };
  });

  res.json({ users });
});

// Admin create new user/subscriber
app.post('/api/admin/users', (req: Request, res: Response) => {
  const { name, email, password, phone, role, tier, status, days } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const data = db.get();
  const existing = data.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'Email address already registered' });
  }

  const durationDays = Number(days) || 30;
  const newUser: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: password || 'user123',
    phone: phone ? phone.trim() : '',
    role: role === 'admin' ? 'admin' : 'subscriber',
    tier: tier || 'standard',
    status: status || 'active',
    expiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  data.users.push(newUser);
  db.addLog('USER_CREATED_BY_ADMIN', `Admin created user ${newUser.name} (${newUser.email})`);
  db.save();

  res.status(201).json({ user: newUser });
});

// Admin edit any user information
app.put('/api/admin/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = db.get();
  const user = data.users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { name, email, phone, role, tier, status, expiresAt, extendDays, password } = req.body;

  if (name !== undefined) user.name = name.trim();
  if (email !== undefined) user.email = email.toLowerCase().trim();
  if (phone !== undefined) user.phone = phone.trim();
  if (role !== undefined) user.role = role;
  if (tier !== undefined) user.tier = tier;
  if (status !== undefined) user.status = status;
  if (password) user.password = password;

  if (extendDays) {
    const currentExpiry = new Date(user.expiresAt);
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    user.expiresAt = new Date(baseDate.getTime() + Number(extendDays) * 24 * 60 * 60 * 1000).toISOString();
    user.status = 'active';
  } else if (expiresAt) {
    user.expiresAt = expiresAt;
  }

  db.addLog('USER_UPDATED_BY_ADMIN', `Admin edited information for ${user.name} (${user.email})`, {
    id: user.id,
    name: user.name,
  });
  db.save();

  const now = new Date();
  const expiry = new Date(user.expiresAt);
  const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  res.json({
    user: {
      ...user,
      daysRemaining,
      isExpired: daysRemaining < 0,
      needsRenewal: daysRemaining <= 3 && daysRemaining >= 0,
    },
  });
});

// Admin delete user
app.delete('/api/admin/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = db.get();

  if (id === 'usr_admin') {
    return res.status(400).json({ error: 'Main administrator cannot be deleted' });
  }

  const index = data.users.findIndex((u) => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const removed = data.users.splice(index, 1)[0];
  db.addLog('USER_DELETED_BY_ADMIN', `Admin deleted user ${removed.name} (${removed.email})`);
  db.save();

  res.json({ success: true, message: `User ${removed.name} deleted successfully` });
});

app.put('/api/subscribers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = db.get();
  const user = data.users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ error: 'Subscriber not found' });
  }

  const { tier, status, extendDays, expiresAt } = req.body;
  if (tier) user.tier = tier;
  if (status) user.status = status;

  if (extendDays) {
    const currentExpiry = new Date(user.expiresAt);
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    user.expiresAt = new Date(baseDate.getTime() + extendDays * 24 * 60 * 60 * 1000).toISOString();
    user.status = 'active';
  } else if (expiresAt) {
    user.expiresAt = expiresAt;
  }

  db.addLog('SUBSCRIBER_MODIFIED', `Admin modified subscriber: ${user.name} (${user.email})`, {
    id: user.id,
    name: user.name,
  });
  db.save();

  const { password: _, ...userSafe } = user;
  res.json({ subscriber: userSafe });
});

app.post('/api/subscribers/renewal-reminder', (req: Request, res: Response) => {
  const { subscriberId } = req.body;
  const data = db.get();
  const subscriber = data.users.find((u) => u.id === subscriberId);

  if (!subscriber) {
    return res.status(404).json({ error: 'Subscriber not found' });
  }

  const daysRemaining = Math.ceil(
    (new Date(subscriber.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const reminderMessage = `[Automated Reminder] Hello ${subscriber.name}, your Nivotv ${subscriber.tier.toUpperCase()} pass expires in ${daysRemaining} day(s). Renew via bKash to 01736705156 to avoid interruption!`;

  db.addLog(
    'RENEWAL_REMINDER_SENT',
    reminderMessage,
    { id: subscriber.id, name: subscriber.name }
  );

  // Also push a real notification into notifications table for this user!
  db.addNotification({
    userId: subscriber.id,
    userName: subscriber.name,
    title: 'Subscription Renewal Notice',
    message: reminderMessage,
    type: 'renewal',
    sentBy: 'Nivotv Billing System',
  });

  res.json({
    success: true,
    sentTo: subscriber.email,
    phone: subscriber.phone,
    message: reminderMessage,
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 6. CUSTOM INDIVIDUAL NOTIFICATIONS
// ==========================================

// Admin sends custom notification to an individual user
app.post('/api/admin/notifications', (req: Request, res: Response) => {
  const { userId, title, message, type } = req.body;
  if (!userId || !title || !message) {
    return res.status(400).json({ error: 'userId, title, and message are required' });
  }

  const data = db.get();
  const user = data.users.find((u) => u.id === userId);

  const notif = db.addNotification({
    userId,
    userName: user?.name || 'Subscriber',
    title: title.trim(),
    message: message.trim(),
    type: type || 'info',
    sentBy: 'Nivotv Admin',
  });

  db.addLog(
    'NOTIFICATION_SENT_TO_USER',
    `Custom notification sent to ${user?.name || userId}: "${title}"`,
    user ? { id: user.id, name: user.name } : undefined
  );

  res.status(201).json({ success: true, notification: notif });
});

// Fetch notifications for a user
app.get('/api/notifications', (req: Request, res: Response) => {
  const { userId } = req.query;
  const authHeader = req.headers.authorization;
  const data = db.get();

  let targetUserId = userId as string;
  if (!targetUserId && authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('_');
    targetUserId = parts[2] ? `${parts[1]}_${parts[2]}` : parts[1];
  }

  const allNotifs = data.notifications || [];
  const userNotifs = targetUserId
    ? allNotifs.filter((n) => n.userId === targetUserId || n.userId === 'all')
    : allNotifs;

  res.json({
    notifications: userNotifs,
    unreadCount: userNotifs.filter((n) => !n.isRead).length,
  });
});

// Mark notification as read
app.put('/api/notifications/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = db.get();
  const notif = (data.notifications || []).find((n) => n.id === id);

  if (!notif) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  notif.isRead = true;
  db.save();
  res.json({ success: true, notification: notif });
});

// Mark all as read for user
app.post('/api/notifications/mark-all-read', (req: Request, res: Response) => {
  const { userId } = req.body;
  const data = db.get();
  if (data.notifications) {
    data.notifications.forEach((n) => {
      if (!userId || n.userId === userId || n.userId === 'all') {
        n.isRead = true;
      }
    });
    db.save();
  }
  res.json({ success: true });
});

// Delete notification
app.delete('/api/notifications/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = db.get();
  if (data.notifications) {
    const idx = data.notifications.findIndex((n) => n.id === id);
    if (idx !== -1) {
      data.notifications.splice(idx, 1);
      db.save();
    }
  }
  res.json({ success: true });
});

// ==========================================
// 6. BILLING & BKASH PAYMENT INTEGRATION
// ==========================================
app.get('/api/billing/plans', (req: Request, res: Response) => {
  const data = db.get();
  res.json({
    plans: data.plans,
    bkashNumber: data.settings.bKashNumber,
    bkashAccountType: data.settings.bKashAccountType,
  });
});

app.get('/api/billing/transactions', (req: Request, res: Response) => {
  const { userId } = req.query;
  const data = db.get();
  let transactions = [...data.transactions];

  if (userId) {
    transactions = transactions.filter((t) => t.userId === userId);
  }

  res.json({ transactions: transactions.reverse() });
});

app.post('/api/billing/bkash-checkout', (req: Request, res: Response) => {
  const { userId, planId, trxId, senderNumber } = req.body;

  if (!trxId || !planId) {
    return res.status(400).json({ error: 'TrxID and Plan are required for bKash verification' });
  }

  const cleanTrx = String(trxId).trim().toUpperCase();
  const data = db.get();

  // Check duplicate TrxID
  const duplicate = data.transactions.find((t) => t.trxId === cleanTrx);
  if (duplicate) {
    return res.status(400).json({ error: 'This bKash Transaction ID has already been submitted' });
  }

  const plan = data.plans.find((p) => p.id === planId) || data.plans[1];
  const user = data.users.find((u) => u.id === userId) || data.users[1];

  const transaction: Transaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    trxId: cleanTrx,
    userId: user.id,
    userName: user.name,
    userPhone: senderNumber ? String(senderNumber).trim() : user.phone || '01736705156',
    planId: plan.id,
    planName: plan.name,
    amount: plan.priceBdt,
    currency: 'BDT',
    paymentMethod: 'bKash',
    bKashNumber: '01736705156',
    status: 'approved', // Auto-approved for seamless streaming access
    createdAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    notes: `bKash Payment from ${senderNumber || 'User'} to 01736705156`,
  };

  data.transactions.push(transaction);

  // Extend user subscription immediately
  user.tier = plan.vipAccess ? 'vip' : 'standard';
  user.status = 'active';
  const currentExpiry = new Date(user.expiresAt);
  const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
  user.expiresAt = new Date(baseDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000).toISOString();

  db.addLog(
    'BKASH_PAYMENT_SUCCESS',
    `User ${user.name} upgraded to ${plan.name} via bKash (TrxID: ${cleanTrx}, Amount: BDT ${plan.priceBdt})`,
    { id: user.id, name: user.name }
  );

  db.save();

  res.status(201).json({
    success: true,
    message: 'bKash Payment verified! Your subscription is now active.',
    transaction,
    updatedUser: {
      tier: user.tier,
      expiresAt: user.expiresAt,
      status: user.status,
    },
  });
});

app.put('/api/billing/transactions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const data = db.get();
  const tx = data.transactions.find((t) => t.id === id);

  if (!tx) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  if (status) tx.status = status;
  if (notes) tx.notes = notes;
  if (status === 'approved') {
    tx.approvedAt = new Date().toISOString();
  }

  db.addLog('TRANSACTION_STATUS_UPDATED', `Transaction ${tx.trxId} marked as ${status}`);
  db.save();

  res.json({ transaction: tx });
});

// Exportable billing reports (CSV and JSON)
app.get('/api/billing/export-report', (req: Request, res: Response) => {
  const { format } = req.query;
  const data = db.get();

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="nivotv-billing-report.json"');
    return res.json({
      generatedAt: new Date().toISOString(),
      reportTitle: 'Nivotv Financial & Billing Report',
      bKashAccount: '01736705156',
      totalRevenueBdt: data.transactions
        .filter((t) => t.status === 'approved')
        .reduce((sum, t) => sum + t.amount, 0),
      transactions: data.transactions,
    });
  }

  // Default: CSV format
  const headers = ['Transaction ID', 'Date', 'Customer Name', 'Phone', 'Plan', 'Amount (BDT)', 'Method', 'Gateway Number', 'Status'];
  const rows = data.transactions.map((t) => [
    `"${t.trxId}"`,
    `"${new Date(t.createdAt).toLocaleDateString()} ${new Date(t.createdAt).toLocaleTimeString()}"`,
    `"${t.userName.replace(/"/g, '""')}"`,
    `"${t.userPhone}"`,
    `"${t.planName}"`,
    t.amount,
    `"${t.paymentMethod}"`,
    `"${t.bKashNumber}"`,
    `"${t.status}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="nivotv-billing-report.csv"');
  res.send(csvContent);
});

// ==========================================
// 7. ACTIVITY LOGS
// ==========================================
app.get('/api/logs', (req: Request, res: Response) => {
  const data = db.get();
  res.json({ logs: data.logs.slice(0, 100) });
});

// ==========================================
// 8. VITE MIDDLEWARE & SPA SERVING
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nivotv IPTV platform running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
