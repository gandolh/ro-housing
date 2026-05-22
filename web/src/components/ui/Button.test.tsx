import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button.tsx';

describe('<Button>', () => {
  it('renders the label as a real <button>', () => {
    render(<Button>Hello</Button>);
    expect(screen.getByRole('button', { name: 'Hello' })).toBeInTheDocument();
  });

  it('applies variant classes (default / primary / ghost)', () => {
    const { rerender } = render(<Button>x</Button>);
    expect(screen.getByRole('button')).toHaveClass('border-ink');

    rerender(<Button variant="primary">x</Button>);
    // Primary uses the .knob bevel class (defined in styles.css)
    expect(screen.getByRole('button')).toHaveClass('knob');

    rerender(<Button variant="ghost">x</Button>);
    expect(screen.getByRole('button')).toHaveClass('border-transparent');
  });

  it('fires onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Off
      </Button>,
    );
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
