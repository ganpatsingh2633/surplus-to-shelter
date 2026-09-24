/**
 * Food Categories used across Surplus-to-Shelter
 */
export const FOOD_TYPES = [
  'Prepared Meals (Hot)',
  'Dairy & Eggs',
  'Meat & Poultry',
  'Seafood',
  'Fresh Produce',
  'Bakery & Bread',
  'Refrigerated Packaged',
  'Pantry & Canned Goods',
];

/**
 * Base Decay Rates by Category:
 * Highly perishable (dairy/cooked) have high decay rate,
 * packaged/dry have low decay rate.
 */
export const FOOD_DECAY_RATES = {
  'Prepared Meals (Hot)': 0.95,
  'Seafood': 0.95,
  'Meat & Poultry': 0.90,
  'Dairy & Eggs': 0.85,
  'Refrigerated Packaged': 0.65,
  'Fresh Produce': 0.55,
  'Bakery & Bread': 0.40,
  'Pantry & Canned Goods': 0.15,
};

/**
 * Calculates a food spoilage and urgency Risk Score (0-100).
 * Weighted formula:
 *   base risk by foodType category × (time elapsed / total expiry window)
 * 
 * @param {string} foodType - Category of food
 * @param {string|Date} expiryWindow - Expiration timestamp or date string
 * @param {string|Date} [createdAt] - Creation timestamp or date string (defaults to now)
 * @returns {number} Integer between 0 and 100
 */
export function calculateRiskScore(foodType, expiryWindow, createdAt) {
  if (!foodType || !expiryWindow) return 50;

  const baseDecayRate = FOOD_DECAY_RATES[foodType] ?? 0.50;

  const createdMs = createdAt ? new Date(createdAt).getTime() : Date.now();
  const expiryMs = new Date(expiryWindow).getTime();
  const nowMs = Date.now();

  const totalWindow = Math.max(1000 * 60, expiryMs - createdMs);
  const timeElapsed = Math.max(0, nowMs - createdMs);

  if (nowMs >= expiryMs) {
    return 100;
  }

  const elapsedRatio = Math.min(1.0, timeElapsed / totalWindow);

  // Weighted formula: baseline decay readiness + elapsed time factor
  const score = Math.round(baseDecayRate * 100 * (0.25 + 0.75 * elapsedRatio));
  return Math.min(100, Math.max(5, score));
}

/**
 * Maps riskScore (0-100) to badge tiers:
 * - Green: < 33 (Low Risk)
 * - Amber: 33 - 66 (Medium Risk)
 * - Red: > 66 (Critical Risk)
 */
export function getRiskLevel(score = 50) {
  const numericScore = Number(score) || 0;

  if (numericScore < 33) {
    return {
      tier: 'green',
      label: 'Low Risk',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      badgeColor: 'bg-emerald-500',
      description: 'Slow decay rate; comfortable safe window (< 33)',
    };
  }

  if (numericScore <= 66) {
    return {
      tier: 'amber',
      label: 'Medium Risk',
      color: 'bg-amber-50 text-amber-800 border-amber-300',
      badgeColor: 'bg-amber-500',
      description: 'Moderate decay; dispatch recommended soon (33-66)',
    };
  }

  return {
    tier: 'red',
    label: 'Critical Risk',
    color: 'bg-rose-50 text-rose-800 border-rose-300',
    badgeColor: 'bg-rose-500',
    description: 'Rapid decay; immediate pickup required (> 66)',
  };
}
