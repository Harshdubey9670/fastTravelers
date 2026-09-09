import React, { useState, useEffect } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { AdminApiClient } from '../api/client';

export const LandmarksTab: React.FC = () => {
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Landmark Form State
  const [nameEn, setNameEn] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [category, setCategory] = useState('MANDI');
  const [latitude, setLatitude] = useState('26.1667');
  const [longitude, setLongitude] = useState('82.3833');
  const [aliases, setAliases] = useState('');

  const fetchPlaces = async () => {
    try {
      setLoading(true);
      const res = await AdminApiClient.getPlaces(searchQuery);
      setPlaces(res.data?.places || []);
    } catch (err: any) {
      console.error('Failed to fetch places:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaces();
  }, [searchQuery]);

  const handleCreatePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim() || !latitude || !longitude) return;

    try {
      setIsSubmitting(true);
      const aliasList = aliases
        .split(',')
        .map(a => a.trim())
        .filter(Boolean);

      await AdminApiClient.createPlace({
        nameEn: nameEn.trim(),
        nameHi: nameHi.trim() || nameEn.trim(),
        category,
        location: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        aliases: aliasList,
      });

      setFeedbackMsg({ type: 'success', text: `Landmark "${nameEn}" added to dispatch database!` });
      setIsAddModalOpen(false);
      setNameEn('');
      setNameHi('');
      setAliases('');
      fetchPlaces();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to save landmark' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
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

      {/* Top action bar */}
      <div className="glass-card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', width: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search landmarks, mandis, temples..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.2rem', width: '100%', height: 40 }}
          />
        </div>

        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="btn btn-primary btn-sm"
          style={{ gap: '0.4rem' }}
        >
          <Plus size={16} />
          <span>Add Rural Landmark</span>
        </button>
      </div>

      {/* Places Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Landmark Name (English & Hindi)</th>
              <th>Category</th>
              <th>GPS Coordinates</th>
              <th>Search Aliases</th>
              <th>Popularity</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                  Loading local landmarks...
                </td>
              </tr>
            ) : places.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                  No landmarks found in this cluster. Click "Add Rural Landmark" to register one.
                </td>
              </tr>
            ) : (
              places.map(place => (
                <tr key={place._id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{place.nameEn}</div>
                    <div style={{ fontSize: '0.825rem', color: '#f97316' }}>{place.nameHi}</div>
                  </td>
                  <td>
                    <span className="badge badge-info">{place.category}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.825rem', fontFamily: 'monospace' }}>
                      {place.location?.coordinates ? `${place.location.coordinates[1].toFixed(4)}° N, ${place.location.coordinates[0].toFixed(4)}° E` : 'N/A'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {place.aliases && place.aliases.map((al: string, i: number) => (
                        <span key={i} style={{
                          fontSize: '0.725rem',
                          background: 'rgba(255,255,255,0.05)',
                          padding: '0.15rem 0.45rem',
                          borderRadius: 4,
                          color: '#9ca3af'
                        }}>
                          {al}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {place.pickupCount || 0} rides
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Landmark Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Add Rural Landmark / Chauraha</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePlace}>
              <div className="form-group">
                <label className="form-label">Name (English)</label>
                <input 
                  type="text"
                  placeholder="e.g. Kadipur Subzi Mandi"
                  value={nameEn}
                  onChange={e => setNameEn(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Name (Hindi)</label>
                <input 
                  type="text"
                  placeholder="उदा. कादीपुर सब्जी मंडी"
                  value={nameHi}
                  onChange={e => setNameHi(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  className="form-select"
                >
                  <option value="MANDI">Mandi / Market (सब्जी मंडी)</option>
                  <option value="TEMPLE">Temple / Shrine (मंदिर / तीर्थ)</option>
                  <option value="HOSPITAL">Hospital / CHC (अस्पताल)</option>
                  <option value="BUS_STAND">Bus Stand / Chauraha (बस स्टैंड / चौराहा)</option>
                  <option value="RAILWAY_STATION">Railway Station (रेलवे स्टेशन)</option>
                  <option value="SCHOOL_COLLEGE">School / College (स्कूल / कॉलेज)</option>
                  <option value="VILLAGE_CENTRE">Village Centre (गांव केंद्र)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input 
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={e => setLatitude(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input 
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={e => setLongitude(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Search Aliases (Comma separated)</label>
                <input 
                  type="text"
                  placeholder="e.g. Subzi Mandi, Mandi Gate, Purani Mandi"
                  value={aliases}
                  onChange={e => setAliases(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Register Landmark'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
