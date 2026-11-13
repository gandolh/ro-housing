import { Select as BaseSelect } from "@base-ui/react/select";
import { forwardRef, type ComponentProps, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "../../lib/cn.ts";
import { Icon } from "../Icon.tsx";

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
        "inline-flex h-9 min-w-[8rem] items-center justify-between gap-2 border border-rule bg-panel pl-3 pr-2.5 text-base font-medium text-ink",
        "hover:bg-panel-alt data-popup-open:bg-panel-alt",
        "data-disabled:border-rule-soft data-disabled:text-ink-faint",
        className,
      )}
    >
      {children}
      <BaseSelect.Icon aria-hidden="true" className="text-ink">
        <Icon name="chevron" />
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
          className={cn("min-w-[var(--anchor-width)] border border-rule bg-panel py-1 shadow-popup", className)}
        >
          {children}
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

type SelectItemProps = ComponentPropsWithoutRef<typeof BaseSelect.Item> & {
  /** A second line under the label (a source's last run); the trigger still shows only the label. */
  detail?: ReactNode;
};

export const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, detail, ...props }, ref) => (
    <BaseSelect.Item
      ref={ref}
      {...props}
      className={cn(
        "flex min-h-9 cursor-pointer flex-col justify-center px-3 py-1 text-base",
        "data-highlighted:bg-panel-alt data-selected:bg-accent-soft",
        className,
      )}
    >
      <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
      {detail}
    </BaseSelect.Item>
  ),
);
SelectItem.displayName = "SelectItem";
