import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { StackedScrollContainer, StackedScrollSection } from './stacked-scroll';
import { ScrollReveals } from './ScrollReveals';
import { PageTransition } from './PageTransition';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isInfoPage = ['/about', '/contact', '/privacy-policy', '/terms-of-use', '/privacy', '/terms'].includes(
    location.pathname
  );

  const isSubmit = location.pathname === '/submit' || location.pathname === '/write-complaint';

  if (isHome) {
    return (
      <div className="min-h-screen flex flex-col w-full bg-[#F7F6F3] text-[#141414] overflow-visible selection:bg-[#681822] selection:text-[#FFFFFF]">
        <PublicHeader />
        <main className="flex-1 w-full overflow-visible p-0 m-0">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col w-full selection:bg-[#681822] selection:text-[#FFFFFF] ${
        isInfoPage
          ? 'bg-[#141414] text-[#F7F6F3] overflow-visible'
          : 'bg-[#F7F6F3] text-[#141414] overflow-visible'
      }`}
    >
      <PublicHeader />
      <ScrollReveals />
      <StackedScrollContainer as="div" className="flex-1 w-full flex flex-col">
        <StackedScrollSection
          depth={10}
          // Keep long-form text and input fields at native scale while reading.
          // The homepage owns continuous 3D; inner pages use settled entrances.
          recedeOnScroll={false}
          as="main"
          className={`flex-1 w-full relative min-h-[100svh] ${
            isInfoPage
              ? 'p-0 m-0'
              : isSubmit
                ? 'p-0 m-0 overflow-visible'
                : 'bg-[#F7F6F3] pt-20 sm:pt-24 pb-12 sm:pb-16'
          }`}
        >
          <div className="w-full relative z-10">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </StackedScrollSection>

        <StackedScrollSection
          depth={30}
          recedeOnScroll={false}
          hasIncomingShadow={true}
          as="div"
          className="w-full"
        >
          <PublicFooter />
        </StackedScrollSection>
      </StackedScrollContainer>
    </div>
  );
};

export default AppLayout;
