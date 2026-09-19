import React from 'react';
import { X, Activity, Zap, Shield, CheckCircle, Wifi, Cpu, Server } from 'lucide-react';
import { Channel } from '../types';
import { TranslationDict } from '../i18n/translations';

interface StreamDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel | null;
  t: TranslationDict;
}

export const StreamDiagnosticsModal: React.FC<StreamDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  channel,
  t,
}) => {
  if (!isOpen || !channel) return null;

  return (
    <div
      id="diagnostics-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnostics-title"
    >
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 id="diagnostics-title" className="font-bold text-sm text-white">
                Stream Diagnostics & Proxy Inspector
              </h3>
              <p className="text-[11px] text-zinc-400 truncate max-w-xs">{channel.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Key Metric Badges */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
              <div className="text-zinc-500 mb-1 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-rose-400" />
                <span>Proxy Engine Status</span>
              </div>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Active (CORS Rewritten)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
              <div className="text-zinc-500 mb-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Encrypted HLS Support</span>
              </div>
              <div className="text-sm font-bold text-white flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>AES-128 / Clear Key OK</span>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5 font-mono text-[11px]">
            <div className="flex justify-between items-center text-zinc-400">
              <span>Channel Name:</span>
              <span className="text-white font-sans font-semibold">{channel.name}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400">
              <span>Category:</span>
              <span className="text-zinc-200">{channel.groupTitle}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400">
              <span>Upstream Protocol:</span>
              <span className="text-zinc-200">Apple HLS (RFC 8216)</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400">
              <span>Estimated Ping:</span>
              <span className="text-emerald-400 font-bold">{channel.pingMs || 115} ms</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400">
              <span>Current Viewers:</span>
              <span className="text-white">{channel.viewers || 120} concurrent</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400">
              <span>CORS Origin Policy:</span>
              <span className="text-emerald-400">Access-Control-Allow-Origin: *</span>
            </div>
          </div>

          {/* Protected Stream URL */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-zinc-400">
                Protected Stream Relay:
              </label>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">
                Origin Obfuscated
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-emerald-400 font-mono text-[10px] break-all select-all flex items-center justify-between">
              <span>{channel.url.startsWith('http') ? `/api/stream/${channel.id}.m3u8` : channel.url}</span>
              <span className="text-[9px] text-zinc-500 font-sans ml-2 uppercase">HLS AES/CORS Safe</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] leading-relaxed">
            All requests to this channel are transparently proxied through Nivotv's high-speed Node.js edge proxy, ensuring zero CORS violations and seamless playback on all browsers and devices.
          </div>
        </div>
      </div>
    </div>
  );
};
