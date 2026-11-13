import { Button as BaseButton } from "@base-ui/react/button";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/cn.ts";

type Variant = "default" | "primary" | "ghost";

interface ButtonProps extends ComponentPropsWithoutRef<typeof BaseButton> {
  variant?: Variant;
}

const variantClass: Record<Variant, string> = {
  // Secondary: the quiet button, a 1px rule on the panel. Refresh, Discard.
  default:
    "h-9 gap-2 px-4 border border-rule bg-panel font-medium text-ink hover:bg-panel-alt data-disabled:border-rule-soft data-disabled:bg-transparent data-disabled:text-ink-faint data-disabled:hover:bg-transparent",
  // Primary: solid ink, flat. One per screen where there is an action (Fetch details, Save).
  primary:
    "h-9 gap-2 px-5 border border-ink bg-ink font-bold text-paper hover:border-ink-dim hover:bg-ink-dim data-disabled:border-rule-soft data-disabled:bg-transparent data-disabled:text-ink-faint data-disabled:hover:bg-transparent",
  // Ghost: no chrome until the pointer is over it. Save, Edit, Delete, Cancel.
  ghost:
    "h-8 gap-1.5 px-2 border border-transparent font-medium text-ink hover:border-rule-soft hover:bg-panel-alt data-disabled:text-ink-faint data-disabled:hover:border-transparent data-disabled:hover:bg-transparent",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", className, ...props }, ref) => {
    return (
      <BaseButton
        ref={ref}
        {...props}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap text-base select-none motion-safe:transition-colors",
          variantClass[variant],
          className,
        )}
      />
    );
  },
);
Button.displayName = "Button";
