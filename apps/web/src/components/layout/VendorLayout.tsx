import { Outlet } from 'react-router-dom';

import { VendorWorkspaceNav } from '../../features/vendors/components/VendorWorkspaceNav';
import { VendorWorkspaceHeader } from '../navigation/VendorWorkspaceHeader';
import { VendorWorkspaceFooter } from '../ui/VendorWorkspaceFooter';

export function VendorLayout() {
  return (
    <div className="workspace-shell flex min-h-screen flex-col overflow-x-hidden text-[var(--color-charcoal)]">
      <div className="relative z-50 px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <VendorWorkspaceHeader />
        </div>
      </div>

      <div className="relative z-40 px-4 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <VendorWorkspaceNav />
        </div>
      </div>

      <main className="relative flex-1">
        <Outlet />
      </main>

      <VendorWorkspaceFooter />
    </div>
  );
}
