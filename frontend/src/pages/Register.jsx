import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, AlertTriangle, Eye, EyeOff, Check, Circle, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Password strength rules
const RULES = [
  { id: 'length',    label: 'At least 8 characters',          test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter (A–Z)',      test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter (a–z)',      test: (p) => /[a-z]/.test(p) },
  { id: 'number',    label: 'One number (0–9)',                test: (p) => /[0-9]/.test(p) },
  { id: 'special',   label: 'One special character (!@#$…)',   test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(password) {
  const passed = RULES.filter((r) => r.test(password)).length;
  if (passed <= 1) return { score: passed, label: 'Very weak', color: 'bg-red-500' };
  if (passed === 2) return { score: passed, label: 'Weak',      color: 'bg-orange-400' };
  if (passed === 3) return { score: passed, label: 'Fair',      color: 'bg-yellow-400' };
  if (passed === 4) return { score: passed, label: 'Strong',    color: 'bg-blue-500' };
  return { score: passed, label: 'Very strong', color: 'bg-green-500' };
}

export default function Register() {
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', firstName: '', lastName: '',
  });
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  const strength = useMemo(() => getStrength(formData.password), [formData.password]);
  const ruleResults = useMemo(() => RULES.map((r) => ({ ...r, passed: r.test(formData.password) })), [formData.password]);
  const passwordValid = strength.score === RULES.length;
  const passwordsMatch = formData.password === formData.confirmPassword;

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const markTouched = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTouched({ email: true, password: true, confirmPassword: true, firstName: true, lastName: true });

    if (!passwordValid) { setError('Please choose a stronger password.'); return; }
    if (!passwordsMatch) { setError('Passwords do not match.'); return; }
    if (!acceptedTerms) { setError('Confirm that you are at least 13 and accept the Terms.'); return; }

    setLoading(true);
    const result = await register({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      ageConfirmed: true,
      acceptedTerms: true,
    });

    if (result.success) {
      if (result.verificationRequired) {
        navigate(`/verify-email?email=${encodeURIComponent(result.email)}`, {
          state: { codeJustSent: true },
        });
      } else {
        navigate('/');
      }
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  const inputClass = (field, extra = '') =>
    `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${extra} ` +
    (touched[field] && !formData[field] ? 'border-red-400 bg-red-50' : 'border-gray-300');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3 shadow-lg">
            <GraduationCap className="h-7 w-7 text-white" strokeWidth={2} aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Create Account</h1>
          <p className="text-gray-500 text-sm">Join My Skool Club — it's free!</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {error && (
            <div className="mb-5 flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName" type="text" required autoComplete="given-name"
                  value={formData.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  onBlur={() => markTouched('firstName')}
                  className={inputClass('firstName')}
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName" type="text" required autoComplete="family-name"
                  value={formData.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  onBlur={() => markTouched('lastName')}
                  className={inputClass('lastName')}
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email" type="email" required autoComplete="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                onBlur={() => markTouched('email')}
                className={inputClass('email')}
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  onBlur={() => markTouched('password')}
                  className={inputClass('password', 'pr-10')}
                  placeholder="Create a strong password"
                />
                <button
                  type="button" tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" strokeWidth={2} aria-hidden="true" /> : <Eye className="h-5 w-5" strokeWidth={2} aria-hidden="true" />}
                </button>
              </div>

              {/* Strength bar — shown once user starts typing */}
              {formData.password.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex gap-1">
                      {[1,2,3,4,5].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            i <= strength.score ? strength.color : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-xs font-medium w-20 text-right ${
                      strength.score <= 1 ? 'text-red-500' :
                      strength.score === 2 ? 'text-orange-500' :
                      strength.score === 3 ? 'text-yellow-600' :
                      strength.score === 4 ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {strength.label}
                    </span>
                  </div>

                  {/* Rule checklist */}
                  <ul className="space-y-1">
                    {ruleResults.map((r) => (
                      <li key={r.id} className="flex items-center gap-1.5 text-xs">
                        <span className={r.passed ? 'text-green-500' : 'text-gray-400'}>
                          {r.passed ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" /> : <Circle className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />}
                        </span>
                        <span className={r.passed ? 'text-green-700' : 'text-gray-500'}>
                          {r.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  required autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  onBlur={() => markTouched('confirmPassword')}
                  className={
                    `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-10 ` +
                    (touched.confirmPassword && formData.confirmPassword && !passwordsMatch
                      ? 'border-red-400 bg-red-50'
                      : touched.confirmPassword && passwordsMatch && formData.confirmPassword
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-300')
                  }
                  placeholder="Re-enter your password"
                />
                <button
                  type="button" tabIndex={-1}
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="h-5 w-5" strokeWidth={2} aria-hidden="true" /> : <Eye className="h-5 w-5" strokeWidth={2} aria-hidden="true" />}
                </button>
                {touched.confirmPassword && formData.confirmPassword && (
                  <span className="absolute right-10 top-1/2 -translate-y-1/2">
                    {passwordsMatch ? <CheckCircle2 className="h-5 w-5 text-green-600" strokeWidth={2} aria-hidden="true" /> : <XCircle className="h-5 w-5 text-red-600" strokeWidth={2} aria-hidden="true" />}
                  </span>
                )}
              </div>
              {touched.confirmPassword && formData.confirmPassword && !passwordsMatch && (
                <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
              )}
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                I confirm I am at least 13 years old and agree to the{' '}
                <Link to="/terms" target="_blank" className="font-semibold text-blue-700 underline">Terms of Service</Link>,{' '}
                <Link to="/privacy" target="_blank" className="font-semibold text-blue-700 underline">Privacy Policy</Link>, and{' '}
                <Link to="/community-standards" target="_blank" className="font-semibold text-blue-700 underline">Community Standards</Link>.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !acceptedTerms}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Creating account…
                </>
              ) : 'Create Account'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          By creating an account you agree to our{' '}
          <a href="/terms" className="underline hover:text-gray-600">Terms</a> and{' '}
          <a href="/privacy" className="underline hover:text-gray-600">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
