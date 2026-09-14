import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/* Shared card shell: white, thin border, soft radius + shadow. */
export function SettingsCard({
  icon: Icon,
  title,
  subtitle,
  children,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`animate-rise-up rounded-2xl border border-[#DADCE0] bg-white p-5 shadow-[0_1px_2px_rgba(16,42,86,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(20,120,242,0.08)] sm:p-6 ${className}`}
    >
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#E8F0FE] text-[#1A73E8]" aria-hidden="true">
          <Icon size={19} strokeWidth={2.1} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold tracking-tight text-[#202124]">{title}</h2>
          <p className="mt-0.5 text-xs font-medium leading-relaxed text-[#5F6368]">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/* Accessible toggle switch. */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A73E8] ${
        checked ? "bg-[#1A73E8]" : "bg-[#D7E3F2]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

/* Labelled native select matching app input styling. */
export function FieldSelect({
  id,
  label,
  hint,
  value,
  onChange,
  options,
  disabled = false,
  disabledNote,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange?: (value: string) => void;
  options: readonly { value: string; label: string }[] | readonly string[];
  disabled?: boolean;
  disabledNote?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-[#202124]">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className="w-full appearance-none rounded-xl border border-[#DADCE0] bg-white py-2.5 pl-3.5 pr-9 text-sm font-medium text-[#202124] transition-colors hover:border-[#BCD9F5] focus:border-[#1A73E8] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/15 disabled:cursor-not-allowed disabled:bg-[#F1F3F4] disabled:text-[#5F6368]"
        >
          {options.map((o) =>
            typeof o === "string" ? (
              <option key={o} value={o}>
                {o}
              </option>
            ) : (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ),
          )}
        </select>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5F6368]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
      {hint && <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-[#5F6368]">{hint}</p>}
      {disabled && disabledNote && (
        <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-[#5F6368]">{disabledNote}</p>
      )}
    </div>
  );
}

/* Labelled text input matching app input styling. */
export function FieldInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  readOnly = false,
  note,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  readOnly?: boolean;
  note?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-[#202124]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        readOnly={readOnly}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="w-full rounded-xl border border-[#DADCE0] bg-white px-3.5 py-2.5 text-sm font-medium text-[#202124] transition-colors placeholder:text-[#5F6368] hover:border-[#BCD9F5] focus:border-[#1A73E8] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/15 read-only:cursor-default read-only:bg-[#F8F9FA] read-only:text-[#5F6368]"
      />
      {note && <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-[#5F6368]">{note}</p>}
    </div>
  );
}
