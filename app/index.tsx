import { Redirect } from "expo-router";

import { useSessionStore } from "@/store/useSessionStore";

export default function Index() {
  const userId = useSessionStore((state) => state.userId);
  return <Redirect href={userId ? "/(tabs)" : "/(auth)"} />;
}
