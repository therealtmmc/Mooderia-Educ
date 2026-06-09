/**
 * Application Configuration Management Module
 * Robustly parses and sanitizes Vite environment variables for both standard browser
 * and packaged PWA shell contexts (where window.location.host may resolve incorrectly).
 */

const processEnv = (import.meta as any).env || {};

export const GEMINI_API_KEY = processEnv.GEMINI_API_KEY || "";
export const APP_URL = processEnv.APP_URL || "";

// Custom Game Engine Config
export const VITE_BACKEND_URL = processEnv.VITE_BACKEND_URL || "";

/**
 * Resolves the absolute backend base URL for HTTP/REST communication.
 * Gracefully handles relative pathways, custom absolute gateways, and PWA wraps.
 * 
 * @param path The relative sub-route (e.g., '/api/arena/join')
 * @returns The fully normalized URL path
 */
export function getBackendHttpUrl(path: string): string {
  if (VITE_BACKEND_URL) {
    const cleanBase = VITE_BACKEND_URL.endsWith("/")
      ? VITE_BACKEND_URL.slice(0, -1)
      : VITE_BACKEND_URL;
    return `${cleanBase}${path}`;
  }

  // Detect basic PWA custom protocols or hybrid wrappers where hostname lacks a domain
  const isPwaShell = 
    (window.location.hostname === "localhost" && !window.location.port) ||
    window.location.protocol.startsWith("app") ||
    window.location.protocol.startsWith("capacitor") ||
    window.location.protocol.startsWith("chrome-extension");

  if (isPwaShell) {
    console.warn("[PWA Runtime] Packaged wrapper environment detected. Redirecting API to hosted gateway fallback.");
    const fallbackBase = APP_URL ? (APP_URL.endsWith("/") ? APP_URL.slice(0, -1) : APP_URL) : "";
    return `${fallbackBase}${path}`;
  }

  // Standard relative fallback on modern browser environments (single-origin proxy setup)
  return path;
}

/**
 * Resolves the absolute backend WebSocket URL.
 * Automatically switches protocols depending on security settings (wss:// or ws://).
 * 
 * @returns The fully normalized WebSocket synchronization channel URL
 */
export function getBackendWsUrl(): string {
  if (VITE_BACKEND_URL) {
    const cleanBase = VITE_BACKEND_URL.endsWith("/")
      ? VITE_BACKEND_URL.slice(0, -1)
      : VITE_BACKEND_URL;
    const isSecureWs = cleanBase.startsWith("https:") || cleanBase.startsWith("wss:");
    const wsProtocol = isSecureWs ? "wss:" : "ws:";
    const wsHost = cleanBase.replace(/^https?:\/\//, "").replace(/^wss?:\/\//, "");
    return `${wsProtocol}//${wsHost}/multiplayer`;
  }

  // Detect basic PWA custom protocols or hybrid wrappers where hostname lacks a domain
  const isPwaShell = 
    (window.location.hostname === "localhost" && !window.location.port) ||
    window.location.protocol.startsWith("app") ||
    window.location.protocol.startsWith("capacitor") ||
    window.location.protocol.startsWith("chrome-extension");

  if (isPwaShell && APP_URL) {
    const cleanBase = APP_URL.endsWith("/") ? APP_URL.slice(0, -1) : APP_URL;
    const isSecureWs = cleanBase.startsWith("https:");
    const wsProtocol = isSecureWs ? "wss:" : "ws:";
    const wsHost = cleanBase.replace(/^https?:\/\//, "");
    return `${wsProtocol}//${wsHost}/multiplayer`;
  }

  // Standard runtime resolution for browser single-origin context
  const isSecure = window.location.protocol === "https:";
  const wsProtocol = isSecure ? "wss:" : "ws:";
  return `${wsProtocol}//${window.location.host}/multiplayer`;
}
