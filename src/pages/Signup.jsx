import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_DASHBOARDS } from '../components/ProtectedRoute';
import {
  UtensilsCrossed,
  UserPlus,
  AlertCircle,
  HeartHandshake,
  Home,
  Truck,
  Check,
} from 'lucide-react';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('donor'); // "donor" | "shelter" | "driver"
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const roleOptions = [
    {
      id: 'donor',
      title: 'Food Donor',
      subtitle: 'Restaurants, grocery stores, catering companies with surplus food',
      icon: HeartHandshake,
      activeBorder: 'border-emerald-500 bg-emerald-50/40 text-emerald-900',
      iconColor: 'text-emerald-600',
    },
    {
      id: 'shelter',
      title: 'Shelter Hub',
      subtitle: 'Food banks, community kitchens & emergency shelters receiving donations',
      icon: Home,
      activeBorder: 'border-indigo-500 bg-indigo-50/40 text-indigo-900',
      iconColor: 'text-indigo-600',
    },
    {
      id: 'driver',
      title: 'Rescue Driver',
      subtitle: 'Volunteers & couriers transporting perishable surplus to shelter doors',
      icon: Truck,
      activeBorder: 'border-amber-500 bg-amber-50/40 text-amber-900',
      iconColor: 'text-amber-600',
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      await signup(email, password, name, role);
      // Role-based routing redirect
      const target = ROLE_DASHBOARDS[role] || '/donor-dashboard';
      navigate(target, { replace: true });
    } catch (err) {
      console.error('Signup error:', err);
      let msg = 'Failed to create account. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email address is already registered. Please sign in instead.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please provide a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[82vh] flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/30 mb-3">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight sm:text-3xl">
            Join the Rescue Network
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Create an account to start routing surplus food to community shelters
          </p>
        </div>

        {/* Signup Card */}
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
                Name or Organization
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Green Bakery or Sarah Johnson"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@organization.org"
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
                placeholder="At least 6 characters"
                className="w-full"
              />
            </div>

            {/* Role Selector Card Group */}
            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Select Your Role <span className="text-emerald-600">*</span>
              </label>
              <div className="space-y-2.5">
                {roleOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = role === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setRole(opt.id)}
                      className={`relative flex items-start p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? opt.activeBorder
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className={`mt-0.5 mr-3 shrink-0 p-2 rounded-lg bg-white shadow-sm border border-slate-100 ${opt.iconColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900">
                            {opt.title}
                          </span>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {opt.subtitle}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{submitting ? 'Creating account...' : `Sign Up as ${role.charAt(0).toUpperCase() + role.slice(1)}`}</span>
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-600 font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
