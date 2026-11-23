import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  AgentStatus,
  ContradictionSeverity,
  CoverageStatus,
  VerificationStatus,
} from '../../types/research';

export const DemoDisclosure: React.FC<{ label?: string; providerMode?: 'demo' | 'live' }> = ({
  label,
  providerMode = 'live',
}) => {
  if (providerMode === 'demo') {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-amber-300">
        <span className="font-mono text-[11px] font-medium">OFFLINE / DEGRADED</span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span>{label || 'Live scholarly APIs unavailable'}</span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 text-xs text-slate-300">
      <span className="font-mono text-[11px] font-medium text-emerald-400">VERIFIED ACADEMIC APIs</span>
      <span aria-hidden="true" className="text-slate-600">·</span>
      <span>{label || 'OpenAlex · Crossref · Semantic Scholar'}</span>
    </div>
  );
};

export const VerificationStatusText: React.FC<{ status: VerificationStatus }> = ({ status }) => {
  switch (status) {
    case 'Supported':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Supported
        </span>
      );
    case 'Partially Supported':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 whitespace-nowrap">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Partially Supported
        </span>
      );
    case 'Contradicted':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 whitespace-nowrap">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          Contradicted
        </span>
      );
    case 'Unverified':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 whitespace-nowrap">
          <HelpCircle className="h-3.5 w-3.5 shrink-0" />
          Unverified
        </span>
      );
  }
};

export const SeverityText: React.FC<{ severity: ContradictionSeverity }> = ({ severity }) => {
  const color =
    severity === 'Significant'
      ? 'text-rose-400'
      : severity === 'Moderate'
      ? 'text-amber-400'
      : 'text-cyan-400';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${color}`}>
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      {severity} Contradiction
    </span>
  );
};

export const CoverageStatusText: React.FC<{ status: CoverageStatus }> = ({ status }) => {
  const color =
    status === 'Well explored'
      ? 'text-emerald-400'
      : status === 'Partially explored'
      ? 'text-cyan-400'
      : status === 'Under explored'
      ? 'text-amber-400'
      : 'text-rose-400';

  return <span className={`text-xs font-medium whitespace-nowrap ${color}`}>{status}</span>;
};

export const AgentStatusLabel: React.FC<{ status: AgentStatus }> = ({ status }) => {
  const active = status === 'Planning' || status === 'Searching' || status === 'Analyzing';
  const color =
    status === 'Completed'
      ? 'text-emerald-400'
      : status === 'Failed'
      ? 'text-rose-400'
      : status === 'Needs more research'
      ? 'text-amber-400'
      : active
      ? 'text-cyan-300'
      : 'text-slate-400';

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${color}`}>
      {active && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />}
      {status === 'Completed' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
      {status === 'Failed' && <ShieldAlert className="h-3.5 w-3.5 shrink-0" />}
      {status === 'Needs more research' && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
      {(status === 'Idle' || status === 'Waiting') && <Clock className="h-3.5 w-3.5 shrink-0" />}
      {status === 'Searching' && !active && <Search className="h-3.5 w-3.5 shrink-0" />}
      {status}
    </span>
  );
};

export const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between pb-5 border-b border-slate-800/80">
    <div className="space-y-1 max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-50 text-balance">{title}</h1>
      {subtitle && <p className="text-sm text-slate-400 leading-relaxed">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
  </div>
);

export const EmptyNotice: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-10 text-center">
    <Sparkles className="h-6 w-6 text-violet-400 mx-auto mb-3" />
    <h3 className="text-base font-semibold text-slate-100">{title}</h3>
    <p className="text-sm text-slate-400 max-w-md mx-auto mt-1.5">{description}</p>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="mt-5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
