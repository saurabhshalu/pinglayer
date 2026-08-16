import React from 'react';

export interface TenantDisplayProps {
  tenantId: string;
  tenantName?: string | null;
  className?: string;
  showIdSubtle?: boolean;
  size?: 'sm' | 'base' | 'lg';
}

export const TenantDisplay: React.FC<TenantDisplayProps> = ({
  tenantId,
  tenantName,
  className = '',
  showIdSubtle = true,
  size = 'base',
}) => {
  const hasName = Boolean(tenantName && tenantName.trim() && tenantName.trim() !== tenantId);

  const titleSizeClass = {
    sm: 'text-xs',
    base: 'text-xs sm:text-sm',
    lg: 'text-sm sm:text-base',
  }[size];

  if (!hasName) {
    return (
      <div className={`min-w-0 ${className}`} title={tenantId}>
        <span className={`font-mono font-semibold text-[#BDD2B6] break-all ${titleSizeClass}`}>
          {tenantId}
        </span>
      </div>
    );
  }

  return (
    <div className={`min-w-0 ${className}`} title={`Tenant ID: ${tenantId}`}>
      <span className={`font-semibold text-slate-100 block truncate ${titleSizeClass}`}>
        {tenantName}
      </span>
      {showIdSubtle && (
        <span className="font-mono text-[11px] text-slate-500 block truncate mt-0.5" title={tenantId}>
          {tenantId}
        </span>
      )}
    </div>
  );
};
