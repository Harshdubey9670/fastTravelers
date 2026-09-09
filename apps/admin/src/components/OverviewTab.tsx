import React from 'react';
import { 
  Car, 
  CheckCircle2, 
  IndianRupee, 
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Navigation
} from 'lucide-react';

interface OverviewTabProps {
  stats: any;
  onNavigateTab: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ stats, onNavigateTab }) => {
  const s = stats || {
    rides: { active: 0, completedToday: 0, total: 0, cancelled: 0 },
    drivers: { total: 0, online: 0, available: 0, busy: 0, pendingVerification: 0 },
    revenue: { totalGrossINR: 0, cashINR: 0, upiINR: 0 },
    system: { healthy: true, uptimeSeconds: 3600 }
  };

  const metrics = [
    {
      label: 'Active Rides Now',
      value: s.rides?.active ?? 0,
      sub: `${s.rides?.total ?? 0} total rides logged`,
      icon: Navigation,
      color: '#f97316',
      tab: 'rides',
    },
    {
      label: 'Drivers Online',
      value: s.drivers?.online ?? 0,
      sub: `${s.drivers?.available ?? 0} available, ${s.drivers?.busy ?? 0} in active trip`,
      icon: Car,
      color: '#10b981',
      tab: 'drivers',
    },
    {
      label: 'Completed Today',
      value: s.rides?.completedToday ?? 0,
      sub: 'Fulfilled village trips',
      icon: CheckCircle2,
      color: '#06b6d4',
      tab: 'rides',
    },
    {
      label: 'Gross Volume (GMV)',
      value: `₹${(s.revenue?.totalGrossINR ?? 0).toLocaleString('en-IN')}`,
      sub: `₹${s.revenue?.cashINR ?? 0} Cash | ₹${s.revenue?.upiINR ?? 0} UPI`,
      icon: IndianRupee,
      color: '#8b5cf6',
      tab: 'analytics',
    },
    {
      label: 'Pending Verifications',
      value: s.drivers?.pendingVerification ?? 0,
      sub: s.drivers?.pendingVerification > 0 ? 'Requires admin action' : 'Queue clear',
      icon: ShieldCheck,
      color: s.drivers?.pendingVerification > 0 ? '#f59e0b' : '#9ca3af',
      tab: 'drivers',
    },
    {
      label: 'Cancellation Rate',
      value: s.rides?.total > 0 ? `${((s.rides.cancelled / s.rides.total) * 100).toFixed(1)}%` : '0%',
      sub: `${s.rides?.cancelled ?? 0} cancelled rides`,
      icon: AlertTriangle,
      color: '#ef4444',
      tab: 'analytics',
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Metrics Row */}
      <div className="metric-grid">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div 
              key={idx} 
              className="glass-card metric-card"
              style={{ cursor: 'pointer' }}
              onClick={() => onNavigateTab(m.tab)}
            >
              <div className="metric-label">
                <span>{m.label}</span>
                <div style={{
                  padding: '0.4rem',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  color: m.color
                }}>
                  <Icon size={18} />
                </div>
              </div>
              <div className="metric-value">{m.value}</div>
              <div className="metric-sub" style={{ color: '#9ca3af' }}>{m.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Two Column Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        {/* Sultanpur & Kadipur Cluster Status Card */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Operational Cluster: Sultanpur & Kadipur</h3>
            <span className="badge badge-success">ACTIVE ZONE</span>
          </div>

          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Gaon Auto provides direct phone-verified booking, landmark matching, and dynamic driver bidding across rural eastern Uttar Pradesh.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '0.85rem', color: '#e5e7eb' }}>Primary Tehsil Hub</span>
              <span style={{ fontWeight: 600, color: '#f97316' }}>Kadipur Chauraha (26.1667° N, 82.3833° E)</span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '0.85rem', color: '#e5e7eb' }}>Dispatch Search Radius</span>
              <span style={{ fontWeight: 600, color: '#10b981' }}>3 km to 12 km (Expanding)</span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '0.85rem', color: '#e5e7eb' }}>Payment Mode</span>
              <span style={{ fontWeight: 600, color: '#06b6d4' }}>Direct Cash & UPI QR (Zero Gateway Commission)</span>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
            <button 
              onClick={() => onNavigateTab('drivers')}
              className="btn btn-primary btn-sm"
              style={{ flex: 1 }}
            >
              Verify Onboarding Drivers <ArrowUpRight size={14} />
            </button>
            <button 
              onClick={() => onNavigateTab('rides')}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
            >
              Inspect Live Rides <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {/* System & Dispatch Engine Health */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Dispatch & Safety Engine</h3>
            <span className="badge badge-success">PROTECTED</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', marginTop: 6 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Atomic Driver Reservation (DB-Level Lock)</div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                  Prevents two passengers from booking the same driver concurrently. High-concurrency race condition defense verified.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', marginTop: 6 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Immutable RideEvent Ledger</div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                  Every ride transition (Requested, Dispatched, Bidded, Selected, Arrived, OTP, Completed, Cancelled) is permanently audited.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', marginTop: 6 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Phone E.164 Normalization & SMS Guard</div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                  All phone numbers normalized to +91XXXXXXXXXX. Mock SMS providers rejected automatically if started in production mode.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', marginTop: 6 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Private Driver Document Storage</div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                  Aadhaar, Driving License, and RC documents stored in isolated filesystem paths accessible only through authenticated admin streams.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
