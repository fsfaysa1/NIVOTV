import React from 'react';
import { X, Check, Shield, Zap, Sparkles, CreditCard, Clock, Bell } from 'lucide-react';
import { SubscriptionPlan, User } from '../types';
import { TranslationDict } from '../i18n/translations';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: SubscriptionPlan[];
  currentUser: User | null;
  onSelectPlanForBkash: (plan: SubscriptionPlan) => void;
  t: TranslationDict;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  plans,
  currentUser,
  onSelectPlanForBkash,
  t,
}) => {
  if (!isOpen) return null;

  const daysLeft = currentUser?.expiresAt
    ? Math.ceil((new Date(currentUser.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div
      id="plans-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plans-modal-title"
    >
      <div className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div>
            <h3 id="plans-modal-title" className="text-xl font-bold text-white">
              Nivotv Subscription Plans & Passes
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Instant activation via bKash to <strong>01736705156</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Expiration alert banner if logged in */}
        {currentUser && (
          <div className="bg-zinc-950/80 px-6 py-3 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <span className="text-zinc-400">Current Plan:</span>
              <span className="font-bold text-white uppercase">{currentUser.tier}</span>
              <span>•</span>
              <span className="text-zinc-400">Status:</span>
              <span className="font-semibold text-emerald-400 capitalize">{currentUser.status}</span>
              <span>•</span>
              <span className="text-zinc-400">Expires:</span>
              <span className="font-mono text-zinc-200">
                {new Date(currentUser.expiresAt).toLocaleDateString()} ({daysLeft} days left)
              </span>
            </div>

            {daysLeft <= 3 && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1.5 animate-pulse">
                <Bell className="w-3.5 h-3.5" />
                <span>Renewal Recommended</span>
              </span>
            )}
          </div>
        )}

        {/* Plans Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.filter(p => p.id !== 'free_trial').map((plan) => {
            const isVip = plan.vipAccess;
            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-5 border flex flex-col justify-between transition-all relative ${
                  isVip
                    ? 'bg-zinc-950 border-rose-500 shadow-xl shadow-rose-950/30'
                    : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {isVip && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold text-[10px] uppercase tracking-wider shadow">
                    Most Popular
                  </div>
                )}

                <div>
                  <h4 className="text-base font-bold text-white mb-1">{plan.name}</h4>
                  <p className="text-xs text-zinc-400 min-h-[36px]">{plan.description}</p>

                  <div className="my-4">
                    <span className="text-3xl font-extrabold text-white">৳ {plan.priceBdt}</span>
                    <span className="text-xs text-zinc-400 ml-1.5">BDT / {plan.durationDays} Days</span>
                  </div>

                  <div className="space-y-2.5 text-xs text-zinc-300 border-t border-zinc-800 pt-4">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>{plan.screens} Simultaneous Screen(s)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Resolution: {plan.resolution}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>HLS Low-Latency Streaming Proxy</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Encrypted M3U8 Stream Support</span>
                    </div>
                    {isVip && (
                      <div className="flex items-center gap-2 text-amber-400 font-semibold">
                        <Shield className="w-4 h-4 text-amber-400" />
                        <span>All VIP Sports & Cinema Channels</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => onSelectPlanForBkash(plan)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md ${
                      isVip
                        ? 'bg-[#E2136E] hover:bg-[#c71060] text-white'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-white/20 flex items-center justify-center text-[9px]">
                      ৳
                    </span>
                    <span>Pay with bKash (01736705156)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
