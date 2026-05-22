import { type HTMLAttributes } from 'react';
import { cn } from '../../lib/cn.ts';

type Tone = 'default' | 'ok' | 'bad' | 'accent';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneClass: Record<Tone, string> = {
  default: 'border-ink text-ink bg-panel',
  ok: 'border-ok text-ok bg-ok-soft',
  bad: 'border-bad text-bad bg-bad-soft',
  accent: 'border-accent text-accent bg-accent-soft',
};

export function Badge({
  tone = 'default',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center border px-1.5 text-[10px] uppercase tracking-wide leading-4',
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
