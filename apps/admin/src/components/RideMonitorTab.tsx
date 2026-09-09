import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  History, 
  Search, 
  X
} from 'lucide-react';
import { AdminApiClient } from '../api/client';

export const RideMonitorTab: React.FC = () => {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRideTimeline, setSelectedRideTimeline] = useState<{ ride: any; events: any[] } | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const fetchRides = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      const res = await AdminApiClient.getRides(params);
      setRides(res.data?.rides || []);
    } catch (err: any) {
      console.error('Failed to fetch rides:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, [statusFilter]);

  const handleOpenTimeline = async (ride: any) => {
    try {
      setTimelineLoading(true);
      setSelectedRideTimeline({ ride, events: [] });
      const res = await AdminApiClient.getRideTimeline(ride._id);
      setSelectedRideTimeline({ ride, events: res.data?.events || [] });
    } catch (err: any) {
      console.error('Failed to fetch timeline:', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  const filtered = rides.filter(r => {
    const num = r.rideNumber || '';
    const pName = r.passengerId?.name || '';
    const pPhone = r.passengerId?.phone || '';
    const dName = r.driverId?.userId?.name || '';
    const q = searchQuery.toLowerCase();
    return num.toLowerCase().includes(q) || pName.toLowerCase().includes(q) || pPhone.includes(q) || dName.toLowerCase().includes(q);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RIDE_STARTED':
      case 'DRIVER_ARRIVED':
      case 'DRIVER_SELECTED':
        return <span className="badge badge-primary"><span className="pulsing-dot" style={{ background: '#f97316' }} /> {status}</span>;
      case 'REQUESTED':
      case 'OFFERS_RECEIVED':
        return <span className="badge badge-info"><span className="pulsing-dot" style={{ background: '#06b6d4' }} /> {status}</span>;
      case 'COMPLETED':
        return <span className="badge badge-success"><CheckCircle2 size={12} /> COMPLETED</span>;
      case 'CANCELLED':
      case 'EXPIRED':
        return <span className="badge badge-danger"><XCircle size={12} /> {status}</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Filters Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['ALL', 'ACTIVE', 'REQUESTED', 'DRIVER_SELECTED', 'RIDE_STARTED', 'COMPLETED', 'CANCELLED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
            >
              {st}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search Ride #, Phone, Name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.2rem', width: '100%', height: 40 }}
          />
        </div>
      </div>

      {/* Rides Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ride ID / Date</th>
              <th>Passenger</th>
              <th>Driver / Auto</th>
              <th>Route (Pickup ➔ Drop)</th>
              <th>Fare & Payment</th>
              <th>Status</th>
              <th>Audit</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                  Loading real-time ride stream...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                  No rides recorded matching this status.
                </td>
              </tr>
            ) : (
              filtered.map(ride => {
                const pass = ride.passengerId;
                const driverUser = ride.driverId?.userId;
                const vehicle = ride.driverId?.vehicle;

                return (
                  <tr key={ride._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f97316' }}>{ride.rideNumber}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {new Date(ride.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(ride.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{pass?.name || 'Passenger'}</div>
                      <div style={{ fontSize: '0.785rem', color: '#9ca3af' }}>{pass?.phone}</div>
                    </td>
                    <td>
                      {driverUser ? (
                        <>
                          <div style={{ fontWeight: 600 }}>{driverUser.name}</div>
                          <div style={{ fontSize: '0.785rem', color: '#9ca3af' }}>
                            {vehicle?.registrationNumber || driverUser.phone}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: '#6b7280', fontSize: '0.825rem' }}>Awaiting Driver Selection</span>
                      )}
                    </td>
                    <td style={{ maxWidth: 260 }}>
                      <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ color: '#10b981' }}>●</span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ride.pickupLocation?.address || 'Pickup'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: 2 }}>
                        <span style={{ color: '#ef4444' }}>■</span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ride.destinationLocation?.address || 'Destination'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                        ₹{ride.agreedFare || ride.fareEstimated || 0}
                      </div>
                      <div style={{ fontSize: '0.75rem' }}>
                        <span className={`badge ${
                          ride.paymentStatus === 'DRIVER_CONFIRMED_RECEIVED' ? 'badge-success' :
                          ride.paymentStatus === 'PASSENGER_CLAIMS_PAID' ? 'badge-warning' : 'badge-secondary'
                        }`}>
                          {ride.paymentStatus}
                        </span>
                      </div>
                    </td>
                    <td>
                      {getStatusBadge(ride.status)}
                    </td>
                    <td>
                      <button
                        onClick={() => handleOpenTimeline(ride)}
                        className="btn btn-secondary btn-sm"
                        style={{ gap: '0.35rem' }}
                      >
                        <History size={14} />
                        <span>Audit</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Ride Audit Timeline Modal */}
      {selectedRideTimeline && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: 650 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem' }}>Ride Audit Ledger: {selectedRideTimeline.ride.rideNumber}</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                  Authoritative Immutable Event Sequence (Database Audit Trail)
                </p>
              </div>
              <button 
                onClick={() => setSelectedRideTimeline(null)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Ride Snapshot */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 10,
              padding: '0.85rem 1rem',
              marginBottom: '1.5rem',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Agreed Fare</span>
                <div style={{ fontWeight: 700, color: '#f97316' }}>₹{selectedRideTimeline.ride.agreedFare || 0}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Current Status</span>
                <div>{getStatusBadge(selectedRideTimeline.ride.status)}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Payment State</span>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{selectedRideTimeline.ride.paymentStatus}</div>
              </div>
            </div>

            {/* Events Timeline */}
            <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid rgba(255,255,255,0.1)', marginLeft: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {timelineLoading ? (
                <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Replaying immutable ledger...</div>
              ) : selectedRideTimeline.events.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No events recorded for this ride.</div>
              ) : (
                selectedRideTimeline.events.map((evt, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: -31,
                      top: 4,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: '#f97316',
                      border: '2px solid #111827'
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="badge badge-primary">{evt.eventType}</span>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {new Date(evt.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#e5e7eb', marginTop: 4 }}>
                      Triggered by: <span style={{ fontWeight: 600 }}>{evt.actorRole}</span>
                    </div>
                    {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                      <pre style={{
                        marginTop: 4,
                        padding: '0.4rem 0.65rem',
                        borderRadius: 6,
                        background: 'rgba(0,0,0,0.3)',
                        fontSize: '0.725rem',
                        color: '#9ca3af',
                        overflowX: 'auto'
                      }}>
                        {JSON.stringify(evt.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setSelectedRideTimeline(null)}
                className="btn btn-secondary"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
