import { type HTMLAttributes } from 'react';
import { cn } from '../../lib/cn.ts';

// A 1px-bordered white container used to enclose lists and tables.
// Equivalent of the "white card on paper" pattern from the todo-app reference.
export function Panel({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('border border-ink bg-panel', className)}
    >
      {children}
    </div>
  );
}
