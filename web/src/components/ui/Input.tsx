import { Input as BaseInput } from '@base-ui/react/input';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn.ts';

type InputProps = ComponentPropsWithoutRef<typeof BaseInput>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <BaseInput
        ref={ref}
        {...props}
        className={cn(
          'h-7 w-full border border-ink bg-panel px-2 text-sm',
          'placeholder:text-ink-faint',
          'focus:outline-none focus:bg-paper data-focused:bg-paper',
          'data-disabled:opacity-50',
          className,
        )}
      />
    );
  },
);
Input.displayName = 'Input';
