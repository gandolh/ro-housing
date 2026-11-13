import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/cn.ts";

type CheckboxProps = ComponentPropsWithoutRef<typeof BaseCheckbox.Root>;

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(({ className, ...props }, ref) => {
  return (
    <BaseCheckbox.Root
      ref={ref}
      {...props}
      className={cn(
        "relative inline-flex size-4 shrink-0 before:absolute before:-inset-3.5 before:content-[''] min-[821px]:before:hidden items-center justify-center border border-rule bg-panel",
        "data-checked:bg-ink data-checked:text-paper",
        "data-disabled:opacity-40",
        className,
      )}
    >
      <BaseCheckbox.Indicator className="text-mark leading-none data-unchecked:hidden">×</BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
});
Checkbox.displayName = "Checkbox";
