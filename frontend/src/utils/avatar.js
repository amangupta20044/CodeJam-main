const AVATAR_COLORS = [
  "bg-zinc-700 text-zinc-100",
  "bg-indigo-600 text-white",
  "bg-slate-600 text-slate-100",
  "bg-zinc-600 text-zinc-100",
  "bg-indigo-700 text-indigo-100",
];

export function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function getAvatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
