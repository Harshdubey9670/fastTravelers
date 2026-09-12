import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { AdminApiClient } from './api/client';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewTab } from './components/OverviewTab';
import { DriverVerificationTab } from './components/DriverVerificationTab';
import { RideMonitorTab } from './components/RideMonitorTab';
import { LandmarksTab } from './components/LandmarksTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { LoginModal } from './components/LoginModal';

export function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<any | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Check existing session
  useEffect(() => {
    const existingUser = AdminApiClient.getCurrentUser();
    const token = AdminApiClient.getToken();
    if (token && existingUser) {
      setUser(existingUser);
    }
  }, []);

  // Fetch statistics
  const fetchStats = async () => {
    try {
      setIsRefreshing(true);
      const res = await AdminApiClient.getStats();
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
      const interval = setInterval(fetchStats, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [user]);

  // Socket.IO Connection
  useEffect(() => {
    const token = AdminApiClient.getToken();
    if (!user || !token) return;

    const wsUrl = (import.meta as any).env?.VITE_WS_URL || 'http://localhost:5050';
    const s = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    s.on('connect', () => {
      setIsSocketConnected(true);
    });

    s.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    // When ride events occur, refresh stats
    s.on('ride:status', () => {
      fetchStats();
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user]);

  const handleLogout = () => {
    AdminApiClient.clearAuth();
    setUser(null);
    if (socket) {
      socket.disconnect();
    }
  };

  if (!user) {
    return <LoginModal onLoginSuccess={(u) => setUser(u)} />;
  }

  const tabTitles: Record<string, { title: string; sub: string }> = {
    overview: {
      title: 'Operations Overview',
      sub: 'Real-time metrics, active cluster status & dispatch health',
    },
    drivers: {
      title: 'Driver Verification Queue',
      sub: 'Review identity documents, vehicle registration, and driver onboarding',
    },
    rides: {
      title: 'Live Ride Dispatch & Ledger',
      sub: 'Monitor active trips, agreed fares, and chronological audit timelines',
    },
    landmarks: {
      title: 'Rural Landmarks & Mandis',
      sub: 'Manage local villages, mandis, and chauraha pickup points',
    },
    analytics: {
      title: 'Corridors & Payment Analytics',
      sub: 'Popular village routes, direct cash/UPI distribution & security audit logs',
    },
  };

  const currentMeta = tabTitles[activeTab] || tabTitles.overview;

  return (
    <div className="admin-shell">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingDriverCount={stats?.drivers?.pendingVerification || stats?.pendingDrivers || 0}
        activeRideCount={stats?.rides?.active || stats?.activeRides || 0}
        user={user}
        onLogout={handleLogout}
      />

      <div className="main-content">
        <Header
          title={currentMeta.title}
          subtitle={currentMeta.sub}
          isSocketConnected={isSocketConnected}
          onRefresh={fetchStats}
          isRefreshing={isRefreshing}
        />

        <main className="content-body">
          {activeTab === 'overview' && (
            <OverviewTab stats={stats} onNavigateTab={(t) => setActiveTab(t)} />
          )}
          {activeTab === 'drivers' && <DriverVerificationTab />}
          {activeTab === 'rides' && <RideMonitorTab />}
          {activeTab === 'landmarks' && <LandmarksTab />}
          {activeTab === 'analytics' && <AnalyticsTab />}
        </main>
      </div>
    </div>
  );
}

export default App;
