/**
 * Render deployment shim
 * ─────────────────────────────────────────────────────────────────
 * Render's auto-detection sometimes resolves the entry point to
 * src/server.js instead of the root server.js.
 * This file simply delegates to the real entry point at the root.
 */
require('../server');
