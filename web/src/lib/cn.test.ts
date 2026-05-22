import { describe, expect, it } from 'vitest';
import { cn } from './cn.ts';

describe('cn', () => {
  it('joins truthy class fragments', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('drops falsy fragments', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('honours conditional object syntax via clsx', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });

  it('merges conflicting Tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-ink', 'text-paper')).toBe('text-paper');
  });

  it('keeps non-conflicting classes together', () => {
    expect(cn('h-7', 'px-3', 'border-ink')).toBe('h-7 px-3 border-ink');
  });
});
