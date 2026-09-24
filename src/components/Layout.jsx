import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RoleBadge from './RoleBadge';
import {
  UtensilsCrossed,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  UserCheck,
  Building2,
  Truck,
  HeartHandshake,
  ExternalLink,
  TrendingUp,
} from 'lucide-react';

export default function Layout({ children }) {
  const { currentUser, userProfile, role, logout, isFirebaseConfigured, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showConfigAlert, setShowConfigAlert] = useState(!isFirebaseConfigured);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Failed to log out', err);
    }
  };

  const navLinks = [
    { name: 'Donor Hub', href: '/donor-dashboard', role: 'donor', icon: HeartHandshake },
    { name: 'Shelter Hub', href: '/shelter-dashboard', role: 'shelter', icon: Building2 },
    { name: 'Driver Route', href: '/driver-dashboard', role: 'driver', icon: Truck },
    { name: 'Impact Ledger', href: '/impact', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Banner if Firebase Credentials are not yet set in .env */}
      {showConfigAlert && !isFirebaseConfigured && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs md:text-sm font-medium border-b border-amber-600 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <AlertTriangle className="w-4 h-4 shrink-0 text-slate-950" />
            <span>
              <strong>Local Sandbox Mode:</strong> Firebase API keys are not yet provided in <code className="bg-amber-400 px-1 py-0.5 rounded font-mono text-xs">.env</code>. You can test all forms and role switching right now!
            </span>
          </div>
          <button
            onClick={() => setShowConfigAlert(false)}
            className="text-slate-900 hover:text-black font-bold text-lg px-2 leading-none"
            aria-label="Dismiss banner"
          >
            &times;
          </button>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-slate-900 text-lg tracking-tight block leading-none">
                    Surplus<span className="text-emerald-600">-to-</span>Shelter
                  </span>
                  <span className="text-[11px] text-slate-500 tracking-wide font-medium">
                    Food Rescue Routing
                  </span>
                </div>
              </Link>

              {/* Navigation tabs for Desktop */}
              {currentUser && (
                <nav className="hidden md:flex items-center gap-1 ml-6 pl-6 border-l border-slate-200">
                  {navLinks.map((link) => {
                    const isActive = location.pathname === link.href;
                    const isUserRole = role === link.role;
                    const LinkIcon = link.icon;
                    return (
                      <Link
                        key={link.name}
                        to={link.href}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-sm'
                            : isUserRole
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        {link.name}
                        {isUserRole && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>

            {/* Right Action Area */}
            <div className="hidden md:flex items-center gap-4">
              {currentUser ? (
                <>
                  {/* Role Quick-Switching Tool for Sandbox/Dev testing */}
                  {!isFirebaseConfigured && (
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                      <span className="text-slate-500 px-1 text-[11px]">Role:</span>
                      <button
                        onClick={() => { switchDemoRole('donor'); navigate('/donor-dashboard'); }}
                        className={`px-2 py-0.5 rounded font-medium ${role === 'donor' ? 'bg-white shadow text-emerald-700' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Donor
                      </button>
                      <button
                        onClick={() => { switchDemoRole('shelter'); navigate('/shelter-dashboard'); }}
                        className={`px-2 py-0.5 rounded font-medium ${role === 'shelter' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Shelter
                      </button>
                      <button
                        onClick={() => { switchDemoRole('driver'); navigate('/driver-dashboard'); }}
                        className={`px-2 py-0.5 rounded font-medium ${role === 'driver' ? 'bg-white shadow text-amber-700' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Driver
                      </button>
                    </div>
                  )}

                  {/* User Profile + Role Badge */}
                  <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-800 leading-tight">
                        {userProfile?.name || currentUser.displayName || 'Rescue Partner'}
                      </div>
                      <div className="text-[11px] text-slate-500 leading-tight">
                        {currentUser.email}
                      </div>
                    </div>
                    {role && <RoleBadge role={role} size="sm" />}
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/impact"
                    className="text-xs font-semibold text-slate-700 hover:text-emerald-700 px-3 py-1.5 flex items-center gap-1.5 transition-colors"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Impact Ledger</span>
                  </Link>
                  <Link
                    to="/login"
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-lg shadow-sm"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              {role && <RoleBadge role={role} size="sm" />}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3">
            {currentUser && (
              <div className="pb-3 border-b border-slate-100">
                <div className="text-sm font-bold text-slate-900">
                  {userProfile?.name || currentUser.displayName || 'Rescue Partner'}
                </div>
                <div className="text-xs text-slate-500">{currentUser.email}</div>
                <div className="mt-2">
                  <RoleBadge role={role} />
                </div>
              </div>
            )}

            <div className="space-y-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.href;
                const LinkIcon = link.icon;
                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <LinkIcon className="w-4 h-4" />
                    {link.name}
                  </Link>
                );
              })}
            </div>

            {/* Mobile Logout / Auth Links */}
            <div className="pt-2 border-t border-slate-100">
              {currentUser ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 text-sm font-semibold border border-slate-300 rounded-lg text-slate-700"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-slate-700">Surplus-to-Shelter</span>
            <span>&bull; Intelligent routing connecting food surplus to community shelters</span>
          </div>
          <div>
            Built with React, Tailwind CSS, &amp; Firebase
          </div>
        </div>
      </footer>
    </div>
  );
}
