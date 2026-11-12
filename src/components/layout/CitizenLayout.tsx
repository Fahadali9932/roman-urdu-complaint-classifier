import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { StackedScrollContainer, StackedScrollSection } from './stacked-scroll';

export const CitizenLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F3] text-[#141414] w-full overflow-visible selection:bg-[#681822] selection:text-[#FFFFFF]">
      <PublicHeader />
      <StackedScrollContainer as="div" className="flex-1 w-full flex flex-col">
        <StackedScrollSection
          depth={10}
          recedeOnScroll={true}
          as="main"
          stickyMode="top"
          trackHeight="150vh"
          className="flex-1 w-full bg-[#F7F6F3]"
        >
          <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 pt-24 sm:pt-28 pb-16 sm:pb-24">
            <Outlet />
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
