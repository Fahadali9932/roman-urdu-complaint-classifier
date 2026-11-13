import React, { useLayoutEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { DepartmentAuthProvider } from './context/DepartmentAuthContext';
import { AppRoutes } from './routes/AppRoutes';

const ScrollToTop: React.FC = () => {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: 'instant' });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);

  return null;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <LanguageProvider>
        <AdminAuthProvider>
          <DepartmentAuthProvider>
            <AppRoutes />
          </DepartmentAuthProvider>
        </AdminAuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
};

export default App;
