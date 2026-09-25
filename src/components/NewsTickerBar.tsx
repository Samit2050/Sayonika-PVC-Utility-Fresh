import React from 'react';
import { 
  Megaphone, 
  ExternalLink, 
  Edit3, 
  Sparkles, 
  Radio, 
  ChevronRight,
  Globe
} from 'lucide-react';
import { 
  NewsTickerConfig, 
  NewsTickerEffect, 
  NewsTickerSpeed 
} from '../utils/newsTickerService';

interface NewsTickerBarProps {
  config: NewsTickerConfig;
  canEdit: boolean;
  onOpenEditor: () => void;
}

const SPEED_DURATION_MAP: Record<NewsTickerSpeed, string> = {
  slow: '55s',
  medium: '35s',
  fast: '22s',
};

export const NewsTickerBar: React.FC<NewsTickerBarProps> = ({
  config,
  canEdit,
  onOpenEditor,
}) => {
  // If disabled and user is not an admin, don't render anything
  if (!config.isEnabled && !canEdit) {
    return null;
  }

  const duration = SPEED_DURATION_MAP[config.speed] || '35s';
  const pauseClass = config.isPausedOnHover ? 'pause-on-hover' : '';

  const getEffectClass = (effect: NewsTickerEffect): string => {
    switch (effect) {
      case 'neon-pulse':
        return 'ticker-effect-neon-pulse text-cyan-200 font-semibold';
      case 'rgb-glow':
        return 'ticker-effect-rgb-glow font-bold';
      case 'cyberpunk':
        return 'ticker-effect-cyberpunk font-bold';
      case 'gold-fire':
        return 'ticker-effect-gold-fire font-bold';
      case 'smooth-marquee':
        return 'ticker-effect-smooth-marquee text-slate-100 font-medium';
      case 'subtle':
      default:
        return 'ticker-effect-subtle text-slate-200';
    }
  };

  const effectClass = getEffectClass(config.effect);

  return (
    <div
      id="news-ticker-bar"
      className={`relative w-full border-t border-b border-slate-800/90 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-xs py-1.5 px-3 flex items-center gap-3 overflow-hidden select-none z-20 ${pauseClass} ${
        !config.isEnabled ? 'opacity-60 bg-slate-950/70 border-dashed border-amber-500/40' : ''
      }`}
    >
      {/* Prefix Badge */}
      <div className="shrink-0 flex items-center gap-1.5 z-10">
        <div
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-sm ring-1 ring-white/20 whitespace-nowrap"
          style={{ backgroundColor: config.badgeBgColor || '#dc2626' }}
        >
          {config.showIcon && <Megaphone className="w-3 h-3 animate-pulse" />}
          <span>{config.prefixLabel || 'NEWS'}</span>
        </div>

        {!config.isEnabled && canEdit && (
          <span className="hidden sm:inline px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono border border-amber-500/30">
            Hidden from Users
          </span>
        )}
      </div>

      {/* Marquee Ticker Track */}
      <div className="flex-1 overflow-hidden relative min-w-0 flex items-center h-5">
        <div
          className="animate-marquee-scroll flex items-center gap-16"
          style={{ '--ticker-duration': duration } as React.CSSProperties}
        >
          {/* First Copy */}
          <div className="flex items-center gap-4 shrink-0">
            <span
              className={`tracking-wide text-xs ${effectClass}`}
              style={{ color: config.textColor || undefined }}
            >
              {config.text || 'Welcome to Sayonika PVC Utility!'}
            </span>

            {config.linkUrl && (
              <a
                href={config.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 hover:text-blue-100 border border-blue-400/50 text-[10px] font-bold transition shadow-sm"
                title={`Open link: ${config.linkUrl}`}
              >
                <span>{config.linkLabel || 'Visit Link'}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>

          {/* Seamless Duplicate Copy for Continuous Loop */}
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-slate-600 font-bold">•</span>
            <span
              className={`tracking-wide text-xs ${effectClass}`}
              style={{ color: config.textColor || undefined }}
            >
              {config.text || 'Welcome to Sayonika PVC Utility!'}
            </span>

            {config.linkUrl && (
              <a
                href={config.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 hover:text-blue-100 border border-blue-400/50 text-[10px] font-bold transition shadow-sm"
                title={`Open link: ${config.linkUrl}`}
              >
                <span>{config.linkLabel || 'Visit Link'}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>

        {/* Left & Right subtle edge gradients */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-slate-950 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent" />
      </div>

      {/* Static Website Link (Right Side Desktop) */}
      {config.linkUrl && (
        <a
          href={config.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/70 hover:bg-blue-900/90 text-blue-300 hover:text-blue-100 border border-blue-600/40 text-[11px] font-bold transition shrink-0 z-10 shadow-sm active:scale-95"
        >
          <Globe className="w-3 h-3 text-cyan-400" />
          <span>{config.linkLabel || 'Visit Link'}</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      )}

      {/* Admin Quick Edit Button */}
      {canEdit && (
        <button
          type="button"
          id="admin-edit-news-ticker-btn"
          onClick={onOpenEditor}
          className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-100 border border-amber-500/40 text-[10px] font-bold transition cursor-pointer z-10"
          title="Admin: Customize scrolling news text, glowing effects, and website links"
        >
          <Edit3 className="w-3 h-3 text-amber-400" />
          <span className="hidden sm:inline">Edit News</span>
        </button>
      )}
    </div>
  );
};
