import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn.ts';

export const Dialog = BaseDialog.Root;
export const DialogTrigger = BaseDialog.Trigger;
export const DialogClose = BaseDialog.Close;

interface DialogContentProps
  extends ComponentPropsWithoutRef<typeof BaseDialog.Popup> {
  // No extra props yet.
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="fixed inset-0 z-40 bg-ink/30 data-starting-style:opacity-0 data-ending-style:opacity-0 transition-opacity duration-150" />
      <BaseDialog.Popup
        ref={ref}
        {...props}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
          'w-[min(560px,92vw)] border border-ink bg-panel p-4 shadow-[4px_4px_0_0_var(--color-ink)]',
          'data-starting-style:opacity-0 data-ending-style:opacity-0 transition-opacity duration-150',
          'focus:outline-none',
          className,
        )}
      >
        {children}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  ),
);
DialogContent.displayName = 'DialogContent';

export const DialogTitle = forwardRef<
  HTMLHeadingElement,
  ComponentPropsWithoutRef<typeof BaseDialog.Title>
>(({ className, ...props }, ref) => (
  <BaseDialog.Title
    ref={ref}
    {...props}
    className={cn(
      'text-sm font-bold uppercase tracking-tight text-ink',
      className,
    )}
  />
));
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = forwardRef<
  HTMLParagraphElement,
  ComponentPropsWithoutRef<typeof BaseDialog.Description>
>(({ className, ...props }, ref) => (
  <BaseDialog.Description
    ref={ref}
    {...props}
    className={cn('mt-1 text-xs text-ink-dim', className)}
  />
));
DialogDescription.displayName = 'DialogDescription';
