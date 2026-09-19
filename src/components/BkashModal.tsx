import React, { useState } from 'react';
import { X, Check, Copy, ShieldCheck, ArrowRight, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react';
import { SubscriptionPlan, User } from '../types';
import { TranslationDict } from '../i18n/translations';

interface BkashModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: SubscriptionPlan[];
  selectedPlan: SubscriptionPlan | null;
  onSelectPlan: (plan: SubscriptionPlan) => void;
  currentUser: User | null;
  onPaymentSuccess: (updatedUser: any) => void;
  t: TranslationDict;
}

const BKASH_NUMBER = '01736705156';

export const BkashModal: React.FC<BkashModalProps> = ({
  isOpen,
  onClose,
  plans,
  selectedPlan,
  onSelectPlan,
  currentUser,
  onPaymentSuccess,
  t,
}) => {
  const [copied, setCopied] = useState(false);
  const [trxId, setTrxId] = useState('');
  const [senderPhone, setSenderPhone] = useState(currentUser?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  if (!isOpen) return null;

  const currentActivePlan = selectedPlan || plans[1] || plans[0];

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(BKASH_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleQuickDemoTrx = () => {
    const randomTrx = 'BKH' + Math.random().toString(36).substring(2, 9).toUpperCase();
    setTrxId(randomTrx);
    if (!senderPhone) setSenderPhone('01712345678');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxId.trim()) {
      setError('Please enter the 10-character bKash Transaction ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/bkash-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || 'usr_demo',
          planId: currentActivePlan.id,
          trxId: trxId.trim(),
          senderNumber: senderPhone.trim() || '01736705156',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify bKash payment');
      }

      setSuccessData(data);
      if (data.updatedUser) {
        onPaymentSuccess(data.updatedUser);
      }
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="bkash-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bkash-modal-title"
    >
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header with bKash Pink Accent */}
        <div className="bg-[#E2136E] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-xl shadow-inner">
              ৳
            </div>
            <div>
              <h3 id="bkash-modal-title" className="font-bold text-lg leading-tight">
                bKash Payment Gateway
              </h3>
              <p className="text-xs text-rose-100 mt-0.5">
                Official Merchant / Personal Transfer Verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-5">
          {successData ? (
            /* Success View */
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/40">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white mb-1">
                  Payment Successful!
                </h4>
                <p className="text-zinc-300 text-sm">
                  Your <span className="font-semibold text-rose-400">{currentActivePlan.name}</span> pass is now active.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-left text-xs space-y-2 max-w-sm mx-auto">
                <div className="flex justify-between text-zinc-400">
                  <span>Transaction ID:</span>
                  <span className="font-mono text-white font-semibold">{successData.transaction.trxId}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Amount Paid:</span>
                  <span className="text-emerald-400 font-semibold">৳ {successData.transaction.amount} BDT</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Receiver Account:</span>
                  <span className="font-mono text-zinc-200">{BKASH_NUMBER}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Valid Until:</span>
                  <span className="text-zinc-200">{new Date(successData.updatedUser?.expiresAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setSuccessData(null);
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-[#E2136E] hover:bg-[#c71060] text-white font-semibold text-sm transition shadow-lg"
              >
                Start Watching Now
              </button>
            </div>
          ) : (
            /* Payment Form */
            <>
              {/* Plan Selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Select Subscription Plan:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {plans.map((p) => {
                    const isSel = currentActivePlan.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelectPlan(p)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          isSel
                            ? 'bg-[#E2136E]/15 border-[#E2136E] text-white shadow-md'
                            : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="font-bold text-xs truncate">{p.name}</div>
                        <div className="text-rose-400 font-bold text-sm mt-0.5">
                          ৳ {p.priceBdt}
                        </div>
                        <div className="text-[10px] text-zinc-500">{p.durationDays} Days</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* bKash Payment Instructions Card */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300">
                    Send Money / Payment to this bKash Number:
                  </span>
                  <span className="text-[11px] text-emerald-400 font-medium">Personal / Agent</span>
                </div>

                {/* Highlighted bKash Number with Copy button */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-rose-500/40 shadow-inner">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-[#E2136E]" />
                    <span className="text-xl font-bold font-mono tracking-wider text-white">
                      {BKASH_NUMBER}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyNumber}
                    className="px-3 py-1.5 rounded-lg bg-[#E2136E] hover:bg-[#c71060] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? t.copied : t.copyNumber}</span>
                  </button>
                </div>

                {/* Step by Step instructions */}
                <div className="text-xs text-zinc-400 space-y-1 pt-1">
                  <p className="flex items-start gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-zinc-800 text-zinc-300 text-[10px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">1</span>
                    <span>Open bKash App or Dial <strong>*247#</strong> and select <strong>Send Money</strong></span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-zinc-800 text-zinc-300 text-[10px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">2</span>
                    <span>Enter Receiver Number: <strong className="text-white">{BKASH_NUMBER}</strong></span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-zinc-800 text-zinc-300 text-[10px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">3</span>
                    <span>Enter Amount: <strong className="text-emerald-400">৳ {currentActivePlan.priceBdt} BDT</strong> and Reference: <strong>Nivotv</strong></span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-zinc-800 text-zinc-300 text-[10px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">4</span>
                    <span>Copy the 10-character <strong>TrxID</strong> from SMS or App and enter below:</span>
                  </p>
                </div>
              </div>

              {/* Form Inputs */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Your bKash Sender Phone Number:
                  </label>
                  <input
                    type="text"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="e.g. 01712345678"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-[#E2136E] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E2136E]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-zinc-300">
                      bKash Transaction ID (TrxID):
                    </label>
                    <button
                      type="button"
                      onClick={handleQuickDemoTrx}
                      className="text-[11px] text-rose-400 hover:text-rose-300 underline font-medium"
                    >
                      Generate Sample TrxID
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                    placeholder="e.g. BKH872A4X9"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-[#E2136E] text-white font-mono text-sm uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-[#E2136E]"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#E2136E] hover:bg-[#c71060] disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-rose-900/40 flex items-center justify-center gap-2 transition"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Verifying with bKash...
                    </span>
                  ) : (
                    <>
                      <span>{t.verifyAndActivate}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center text-[11px] text-zinc-500 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Encrypted 256-bit automated transaction verification</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
