const SIZE = {
  xs: "h-7 w-7 text-xs",
  sm: "h-9 w-9 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-20 w-20 text-2xl",
  xl: "h-28 w-28 text-3xl",
};

export default function Avatar({ src, name, size = "md", className = "" }) {
  const sizeClass = SIZE[size] || SIZE.md;
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        className={`${sizeClass} shrink-0 rounded-full border border-zinc-200 object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} shrink-0 flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-100 font-bold text-emerald-700 ${className}`}
      aria-label={name || "Avatar"}
    >
      {initial}
    </div>
  );
}
