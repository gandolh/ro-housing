import { useState } from 'react';
import { ReportIssueButton } from './components/ReportIssueButton.tsx';
import { Tabs, TabsList, TabsPanel, TabsTab } from './components/ui/Tabs.tsx';
import { ListingsPage } from './pages/ListingsPage.tsx';
import { SourcesPage } from './pages/SourcesPage.tsx';

export function App() {
  const [tab, setTab] = useState<string>('listings');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 flex h-9 items-center justify-between border-b border-ink bg-panel px-4">
        <span className="text-xl font-bold uppercase tracking-tight">
          ro-housing
        </span>
        <ReportIssueButton />
      </header>

      <main className="mx-auto w-full max-w-[960px] flex-1 px-6 py-5">
        <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
          <TabsList>
            <TabsTab value="listings">Listings</TabsTab>
            <TabsTab value="sources">Sources</TabsTab>
          </TabsList>
          <TabsPanel value="listings">
            <ListingsPage />
          </TabsPanel>
          <TabsPanel value="sources">
            <SourcesPage />
          </TabsPanel>
        </Tabs>
      </main>

      <footer className="mt-auto flex h-9 items-center justify-between border-t border-ink bg-panel px-4 text-xs uppercase tracking-wide text-ink-faint">
        <span>ro-housing</span>
        <span>Timi&#537;oara only</span>
      </footer>
    </div>
  );
}
