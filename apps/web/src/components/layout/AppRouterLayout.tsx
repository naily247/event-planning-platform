import { Outlet } from 'react-router-dom';
import { ScrollToTop } from '../navigation/ScrollToTop';

export function AppRouterLayout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
}