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
  phone?: string;
  role: 'admin' | 'subscriber';
  tier: 'free' | 'standard' | 'vip';
  status: 'active' | 'expired' | 'suspended';
  expiresAt: string;
  createdAt: string;
  lastLogin?: string;
  daysRemaining?: number;
  needsRenewal?: boolean;
  isExpired?: boolean;
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

export interface AnalyticsData {
  metrics: {
    totalSubscribers: number;
    activeSubscribers: number;
    totalChannels: number;
    onlineChannels: number;
    totalViewers: number;
    currentBandwidthMbps: string;
    totalRevenueBdt: number;
    pendingApprovals: number;
  };
  topChannels: Array<{
    id: string;
    name: string;
    group: string;
    viewers: number;
    pingMs: number;
    streamHealth: 'online' | 'degraded' | 'offline';
  }>;
  healthBreakdown: {
    online: number;
    degraded: number;
    offline: number;
  };
  subscriberTiers: {
    vip: number;
    standard: number;
    free: number;
  };
}

export type LanguageCode = 'en' | 'bn' | 'es' | 'hi' | 'ar';

export interface UserNotification {
  id: string;
  userId: string;
  userName?: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'renewal' | 'special';
  createdAt: string;
  isRead: boolean;
  sentBy?: string;
}
