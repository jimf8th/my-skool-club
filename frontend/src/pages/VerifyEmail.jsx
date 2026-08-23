import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmail, resendVerification, isAuthenticated } = useAuth();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState(
    location.state?.codeJustSent ? 'We sent a six-digit code to your email.' : ''
  );
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(location.state?.codeJustSent ? 60 : 0);

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const handleVerify = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!email || !/^\d{6}$/.test(code)) {
      setError('Enter your email and the six-digit verification code.');
      return;
    }

    setLoading(true);
    const result = await verifyEmail(email, code);
    setLoading(false);
    if (result.success) navigate('/');
    else setError(result.error);
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    if (!email) {
      setError('Enter your email address first.');
      return;
    }

    const result = await resendVerification(email);
    if (result.success) {
      setMessage(result.message);
      setResendSeconds(60);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3 shadow-lg text-2xl">
            ✉️
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Verify your email</h1>
          <p className="text-gray-600 mt-2">Enter the code to finish creating your account.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          {message && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{message}</div>}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="verification-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="verification-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 mb-1">Six-digit code</label>
              <input
                id="verification-code"
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-[0.45em] font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying…' : 'Verify and sign in'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleResend}
            disabled={resendSeconds > 0}
            className="w-full mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400"
          >
            {resendSeconds > 0 ? `Send another code in ${resendSeconds}s` : 'Send another code'}
          </button>

          <p className="mt-5 text-center text-sm text-gray-600">
            Already verified? <Link to="/login" className="text-blue-600 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
