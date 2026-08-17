import { LoaderCircle } from 'lucide-react';
import { Outlet } from 'react-router-dom';

import { useCurrentUser } from '../../features/auth/useCurrentUser';
import { CustomerWorkspaceHeader } from '../navigation/CustomerWorkspaceHeader';
import { CustomerWorkspaceFooter } from '../ui/CustomerWorkspaceFooter';

export function CustomerLayout() {
  const currentUserQuery = useCurrentUser(true);

  if (currentUserQuery.isLoading) {
    return (
      <div className="workspace-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-72 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-9 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Opening your Eventure workspace
            </p>

            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
              Restoring your customer account and planning tools.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (
    currentUserQuery.isError ||
    !currentUserQuery.data ||
    currentUserQuery.data.role !== 'CUSTOMER'
  ) {
    return null;
  }

  return (
    <div className="workspace-shell flex min-h-screen flex-col overflow-x-hidden text-[var(--color-charcoal)]">
      <div className="relative z-40 px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <CustomerWorkspaceHeader user={currentUserQuery.data} />
        </div>
      </div>

      <main className="relative flex-1">
        <Outlet />
      </main>

      <CustomerWorkspaceFooter />
    </div>
  );
}
