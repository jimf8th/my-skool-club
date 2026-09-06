import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkEmailVerified, resendVerification, isAuthenticated } = useAuth();
  const email = searchParams.get('email') || 'your email address';
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

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

  const handleContinue = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    const result = await checkEmailVerified();
    setLoading(false);
    if (result.success) navigate('/');
    else setError(result.error);
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    const result = await resendVerification();
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
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3 shadow-lg">
            <Mail className="h-7 w-7 text-white" strokeWidth={2} aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Verify your email</h1>
          <p className="text-gray-600 mt-2">
            We sent a verification link to <span className="font-medium">{email}</span>.
            Open it, then come back here.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          {message && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{message}</div>}

          <button
            type="button"
            onClick={handleContinue}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Checking…' : "I've verified my email"}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resendSeconds > 0}
            className="w-full mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400"
          >
            {resendSeconds > 0 ? `Send another link in ${resendSeconds}s` : 'Send another link'}
          </button>

          <p className="mt-5 text-center text-sm text-gray-600">
            Already verified? <Link to="/login" className="text-blue-600 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
