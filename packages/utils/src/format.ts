/**
 * Formatting utilities for Indian currency and date display.
 */

export function formatINR(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹0';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatTimeAgo(date: Date | string | number): string {
  const now = Date.now();
  const past = new Date(date).getTime();
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}
