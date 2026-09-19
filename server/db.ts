import fs from 'fs';
import path from 'path';

export interface Channel {
  id: string;
  name: string;
  logo: string;
  groupTitle: string;
  url: string;
  useProxy: boolean;
  isVip: boolean;
  status: 'active' | 'inactive';
  order: number;
  lastChecked?: string;
  streamHealth?: 'online' | 'degraded' | 'offline' | 'unknown';
  pingMs?: number;
  viewers?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role: 'admin' | 'subscriber';
  tier: 'free' | 'standard' | 'vip';
  status: 'active' | 'expired' | 'suspended';
  expiresAt: string;
  createdAt: string;
  lastLogin?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceBdt: number;
  durationDays: number;
  screens: number;
  resolution: string;
  vipAccess: boolean;
  description: string;
}

export interface Transaction {
  id: string;
  trxId: string;
  userId: string;
  userName: string;
  userPhone: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  paymentMethod: 'bKash' | 'manual';
  bKashNumber: string;
  status: 'approved' | 'pending' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  notes?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  action: string;
  channelId?: string;
  channelName?: string;
  ip?: string;
  details?: string;
}

export interface UserNotification {
  id: string;
  userId: string; // Target individual user ID or 'all'
  userName?: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'renewal' | 'special';
  createdAt: string;
  isRead: boolean;
  sentBy?: string;
}

export interface DatabaseSchema {
  channels: Channel[];
  users: User[];
  plans: SubscriptionPlan[];
  transactions: Transaction[];
  logs: ActivityLog[];
  notifications: UserNotification[];
  settings: {
    bKashNumber: string;
    bKashAccountType: string;
    defaultPlaylistUrl: string;
    autoRenewalReminders: boolean;
    reminderDays: number[];
    siteName: string;
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'nivotv_db.json');

// Default subscription plans
const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'free_trial',
    name: 'Free Trial',
    priceBdt: 0,
    durationDays: 3,
    screens: 1,
    resolution: '720p HD',
    vipAccess: false,
    description: '3-day trial access to all public and entertainment channels'
  },
  {
    id: 'standard_monthly',
    name: 'Standard Pass',
    priceBdt: 350,
    durationDays: 30,
    screens: 2,
    resolution: '1080p FHD',
    vipAccess: false,
    description: 'Full 30-day access to 400+ Live TV channels with low-latency proxy'
  },
  {
    id: 'vip_sports_movies',
    name: 'VIP Premium Pro',
    priceBdt: 650,
    durationDays: 30,
    screens: 4,
    resolution: '4K UltraHD',
    vipAccess: true,
    description: 'All channels including Exclusive VIP Sports, Premium Movies, and Priority Proxy Acceleration'
  },
  {
    id: 'annual_unlimited',
    name: 'Annual VIP Pass',
    priceBdt: 3500,
    durationDays: 365,
    screens: 5,
    resolution: '4K UltraHD',
    vipAccess: true,
    description: '365 days of uninterrupted streaming with automated renewal protection'
  }
];

