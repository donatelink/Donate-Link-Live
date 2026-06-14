import COUNTRIES from "@/utils/countries";

const VARIANTS = {
  default:
    "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200",
  pill:
    "mt-1 w-full rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm text-black focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200",
};

export default function CountrySelect({ id, value, onChange, required, variant = "default" }) {
  const cls = VARIANTS[variant] || VARIANTS.default;
  return (
    <select
      id={id}
      required={required}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={cls}
    >
      <option value="" disabled>
        Select a country…
      </option>
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.name}>
          {c.flag} {c.name}
        </option>
      ))}
    </select>
  );
}
