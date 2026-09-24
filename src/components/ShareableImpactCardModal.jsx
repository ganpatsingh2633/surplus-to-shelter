import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import {
  calculateDonationImpact,
  EMISSION_FACTOR_CO2E_PER_KG,
} from '../utils/impactCalculator';
import {
  Download,
  Share2,
  Copy,
  Check,
  X,
  Sparkles,
  TreePine,
  Utensils,
  Scale,
  Award,
  ExternalLink,
} from 'lucide-react';

export default function ShareableImpactCardModal({
  donation,
  isOpen,
  onClose,
  donorName = 'Rescue Partner',
}) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const impact = donation ? calculateDonationImpact(donation) : {
    kgDiverted: 28,
    mealsRescued: 67,
    peopleFed: 67,
    co2eAvoidedKg: 70,
  };

  // Trigger celebration confetti when modal opens
  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
        });
      } catch (e) {}

      // Draw canvas preview
      setTimeout(drawSocialCard, 100);
    }
  }, [isOpen, donation]);

  // Generates 1200x675 HD share card on HTML5 Canvas
  const drawSocialCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 1200x675 (Standard 16:9 Twitter/LinkedIn/OG card resolution)
    canvas.width = 1200;
    canvas.height = 675;

    // 1. Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 675);
    bgGrad.addColorStop(0, '#042f2e'); // Deep teal
    bgGrad.addColorStop(0.5, '#064e3b'); // Emerald dark
    bgGrad.addColorStop(1, '#0f172a'); // Slate dark
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 675);

    // Decorative circle glows
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
    ctx.beginPath();
    ctx.arc(1050, 100, 320, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.beginPath();
    ctx.arc(150, 580, 260, 0, Math.PI * 2);
    ctx.fill();

    // 2. Header Branding
    ctx.fillStyle = '#34d399'; // Emerald light
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('SURPLUS-TO-SHELTER', 80, 90);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px sans-serif';
    ctx.fillText('VERIFIED FOOD RESCUE & EMISSION OFFSET', 80, 125);

    // 3. Main Headline
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px sans-serif';
    ctx.fillText('FOOD RESCUE IMPACT CERTIFICATE', 80, 210);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '24px sans-serif';
    const subTitle = `Diverted by ${donorName} • ${donation?.foodType || 'Fresh Prepared Surplus'}`;
    ctx.fillText(subTitle, 80, 255);

    // 4. Three Metric Stat Cards
    const cards = [
      { label: 'FOOD DIVERTED', val: `${impact.kgDiverted} kg`, sub: 'Saved from landfill', color: '#10b981' },
      { label: 'PEOPLE NOURISHED', val: `~${impact.peopleFed}`, sub: 'Nutritious meals served', color: '#38bdf8' },
      { label: 'EMISSIONS AVOIDED', val: `${impact.co2eAvoidedKg} kg`, sub: 'CO2e greenhouse offset', color: '#fbbf24' },
    ];

    cards.forEach((c, i) => {
      const cardX = 80 + i * 360;
      const cardY = 320;
      const cardW = 320;
      const cardH = 220;

      // Card Background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();

      // Category Pill
      ctx.fillStyle = c.color;
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(c.label, cardX + 24, cardY + 45);

      // Value
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 46px sans-serif';
      ctx.fillText(c.val, cardX + 24, cardY + 115);

      // Subtitle
      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px sans-serif';
      ctx.fillText(c.sub, cardX + 24, cardY + 165);
    });

    // 5. Footer Bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, 595, 1200, 80);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('🌱 Every kg of surplus food rescued averts 2.5 kg of atmospheric CO2e.', 80, 642);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px sans-serif';
    ctx.fillText(new Date().toLocaleDateString(undefined, { dateStyle: 'long' }), 1000, 642);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setGenerating(true);

    try {
      const imageUri = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `surplus-to-shelter-impact-${Date.now()}.png`;
      link.href = imageUri;
      link.click();
      toast.success('HD Impact Card downloaded successfully! 🎉');
    } catch (err) {
      console.error(err);
      toast.error('Could not download image. Please copy text instead.');
    } finally {
      setGenerating(false);
    }
  };

  const shareText = `🌍 Proud to partner with Surplus-to-Shelter! We just diverted ${impact.kgDiverted}kg of food, fed ~${impact.peopleFed} people at community shelters, and prevented ${impact.co2eAvoidedKg}kg of CO2e emissions! #FoodRescue #ZeroWaste #Sustainability`;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success('Share text copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error('Failed to copy text.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/20 border border-emerald-300/30 flex items-center justify-center text-emerald-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                Surplus Rescue Completed!
              </h3>
              <p className="text-xs text-emerald-200 mt-0.5">
                Food Safety Verified &amp; Diverted to Shelter
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

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Main Headline Prompt */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              Verified Community Impact
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              You just diverted <span className="text-emerald-600">{impact.kgDiverted} kg</span> / fed{' '}
              <span className="text-sky-600">~{impact.peopleFed} people</span> / saved{' '}
              <span className="text-amber-600">{impact.co2eAvoidedKg} kg CO₂e</span> 🌍
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your surplus food reached local shelter residents instead of going to waste in landfills.
            </p>
          </div>

          {/* Canvas Card Preview */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-900">
            <canvas ref={canvasRef} className="w-full h-auto block" />
            <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] text-white/90 font-mono font-bold">
              1200 × 675 HD PNG
            </div>
          </div>

          {/* Social Text Snippet */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider">Social Share Text:</span>
              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/80">
              {shareText}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
            >
              Done
            </button>

            <div className="w-full sm:w-auto flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4 text-slate-600" />
                <span>{copied ? 'Copied Text' : 'Share Text'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={generating}
                className="flex-1 sm:flex-initial px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Download Image Card</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
