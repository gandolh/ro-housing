import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { forwardRef, useCallback, useRef, type ComponentProps, type ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/cn.ts";

/**
 * A modal dialog root. An Esc that a control inside already used (a select
 * closing its list) isn't the dialog's, so that close is skipped. A dialog that
 * holds a form sets `disablePointerDismissal`: an outside tap must not throw
 * away what was typed.
 */
export function Dialog({ onOpenChange, ...props }: ComponentProps<typeof BaseDialog.Root>) {
  return (
    <BaseDialog.Root
      {...props}
      onOpenChange={(open, details) => {
        if (!open && details.reason === "escape-key" && details.event.defaultPrevented) return;
        onOpenChange?.(open, details);
      }}
    />
  );
}
export const DialogTrigger = BaseDialog.Trigger;
export const DialogClose = BaseDialog.Close;

// No extra props yet.
type DialogContentProps = ComponentPropsWithoutRef<typeof BaseDialog.Popup>;

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => {
    const popup = useRef<HTMLDivElement | null>(null);
    const setRef = useCallback(
      (node: HTMLDivElement | null) => {
        popup.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );
    // Focus goes to the first [data-autofocus], else the first field, else the first button: never the first control by accident.
    const initialFocus = () =>
      popup.current?.querySelector<HTMLElement>("[data-autofocus]") ??
      popup.current?.querySelector<HTMLElement>(
        "input:not(:disabled), select:not(:disabled), textarea:not(:disabled)",
      ) ??
      popup.current?.querySelector<HTMLElement>("button:not(:disabled)") ??
      true;
    return (
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-40 bg-ink/30 data-starting-style:opacity-0 data-ending-style:opacity-0 transition-opacity duration-150" />
        <BaseDialog.Popup
          ref={setRef}
          initialFocus={initialFocus}
          {...props}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-[min(560px,92vw)] border border-ink bg-panel p-4 shadow-[4px_4px_0_0_var(--color-ink)]",
            "data-starting-style:opacity-0 data-ending-style:opacity-0 transition-opacity duration-150",
            "focus:outline-none",
            className,
          )}
        >
          {children}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    );
  },
);
DialogContent.displayName = "DialogContent";

export const DialogTitle = forwardRef<HTMLHeadingElement, ComponentPropsWithoutRef<typeof BaseDialog.Title>>(
  ({ className, ...props }, ref) => (
    <BaseDialog.Title
      ref={ref}
      {...props}
      className={cn("text-sm font-bold uppercase tracking-tight text-ink", className)}
    />
  ),
);
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = forwardRef<
  HTMLParagraphElement,
  ComponentPropsWithoutRef<typeof BaseDialog.Description>
>(({ className, ...props }, ref) => (
  <BaseDialog.Description ref={ref} {...props} className={cn("mt-1 text-xs text-ink-dim", className)} />
));
DialogDescription.displayName = "DialogDescription";
