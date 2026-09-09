import React from 'react';
import { 
  LayoutDashboard, 
  UserCheck, 
  Car, 
  MapPin, 
  BarChart3, 
  LogOut
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingDriverCount: number;
  activeRideCount: number;
  user: any;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingDriverCount,
  activeRideCount,
  user,
  onLogout,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { 
      id: 'drivers', 
      label: 'Driver Verification', 
      icon: UserCheck,
      badge: pendingDriverCount > 0 ? pendingDriverCount : undefined,
      badgeType: 'warning'
    },
    { 
      id: 'rides', 
      label: 'Live Ride Dispatch', 
      icon: Car,
      badge: activeRideCount > 0 ? activeRideCount : undefined,
      badgeType: 'primary'
    },
    { id: 'landmarks', label: 'Landmarks & Mandis', icon: MapPin },
    { id: 'analytics', label: 'Routes & Metrics', icon: BarChart3 },
  ];

  return (
    <aside className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', padding: '0 0.5rem' }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          boxShadow: '0 4px 14px rgba(249, 115, 22, 0.35)'
        }}>
          🛺
        </div>
        <div>
          <h2 style={{ fontSize: '1.2rem', lineHeight: 1.1 }}>Gaon Auto</h2>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Control Center v1.0</span>
        </div>
      </div>

      <div style={{ marginBottom: '1rem', padding: '0 0.5rem' }}>
        <div style={{ 
          background: 'rgba(255,255,255,0.03)', 
          border: '1px solid rgba(255,255,255,0.06)', 
          borderRadius: 10, 
          padding: '0.65rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span className="pulsing-dot" style={{ background: '#10b981' }} />
          <span style={{ fontSize: '0.78rem', color: '#e5e7eb' }}>Sultanpur & Kadipur Cluster</span>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-btn ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge !== undefined && (
                <span className={`badge badge-${item.badgeType || 'primary'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {user && (
        <div style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: '#1f2937',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              color: '#f97316'
            }}>
              {user.name ? user.name[0] : 'A'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name || 'Master Admin'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{user.phone}</div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="btn btn-secondary btn-sm" 
            style={{ width: '100%', justifyContent: 'flex-start', gap: '0.5rem' }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </aside>
  );
};
