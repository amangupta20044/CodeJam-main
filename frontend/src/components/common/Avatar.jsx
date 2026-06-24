import { getAvatarColor, getInitials } from "../../utils/avatar";

export default function Avatar({
  name,
  size = "md",
  className = "",
  ring = false,
}) {
  const sizeClass =
    size === "sm"
      ? "h-7 w-7 text-[10px]"
      : size === "lg"
        ? "h-10 w-10 text-sm"
        : "h-8 w-8 text-xs";

  return (
    <div
      className={`${sizeClass} ${getAvatarColor(name)} flex shrink-0 items-center justify-center rounded-none border border-[var(--cj-border)] font-semibold ${
        ring
          ? "border-[var(--cj-indigo)] ring-1 ring-indigo-500/40"
          : ""
      } ${className}`}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
