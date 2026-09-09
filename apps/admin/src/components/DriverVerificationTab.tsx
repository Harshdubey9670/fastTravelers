import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertOctagon, 
  FileText, 
  Eye, 
  Search,
  X
} from 'lucide-react';
import { AdminApiClient } from '../api/client';

export const DriverVerificationTab: React.FC = () => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionModalDriver, setRejectionModalDriver] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'ALL') {
        params.verificationStatus = statusFilter;
      }
      const res = await AdminApiClient.getDrivers(params);
      setDrivers(res.data?.drivers || []);
    } catch (err: any) {
      console.error('Failed to fetch drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [statusFilter]);

  const handleApprove = async (driverId: string) => {
    try {
      setActionLoading(true);
      await AdminApiClient.verifyDriver(driverId, 'APPROVED');
      setFeedbackMsg({ type: 'success', text: 'Driver approved successfully! Driver is now eligible to go online.' });
      setSelectedDriver(null);
      fetchDrivers();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to approve driver' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectionModalDriver || !rejectionReason.trim()) return;
    try {
      setActionLoading(true);
      await AdminApiClient.verifyDriver(rejectionModalDriver._id, 'REJECTED', rejectionReason);
      setFeedbackMsg({ type: 'success', text: 'Driver onboarding rejected with specified reason.' });
      setRejectionModalDriver(null);
      setRejectionReason('');
      setSelectedDriver(null);
      fetchDrivers();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to reject driver' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (driverId: string) => {
    const reason = prompt('Enter suspension reason:');
    if (!reason) return;
    try {
      setActionLoading(true);
      await AdminApiClient.suspendDriver(driverId, reason);
      setFeedbackMsg({ type: 'success', text: 'Driver account suspended and taken offline immediately.' });
      fetchDrivers();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to suspend driver' });
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = drivers.filter(d => {
    const user = d.userId;
    const name = user?.name || '';
    const phone = user?.phone || '';
    const reg = d.vehicle?.registrationNumber || '';
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || phone.includes(q) || reg.toLowerCase().includes(q);
  });

  return (
    <div className="animate-fade-in">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: 10,
          marginBottom: '1.25rem',
          background: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${feedbackMsg.type === 'success' ? '#10b981' : '#ef4444'}`,
          color: feedbackMsg.type === 'success' ? '#34d399' : '#f87171',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.9rem'
        }}>
          <span>{feedbackMsg.text}</span>
          <button 
            onClick={() => setFeedbackMsg(null)} 
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize' }}
            >
              {st.toLowerCase()}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search name, phone, RC..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.2rem', width: '100%', height: 40 }}
          />
        </div>
      </div>

      {/* Drivers Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Driver Details</th>
              <th>Vehicle & Type</th>
              <th>Status</th>
              <th>Availability</th>
              <th>Documents</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                  Loading drivers from database...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                  No drivers found matching current filter.
                </td>
              </tr>
            ) : (
              filtered.map(driver => {
                const u = driver.userId;
                const v = driver.vehicle;
                const isPending = driver.verificationStatus === 'PENDING';
                const isApproved = driver.verificationStatus === 'APPROVED';

                return (
                  <tr key={driver._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u?.name || 'Unnamed Driver'}</div>
                      <div style={{ fontSize: '0.785rem', color: '#9ca3af' }}>{u?.phone}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className="badge badge-primary">{v?.vehicleType || 'AUTO'}</span>
                        <span style={{ fontWeight: 500 }}>{v?.registrationNumber || 'No RC'}</span>
                      </div>
                      <div style={{ fontSize: '0.785rem', color: '#9ca3af' }}>
                        {v?.make} {v?.model} {v?.fuelType ? `(${v.fuelType})` : ''}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${
                        driver.verificationStatus === 'APPROVED' ? 'success' :
                        driver.verificationStatus === 'PENDING' ? 'warning' : 'danger'
                      }`}>
                        {driver.verificationStatus}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                        <span 
                          className="pulsing-dot" 
                          style={{ background: driver.isOnline ? '#10b981' : '#6b7280' }} 
                        />
                        <span>{driver.isOnline ? driver.availabilityStatus : 'OFFLINE'}</span>
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedDriver(driver)}
                        className="btn btn-secondary btn-sm"
                        style={{ gap: '0.35rem' }}
                      >
                        <Eye size={14} />
                        <span>Inspect Files</span>
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleApprove(driver._id)}
                              className="btn btn-success btn-sm"
                              disabled={actionLoading}
                              title="Approve Driver"
                            >
                              <CheckCircle size={14} /> Approve
                            </button>
                            <button
                              onClick={() => setRejectionModalDriver(driver)}
                              className="btn btn-danger btn-sm"
                              disabled={actionLoading}
                              title="Reject Application"
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          </>
                        )}
                        {isApproved && (
                          <button
                            onClick={() => handleSuspend(driver._id)}
                            className="btn btn-secondary btn-sm"
                            disabled={actionLoading}
                            style={{ color: '#f87171' }}
                            title="Suspend Driver"
                          >
                            <AlertOctagon size={14} /> Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Document Inspection Modal */}
      {selectedDriver && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem' }}>Driver Documents & Profile Review</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                  {selectedDriver.userId?.name} ({selectedDriver.userId?.phone})
                </p>
              </div>
              <button 
                onClick={() => setSelectedDriver(null)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Vehicle Details Box */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: '1rem',
              marginBottom: '1.5rem',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Vehicle Registration (RC)</span>
                <div style={{ fontWeight: 600, color: '#f97316' }}>{selectedDriver.vehicle?.registrationNumber || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Type & Make</span>
                <div style={{ fontWeight: 600 }}>{selectedDriver.vehicle?.vehicleType} - {selectedDriver.vehicle?.make} {selectedDriver.vehicle?.model}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Passenger Capacity</span>
                <div style={{ fontWeight: 600 }}>{selectedDriver.vehicle?.capacity || 3} Passengers</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Current Status</span>
                <div>
                  <span className={`badge badge-${selectedDriver.verificationStatus === 'APPROVED' ? 'success' : 'warning'}`}>
                    {selectedDriver.verificationStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Documents List */}
            <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Protected Identification Files</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
              {selectedDriver.documents && selectedDriver.documents.length > 0 ? (
                selectedDriver.documents.map((doc: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <FileText size={18} color="#f97316" />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{doc.documentType}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <a
                      href={AdminApiClient.getDocumentFileUrl(doc._id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                    >
                      <Eye size={14} /> View File
                    </a>
                  </div>
                ))
              ) : (
                <div style={{
                  padding: '1.25rem',
                  background: 'rgba(245, 158, 11, 0.05)',
                  border: '1px dashed rgba(245, 158, 11, 0.3)',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  color: '#fbbf24'
                }}>
                  No uploaded document records found for this driver in this staging cycle.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              {selectedDriver.verificationStatus === 'PENDING' && (
                <>
                  <button 
                    onClick={() => {
                      setRejectionModalDriver(selectedDriver);
                    }}
                    className="btn btn-danger"
                    disabled={actionLoading}
                  >
                    Reject Application
                  </button>
                  <button 
                    onClick={() => handleApprove(selectedDriver._id)}
                    className="btn btn-success"
                    disabled={actionLoading}
                  >
                    Approve Driver
                  </button>
                </>
              )}
              <button 
                onClick={() => setSelectedDriver(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Dialog */}
      {rejectionModalDriver && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: 480 }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Reject Driver Application</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              State the exact reason for rejection. This will be visible to the driver upon next login.
            </p>

            <div className="form-group">
              <label className="form-label">Rejection Reason</label>
              <textarea 
                rows={3}
                placeholder="e.g. Unclear Driving License photo, Expired vehicle registration insurance..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="form-textarea"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setRejectionModalDriver(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleRejectSubmit}
                className="btn btn-danger"
                disabled={actionLoading || !rejectionReason.trim()}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
