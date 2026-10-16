import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsList, TabsPanel, TabsTab } from './Tabs.tsx';

function Harness() {
  return (
    <Tabs defaultValue="a">
      <TabsList>
        <TabsTab value="a">A</TabsTab>
        <TabsTab value="b">B</TabsTab>
      </TabsList>
      <TabsPanel value="a">Panel A</TabsPanel>
      <TabsPanel value="b">Panel B</TabsPanel>
    </Tabs>
  );
}

describe('<Tabs>', () => {
  it('renders the default panel and switches when a tab is clicked', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByText('Panel A')).toBeInTheDocument();
    expect(screen.queryByText('Panel B')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'B' }));
    expect(screen.getByText('Panel B')).toBeInTheDocument();
  });

  // The active-tab styles in Tabs.tsx key on this attribute. They keyed on
  // data-selected, which Base UI 1.x never sets, so no tab ever looked active.
  it('marks the selected tab with data-active, and only that one', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole('tab', { selected: true })).toHaveAttribute('data-active');
    expect(screen.getByRole('tab', { name: 'B' })).not.toHaveAttribute('data-active');

    await user.click(screen.getByRole('tab', { name: 'B' }));
    expect(screen.getByRole('tab', { name: 'B' })).toHaveAttribute('data-active');
    expect(screen.getByRole('tab', { name: 'A' })).not.toHaveAttribute('data-active');
  });
});
