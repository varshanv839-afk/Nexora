import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { ResearchProvider, useResearch } from './context/ResearchContext';
import { ContradictionRadarPage } from './pages/ContradictionRadarPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentCrossRefPage } from './pages/DocumentCrossRefPage';
import { EvidenceLedgerPage } from './pages/EvidenceLedgerPage';
import { KnowledgeMapPage } from './pages/KnowledgeMapPage';
import { MyResearchPage } from './pages/MyResearchPage';
import { NewResearchPage } from './pages/NewResearchPage';
import { ReportViewerPage } from './pages/ReportViewerPage';
import { ResearchGapsPage } from './pages/ResearchGapsPage';
import { ResearchMemoryPage } from './pages/ResearchMemoryPage';
import { ResearchTrailPage } from './pages/ResearchTrailPage';
import { SettingsPage } from './pages/SettingsPage';
import { SourceIntelligencePage } from './pages/SourceIntelligencePage';
import { WorkspacePage } from './pages/WorkspacePage';

const AppShell: React.FC = () => {
  const { activePage } = useResearch();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'new-research':
        return <NewResearchPage />;
      case 'workspace':
        return <WorkspacePage />;
      case 'my-research':
        return <MyResearchPage />;
      case 'research-library':
        return <SourceIntelligencePage />;
      case 'evidence-ledger':
        return <EvidenceLedgerPage />;
      case 'contradiction-radar':
        return <ContradictionRadarPage />;
      case 'research-gaps':
        return <ResearchGapsPage />;
      case 'research-trail':
        return <ResearchTrailPage />;
      case 'knowledge-map':
        return <KnowledgeMapPage />;
      case 'document-crossref':
        return <DocumentCrossRefPage />;
      case 'research-memory':
        return <ResearchMemoryPage />;
      case 'report-viewer':
        return <ReportViewerPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen flex bg-[#070B14] text-slate-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] w-full mx-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ResearchProvider>
      <AppShell />
    </ResearchProvider>
  );
}
