import React, { useState } from 'react';
import { Copy, Check, Eye, EyeOff, AlertTriangle, ShieldCheck } from 'lucide-react';
import { copyToClipboard } from '../../lib/utils';

export interface ApiKeyDisplayProps {
  apiKey: string;
  prefix?: string;
  onDismiss?: () => void;
}

export const ApiKeyDisplay: React.FC<ApiKeyDisplayProps> = ({
  apiKey,
  prefix,
  onDismiss,
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(apiKey);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Warning Banner */}
      <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-amber-300">Copy this API key now. It will not be shown again.</p>
          <p className="text-amber-200/80">
            For security, PingLayer stores only a cryptographic hash of this key. If lost, you will need to rotate or generate a new key.
          </p>
        </div>
      </div>

      {/* Key Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{prefix ? `Key Prefix: ${prefix}` : 'API Key'}</span>
          <button
            type="button"
            onClick={() => setIsRevealed(!isRevealed)}
            className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
          >
            {isRevealed ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide key</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Click to reveal</span>
              </>
            )}
          </button>
        </div>

        <div className="relative flex items-center bg-slate-950 rounded-lg border border-slate-700/80 p-3 shadow-inner">
          <code
            className={`flex-1 font-mono text-xs md:text-sm text-emerald-400 break-all select-all transition-all duration-200 ${
              isRevealed ? 'filter-none' : 'filter blur-sm select-none opacity-60'
            }`}
          >
            {apiKey}
          </code>

          <div className="ml-3 pl-3 border-l border-slate-800 flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Checkbox */}
      <div className="pt-2 border-t border-slate-800 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={hasConfirmed}
            onChange={(e) => setHasConfirmed(e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950 transition-all cursor-pointer"
          />
          <span className="text-xs text-slate-300 group-hover:text-slate-100 transition-colors select-none">
            I have securely copied and saved this API key in a safe place
          </span>
        </label>

        {onDismiss && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={!hasConfirmed}
              onClick={onDismiss}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Done, I've Saved the Key</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
