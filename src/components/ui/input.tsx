import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    { className, label, error, id, ...props },
    ref
) {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label
                    htmlFor={inputId}
                    className="text-sm font-medium text-[var(--text-primary)]"
                >
                    {label}
                </label>
            )}
            <input
                ref={ref}
                id={inputId}
                className={cn(
                    'h-10 w-full rounded-lg border bg-[#141416] px-3 py-2',
                    'text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]',
                    'border-[#1F1F23] transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    error &&
                        'border-[var(--danger)] focus-visible:ring-[var(--danger)]',
                    className
                )}
                {...props}
            />
            {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        </div>
    );
});
