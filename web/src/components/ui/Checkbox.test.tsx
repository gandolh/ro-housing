import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox.tsx';

describe('<Checkbox>', () => {
  it('renders as an accessible checkbox', () => {
    render(<Checkbox aria-label="enable storia" />);
    expect(screen.getByRole('checkbox', { name: 'enable storia' })).toBeInTheDocument();
  });

  it('toggles checked state on click', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="x" onCheckedChange={onCheckedChange} />);
    await user.click(screen.getByRole('checkbox'));
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it('respects controlled checked prop', () => {
    render(<Checkbox aria-label="x" checked />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('data-checked');
  });
});
