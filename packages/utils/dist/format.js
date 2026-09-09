"use strict";
/**
 * Formatting utilities for Indian currency and date display.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatINR = formatINR;
exports.formatTimeAgo = formatTimeAgo;
function formatINR(amount) {
    if (typeof amount !== 'number' || isNaN(amount))
        return '₹0';
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}
function formatTimeAgo(date) {
    const now = Date.now();
    const past = new Date(date).getTime();
    const diffSec = Math.floor((now - past) / 1000);
    if (diffSec < 60)
        return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60)
        return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24)
        return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
}
//# sourceMappingURL=format.js.map