import { useState } from "react";

const VARIANTS = {
  default: {
    input:
      "w-full rounded-lg border border-zinc-300 px-3 py-2 pr-10 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200",
    btn: "px-3",
  },
  pill: {
    input:
      "w-full rounded-full border border-zinc-300 px-5 py-3 pr-12 text-sm text-black focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-200",
    btn: "px-4",
  },
};

// Password input with a show/hide eye toggle. Pass variant="pill" for the
// rounded-full auth-screen style.
export default function PasswordInput({ variant = "default", className = "", ...props }) {
  const v = VARIANTS[variant] || VARIANTS.default;
  const [show, setShow] = useState(false);

  return (
    <div className="relative mt-1">
      <input
        {...props}
        type={show ? "text" : "password"}
        className={`${v.input} ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className={`absolute right-0 top-0 flex h-full items-center text-zinc-400 hover:text-zinc-600 ${v.btn}`}
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" x2="22" y1="2" y2="22" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
