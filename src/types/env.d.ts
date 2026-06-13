declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_AUTH_REDIRECT_URL?: string;
  }
}

declare module "expo-web-browser" {
  export function maybeCompleteAuthSession(): void;
  export function openAuthSessionAsync(
    url: string,
    redirectUrl?: string | null,
  ): Promise<{ type: string; url?: string }>;
}
