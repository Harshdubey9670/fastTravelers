import React, { useState } from 'react';
import { Phone, KeyRound, Sparkles } from 'lucide-react';
import { AdminApiClient } from '../api/client';

interface LoginModalProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('+919999999999');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phone.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await AdminApiClient.requestOtp(phone.trim());
      setStep('OTP');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP to admin phone');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otp.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const res = await AdminApiClient.verifyOtp(phone.trim(), otp.trim());
      onLoginSuccess(res.data.user);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDevLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const devPhone = '+919999999999';
      setPhone(devPhone);
      const reqRes = await AdminApiClient.requestOtp(devPhone);
      // If dev OTP is returned or standard dev OTP
      const code = reqRes.devOtp || '123456';
      setOtp(code);
      const authRes = await AdminApiClient.verifyOtp(devPhone, code);
      onLoginSuccess(authRes.data.user);
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in" style={{ maxWidth: 420, textAlign: 'center' }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
          fontSize: '2rem',
          boxShadow: '0 8px 20px rgba(249, 115, 22, 0.4)'
        }}>
          🛺
        </div>

        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>Gaon Auto Admin</h2>
        <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '1.75rem' }}>
          Secure Dispatch & Verification Console
        </p>

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        {step === 'PHONE' ? (
          <form onSubmit={handleSendOtp}>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label">Authorized Admin Phone</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#9ca3af' }} />
                <input
                  type="tel"
                  placeholder="+919999999999"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.2rem', width: '100%' }}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? 'Sending OTP...' : 'Send Verification OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label">Enter 6-Digit OTP</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.2rem', width: '100%', letterSpacing: '0.3em', fontSize: '1.2rem', textAlign: 'center' }}
                  required
                  autoFocus
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Authenticate & Enter'}
            </button>

            <button
              type="button"
              onClick={() => setStep('PHONE')}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', marginTop: '0.75rem' }}
            >
              Change Phone Number
            </button>
          </form>
        )}

        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={handleQuickDevLogin}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', gap: '0.4rem', color: '#f97316' }}
          >
            <Sparkles size={14} />
            <span>Instant One-Click Dev Admin Login</span>
          </button>
        </div>
      </div>
    </div>
  );
};
