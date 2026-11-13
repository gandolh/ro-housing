import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn.ts";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      {...props}
      className={cn(
        "block w-full resize-y border border-rule bg-panel px-3 py-2 text-base",
        "placeholder:text-ink-faint",
        "focus:bg-paper",
        "disabled:opacity-50",
        className,
      )}
    />
  );
});
Textarea.displayName = "Textarea";
