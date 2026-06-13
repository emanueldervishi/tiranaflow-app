import { Redirect } from "expo-router";

export default function CaptureRedirect() {
  return <Redirect href={"/report/new" as never} />;
}