// Initial seeded channels (verified working streams from user's StreamVault repository)
const SEED_CHANNELS: Channel[] = [
  {
    id: 'ch-1',
    name: 'Maasranga Tv',
    logo: 'https://i.postimg.cc/L5N2hjfc/teleghor.png',
    groupTitle: 'Bangla Live TV',
    url: 'https://mtv.sunplex.live/MAASRANGA/tracks-v1a1/mono.m3u8',
    useProxy: true,
    isVip: false,
    status: 'active',
    order: 1,
    streamHealth: 'online',
    pingMs: 120,
    viewers: 142
  },
  {
    id: 'ch-2',
    name: 'Boishakhi TV',
    logo: 'https://i.postimg.cc/L5N2hjfc/teleghor.png',
    groupTitle: 'Bangla Live TV',
    url: 'https://boishakhi.sonarbanglatv.com/boishakhi/boishakhitv/index.m3u8',
    useProxy: true,
    isVip: false,
    status: 'active',
    order: 2,
    streamHealth: 'online',
    pingMs: 95,
    viewers: 98
  },
  {
    id: 'ch-3',
    name: 'A SPOR',
    logo: 'https://i.postimg.cc/L5N2hjfc/teleghor.png',
    groupTitle: 'Sports HD',
    url: 'https://rnttwmjcin.turknet.ercdn.net/lcpmvefbyo/aspor/aspor_480p.m3u8',
    useProxy: true,
    isVip: true,
    status: 'active',
    order: 3,
    streamHealth: 'online',
    pingMs: 140,
    viewers: 320
  },
  {
    id: 'ch-4',
    name: 'Motor Vision',
    logo: 'https://i.postimg.cc/L5N2hjfc/teleghor.png',
    groupTitle: 'Sports HD',
    url: 'https://mvg-mv-xumo.otteravision.com/mvg/mv/mv.m3u8',
    useProxy: true,
    isVip: false,
    status: 'active',
    order: 4,
    streamHealth: 'online',
    pingMs: 110,
    viewers: 85
  },
  {
    id: 'ch-5',
    name: 'Action Hollywood Movies',
    logo: 'https://i.postimg.cc/L5N2hjfc/teleghor.png',
    groupTitle: 'Movies & Cinema',
    url: 'https://amg01076-lightningintern-actionhollywood-samsungnz-82rry.amagi.tv/playlist/amg01076-lightningintern-actionhollywood-samsungnz/playlist.m3u8',
    useProxy: true,
    isVip: true,
    status: 'active',
    order: 5,
    streamHealth: 'online',
    pingMs: 130,
    viewers: 215
  },
  {
    id: 'ch-6',
    name: 'B4U Movies',
    logo: 'https://i.postimg.cc/L5N2hjfc/teleghor.png',
    groupTitle: 'Movies & Cinema',
    url: 'https://amg00877-b4unew-amg00877c2-xiaomi-in-5489.playouts.now.amagi.tv/playlist.m3u8',
    useProxy: true,
    isVip: false,
    status: 'active',
    order: 6,
    streamHealth: 'online',
    pingMs: 155,
    viewers: 178
  },
  {
    id: 'ch-7',
    name: 'Cartoon Network',
    logo: 'https://i.postimg.cc/L5N2hjfc/teleghor.png',
    groupTitle: 'Kids & Family',
    url: 'https://live20.bozztv.com/giatvplayout7/giatv-209624/index.m3u8',
    useProxy: true,
    isVip: false,
    status: 'active',
    order: 7,
    streamHealth: 'online',
    pingMs: 180,
    viewers: 94
  },
  {
    id: 'ch-8',
    name: 'BBC Cbeebies',
    logo: 'https://i.postimg.cc/L5N2hjfc/teleghor.png',
    groupTitle: 'Kids & Family',
    url: 'https://live20.bozztv.com/giatvplayout7/giatv-209622/index.m3u8',
    useProxy: true,
    isVip: false,
    status: 'active',
    order: 8,
    streamHealth: 'online',
    pingMs: 190,
    viewers: 62
  },
  {
    id: 'ch-9',
    name: 'CNN (US)',
    logo: 'https://i.postimg.cc/L5N2hjfc/teleghor.png',
    groupTitle: 'News & Info',
    url: 'https://turnerlive.warnermediacdn.com/hls/live/586495/cnngo/cnn_slate/VIDEO_0_3564000.m3u8',
    useProxy: true,
    isVip: true,
    status: 'active',
    order: 9,
    streamHealth: 'online',
    pingMs: 105,
    viewers: 280
  },
  {
    id: 'ch-10',
    name: 'AL EKHBARIA',
    logo: 'https://i.postimg.cc/L5N2hjfc/teleghor.png',
    groupTitle: 'News & Info',
    url: 'https://cdn-globecast.akamaized.net/live/eds/al_ekhbariya/hls_roku/index.m3u8',
    useProxy: true,
    isVip: false,
    status: 'active',
    order: 10,
    streamHealth: 'online',
    pingMs: 160,
    viewers: 72
  },
  {
    id: 'ch-11',
    name: 'BAHRAIN QURAN',
    logo: 'https://i.postimg.cc/L5N2hjfc/teleghor.png',
    groupTitle: 'Religious & Quran',
    url: 'https://5c7b683162943.streamlock.net/live/ngrp:bahrainquran_all/playlist.m3u8',
    useProxy: true,
    isVip: false,
    status: 'active',
    order: 11,
    streamHealth: 'online',
    pingMs: 115,
    viewers: 130
  },
  {
    id: 'ch-12',
    name: 'Colors Infinity SD',
    logo: 'https://i.postimg.cc/L5N2hjfc/teleghor.png',
    groupTitle: 'Entertainment',
    url: 'https://livecdn.live247stream.com/joomusic/tv/playlist.m3u8',
    useProxy: true,
    isVip: false,
    status: 'active',
    order: 12,
    streamHealth: 'online',
    pingMs: 145,
    viewers: 110
  }
];

class DatabaseManager {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure channels are non-empty
        if (!parsed.channels || parsed.channels.length === 0) {
          parsed.channels = SEED_CHANNELS;
        }
        // Ensure admin credentials always strictly match requested admin@example.com / mrf226
        parsed.users = parsed.users || [];
        const adminIndex = parsed.users.findIndex(
          (u: User) => u.role === 'admin' || u.email === 'admin@example.com' || u.email === 'admin@nivotv.com'
        );
        if (adminIndex >= 0) {
          parsed.users[adminIndex].email = 'admin@example.com';
          parsed.users[adminIndex].password = 'mrf226';
          parsed.users[adminIndex].role = 'admin';
          parsed.users[adminIndex].tier = 'vip';
          parsed.users[adminIndex].status = 'active';
        } else {
          parsed.users.unshift({
            id: 'usr_admin',
            name: 'Nivotv Admin',
            email: 'admin@example.com',
            password: 'mrf226',
            phone: '01736705156',
            role: 'admin',
            tier: 'vip',
            status: 'active',
            expiresAt: '2030-12-31T23:59:59.000Z',
            createdAt: new Date().toISOString()
          });
        }
        if (!parsed.notifications) {
          parsed.notifications = [];
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading database file, initializing defaults:', e);
    }

