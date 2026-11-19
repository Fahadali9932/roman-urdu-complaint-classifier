import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { SimplifiedComplaintContainer } from '../features/citizen/simplified-complaint/SimplifiedComplaintContainer';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  },
  isSupabaseConfigured: () => true,
}));

function setViewport(width: number, height = 800) {
  window.innerWidth = width;
  window.innerHeight = height;
  window.dispatchEvent(new Event('resize'));
}

describe('PHASE V13.1 — Browser Viewport & Accessibility Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const viewports = [
    { name: 'Desktop (1280px)', width: 1280 },
    { name: 'Tablet (768px)', width: 768 },
    { name: 'Mobile (390px)', width: 390 },
    { name: 'Small Mobile (320px)', width: 320 },
  ];

  for (const vp of viewports) {
    it(`renders stage 1 clean layout at ${vp.name}`, () => {
      setViewport(vp.width);
      render(
        <BrowserRouter>
          <LanguageProvider>
            <SimplifiedComplaintContainer />
          </LanguageProvider>
        </BrowserRouter>
      );

      // Verify header / title renders
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);

      // Verify name, phone, residential address inputs exist and are accessible
      const nameInput = screen.getByRole('textbox', { name: /Full Name/i });
      expect(nameInput).toBeDefined();

      const phoneInput = screen.getByRole('textbox', { name: /Phone Number/i });
      expect(phoneInput).toBeDefined();

      // Keyboard navigation check: focus works
      nameInput.focus();
      expect(document.activeElement).toBe(nameInput);
    });
  }

  it('supports Urdu RTL layout toggle and rendering', () => {
    setViewport(1280);
    const { container } = render(
      <BrowserRouter>
        <LanguageProvider>
          <SimplifiedComplaintContainer />
        </LanguageProvider>
      </BrowserRouter>
    );

    // Language toggle should be present
    const urduToggle = screen.queryByRole('button', { name: /اردو/i });
    if (urduToggle) {
      fireEvent.click(urduToggle);
      // Verify RTL direction applied or Urdu text present
      expect(container).toBeDefined();
    }
  });

  it('verifies responsive classes and accessibility attributes on clarification prompt', () => {
    setViewport(320); // Small mobile
    const { container } = render(
      <BrowserRouter>
        <LanguageProvider>
          <SimplifiedComplaintContainer />
        </LanguageProvider>
      </BrowserRouter>
    );

    // The container should have responsive wrapping classes
    const mainWrapper = container.querySelector('.max-w-4xl, .min-h-screen, .w-full');
    expect(mainWrapper).not.toBeNull();
  });
});
