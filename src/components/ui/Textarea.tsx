import { TextareaHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs md:text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={clsx(
            // Base styles using semantic tokens
            'w-full px-3 py-2 rounded-md shadow-sm resize-vertical',
            'bg-input-bg border border-input-border text-input-text',
            'placeholder:text-input-placeholder',
            // Focus states
            'focus:outline-none focus:ring-2 focus:ring-input-focus-ring focus:border-border-focus',
            // Disabled states
            'disabled:bg-input-disabled-bg disabled:text-input-disabled-text disabled:cursor-not-allowed',
            // Error states
            'transition-shadow duration-200 ease-out',
            'motion-safe:animate-fade-in',
            error && 'border-error focus:ring-error focus:border-error',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-error">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-2 text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';