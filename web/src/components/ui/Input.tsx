import { Input as BaseInput } from "@base-ui/react/input";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/cn.ts";

type InputProps = ComponentPropsWithoutRef<typeof BaseInput>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <BaseInput
      ref={ref}
      {...props}
      className={cn(
        "h-10 w-full border border-rule bg-panel px-3 text-base",
        "placeholder:text-ink-faint",
        "focus:bg-paper data-focused:bg-paper",
        "data-disabled:opacity-50",
        className,
      )}
    />
  );
});
Input.displayName = "Input";
