import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn.ts';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        {...props}
        className={cn(
          'block w-full resize-y border border-ink bg-panel px-2 py-1.5 text-sm leading-5',
          'placeholder:text-ink-faint',
          'focus:outline-none focus:bg-paper',
          'disabled:opacity-50',
          className,
        )}
      />
    );
  },
);
Textarea.displayName = 'Textarea';
