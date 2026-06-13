import * as WebBrowser from "expo-web-browser";

import { supabase } from "@/lib/supabase";
import type { SessionUser } from "@/types/domain";

WebBrowser.maybeCompleteAuthSession();

const readOAuthParams = (url: string) => {
  const parsedUrl = new URL(url);
  const searchParams = new URLSearchParams(parsedUrl.search);
  const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ""));

  return {
    code: searchParams.get("code") ?? hashParams.get("code"),
    accessToken: searchParams.get("access_token") ?? hashParams.get("access_token"),
    refreshToken: searchParams.get("refresh_token") ?? hashParams.get("refresh_token"),
    error: searchParams.get("error_description")
      ?? hashParams.get("error_description")
      ?? searchParams.get("error")
      ?? hashParams.get("error"),
  };
};

export const getCurrentSessionUser = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return null;

  return {
    id: data.session.user.id,
    email: data.session.user.email ?? null,
  } satisfies SessionUser;
};

export const signInWithGoogle = async () => {
  if (!supabase) throw new Error("Missing Supabase env keys.");

  const redirectTo = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL ?? "tiranaflow://auth/callback";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error("Supabase did not return an OAuth URL.");

  const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (authResult.type !== "success" || !authResult.url) {
    throw new Error("Google sign-in was cancelled.");
  }

  const params = readOAuthParams(authResult.url);
  if (params.error) {
    throw new Error(params.error);
  }

  if (params.code) {
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
    if (exchangeError) throw exchangeError;
    if (!sessionData.session?.user) throw new Error("No session was created.");

    return {
      id: sessionData.session.user.id,
      email: sessionData.session.user.email ?? null,
    } satisfies SessionUser;
  }

  if (params.accessToken && params.refreshToken) {
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    });
    if (sessionError) throw sessionError;
    if (!sessionData.session?.user) throw new Error("No session was created.");

    return {
      id: sessionData.session.user.id,
      email: sessionData.session.user.email ?? null,
    } satisfies SessionUser;
  }

  throw new Error("Google sign-in returned without a usable session.");
};

export const signOutRemote = async () => {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
