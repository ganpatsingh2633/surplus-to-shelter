import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  PackageCheck,
  AlertTriangle,
  Loader2,
  X,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { confirmDonationReceived } from '../firebase/firestore';
import { useAuth } from '../context/AuthContext';

export default function ConfirmReceivedModal({
  donation,
  isOpen,
  onClose,
  onConfirmed,
}) {
  const { currentUser } = useAuth();
  const [isUsable, setIsUsable] = useState(true);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !donation) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const result = await confirmDonationReceived({
        donationId: donation.id,
        donorId: donation.donorId,
        shelterId: currentUser?.uid || donation.matchedShelterId,
        usable: isUsable,
        note: note.trim(),
      });

      if (onConfirmed) {
        onConfirmed(result);
      }
      onClose();
    } catch (err) {
      console.error('Error confirming receipt:', err);
      setError(err.message || 'Failed to submit confirmation. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Confirm Surplus Delivery</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Food Safety &amp; Trust Confirmation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Donation Summary Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Surplus Batch Details
            </div>
            <div className="text-sm font-extrabold text-slate-900">
              {donation.foodType}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Quantity: <span className="font-medium text-slate-800">{donation.quantity}</span>
            </div>
          </div>

          {/* Question: Was the food usable? */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Was the received food usable &amp; safe to distribute? <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsUsable(true)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  isUsable
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                }`}
              >
                <ThumbsUp className={`w-6 h-6 mb-1.5 ${isUsable ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="font-bold text-sm">Yes, Usable</span>
                <span className="text-[11px] text-slate-500 mt-0.5">Fresh &amp; safe to serve (+1 Rating)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsUsable(false)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  !isUsable
                    ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                }`}
              >
                <ThumbsDown className={`w-6 h-6 mb-1.5 ${!isUsable ? 'text-rose-600' : 'text-slate-400'}`} />
                <span className="font-bold text-sm">No, Unusable</span>
                <span className="text-[11px] text-slate-500 mt-0.5">Spoiled or damaged (0 Rating)</span>
              </button>
            </div>
          </div>

          {/* Optional Inspection Note */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              <span>Inspection Notes / Feedback (Optional)</span>
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Arrived warm and fresh, distributed immediately to 40 shelter residents."
              className="w-full text-xs"
            />
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-500 border border-slate-200/60 leading-relaxed">
            Submitting this confirmation marks the donation as <strong>"delivered"</strong>, logs a record in the <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[10px]">confirmations</code> subcollection, and updates the donor's running <strong>Trust Score</strong>.
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50 ${
                isUsable ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Confirmation...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm Receipt &amp; Rate Donor</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
