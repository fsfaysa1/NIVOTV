import React, { useState, useEffect } from 'react';
import {
  Tv,
  Globe,
  Shield,
  User as UserIcon,
  LogIn,
  LogOut,
  Bell,
  Sparkles,
  CreditCard,
  Settings,
  ChevronDown,
  Check,
  AlertTriangle,
  Info
} from 'lucide-react';
import { User, LanguageCode } from '../types';
import { TranslationDict } from '../i18n/translations';

interface NavbarProps {
  currentUser: User | null;
  currentLanguage: LanguageCode;
  onChangeLanguage: (lang: LanguageCode) => void;
  onOpenAdmin: () => void;
  onOpenPlans: () => void;
  onOpenBkash: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  t: TranslationDict;
}

const LANGUAGES: Array<{ code: LanguageCode; label: string; flag: string }> = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'bn', label: 'বাংলা (Bengali)', flag: '🇧🇩' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', label: 'العربية (RTL)', flag: '🇸🇦' },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentLanguage,
  onChangeLanguage,
  onOpenAdmin,
  onOpenPlans,
  onOpenBkash,
  onOpenAuth,
  onLogout,
  t,
}) => {
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUserNotifications = async () => {
    try {
      const url = currentUser ? `/api/notifications?userId=${currentUser.id}` : '/api/notifications';
      const res = await fetch(url);
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUserNotifications();
    const interval = setInterval(fetchUserNotifications, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleMarkAsRead = async (notifId: string) => {
    try {
      await fetch(`/api/notifications/${notifId}/read`, { method: 'PUT' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  // Compute renewal warning
  const daysLeft = currentUser?.expiresAt
    ? Math.ceil((new Date(currentUser.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const showRenewalWarning = currentUser?.role === 'subscriber' && daysLeft <= 5;

  return (
    <header className="sticky top-0 z-40 w-full bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center shadow-sm">
            <Tv className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Nivo<span className="text-rose-500">tv</span>
          </span>
        </div>

        {/* Right Actions: bKash, Language, Admin, and User Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* bKash Quick Checkout Button */}
          <button
            id="navbar-bkash-button"
            onClick={onOpenBkash}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E2136E] hover:bg-[#c71060] text-white text-xs font-semibold shadow-sm transition active:scale-95"
            title="bKash Merchant: 01736705156"
          >
            <span className="font-bold text-xs">৳</span>
            <span>bKash</span>
            <span className="hidden sm:inline font-mono text-[11px] text-pink-100">01736705156</span>
          </button>

          {/* Multi-language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs flex items-center gap-1.5 transition"
              aria-label="Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-zinc-400" />
              <span className="uppercase font-semibold text-[11px]">{currentLanguage}</span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-zinc-900 border border-zinc-700/80 rounded-2xl p-1.5 shadow-2xl z-50 text-xs">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onChangeLanguage(lang.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition ${
                      currentLanguage === lang.code
                        ? 'bg-rose-600 text-white font-semibold'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </span>
                    {currentLanguage === lang.code && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification Bell with Badge */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifMenuOpen(!notifMenuOpen);
                setLangMenuOpen(false);
                setUserMenuOpen(false);
              }}
              className="relative p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition"
              title="Notifications & Alerts"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4 text-zinc-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center px-1 shadow animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs">
                <div className="p-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-rose-500" />
                    <h4 className="font-bold text-white text-xs">Notification Center</h4>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setNotifMenuOpen(false)}
                    className="text-zinc-500 hover:text-zinc-300 text-[11px]"
                  >
                    Close
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/60 p-1">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-zinc-500">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No notifications at this time.</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const typeBadge = {
                        vip: { bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30', label: 'VIP Pass' },
                        renewal: { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Renewal' },
                        alert: { bg: 'bg-rose-500/20 text-rose-400 border-rose-500/30', label: 'Notice' },
                        info: { bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Info' },
                      }[n.type as 'vip' | 'renewal' | 'alert' | 'info'] || {
                        bg: 'bg-zinc-800 text-zinc-300 border-zinc-700',
                        label: 'Notice',
                      };

                      return (
                        <div
                          key={n.id}
                          className={`p-3 rounded-xl transition ${
                            n.isRead ? 'opacity-60 bg-transparent' : 'bg-zinc-950/60 border border-zinc-800/80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${typeBadge.bg}`}
                              >
                                {typeBadge.label}
                              </span>
                              <h5 className="font-semibold text-white text-[11px] truncate max-w-[180px]">
                                {n.title}
                              </h5>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono flex-shrink-0">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-zinc-300 text-[11px] leading-relaxed mb-2 break-words">
                            {n.message}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-zinc-500">
                            <span>From: {n.sentBy || 'Admin'}</span>
                            {!n.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(n.id)}
                                className="text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Mark read</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Admin Panel Trigger */}
          <button
            id="navbar-admin-button"
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition"
            title="Admin Command Center"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Admin</span>
          </button>

          {/* User Profile / Auth State */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left transition"
              >
                <div className="w-6 h-6 rounded-md bg-rose-600/20 text-rose-400 flex items-center justify-center font-bold text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <span className="hidden sm:block text-xs font-medium text-white truncate max-w-[90px]">
                  {currentUser.name.split(' ')[0]}
                </span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-zinc-900 border border-zinc-700/80 rounded-2xl p-2 shadow-2xl z-50 text-xs space-y-1">
                  <div className="p-2 border-b border-zinc-800">
                    <p className="font-semibold text-white truncate">{currentUser.name}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{currentUser.email}</p>
                    <div className="mt-1 flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400">Role:</span>
                      <span className="text-rose-400 font-semibold capitalize">{currentUser.role}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onOpenBkash();
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-rose-400 hover:bg-zinc-800 flex items-center gap-2 font-medium"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>bKash Subscription</span>
                  </button>

                  <button
                    onClick={() => {
                      onLogout();
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.logout}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition"
            >
              <LogIn className="w-3.5 h-3.5 text-zinc-400" />
              <span>{t.login}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
