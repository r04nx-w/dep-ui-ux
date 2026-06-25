'use client'

import { Sidebar } from './sidebar'
import { TopBar } from './topbar'
import { Dashboard } from '@/components/screens/dashboard'
import { DataSourcesHub } from '@/components/screens/data-sources-hub'
import { ResourceCatalogBuilder } from '@/components/screens/resource-catalog-builder'
import { ACLBuilder } from '@/components/screens/acl-builder'
import { CatalogExplorer } from '@/components/screens/catalog-explorer'
import { MyDataAccess } from '@/components/screens/my-data-access'
import { ProjectWorkspaces } from '@/components/screens/project-workspaces'
import { SavedArtifacts } from '@/components/screens/saved-artifacts'
import { UserDirectory } from '@/components/screens/user-directory'
import { AuditTrails } from '@/components/screens/audit-trails'
import { AccountSettings } from '@/components/screens/account-settings'

interface MainLayoutProps {
  userRole: 'admin' | 'onboarder' | 'analyst'
  currentPage: string
  onNavigate: (page: string) => void
  onLogout: () => void
}

const getPageTitle = (page: string): string => {
  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    connections: 'Data Connections',
    catalog: 'Resource Catalog',
    acl: 'Governance & ACL Builder',
    explorer: 'Catalog Explorer',
    access: 'My Data Access',
    workspaces: 'Project Workspaces',
    artifacts: 'Saved Artifacts',
    users: 'User Directory',
    audit: 'Audit Trails',
    settings: 'Account Settings',
  }
  return titles[page] || 'Dashboard'
}

const renderPage = (page: string, userRole: 'admin' | 'onboarder' | 'analyst') => {
  switch (page) {
    case 'connections':
      return <DataSourcesHub />
    case 'catalog':
      return <ResourceCatalogBuilder />
    case 'acl':
      return <ACLBuilder />
    case 'explorer':
      return <CatalogExplorer />
    case 'access':
      return <MyDataAccess />
    case 'workspaces':
      return <ProjectWorkspaces />
    case 'artifacts':
      return <SavedArtifacts />
    case 'users':
      return <UserDirectory />
    case 'audit':
      return <AuditTrails />
    case 'settings':
      return <AccountSettings />
    default:
      return <Dashboard userRole={userRole} />
  }
}

export function MainLayout({
  userRole,
  currentPage,
  onNavigate,
  onLogout,
}: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-[#181818]">
      <Sidebar
        userRole={userRole}
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          title={getPageTitle(currentPage)}
          userRole={userRole}
        />
        <main className="flex-1 overflow-auto bg-[#181818]">
          {renderPage(currentPage, userRole)}
        </main>
      </div>
    </div>
  )
}
