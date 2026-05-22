import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn.ts';

export const Tabs = BaseTabs.Root;

export const TabsList = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof BaseTabs.List>
>(({ className, ...props }, ref) => (
  <BaseTabs.List
    ref={ref}
    {...props}
    className={cn(
      'mb-5 flex items-stretch border-b-2 border-ink',
      // Vertical 1px rules between adjacent tabs (industrial-panel "fascia" feel).
      // We draw them with divide-x so we don't need an extra wrapper per tab.
      'divide-x divide-rule-soft',
      className,
    )}
  />
));
TabsList.displayName = 'TabsList';

export const TabsTab = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof BaseTabs.Tab>
>(({ className, ...props }, ref) => (
  <BaseTabs.Tab
    ref={ref}
    {...props}
    className={cn(
      // h-10 (40px) + horizontal padding to give the tabs room to breathe.
      'relative h-10 px-5 text-sm uppercase tracking-wide text-ink-dim transition-colors',
      'hover:bg-panel-alt hover:text-ink',
      // Active state: bold, ink, panel background to lift it visually,
      // plus a 3px ink underline flush with the list's bottom border.
      'data-selected:font-bold data-selected:text-ink data-selected:bg-panel',
      'after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[3px] after:bg-transparent',
      'data-selected:after:bg-ink',
      className,
    )}
  />
));
TabsTab.displayName = 'TabsTab';

export const TabsPanel = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof BaseTabs.Panel>
>(({ className, ...props }, ref) => (
  <BaseTabs.Panel
    ref={ref}
    {...props}
    className={cn('focus:outline-none', className)}
  />
));
TabsPanel.displayName = 'TabsPanel';
