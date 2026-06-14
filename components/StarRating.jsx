const SIZE = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export default function StarRating({ value = 0, size = "sm", showNumber = false, count = null }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={`inline-flex items-center gap-1 ${SIZE[size] || SIZE.sm}`}>
      <span className="leading-none">
        {[1, 2, 3, 4, 5].map((n) => {
          if (rounded >= n) return <span key={n} className="text-amber-500">★</span>;
          if (rounded >= n - 0.5) return <span key={n} className="text-amber-500">⯨</span>;
          return <span key={n} className="text-zinc-300">★</span>;
        })}
      </span>
      {showNumber && value > 0 && (
        <span className="text-xs font-semibold text-zinc-700">{value.toFixed(1)}</span>
      )}
      {count !== null && (
        <span className="text-xs text-zinc-500">
          {count === 0 ? "No reviews" : `${count} review${count === 1 ? "" : "s"}`}
        </span>
      )}
    </span>
  );
}
