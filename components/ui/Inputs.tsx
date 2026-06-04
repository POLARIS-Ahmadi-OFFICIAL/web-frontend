export function FormField({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[var(--st-text)]">{label}</span>
      {children}
      {help ? <span className="block text-xs text-[var(--st-muted)]">{help}</span> : null}
    </label>
  );
}

const inputClass =
  "w-full min-h-[44px] rounded-[var(--st-radius-sm)] border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2.5 text-base text-[var(--st-text)] placeholder:text-[var(--st-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--st-primary)]/40 focus-visible:border-[var(--st-primary)]";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClass} {...props} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputClass} min-h-[100px]`} {...props} />;
}

export function Select({
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
}) {
  return (
    <select className={inputClass} {...props}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--st-text)]">
      <input type="checkbox" className="rounded border-[var(--st-border)]" {...props} />
      {label}
    </label>
  );
}

export function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" className={inputClass} {...props} />;
}

export function MultiSelect({
  label,
  help,
  options,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const selected = new Set(value);
  function toggle(opt: string) {
    const next = new Set(selected);
    if (next.has(opt)) next.delete(opt);
    else next.add(opt);
    onChange(options.filter((o) => next.has(o)));
  }
  return (
    <FormField label={label} help={help}>
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] p-2">
        {options.map((opt) => (
          <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm text-[var(--st-text)]">
            <input
              type="checkbox"
              className="rounded border-[var(--st-border)]"
              checked={selected.has(opt)}
              onChange={() => toggle(opt)}
            />
            {opt}
          </label>
        ))}
      </div>
    </FormField>
  );
}
