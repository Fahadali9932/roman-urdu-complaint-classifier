import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { StackedScrollContainer, StackedScrollSection } from './stacked-scroll';

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
          <Outlet />
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
      <StackedScrollContainer as="div" className="flex-1 w-full flex flex-col">
        <StackedScrollSection
          depth={10}
          recedeOnScroll={true}
          as="main"
          className={`flex-1 w-full relative ${
            isInfoPage
              ? 'p-0 m-0'
              : isSubmit
                ? 'p-0 m-0 overflow-visible'
                : 'bg-[#F7F6F3] pt-24 sm:pt-28 pb-16 sm:pb-24'
          }`}
        >
          <div className={isSubmit ? 'w-full' : 'sticky bottom-0 z-10 motion-reduce:static'}>
            <Outlet />
          </div>
          <div className="h-[40vh] sm:h-[45vh] lg:h-[50vh] pointer-events-none motion-reduce:hidden" aria-hidden="true" />
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
