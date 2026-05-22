import { Field as BaseField } from '@base-ui/react/field';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn.ts';

export const Field = BaseField.Root;

export const FieldLabel = forwardRef<
  HTMLLabelElement,
  ComponentPropsWithoutRef<typeof BaseField.Label>
>(({ className, ...props }, ref) => (
  <BaseField.Label
    ref={ref}
    {...props}
    className={cn(
      'block text-xs uppercase tracking-wide text-ink-dim mb-1',
      className,
    )}
  />
));
FieldLabel.displayName = 'FieldLabel';

export const FieldDescription = forwardRef<
  HTMLParagraphElement,
  ComponentPropsWithoutRef<typeof BaseField.Description>
>(({ className, ...props }, ref) => (
  <BaseField.Description
    ref={ref}
    {...props}
    className={cn('mt-1 text-xs text-ink-dim', className)}
  />
));
FieldDescription.displayName = 'FieldDescription';

export const FieldError = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof BaseField.Error>
>(({ className, ...props }, ref) => (
  <BaseField.Error
    ref={ref}
    {...props}
    className={cn('mt-1 text-xs text-bad', className)}
  />
));
FieldError.displayName = 'FieldError';
