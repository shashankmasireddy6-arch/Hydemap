// Shared currency formatter (₹, abbreviated to lakhs above ₹1,00,000) used
// anywhere a price needs to be displayed — the budget filter, the rent
// insights card, and anywhere else that shows a price.
export const formatCurrency = (value: number) => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
};
