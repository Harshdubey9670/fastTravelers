import React, { useState, useEffect } from 'react';
import { TrendingUp, IndianRupee, Activity } from 'lucide-react';
import { AdminApiClient } from '../api/client';

export const AnalyticsTab: React.FC = () => {
  const [popularRoutes, setPopularRoutes] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [routesRes, logsRes] = await Promise.all([
          AdminApiClient.getPopularRoutes().catch(() => ({ data: { routes: [] } })),
          AdminApiClient.getAuditLogs().catch(() => ({ data: { logs: [] } })),
        ]);
        setPopularRoutes(routesRes.data?.routes || []);
        setAuditLogs(logsRes.data?.logs || []);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Top Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Popular Routes Section */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="#f97316" /> High-Demand Rural Corridors
            </h3>
            <span className="badge badge-primary">TOP ROUTES</span>
          </div>

          <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Village clusters connecting to local railway stations, tehsils, and subzi mandis.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {loading ? (
              <div style={{ color: '#9ca3af', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>
                Analyzing high-demand village corridors...
              </div>
            ) : popularRoutes.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>
                Corridor demand data aggregates after live ride completions.
              </div>
            ) : (
              popularRoutes.map((r, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {r._id?.pickup || 'Village'} ➔ {r._id?.drop || 'Tehsil'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      {r.count} trips recorded
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#f97316' }}>
                      ₹{Math.round(r.avgFare || 40)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#10b981' }}>Avg Fare</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Integrity and Model */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IndianRupee size={18} color="#10b981" /> Direct Peer Payment Architecture
            </h3>
            <span className="badge badge-success">0% GATEWAY CUT</span>
          </div>

          <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            Unlike urban aggregators that hold driver funds for days, Gaon Auto employs direct passenger-to-driver cash or UPI QR payment.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              fontSize: '0.85rem'
            }}>
              <div style={{ fontWeight: 600, color: '#34d399', marginBottom: 2 }}>
                1. Dual-Sided Payment Reconciliation
              </div>
              <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                Trips are marked PASSENGER_CLAIMS_PAID until the driver confirms DRIVER_CONFIRMED_RECEIVED on their handset.
              </div>
            </div>

            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 8,
              background: 'rgba(249, 115, 22, 0.05)',
              border: '1px solid rgba(249, 115, 22, 0.2)',
              fontSize: '0.85rem'
            }}>
              <div style={{ fontWeight: 600, color: '#f97316', marginBottom: 2 }}>
                2. Real-Time Dynamic Bidding
              </div>
              <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                Drivers propose fares and ETAs based on road condition and vehicle battery, eliminating opaque algorithm gouging.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Audit Trail Table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="#06b6d4" /> Admin Security Audit Trail
          </h3>
          <span className="badge badge-info">AUDIT LOGGED</span>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Admin Action</th>
                <th>Target Entity</th>
                <th>Target ID</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                    No admin mutations logged in this cycle yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log, idx) => (
                  <tr key={idx}>
                    <td style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span className="badge badge-primary">{log.action}</span>
                    </td>
                    <td>{log.targetEntity}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.targetId}</td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                        {JSON.stringify(log.changes || {})}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
