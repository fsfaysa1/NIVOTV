import React, { useState, useEffect } from 'react';
import {
  Tv,
  Users,
  Activity,
  DollarSign,
  FileText,
  Plus,
  RefreshCw,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Trash2,
  Edit,
  Search,
  Bell,
  Zap,
  Filter,
  ExternalLink,
  Shield,
  Smartphone,
  Lock,
  Mail,
  Key,
  Send,
  MessageSquare,
  UserCheck,
  UserX,
  UserPlus,
  Radio,
  Check
} from 'lucide-react';
import { Channel, User, Transaction, ActivityLog, AnalyticsData } from '../types';
import { TranslationDict } from '../i18n/translations';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  t: TranslationDict;
  onRefreshChannels: () => void;
  currentUser?: User | null;
  onAdminLoginSuccess?: (user: User) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  t,
  onRefreshChannels,
  currentUser,
  onAdminLoginSuccess,
}) => {
  if (!isOpen) return null;

  const [adminEmail, setAdminEmail] = useState('admin@example.com');
  const [adminPassword, setAdminPassword] = useState('mrf226');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [activeTab, setActiveTab] = useState<
    'channels' | 'monitoring' | 'subscribers' | 'billing' | 'logs'
  >('channels');

  // Channels state
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchChannel, setSearchChannel] = useState('');
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [newChannel, setNewChannel] = useState<Partial<Channel>>({
    name: '',
    logo: 'https://i.postimg.cc/L5N2hjfc/teleghor.png',
    groupTitle: 'Bangla Live TV',
    url: '',
    useProxy: true,
    isVip: false,
    status: 'active',
  });

  // Monitoring & Analytics
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResults, setPingResults] = useState<any[]>([]);

  // Subscribers & User Management
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'subscriber' | 'admin'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [reminderMsg, setReminderMsg] = useState<string | null>(null);

  // User Edit Modal & Create Form
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'subscriber',
    tier: 'vip',
    status: 'active',
    days: 30,
  });

  // Individual User Notification Modal
  const [notificationModalUser, setNotificationModalUser] = useState<any | null>(null);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'info' | 'renewal' | 'alert' | 'vip'>('info');
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [notifSuccessMsg, setNotifSuccessMsg] = useState<string | null>(null);

  // Billing & Reports
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Logs
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Loading state
  const [loading, setLoading] = useState(false);

  // Fetch initial tab data
  useEffect(() => {
    fetchChannels();
    fetchAnalytics();
    fetchSubscribers();
    fetchTransactions();
    fetchLogs();
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await fetch('/api/channels');
      const data = await res.json();
      setChannels(data.channels || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics');
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        setSubscribers(data.users);
      } else {
        const fallback = await fetch('/api/subscribers');
        const fallbackData = await fallback.json();
        setSubscribers(fallbackData.subscribers || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/billing/transactions');
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Add / Edit Channel
  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingChannel) {
      // Edit
      await fetch(`/api/channels/${editingChannel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingChannel),
      });
      setEditingChannel(null);
    } else {
      // Add
      await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChannel),
      });
      setIsAddingChannel(false);
      setNewChannel({
        name: '',
        logo: 'https://i.postimg.cc/L5N2hjfc/teleghor.png',
        groupTitle: 'Bangla Live TV',
        url: '',
        useProxy: true,
        isVip: false,
        status: 'active',
      });
    }
    fetchChannels();
    onRefreshChannels();
  };

  // Delete channel
  const handleDeleteChannel = async (id: string) => {
    if (!confirm('Are you sure you want to delete this channel?')) return;
    await fetch(`/api/channels/${id}`, { method: 'DELETE' });
    fetchChannels();
    onRefreshChannels();
  };

  // Sync with StreamVault GitHub M3U
  const handleSyncGithub = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/channels/sync-github', { method: 'POST' });
      const data = await res.json();
      alert(`Successfully synchronized ${data.channelsCount} channels from StreamVault GitHub repository!`);
      fetchChannels();
      onRefreshChannels();
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Batch Ping streams
  const handleBatchPing = async () => {
    setIsPinging(true);
    try {
      const res = await fetch('/api/stream/batch-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelIds: channels.slice(0, 12).map((c) => c.id),
        }),
      });
      const data = await res.json();
      setPingResults(data.results || []);
      fetchChannels();
    } catch (err) {
      console.error(err);
    } finally {
      setIsPinging(false);
    }
  };

  // Save edited user information
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingUser.name,
          email: editingUser.email,
          phone: editingUser.phone,
          role: editingUser.role,
          tier: editingUser.tier,
          status: editingUser.status,
          password: editingUser.newPassword || undefined,
        }),
      });
      if (res.ok) {
        setReminderMsg(`User "${editingUser.name}" details updated successfully!`);
        setTimeout(() => setReminderMsg(null), 4000);
        setEditingUser(null);
        fetchSubscribers();
        fetchLogs();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update user');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create new user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm),
      });
      if (res.ok) {
        setReminderMsg(`User "${newUserForm.name}" created successfully!`);
        setTimeout(() => setReminderMsg(null), 4000);
        setIsAddingUser(false);
        setNewUserForm({
          name: '',
          email: '',
          password: '',
          phone: '',
          role: 'subscriber',
          tier: 'vip',
          status: 'active',
          days: 30,
        });
        fetchSubscribers();
        fetchLogs();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create user');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setReminderMsg(`User "${userName}" was deleted.`);
        setTimeout(() => setReminderMsg(null), 4000);
        fetchSubscribers();
        fetchLogs();
      } else {
        const data = await res.json();
        alert(data.error || 'Cannot delete user');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send custom notification to individual user
  const handleSendCustomNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationModalUser || !notifTitle.trim() || !notifMessage.trim()) return;
    setIsSendingNotif(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: notificationModalUser.id,
          title: notifTitle.trim(),
          message: notifMessage.trim(),
          type: notifType,
        }),
      });
      if (res.ok) {
        setNotifSuccessMsg(`Notification sent to ${notificationModalUser.name} successfully!`);
        setTimeout(() => {
          setNotifSuccessMsg(null);
          setNotificationModalUser(null);
          setNotifTitle('');
          setNotifMessage('');
        }, 1800);
        fetchLogs();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to send notification');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingNotif(false);
    }
  };

  // Send renewal reminder to subscriber
  const handleSendReminder = async (subscriberId: string) => {
    try {
      const res = await fetch('/api/subscribers/renewal-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriberId }),
      });
      const data = await res.json();
      setReminderMsg(`Reminder dispatched to ${data.sentTo} (${data.phone})`);
      setTimeout(() => setReminderMsg(null), 4000);
      fetchLogs();
    } catch (err) {
      console.error(err);
    }
  };

  // Extend subscriber pass
  const handleExtendDays = async (subscriberId: string, days: number) => {
    await fetch(`/api/subscribers/${subscriberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extendDays: days, status: 'active' }),
    });
    fetchSubscribers();
  };

  // Approve / Reject transaction
  const handleUpdateTxStatus = async (txId: string, status: 'approved' | 'rejected') => {
    await fetch(`/api/billing/transactions/${txId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchTransactions();
    fetchSubscribers();
  };

  const filteredChannels = channels.filter(
    (c) =>
      c.name.toLowerCase().includes(searchChannel.toLowerCase()) ||
      c.groupTitle.toLowerCase().includes(searchChannel.toLowerCase())
  );

  // Admin Login Handler
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      if (data.user.role !== 'admin') {
        throw new Error('This account does not have administrator privileges');
      }
      if (onAdminLoginSuccess) {
        onAdminLoginSuccess(data.user);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Login failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // If user is not logged in as admin, show dedicated admin authorization modal
  if (currentUser?.role !== 'admin') {
    return (
      <div
        id="admin-auth-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-auth-heading"
      >
        <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700/80 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-500 border border-rose-500/30 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 id="admin-auth-heading" className="font-bold text-base text-white">
                  Admin Command Center
                </h3>
                <p className="text-[11px] text-zinc-400">Restricted administrator access</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleAdminLoginSubmit} className="p-6 space-y-4 text-xs">
            {authError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs">
                {authError}
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/90 space-y-2">
              <span className="text-[11px] font-semibold text-zinc-400 block">
                Administrator Credentials:
              </span>
              <div className="flex items-center justify-between font-mono text-[11px] bg-zinc-900/90 px-3 py-2 rounded-xl border border-zinc-800">
                <span className="text-zinc-300">admin@example.com</span>
                <span className="text-rose-400 font-bold">mrf226</span>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Admin Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl text-white font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Admin Password</label>
              <div className="relative">
                <Key className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl text-white font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 transition flex items-center justify-center gap-2"
            >
              {isAuthenticating ? 'Authenticating...' : 'Unlock Admin Panel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      id="admin-panel-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-panel-heading"
    >
      <div className="relative w-full max-w-6xl h-[90vh] bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-500 border border-rose-500/30 flex items-center justify-center">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 id="admin-panel-heading" className="text-lg font-bold text-white leading-tight">
                Nivotv Admin Command Center
              </h2>
              <p className="text-xs text-zinc-400">
                IPTV Streaming Proxy, Channel Control & Financial Tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition"
            >
              Close Panel
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 bg-zinc-950/60 border-b border-zinc-800/80 flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
          <button
            onClick={() => setActiveTab('channels')}
            className={`px-4 py-3 font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'channels'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Channel Administration ({channels.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`px-4 py-3 font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'monitoring'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Real-time Stream Monitor</span>
          </button>
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`px-4 py-3 font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'subscribers'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Management & Alerts</span>
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`px-4 py-3 font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'billing'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>bKash Billing & Reports</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-3 font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Activity Logs</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-900/60">
          {/* ================================================= */}
          {/* TAB 1: CHANNEL ADMINISTRATION */}
          {/* ================================================= */}
          {activeTab === 'channels' && (
            <div className="space-y-4">
              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/70 p-3.5 rounded-2xl border border-zinc-800">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchChannel}
                    onChange={(e) => setSearchChannel(e.target.value)}
                    placeholder="Search channels..."
                    className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setIsAddingChannel(true);
                      setEditingChannel(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Channel</span>
                  </button>

                  <button
                    onClick={handleSyncGithub}
                    disabled={loading}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center gap-1.5 transition border border-zinc-700"
                    title="Load original M3U playlist from StreamVault GitHub"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-rose-400 ${loading ? 'animate-spin' : ''}`} />
                    <span>Sync StreamVault GitHub M3U</span>
                  </button>

                  <a
                    href="/api/channels/export-m3u"
                    download="nivotv-playlist.m3u"
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center gap-1.5 transition border border-zinc-700"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export M3U</span>
                  </a>
                </div>
              </div>

              {/* Add / Edit Channel Form Modal */}
              {(isAddingChannel || editingChannel) && (
                <div className="p-5 rounded-2xl bg-zinc-950 border border-rose-500/40 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <h3 className="text-sm font-bold text-white">
                      {editingChannel ? `Edit Channel: ${editingChannel.name}` : 'Add New Channel'}
                    </h3>
                    <button
                      onClick={() => {
                        setIsAddingChannel(false);
                        setEditingChannel(null);
                      }}
                      className="text-zinc-400 hover:text-white text-xs"
                    >
                      Cancel
                    </button>
                  </div>

                  <form onSubmit={handleSaveChannel} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-zinc-400 mb-1">Channel Name</label>
                      <input
                        type="text"
                        required
                        value={editingChannel ? editingChannel.name : newChannel.name}
                        onChange={(e) =>
                          editingChannel
                            ? setEditingChannel({ ...editingChannel, name: e.target.value })
                            : setNewChannel({ ...newChannel, name: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-400 mb-1">Category / Group Title</label>
                      <input
                        type="text"
                        value={editingChannel ? editingChannel.groupTitle : newChannel.groupTitle}
                        onChange={(e) =>
                          editingChannel
                            ? setEditingChannel({ ...editingChannel, groupTitle: e.target.value })
                            : setNewChannel({ ...newChannel, groupTitle: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-zinc-400 mb-1">Stream URL (.m3u8)</label>
                      <input
                        type="url"
                        required
                        value={editingChannel ? editingChannel.url : newChannel.url}
                        onChange={(e) =>
                          editingChannel
                            ? setEditingChannel({ ...editingChannel, url: e.target.value })
                            : setNewChannel({ ...newChannel, url: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-400 mb-1">Logo URL (Optional)</label>
                      <input
                        type="url"
                        value={editingChannel ? editingChannel.logo : newChannel.logo}
                        onChange={(e) =>
                          editingChannel
                            ? setEditingChannel({ ...editingChannel, logo: e.target.value })
                            : setNewChannel({ ...newChannel, logo: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="flex items-center gap-6 pt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingChannel ? editingChannel.useProxy : newChannel.useProxy}
                          onChange={(e) =>
                            editingChannel
                              ? setEditingChannel({ ...editingChannel, useProxy: e.target.checked })
                              : setNewChannel({ ...newChannel, useProxy: e.target.checked })
                          }
                          className="w-4 h-4 accent-rose-500"
                        />
                        <span className="text-zinc-200">Enable Proxy Acceleration</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingChannel ? editingChannel.isVip : newChannel.isVip}
                          onChange={(e) =>
                            editingChannel
                              ? setEditingChannel({ ...editingChannel, isVip: e.target.checked })
                              : setNewChannel({ ...newChannel, isVip: e.target.checked })
                          }
                          className="w-4 h-4 accent-amber-500"
                        />
                        <span className="text-amber-400 font-semibold">VIP Pass Required</span>
                      </label>
                    </div>

                    <div className="sm:col-span-2 pt-2">
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition"
                      >
                        {editingChannel ? 'Save Channel Changes' : 'Create Channel'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Channels Table */}
              <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Channel</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Proxy</th>
                      <th className="p-3">Tier</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredChannels.slice(0, 50).map((ch, i) => (
                      <tr key={ch.id} className="hover:bg-zinc-900/40 text-zinc-300">
                        <td className="p-3 text-zinc-500 font-mono">{i + 1}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={ch.logo || 'https://i.postimg.cc/L5N2hjfc/teleghor.png'}
                              alt=""
                              className="w-7 h-7 object-contain bg-zinc-900 rounded p-0.5 border border-zinc-800"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div>
                              <div className="font-semibold text-white">{ch.name}</div>
                              <div className="text-[10px] text-zinc-500 font-mono truncate max-w-[200px]">
                                {ch.url}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-zinc-400">{ch.groupTitle}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ch.useProxy
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {ch.useProxy ? 'Proxy ON' : 'Direct'}
                          </span>
                        </td>
                        <td className="p-3">
                          {ch.isVip ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              VIP
                            </span>
                          ) : (
                            <span className="text-zinc-500 text-[11px]">Free</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ch.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {ch.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingChannel(ch);
                                setIsAddingChannel(false);
                              }}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                              title="Edit Channel"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteChannel(ch.id)}
                              className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 transition"
                              title="Delete Channel"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 2: REAL-TIME STREAM MONITOR */}
          {/* ================================================= */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              {/* Analytics Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <div className="text-xs text-zinc-400 mb-1">{t.activeUsers}</div>
                  <div className="text-2xl font-bold text-white">
                    {analytics?.metrics.activeSubscribers || 2}
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-1">● Concurrency Stable</div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <div className="text-xs text-zinc-400 mb-1">{t.bandwidth}</div>
                  <div className="text-2xl font-bold text-rose-400">
                    {analytics?.metrics.currentBandwidthMbps || '3.4 Gbps'}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">HLS Proxy Acceleration</div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <div className="text-xs text-zinc-400 mb-1">{t.totalStreams}</div>
                  <div className="text-2xl font-bold text-white">
                    {analytics?.metrics.totalChannels || channels.length}
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-1">
                    {analytics?.healthBreakdown.online || 11} Streams Verified
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <div className="text-xs text-zinc-400 mb-1">{t.totalRevenue}</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    ৳ {analytics?.metrics.totalRevenueBdt || 1000} BDT
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">bKash: 01736705156</div>
                </div>
              </div>

              {/* Ping Diagnostic Tool */}
              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Automated Stream Status Ping & Health Diagnostics
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Tests HTTP status, response latency, and manifest availability across top channels
                    </p>
                  </div>
                  <button
                    onClick={handleBatchPing}
                    disabled={isPinging}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-2 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                    <span>{isPinging ? 'Testing Streams...' : 'Ping Stream Health'}</span>
                  </button>
                </div>

                {/* Stream Latency Table */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {channels.slice(0, 12).map((ch) => (
                    <div
                      key={ch.id}
                      className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <div className="font-semibold text-white truncate">{ch.name}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{ch.groupTitle}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-mono text-[11px] text-zinc-400">
                          {ch.pingMs ? `${ch.pingMs}ms` : '110ms'}
                        </span>
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            ch.streamHealth === 'offline'
                              ? 'bg-rose-500'
                              : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 3: USER MANAGEMENT & INDIVIDUAL NOTIFICATIONS */}
          {/* ================================================= */}
          {activeTab === 'subscribers' && (
            <div className="space-y-4">
              {reminderMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between shadow">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="font-medium">{reminderMsg}</span>
                  </div>
                  <button onClick={() => setReminderMsg(null)} className="text-emerald-400 hover:text-white text-xs">
                    Dismiss
                  </button>
                </div>
              )}

              {/* Action Toolbar: Search, Filters, Add User */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      placeholder="Search users by name, email, phone..."
                      className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <select
                    value={userRoleFilter}
                    onChange={(e: any) => setUserRoleFilter(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-rose-500"
                  >
                    <option value="all">All Roles</option>
                    <option value="subscriber">Subscribers Only</option>
                    <option value="admin">Administrators</option>
                  </select>

                  <select
                    value={userStatusFilter}
                    onChange={(e: any) => setUserStatusFilter(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-rose-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddingUser(true)}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add New User</span>
                  </button>
                  <button
                    onClick={fetchSubscribers}
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition"
                    title="Refresh user records"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-3">User & Credentials</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Plan / Tier</th>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Expiry & Status</th>
                      <th className="p-3 text-right">User Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {subscribers
                      .filter((u) => {
                        const q = searchUser.toLowerCase();
                        const matchesSearch =
                          u.name.toLowerCase().includes(q) ||
                          u.email.toLowerCase().includes(q) ||
                          (u.phone && u.phone.toLowerCase().includes(q));
                        const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
                        const matchesStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
                        return matchesSearch && matchesRole && matchesStatus;
                      })
                      .map((u) => {
                        const isPrimaryAdmin = u.id === 'usr_admin';
                        return (
                          <tr key={u.id} className="hover:bg-zinc-900/40 text-zinc-300">
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center font-bold text-xs text-white">
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-white flex items-center gap-1.5">
                                    <span>{u.name}</span>
                                    {isPrimaryAdmin && (
                                      <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                                        Owner
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-zinc-400 font-mono">{u.email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                                  u.role === 'admin'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-zinc-800 text-zinc-300'
                                }`}
                              >
                                {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                                {u.role.toUpperCase()}
                              </span>
                            </td>

                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  u.tier === 'vip'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : u.tier === 'standard'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}
                              >
                                {u.tier?.toUpperCase() || 'FREE'}
                              </span>
                            </td>

                            <td className="p-3 font-mono text-zinc-400">
                              {u.phone || '01736705156'}
                            </td>

                            <td className="p-3">
                              <div className="space-y-1">
                                <div className="font-mono text-[11px] text-zinc-300">
                                  {new Date(u.expiresAt).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                      u.status === 'active'
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : 'bg-rose-500/20 text-rose-400'
                                    }`}
                                  >
                                    {u.status}
                                  </span>
                                  {u.daysRemaining !== undefined && (
                                    <span
                                      className={`text-[10px] font-medium ${
                                        u.daysRemaining <= 3
                                          ? 'text-rose-400 font-bold animate-pulse'
                                          : 'text-zinc-400'
                                      }`}
                                    >
                                      ({u.daysRemaining}d left)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Send Custom Notification */}
                                <button
                                  onClick={() => {
                                    setNotificationModalUser(u);
                                    setNotifTitle('');
                                    setNotifMessage('');
                                    setNotifType('info');
                                    setNotifSuccessMsg(null);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-[11px] font-medium flex items-center gap-1 transition"
                                  title="Send custom notification to this user"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Notify</span>
                                </button>

                                {/* Edit User Information */}
                                <button
                                  onClick={() => setEditingUser({ ...u, newPassword: '' })}
                                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                                  title="Edit user information"
                                >
                                  <Edit className="w-3.5 h-3.5 text-blue-400" />
                                </button>

                                {/* Quick Extend 30 Days */}
                                <button
                                  onClick={() => handleExtendDays(u.id, 30)}
                                  className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium transition"
                                  title="Extend subscription by 30 days"
                                >
                                  +30d
                                </button>

                                {/* Delete User (Disabled for primary admin) */}
                                {!isPrimaryAdmin && (
                                  <button
                                    onClick={() => handleDeleteUser(u.id, u.name)}
                                    className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 transition"
                                    title="Delete user"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* ================================================= */}
              {/* MODAL 1: EDIT USER INFORMATION */}
              {/* ================================================= */}
              {editingUser && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                  role="dialog"
                  aria-modal="true"
                >
                  <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                          <Edit className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-white">Edit User Information</h3>
                          <p className="text-[11px] text-zinc-400">Update profile, role, status, or credentials</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingUser(null)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveEditUser} className="p-5 space-y-3.5 text-xs">
                      <div>
                        <label className="block text-zinc-400 mb-1 font-medium">Full Name</label>
                        <input
                          type="text"
                          required
                          value={editingUser.name}
                          onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-400 mb-1 font-medium">Email Address</label>
                        <input
                          type="email"
                          required
                          value={editingUser.email}
                          onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-400 mb-1 font-medium">bKash Phone Number</label>
                        <input
                          type="text"
                          value={editingUser.phone || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                          placeholder="01736705156"
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-rose-500 font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-zinc-400 mb-1 font-medium">Role</label>
                          <select
                            value={editingUser.role}
                            onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
                          >
                            <option value="subscriber">Subscriber</option>
                            <option value="admin">Administrator</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-zinc-400 mb-1 font-medium">Subscription Tier</label>
                          <select
                            value={editingUser.tier}
                            onChange={(e) => setEditingUser({ ...editingUser, tier: e.target.value })}
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
                          >
                            <option value="vip">VIP Pass</option>
                            <option value="standard">Standard</option>
                            <option value="free">Free</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-zinc-400 mb-1 font-medium">Account Status</label>
                          <select
                            value={editingUser.status}
                            onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
                          >
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-zinc-400 mb-1 font-medium">Reset Password (Optional)</label>
                          <input
                            type="text"
                            placeholder="Leave blank to keep"
                            value={editingUser.newPassword || ''}
                            onChange={(e) => setEditingUser({ ...editingUser, newPassword: e.target.value })}
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
                          />
                        </div>
                      </div>

                      <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setEditingUser(null)}
                          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* ================================================= */}
              {/* MODAL 2: ADD NEW USER */}
              {/* ================================================= */}
              {isAddingUser && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                  role="dialog"
                  aria-modal="true"
                >
                  <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                          <UserPlus className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-white">Create New User</h3>
                          <p className="text-[11px] text-zinc-400">Register a new subscriber or admin account</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsAddingUser(false)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleCreateUser} className="p-5 space-y-3.5 text-xs">
                      <div>
                        <label className="block text-zinc-400 mb-1 font-medium">Full Name</label>
                        <input
                          type="text"
                          required
                          value={newUserForm.name}
                          onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                          placeholder="e.g. Tanvir Ahmed"
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-400 mb-1 font-medium">Email Address</label>
                        <input
                          type="email"
                          required
                          value={newUserForm.email}
                          onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                          placeholder="tanvir@example.com"
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-zinc-400 mb-1 font-medium">Password</label>
                          <input
                            type="text"
                            required
                            value={newUserForm.password}
                            onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                            placeholder="user123"
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
                          />
                        </div>

                        <div>
                          <label className="block text-zinc-400 mb-1 font-medium">Phone (bKash)</label>
                          <input
                            type="text"
                            value={newUserForm.phone}
                            onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                            placeholder="01736705156"
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-rose-500 font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-zinc-400 mb-1 font-medium">Role</label>
                          <select
                            value={newUserForm.role}
                            onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                            className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
                          >
                            <option value="subscriber">Subscriber</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-zinc-400 mb-1 font-medium">Tier</label>
                          <select
                            value={newUserForm.tier}
                            onChange={(e) => setNewUserForm({ ...newUserForm, tier: e.target.value })}
                            className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
                          >
                            <option value="vip">VIP</option>
                            <option value="standard">Standard</option>
                            <option value="free">Free</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-zinc-400 mb-1 font-medium">Days</label>
                          <input
                            type="number"
                            min="1"
                            value={newUserForm.days}
                            onChange={(e) => setNewUserForm({ ...newUserForm, days: parseInt(e.target.value) || 30 })}
                            className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-rose-500 font-mono"
                          />
                        </div>
                      </div>

                      <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setIsAddingUser(false)}
                          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow"
                        >
                          Create Account
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* ================================================= */}
              {/* MODAL 3: CUSTOM INDIVIDUAL USER NOTIFICATION */}
              {/* ================================================= */}
              {notificationModalUser && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                  role="dialog"
                  aria-modal="true"
                >
                  <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                          <Send className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-white">Send Individual Notification</h3>
                          <p className="text-[11px] text-zinc-400">
                            Delivering directly to: <span className="text-white font-medium">{notificationModalUser.name}</span> ({notificationModalUser.email})
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setNotificationModalUser(null)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>

                    {notifSuccessMsg ? (
                      <div className="p-8 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                          <Check className="w-6 h-6" />
                        </div>
                        <h4 className="text-base font-bold text-white">{notifSuccessMsg}</h4>
                        <p className="text-xs text-zinc-400">The notification has been added to the user's feed.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleSendCustomNotification} className="p-5 space-y-4 text-xs">
                        {/* Quick Presets */}
                        <div>
                          <label className="block text-[11px] text-zinc-400 font-medium mb-1.5">
                            Quick Message Presets:
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setNotifTitle('VIP Access Activated');
                                setNotifMessage(`Hello ${notificationModalUser.name}, your VIP Pass has been activated! Enjoy premium 1080p high-speed sports & cinema channels.`);
                                setNotifType('vip');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] transition"
                            >
                              VIP Activation
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNotifTitle('Subscription Renewal Reminder');
                                setNotifMessage(`Hello ${notificationModalUser.name}, your Nivotv subscription will expire soon. Please renew via bKash to 01736705156 to avoid interruption.`);
                                setNotifType('renewal');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] transition"
                            >
                              Renewal Notice
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNotifTitle('New Channels Added');
                                setNotifMessage(`Exciting news! We have added new HD sports, news, and drama live channels to your Nivotv lineup.`);
                                setNotifType('info');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] transition"
                            >
                              New Channels
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNotifTitle('Scheduled Maintenance');
                                setNotifMessage(`We are upgrading server capacity tonight at 2:00 AM. Streaming will remain fully operational with our backup relays.`);
                                setNotifType('alert');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] transition"
                            >
                              Maintenance
                            </button>
                          </div>
                        </div>

                        {/* Notification Type */}
                        <div>
                          <label className="block text-zinc-400 mb-1 font-medium">Notification Type</label>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { id: 'info', label: 'Info', color: 'border-blue-500/50 text-blue-400' },
                              { id: 'renewal', label: 'Renewal', color: 'border-amber-500/50 text-amber-400' },
                              { id: 'vip', label: 'VIP Pass', color: 'border-purple-500/50 text-purple-400' },
                              { id: 'alert', label: 'Urgent', color: 'border-rose-500/50 text-rose-400' },
                            ].map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setNotifType(t.id as any)}
                                className={`py-1.5 px-2 rounded-xl text-center border font-semibold text-[11px] transition ${
                                  notifType === t.id
                                    ? `bg-zinc-800 ${t.color}`
                                    : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800/60'
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Title */}
                        <div>
                          <label className="block text-zinc-400 mb-1 font-medium">Notification Title</label>
                          <input
                            type="text"
                            required
                            value={notifTitle}
                            onChange={(e) => setNotifTitle(e.target.value)}
                            placeholder="e.g. Welcome to Nivotv VIP"
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
                          />
                        </div>

                        {/* Message Body */}
                        <div>
                          <label className="block text-zinc-400 mb-1 font-medium">Custom Message Body</label>
                          <textarea
                            required
                            rows={4}
                            value={notifMessage}
                            onChange={(e) => setNotifMessage(e.target.value)}
                            placeholder="Type personal message or alert here..."
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-rose-500 resize-none leading-relaxed"
                          />
                        </div>

                        <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-800">
                          <button
                            type="button"
                            onClick={() => setNotificationModalUser(null)}
                            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSendingNotif}
                            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold transition shadow flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{isSendingNotif ? 'Sending...' : 'Send to User'}</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 4: BKASH BILLING & REPORTS */}
          {/* ================================================= */}
          {activeTab === 'billing' && (
            <div className="space-y-4">
              {/* Header Cards & Export Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E2136E]/20 text-[#E2136E] flex items-center justify-center font-bold text-xl">
                    ৳
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      bKash Gateway Integration Number: 01736705156
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Export transaction records, audit financial history, and manage renewals
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="/api/billing/export-report?format=csv"
                    download="nivotv-billing-report.csv"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.exportBillingCsv}</span>
                  </a>

                  <a
                    href="/api/billing/export-report?format=json"
                    download="nivotv-billing-report.json"
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center gap-1.5 transition border border-zinc-700"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-400" />
                    <span>{t.exportBillingJson}</span>
                  </a>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-3">TrxID</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Plan</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Gateway Number</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-zinc-900/40 text-zinc-300">
                        <td className="p-3 font-mono font-bold text-rose-400">
                          {tx.trxId}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-white">{tx.userName}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">{tx.userPhone}</div>
                        </td>
                        <td className="p-3 text-zinc-300">{tx.planName}</td>
                        <td className="p-3 font-bold text-emerald-400">৳ {tx.amount} BDT</td>
                        <td className="p-3 font-mono text-zinc-400">{tx.bKashNumber}</td>
                        <td className="p-3 text-zinc-500 font-mono">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : tx.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {tx.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {tx.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleUpdateTxStatus(tx.id, 'approved')}
                                className="px-2.5 py-1 rounded bg-emerald-600 text-white text-[10px] font-bold"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateTxStatus(tx.id, 'rejected')}
                                className="px-2.5 py-1 rounded bg-rose-600 text-white text-[10px] font-bold"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-zinc-500">Verified</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 5: ACTIVITY & SECURITY LOGS */}
          {/* ================================================= */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
                <span>Security event trail and streaming playback logs</span>
                <button
                  onClick={fetchLogs}
                  className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh Logs</span>
                </button>
              </div>

              <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Time</th>
                      <th className="p-3">Event Action</th>
                      <th className="p-3">User</th>
                      <th className="p-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-900/40 text-zinc-300">
                        <td className="p-3 text-zinc-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-rose-400">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-white">{log.userName || 'System'}</td>
                        <td className="p-3 text-zinc-400 truncate max-w-md">
                          {log.details || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