    const initialData: DatabaseSchema = {
      channels: SEED_CHANNELS,
      users: [
        {
          id: 'usr_admin',
          name: 'Nivotv Admin',
          email: 'admin@example.com',
          password: 'mrf226',
          phone: '01736705156',
          role: 'admin',
          tier: 'vip',
          status: 'active',
          expiresAt: '2030-12-31T23:59:59.000Z',
          createdAt: new Date().toISOString()
        },
        {
          id: 'usr_demo',
          name: 'Rahim Ahmed',
          email: 'subscriber@nivotv.com',
          password: 'user',
          phone: '01711223344',
          role: 'subscriber',
          tier: 'vip',
          status: 'active',
          // Expires in 3 days to demonstrate automated renewal reminders!
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'usr_free',
          name: 'Farhana Kabir',
          email: 'farhana@example.com',
          password: 'user',
          phone: '01899887766',
          role: 'subscriber',
          tier: 'standard',
          status: 'active',
          expiresAt: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString()
        }
      ],
      plans: DEFAULT_PLANS,
      transactions: [
        {
          id: 'tx_1001',
          trxId: 'BKH983A74D',
          userId: 'usr_demo',
          userName: 'Rahim Ahmed',
          userPhone: '01711223344',
          planId: 'vip_sports_movies',
          planName: 'VIP Premium Pro',
          amount: 650,
          currency: 'BDT',
          paymentMethod: 'bKash',
          bKashNumber: '01736705156',
          status: 'approved',
          createdAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString(),
          approvedAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000 + 300000).toISOString(),
          notes: 'Auto-approved bKash Payment'
        },
        {
          id: 'tx_1002',
          trxId: 'BKH827C12F',
          userId: 'usr_free',
          userName: 'Farhana Kabir',
          userPhone: '01899887766',
          planId: 'standard_monthly',
          planName: 'Standard Pass',
          amount: 350,
          currency: 'BDT',
          paymentMethod: 'bKash',
          bKashNumber: '01736705156',
          status: 'approved',
          createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
          approvedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000 + 120000).toISOString(),
          notes: 'Standard 30 Days Pass via bKash'
        }
      ],
      logs: [
        {
          id: 'log_1',
          timestamp: new Date().toISOString(),
          userId: 'usr_admin',
          userName: 'Nivotv Admin',
          action: 'SYSTEM_INITIALIZED',
          details: 'Nivotv core streaming proxy database initialized with verified channels'
        }
      ],
      notifications: [
        {
          id: 'notif_1',
          userId: 'usr_demo',
          userName: 'Rahim Ahmed',
          title: 'Welcome to VIP Streaming!',
          message: 'Your VIP pass has been enabled. Enjoy live 4K streams with zero buffering.',
          type: 'special',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          isRead: false,
          sentBy: 'Nivotv Admin'
        },
        {
          id: 'notif_2',
          userId: 'usr_demo',
          userName: 'Rahim Ahmed',
          title: 'Subscription Renewal Notice',
          message: 'Your VIP pass is set to expire in 3 days. Send ৳650 via bKash to 01736705156 to renew.',
          type: 'renewal',
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          isRead: false,
          sentBy: 'System Bot'
        }
      ],
      settings: {
        bKashNumber: '01736705156',
        bKashAccountType: 'Merchant / Personal Send Money',
        defaultPlaylistUrl: 'https://raw.githubusercontent.com/fsfaysa1/StreamVault/refs/heads/main/old.m3u',
        autoRenewalReminders: true,
        reminderDays: [7, 3, 1],
        siteName: 'Nivotv'
      }
    };

    this.saveData(initialData);
    return initialData;
  }

  private saveData(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file:', e);
    }
  }

  public get(): DatabaseSchema {
    return this.data;
  }

  public save() {
    this.saveData(this.data);
  }

  public addNotification(notification: {
    userId: string;
    userName?: string;
    title: string;
    message: string;
    type?: 'info' | 'alert' | 'renewal' | 'special';
    sentBy?: string;
  }): UserNotification {
    if (!this.data.notifications) {
      this.data.notifications = [];
    }
    const newNotif: UserNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: notification.userId,
      userName: notification.userName,
      title: notification.title,
      message: notification.message,
      type: notification.type || 'info',
      createdAt: new Date().toISOString(),
      isRead: false,
      sentBy: notification.sentBy || 'Nivotv Admin'
    };
    this.data.notifications.unshift(newNotif);
    if (this.data.notifications.length > 500) {
      this.data.notifications = this.data.notifications.slice(0, 500);
    }
    this.save();
    return newNotif;
  }

  public addLog(action: string, details?: string, user?: { id?: string; name?: string }, channel?: { id?: string; name?: string }) {
    const newLog: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      userId: user?.id,
      userName: user?.name,
      action,
      details,
      channelId: channel?.id,
      channelName: channel?.name
    };
    this.data.logs.unshift(newLog);
    if (this.data.logs.length > 500) {
      this.data.logs = this.data.logs.slice(0, 500);
    }
    this.save();
    return newLog;
  }
}

export const db = new DatabaseManager();
