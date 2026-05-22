import { Button as BaseButton } from '@base-ui/react/button';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn.ts';

type Variant = 'default' | 'primary' | 'ghost';

interface ButtonProps extends ComponentPropsWithoutRef<typeof BaseButton> {
  variant?: Variant;
}

const variantClass: Record<Variant, string> = {
  // Default: 2px ink border on white, no bevel. Sits between ghost and primary in hierarchy.
  default:
    'h-7 px-3 border-2 border-ink bg-panel text-ink hover:bg-paper active:bg-rule-soft data-disabled:opacity-40 data-disabled:hover:bg-panel',
  // Primary: solid ink with industrial-knob bevel. The dominant action on a screen.
  primary:
    'knob h-7 px-3 border-ink bg-ink text-paper hover:bg-ink-dim active:bg-ink data-disabled:opacity-40 data-disabled:hover:bg-ink',
  // Ghost: flat, no chrome. Used inline (tabs, table actions).
  ghost:
    'h-7 px-3 border border-transparent text-ink hover:underline underline-offset-2 data-disabled:opacity-40 data-disabled:hover:no-underline',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', className, ...props }, ref) => {
    return (
      <BaseButton
        ref={ref}
        {...props}
        className={cn(
          'inline-flex items-center justify-center text-sm transition-colors select-none',
          variantClass[variant],
          className,
        )}
      />
    );
  },
);
Button.displayName = 'Button';
