import { cn } from '@/lib/utils';

export function Input({
  label,
  className,
  error,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string }) {
  return (
    <div className="flex flex-col">
      {label && <label className="input-label">{label}</label>}
      <input className={cn('input-base', className)} {...props} />
      {error ? (
        <p className="text-[10px] text-red-400 font-semibold mt-1.5">{error}</p>
      ) : hint ? (
        <p className="text-[10px] text-[var(--text-dimmed)] mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

export function Textarea({
  label,
  className,
  error,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }) {
  return (
    <div className="flex flex-col">
      {label && <label className="input-label">{label}</label>}
      <textarea className={cn('input-base min-h-[88px] resize-y', className)} {...props} />
      {error && <p className="text-[10px] text-red-400 font-semibold mt-1.5">{error}</p>}
    </div>
  );
}

export function Select({
  label,
  children,
  className,
  error,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }) {
  return (
    <div className="flex flex-col">
      {label && <label className="input-label">{label}</label>}
      <select className={cn('input-base', className)} {...props}>
        {children}
      </select>
      {error && <p className="text-[10px] text-red-400 font-semibold mt-1.5">{error}</p>}
    </div>
  );
}
