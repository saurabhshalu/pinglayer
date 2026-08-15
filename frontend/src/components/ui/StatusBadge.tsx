import React from 'react';
import { cn } from '../../lib/utils';

export interface StatusBadgeProps {
  status: string;
  type?: 'connection' | 'notification' | 'product' | 'apikey' | 'generic';
  className?: string;
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'generic',
  className,
  showDot = true,
}) => {
  const norm = (status || '').toLowerCase();

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
  let dotColor = 'bg-slate-400';
  let isPulsing = false;

  if (type === 'connection') {
    switch (norm) {
      case 'active':
        colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        dotColor = 'bg-emerald-400';
        break;
      case 'inactive':
        colorClasses = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        dotColor = 'bg-slate-400';
        break;
      case 'invalid':
        colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        dotColor = 'bg-rose-400';
        break;
      case 'pending':
        colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        dotColor = 'bg-amber-400';
        isPulsing = true;
        break;
    }
  } else if (type === 'notification') {
    switch (norm) {
      case 'queued':
      case 'processing':
        colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        dotColor = 'bg-amber-400';
        isPulsing = true;
        break;
      case 'sent':
        colorClasses = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        dotColor = 'bg-blue-400';
        break;
      case 'delivered':
        colorClasses = 'bg-teal-500/10 text-teal-400 border-teal-500/20';
        dotColor = 'bg-teal-400';
        break;
      case 'read':
        colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        dotColor = 'bg-emerald-400';
        break;
      case 'failed':
        colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        dotColor = 'bg-rose-400';
        break;
    }
  } else if (type === 'product') {
    switch (norm) {
      case 'active':
        colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        dotColor = 'bg-emerald-400';
        break;
      case 'inactive':
        colorClasses = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        dotColor = 'bg-slate-400';
        break;
      case 'suspended':
        colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        dotColor = 'bg-rose-400';
        break;
    }
  } else if (type === 'apikey') {
    switch (norm) {
      case 'active':
        colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        dotColor = 'bg-emerald-400';
        break;
      case 'revoked':
        colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        dotColor = 'bg-rose-400';
        break;
    }
  } else {
    // Generic
    if (norm === 'active' || norm === 'success' || norm === 'connected' || norm === 'valid') {
      colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      dotColor = 'bg-emerald-400';
    } else if (norm === 'failed' || norm === 'error' || norm === 'revoked' || norm === 'suspended') {
      colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      dotColor = 'bg-rose-400';
    } else if (norm === 'pending' || norm === 'processing' || norm === 'warning') {
      colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      dotColor = 'bg-amber-400';
      isPulsing = true;
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide uppercase',
        colorClasses,
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            dotColor,
            isPulsing && 'animate-ping inline-flex'
          )}
        />
      )}
      {status}
    </span>
  );
};
