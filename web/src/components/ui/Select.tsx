import { Select as BaseSelect } from "@base-ui/react/select";
import { forwardRef, type ComponentProps, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "../../lib/cn.ts";

type SelectProps = Omit<ComponentProps<typeof BaseSelect.Root<string>>, "items" | "multiple"> & {
  /** Every choice with the label the trigger shows for it (base-ui rule 10). */
  items: Record<string, ReactNode>;
};

export function Select(props: SelectProps) {
  return <BaseSelect.Root {...props} />;
}

export const SelectTrigger = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<typeof BaseSelect.Trigger>>(
  ({ className, children, ...props }, ref) => (
    <BaseSelect.Trigger
      ref={ref}
      {...props}
      className={cn(
        // Industrial-knob depth: 2px ink border + top-inset highlight (see styles.css .knob).
        // Inverts on open: ink fill, paper text, highlight flips to the bottom edge.
        "knob inline-flex h-7 min-w-[8rem] items-center justify-between gap-2 border-ink bg-panel px-2 text-sm",
        "hover:bg-paper",
        "data-popup-open:bg-ink data-popup-open:text-paper",
        "data-disabled:opacity-50",
        className,
      )}
    >
      {children}
      <BaseSelect.Icon aria-hidden="true" className="text-ink-dim data-popup-open:text-paper">
        ▾
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  ),
);
SelectTrigger.displayName = "SelectTrigger";

export const SelectValue = BaseSelect.Value;

interface SelectPopupProps {
  children: ReactNode;
  className?: string;
}

export function SelectPopup({ children, className }: SelectPopupProps) {
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner sideOffset={4}>
        <BaseSelect.Popup
          className={cn(
            "min-w-[var(--anchor-width)] border-2 border-ink bg-panel py-1 shadow-[2px_2px_0_0_var(--color-ink)]",
            className,
          )}
        >
          {children}
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

export const SelectItem = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof BaseSelect.Item>>(
  ({ className, children, ...props }, ref) => (
    <BaseSelect.Item
      ref={ref}
      {...props}
      className={cn(
        "flex h-7 cursor-pointer items-center px-2 text-sm",
        "data-highlighted:bg-ink data-highlighted:text-paper",
        className,
      )}
    >
      <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
    </BaseSelect.Item>
  ),
);
SelectItem.displayName = "SelectItem";
