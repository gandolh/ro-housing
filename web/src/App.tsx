import { useState, type ReactNode } from "react";
import { ReportIssueButton } from "./components/ReportIssueButton.tsx";
import { Icon } from "./components/Icon.tsx";
import { Tabs, TabsList, TabsPanel, TabsTab } from "./components/ui/Tabs.tsx";
import { ListingsPage } from "./pages/ListingsPage.tsx";
import { SavedPage } from "./pages/SavedPage.tsx";
import { SourcesPage } from "./pages/SourcesPage.tsx";

/** `account`: the signed-in user's button in the header, from main.tsx; tests
 *  render the app without the sign-in gate and leave it out. */
export function App({ account }: { account?: ReactNode } = {}) {
  const [tab, setTab] = useState<string>("listings");
  // A listing's link handed from the Listings tab to the Saved tab's fetch.
  const [incomingLink, setIncomingLink] = useState<string | null>(null);

  const saveLink = (url: string) => {
    setIncomingLink(url);
    setTab("saved");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-header border-b border-rule bg-panel">
        <div className="mx-auto flex h-12 w-full max-w-[1168px] items-center gap-2 px-6 max-[820px]:gap-1.5 max-[820px]:px-4">
          <span className="mr-auto text-xl font-bold uppercase tracking-tight max-[820px]:text-lg">ro-housing</span>
          <ReportIssueButton />
          {account}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1168px] flex-1 px-6 pb-10 pt-4 max-[820px]:px-0 max-[820px]:pb-0 max-[820px]:pt-0">
        <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="flex min-w-0 flex-1 flex-col">
          <TabsList>
            <TabsTab value="listings">
              <Icon name="list" className="hidden shrink-0 max-[820px]:block" />
              Listings
            </TabsTab>
            <TabsTab value="saved">
              <Icon name="bookmark" className="hidden shrink-0 max-[820px]:block" />
              Saved
            </TabsTab>
            <TabsTab value="sources">
              <Icon name="rss" className="hidden shrink-0 max-[820px]:block" />
              Sources
            </TabsTab>
          </TabsList>
          {/* keepMounted: a hidden page keeps its open draft, sort, filter and
              running Refresh instead of starting over when its tab comes back. */}
          <TabsPanel value="listings" keepMounted className="max-[820px]:px-4 max-[820px]:py-4">
            <ListingsPage onSaveLink={saveLink} />
          </TabsPanel>
          <TabsPanel value="saved" keepMounted className="max-[820px]:px-4 max-[820px]:py-4">
            <SavedPage incomingLink={incomingLink} onIncomingTaken={() => setIncomingLink(null)} />
          </TabsPanel>
          <TabsPanel value="sources" keepMounted className="max-[820px]:px-4 max-[820px]:py-4">
            <SourcesPage active={tab === "sources"} />
          </TabsPanel>
        </Tabs>
      </main>

      <footer className="border-t border-rule bg-panel">
        <div className="mx-auto flex h-10 w-full max-w-[1168px] items-center justify-between px-6 text-xs font-medium text-ink-dim max-[820px]:px-4">
          <span className="text-ink">ro-housing</span>
          <span>Timi&#537;oara only</span>
        </div>
      </footer>
    </div>
  );
}
