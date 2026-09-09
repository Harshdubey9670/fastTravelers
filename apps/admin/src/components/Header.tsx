import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle: string;
  isSocketConnected: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  isSocketConnected,
  onRefresh,
  isRefreshing,
}) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }) + ' IST'
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="top-nav">
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{title}</h1>
        <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0 }}>{subtitle}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Realtime Socket Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.85rem',
          borderRadius: '9999px',
          background: isSocketConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${isSocketConnected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
          fontSize: '0.785rem',
          fontWeight: 600,
          color: isSocketConnected ? '#34d399' : '#f87171',
        }}>
          <span className="pulsing-dot" style={{ background: isSocketConnected ? '#10b981' : '#ef4444' }} />
          <span>{isSocketConnected ? 'Realtime Live' : 'Reconnecting...'}</span>
        </div>

        {/* Live IST Time */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.825rem',
          color: '#9ca3af',
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '0.4rem 0.75rem',
          borderRadius: 8,
          border: '1px solid var(--border-subtle)'
        }}>
          <Clock size={14} />
          <span>{time}</span>
        </div>

        {/* Refresh Action */}
        <button 
          onClick={onRefresh}
          className="btn btn-secondary btn-sm"
          disabled={isRefreshing}
          title="Refresh Data"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>
    </header>
  );
};
