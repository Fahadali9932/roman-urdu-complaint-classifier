import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { StackedScrollContainer, StackedScrollSection } from './stacked-scroll';
import { ScrollReveals } from './ScrollReveals';
import { PageTransition } from './PageTransition';

export const CitizenLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F3] text-[#141414] w-full overflow-visible selection:bg-[#681822] selection:text-[#FFFFFF]">
      <PublicHeader />
      <ScrollReveals />
      <StackedScrollContainer as="div" className="flex-1 w-full flex flex-col">
        <StackedScrollSection
          depth={10}
          // Do not turn complaint forms into scaled GPU textures near the footer.
          recedeOnScroll={false}
          as="main"
          className="flex-1 w-full min-h-[100svh] bg-[#F7F6F3] relative"
        >
          <div className="relative z-10 w-full max-w-[1180px] mx-auto px-4 sm:px-8 pt-20 sm:pt-24 pb-12 sm:pb-16">
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

export default CitizenLayout;
