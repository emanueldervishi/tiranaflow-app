// React Native provides global WebSocket. Supabase's Node fallback is never used.
export default class WebSocketFallback {
  constructor() {
    throw new Error("Node WebSocket fallback is unavailable in React Native.");
  }
}
