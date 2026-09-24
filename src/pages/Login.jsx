import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_DASHBOARDS } from '../components/ProtectedRoute';
import {
  UtensilsCrossed,
  LogIn,
  AlertCircle,
  HeartHandshake,
  Home,
  Truck,
  KeyRound,
  CheckCircle2,
  Copy,
  Sparkles,
} from 'lucide-react';
import { DEMO_CREDENTIALS } from '../utils/dummyData';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const { login, loginAsDemo, currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (currentUser && userProfile?.role) {
      const from = location.state?.from?.pathname || ROLE_DASHBOARDS[userProfile.role] || '/donor-dashboard';
      navigate(from, { replace: true });
    }
  }, [currentUser, userProfile, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await login(email, password);
      const role = res.profile?.role || res.userData?.role || 'donor';
      const target = ROLE_DASHBOARDS[role] || '/donor-dashboard';
      navigate(target, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to sign in. Please verify your credentials or click a 1-Click Demo card below.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInstantDemoLogin = (role) => {
    const profile = loginAsDemo(role);
    const target = ROLE_DASHBOARDS[profile.role] || '/donor-dashboard';
    navigate(target, { replace: true });
  };

  const fillFormWithCredential = (cred) => {
    setEmail(cred.email);
    setPassword(cred.password);
  };

  const copyCredential = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-[82vh] flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/30 mb-3">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Surplus-to-Shelter
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Sign in to coordinate food rescue routing &amp; live operational feeds
          </p>
        </div>

        {/* Demo Accounts Panel */}
        <div className="mb-6 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-5 rounded-2xl shadow-md border border-slate-700/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Pre-Configured Demo Accounts &amp; Operational Data
              </h2>
            </div>
            <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
              Ready to Monitor
            </span>
          </div>

          <p className="text-xs text-slate-300 mb-4">
            Click <strong>"1-Click Sign In"</strong> on any card to immediately access that role's live dashboard, dummy telemetry, and donations:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Donor Demo Card */}
            <div className="bg-slate-800/80 hover:bg-slate-800 border border-emerald-500/30 rounded-xl p-3 flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold mb-1">
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Donor Account</span>
                </div>
                <div className="text-[11px] text-slate-300 font-mono truncate">{DEMO_CREDENTIALS.donor.email}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">Password: {DEMO_CREDENTIALS.donor.password}</div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleInstantDemoLogin('donor')}
                  className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold shadow-sm transition-colors text-center"
                >
                  1-Click Sign In
                </button>
                <button
                  type="button"
                  title="Fill in form"
                  onClick={() => fillFormWithCredential(DEMO_CREDENTIALS.donor)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Shelter Demo Card */}
            <div className="bg-slate-800/80 hover:bg-slate-800 border border-indigo-500/30 rounded-xl p-3 flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-bold mb-1">
                  <Home className="w-3.5 h-3.5" />
                  <span>Shelter Hub</span>
                </div>
                <div className="text-[11px] text-slate-300 font-mono truncate">{DEMO_CREDENTIALS.shelter.email}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">Password: {DEMO_CREDENTIALS.shelter.password}</div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleInstantDemoLogin('shelter')}
                  className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold shadow-sm transition-colors text-center"
                >
                  1-Click Sign In
                </button>
                <button
                  type="button"
                  title="Fill in form"
                  onClick={() => fillFormWithCredential(DEMO_CREDENTIALS.shelter)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Driver Demo Card */}
            <div className="bg-slate-800/80 hover:bg-slate-800 border border-amber-500/30 rounded-xl p-3 flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold mb-1">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Rescue Driver</span>
                </div>
                <div className="text-[11px] text-slate-300 font-mono truncate">{DEMO_CREDENTIALS.driver.email}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">Password: {DEMO_CREDENTIALS.driver.password}</div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleInstantDemoLogin('driver')}
                  className="flex-1 py-1.5 px-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold shadow-sm transition-colors text-center"
                >
                  1-Click Sign In
                </button>
                <button
                  type="button"
                  title="Fill in form"
                  onClick={() => fillFormWithCredential(DEMO_CREDENTIALS.driver)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Regular Login Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. donor@surplustoshelter.org"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Want to register a brand new account?{' '}
            <Link to="/signup" className="text-emerald-600 font-bold hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
