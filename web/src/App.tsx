import { useState } from 'react';
import { ReportIssueButton } from './components/ReportIssueButton.tsx';
import { Tabs, TabsList, TabsPanel, TabsTab } from './components/ui/Tabs.tsx';
import { ListingsPage } from './pages/ListingsPage.tsx';
import { SavedPage } from './pages/SavedPage.tsx';
import { SourcesPage } from './pages/SourcesPage.tsx';

export function App() {
  const [tab, setTab] = useState<string>('listings');
  // A listing's link handed from the Listings tab to the Saved tab's fetch.
  const [incomingLink, setIncomingLink] = useState<string | null>(null);

  const saveLink = (url: string) => {
    setIncomingLink(url);
    setTab('saved');
  };

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
            <TabsTab value="saved">Saved</TabsTab>
            <TabsTab value="sources">Sources</TabsTab>
          </TabsList>
          {/* keepMounted: a hidden page keeps its open draft, sort, filter and
              running Refresh instead of starting over when its tab comes back. */}
          <TabsPanel value="listings" keepMounted>
            <ListingsPage onSaveLink={saveLink} />
          </TabsPanel>
          <TabsPanel value="saved" keepMounted>
            <SavedPage
              incomingLink={incomingLink}
              onIncomingTaken={() => setIncomingLink(null)}
            />
          </TabsPanel>
          <TabsPanel value="sources" keepMounted>
            <SourcesPage active={tab === 'sources'} />
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
