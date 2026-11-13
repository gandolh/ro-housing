import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/cn.ts";

export const Tabs = BaseTabs.Root;

/** The three tabs. On a phone this same list is the bottom bar (one list, so each tab exists once for
 *  assistive tech): it moves after the panels and sticks to the bottom of the screen. */
export const TabsList = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof BaseTabs.List>>(
  ({ className, ...props }, ref) => (
    <BaseTabs.List
      ref={ref}
      {...props}
      className={cn(
        "relative z-10 flex items-end",
        "max-[820px]:sticky max-[820px]:bottom-0 max-[820px]:z-bar max-[820px]:order-last max-[820px]:mt-6 max-[820px]:grid max-[820px]:h-16 max-[820px]:grid-cols-3 max-[820px]:items-stretch max-[820px]:border-t max-[820px]:border-rule max-[820px]:bg-panel",
        className,
      )}
    />
  ),
);
TabsList.displayName = "TabsList";

export const TabsTab = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<typeof BaseTabs.Tab>>(
  ({ className, ...props }, ref) => (
    <BaseTabs.Tab
      ref={ref}
      {...props}
      className={cn(
        // Desktop: a folder tab. The current one takes the head band's ground, a rule on three sides and an
        // ochre top rule, and drops 1px to cover the island's top edge. Base UI marks it with data-active.
        "flex h-11 items-center gap-2 border border-b-0 border-t-2 border-transparent px-5 font-medium text-ink-dim motion-safe:transition-colors",
        "hover:text-ink",
        "data-active:-mb-px data-active:h-[45px] data-active:border-rule data-active:border-t-accent data-active:bg-panel-alt data-active:font-bold data-active:text-ink",
        // Phone: a bottom-bar cell, icon over label, 48px or more to hit.
        "max-[820px]:h-auto max-[820px]:min-h-12 max-[820px]:flex-col max-[820px]:justify-center max-[820px]:gap-0.5 max-[820px]:border-0 max-[820px]:border-t-[3px] max-[820px]:px-0 max-[820px]:text-xs",
        "max-[820px]:data-active:mb-0 max-[820px]:data-active:h-auto max-[820px]:data-active:border-x-0 max-[820px]:data-active:border-b-0 max-[820px]:data-active:border-t-accent",
        className,
      )}
    />
  ),
);
TabsTab.displayName = "TabsTab";

export const TabsPanel = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof BaseTabs.Panel>>(
  ({ className, ...props }, ref) => <BaseTabs.Panel ref={ref} {...props} className={cn(className)} />,
);
TabsPanel.displayName = "TabsPanel";
