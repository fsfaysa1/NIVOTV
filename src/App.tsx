import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Player } from './components/Player';
import { ChannelSidebar } from './components/ChannelSidebar';
import { AdminPanel } from './components/AdminPanel';
import { BkashModal } from './components/BkashModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AuthModal } from './components/AuthModal';
import { StreamDiagnosticsModal } from './components/StreamDiagnosticsModal';
import { Channel, User, SubscriptionPlan, LanguageCode } from './types';
import { translations } from './i18n/translations';
import { Shield, Tv, Activity } from 'lucide-react';

export default function App() {
  const [language, setLanguage] = useState<LanguageCode>('bn');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanForBkash, setSelectedPlanForBkash] = useState<SubscriptionPlan | null>(null);

  // Authenticated user state - stored cleanly in local session
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('nivotv_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Modals
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isBkashOpen, setIsBkashOpen] = useState(false);
  const [isPlansOpen, setIsPlansOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  const t = translations[language] || translations.en;
  const isRtl = language === 'ar';

  useEffect(() => {
    fetchChannels();
    fetchPlans();
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await fetch('/api/channels');
      const data = await res.json();
      if (data.channels && data.channels.length > 0) {
        setChannels(data.channels);
        setCategories(data.categories || []);
        if (!selectedChannel) {
          setSelectedChannel(data.channels[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load channels:', err);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/billing/plans');
      const data = await res.json();
      if (data.plans) {
        setPlans(data.plans);
        setSelectedPlanForBkash(data.plans[2] || data.plans[1]);
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('nivotv_user', JSON.stringify(user));
    } catch {}
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('nivotv_user');
    } catch {}
  };

  const handlePaymentSuccess = (updatedUser: any) => {
    if (currentUser) {
      const updated = {
        ...currentUser,
        tier: (updatedUser.tier || 'vip') as 'free' | 'standard' | 'vip',
        expiresAt: updatedUser.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: (updatedUser.status || 'active') as 'active' | 'expired' | 'suspended',
      };
      setCurrentUser(updated);
      try {
        localStorage.setItem('nivotv_user', JSON.stringify(updated));
      } catch {}
    }
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans"
    >
      {/* Header Navigation */}
      <Navbar
        currentUser={currentUser}
        currentLanguage={language}
        onChangeLanguage={setLanguage}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenPlans={() => setIsPlansOpen(true)}
        onOpenBkash={() => setIsBkashOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        t={t}
      />

      {/* Main Streaming Layout - Clean & Minimal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* Left Column: Fixed / Sticky Player & Minimal Stream Info (8 cols on desktop) */}
        <section className="lg:col-span-8 flex flex-col gap-3 sticky top-14 z-20 bg-zinc-950/95 pb-2 backdrop-blur-md lg:static lg:bg-transparent lg:pb-0 lg:sticky lg:top-20 lg:self-start">
          {/* Integrated Media Player */}
          <Player
            channel={selectedChannel}
            currentUser={currentUser}
            t={t}
            onOpenBkash={() => setIsBkashOpen(true)}
            onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
          />

          {/* Minimal Channel Info Bar */}
          {selectedChannel && (
            <div className="px-4 py-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs shadow-md">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-zinc-950 p-1 border border-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {selectedChannel.logo ? (
                    <img
                      src={selectedChannel.logo}
                      alt={selectedChannel.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Tv className="w-4 h-4 text-rose-500" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="font-semibold text-white text-sm truncate">
                      {selectedChannel.name}
                    </h1>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      LIVE
                    </span>
                    {selectedChannel.isVip && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        VIP
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {selectedChannel.groupTitle}
                  </div>
                </div>
              </div>

              {/* Minimal Stream Controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setIsDiagnosticsOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs flex items-center gap-1.5 transition"
                  title="Stream Diagnostics & Quality"
                >
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Stream Info</span>
                </button>

                {selectedChannel.isVip && (!currentUser || currentUser.tier === 'free') && (
                  <button
                    onClick={() => setIsBkashOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-semibold text-xs shadow-sm transition flex items-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Unlock VIP</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Interactive Channel Sidebar (4 cols on desktop) */}
        <section className="lg:col-span-4 h-[560px] lg:h-[calc(100vh-6.5rem)] flex flex-col min-h-0">
          <ChannelSidebar
            channels={channels}
            selectedChannel={selectedChannel}
            onSelectChannel={(ch) => setSelectedChannel(ch)}
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            t={t}
          />
        </section>
      </main>

      {/* Modals */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        t={t}
        onRefreshChannels={fetchChannels}
        currentUser={currentUser}
        onAdminLoginSuccess={handleLoginSuccess}
      />

      <BkashModal
        isOpen={isBkashOpen}
        onClose={() => setIsBkashOpen(false)}
        plans={plans}
        selectedPlan={selectedPlanForBkash}
        onSelectPlan={(p) => setSelectedPlanForBkash(p)}
        currentUser={currentUser}
        onPaymentSuccess={handlePaymentSuccess}
        t={t}
      />

      <SubscriptionModal
        isOpen={isPlansOpen}
        onClose={() => setIsPlansOpen(false)}
        plans={plans}
        currentUser={currentUser}
        onSelectPlanForBkash={(p) => {
          setSelectedPlanForBkash(p);
          setIsPlansOpen(false);
          setIsBkashOpen(true);
        }}
        t={t}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        t={t}
      />

      <StreamDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        channel={selectedChannel}
        t={t}
      />
    </div>
  );
}
