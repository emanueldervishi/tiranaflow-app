import { formatDistanceToNow, format } from "date-fns";

export const formatSeenAt = (value: string | null) => {
  if (!value) return "No saved sighting yet";
  const date = new Date(value);
  return `${formatDistanceToNow(date, { addSuffix: true })} · ${format(date, "EEE h:mm a")}`;
};

export const formatCompactSeenAt = (value: string | null) => {
  if (!value) return "Not saved yet";
  return format(new Date(value), "MMM d, h:mm a");
};

export const safeArray = <T>(value: T[] | null | undefined) => value ?? [];

export const normalizeQuery = (value: string) => value.trim().toLowerCase();

export const makeId = () => Math.random().toString(36).slice(2, 10);

export const getInitials = (value: string | null | undefined) => {
  if (!value) return "LS";
  return value
    .split(" ")
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
};
