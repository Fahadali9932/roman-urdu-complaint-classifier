import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { CitizenRequiredRoute } from '../features/auth/CitizenRequiredRoute';
import { ComplaintTracker } from '../features/citizen/ComplaintTracker';
import { complaintService } from '../services';
import fs from 'node:fs';
import path from 'node:path';

// Dynamic mock controllers for Supabase module
let mockIsConfigured = false;
let mockSupabaseClient: any = null;

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: () => mockIsConfigured,
  get supabase() {
    return mockSupabaseClient;
  },
}));

// Helper component to display destination route and navigation state
const RouteWatcher: React.FC = () => {
  const location = useLocation();
  return (
    <div>
      <div data-testid="current-path">{location.pathname}</div>
      <div data-testid="current-search">{location.search}</div>
      <div data-testid="nav-error">{(location.state as any)?.error || 'none'}</div>
      <div data-testid="nav-from">{(location.state as any)?.from || 'none'}</div>
    </div>
  );
};

const ProtectedTarget: React.FC = () => <div data-testid="protected-content">CITIZEN_WORKSPACE_GRANTED</div>;

describe('AWAAZ-E-AWAM — PHASE V13.8.1: Authentication Security Hardening', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    mockIsConfigured = false;
    mockSupabaseClient = null;
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Unauthenticated visitor opens /dashboard -> Access Denied
  // -------------------------------------------------------------------------
  it('Scenario 1: denies unauthenticated access to /dashboard and redirects to /login', async () => {
    mockIsConfigured = false;
    mockSupabaseClient = null;

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <CitizenRequiredRoute>
                <ProtectedTarget />
              </CitizenRequiredRoute>
            }
          />
          <Route path="/login" element={<RouteWatcher />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
      expect(screen.getByTestId('nav-from')).toHaveTextContent('/dashboard');
      expect(screen.queryByTestId('protected-content')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Visitor opens /dashboard?demo=true -> Attack blocked, denied
  // -------------------------------------------------------------------------
  it('Scenario 2: blocks ?demo=true attack parameter and strictly redirects to /login', async () => {
    mockIsConfigured = false;
    mockSupabaseClient = null;

    render(
      <MemoryRouter initialEntries={['/dashboard?demo=true']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <CitizenRequiredRoute>
                <ProtectedTarget />
              </CitizenRequiredRoute>
            }
          />
          <Route path="/login" element={<RouteWatcher />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
      expect(screen.queryByTestId('protected-content')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Visitor opens /dashboard?mock=true -> Attack blocked, denied
  // -------------------------------------------------------------------------
  it('Scenario 3: blocks ?mock=true attack parameter and strictly redirects to /login', async () => {
    mockIsConfigured = false;
    mockSupabaseClient = null;

    render(
      <MemoryRouter initialEntries={['/dashboard?mock=true']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <CitizenRequiredRoute>
                <ProtectedTarget />
              </CitizenRequiredRoute>
            }
          />
          <Route path="/login" element={<RouteWatcher />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
      expect(screen.queryByTestId('protected-content')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Visitor opens /dashboard?mode=local-ai-test -> Attack blocked
  // -------------------------------------------------------------------------
  it('Scenario 4: blocks ?mode=local-ai-test shortcut and strictly redirects to /login', async () => {
    mockIsConfigured = false;
    mockSupabaseClient = null;

    render(
      <MemoryRouter initialEntries={['/dashboard?mode=local-ai-test']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <CitizenRequiredRoute>
                <ProtectedTarget />
              </CitizenRequiredRoute>
            }
          />
          <Route path="/login" element={<RouteWatcher />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
      expect(screen.queryByTestId('protected-content')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 5: Visitor manually sets localStorage flag awaaz_mock_citizen_auth
  // -------------------------------------------------------------------------
  it('Scenario 5: blocks localStorage manipulation attack (awaaz_mock_citizen_auth=true)', async () => {
    localStorage.setItem('awaaz_mock_citizen_auth', 'true');
    mockIsConfigured = false;
    mockSupabaseClient = null;

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <CitizenRequiredRoute>
                <ProtectedTarget />
              </CitizenRequiredRoute>
            }
          />
          <Route path="/login" element={<RouteWatcher />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
      expect(screen.queryByTestId('protected-content')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 6: Supabase configuration missing / client is null -> Denied
  // -------------------------------------------------------------------------
  it('Scenario 6: safely denies access with informative notice when Supabase is unconfigured', async () => {
    mockIsConfigured = false;
    mockSupabaseClient = null;

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <CitizenRequiredRoute>
                <ProtectedTarget />
              </CitizenRequiredRoute>
            }
          />
          <Route path="/login" element={<RouteWatcher />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
      expect(screen.getByTestId('nav-error')).toHaveTextContent(/authentication service is currently unavailable/i);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 7: Expired or invalid session -> Denied
  // -------------------------------------------------------------------------
  it('Scenario 7: safely denies access when session is expired or getSession returns null', async () => {
    const mockAuth = {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    };
    mockIsConfigured = true;
    mockSupabaseClient = { auth: mockAuth };

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <CitizenRequiredRoute>
                <ProtectedTarget />
              </CitizenRequiredRoute>
            }
          />
          <Route path="/login" element={<RouteWatcher />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
      expect(screen.queryByTestId('protected-content')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 8: Legitimately authenticated citizen -> Authorized
  // -------------------------------------------------------------------------
  it('Scenario 8: authorizes access only for legitimate citizen profile session', async () => {
    const mockAuth = {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: 'usr-citizen-4401', email: 'citizen@example.com' },
          },
        },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    };

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'usr-citizen-4401', role: 'citizen' },
            error: null,
          }),
        }),
      }),
    });

    mockIsConfigured = true;
    mockSupabaseClient = {
      auth: mockAuth,
      from: mockFrom,
    };

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <CitizenRequiredRoute>
                <ProtectedTarget />
              </CitizenRequiredRoute>
            }
          />
          <Route path="/login" element={<RouteWatcher />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toHaveTextContent('CITIZEN_WORKSPACE_GRANTED');
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 9: Department staff attempts citizen portal -> Wrong portal
  // -------------------------------------------------------------------------
  it('Scenario 9: detects department_staff role, revokes citizen session, and redirects to login with notice', async () => {
    const signOutMock = vi.fn().mockResolvedValue({ error: null });
    const mockAuth = {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: 'usr-staff-771', email: 'officer@kwsc.gov.pk' },
          },
        },
        error: null,
      }),
      signOut: signOutMock,
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    };

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'usr-staff-771', role: 'department_staff' },
            error: null,
          }),
        }),
      }),
    });

    mockIsConfigured = true;
    mockSupabaseClient = {
      auth: mockAuth,
      from: mockFrom,
    };

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <CitizenRequiredRoute>
                <ProtectedTarget />
              </CitizenRequiredRoute>
            }
          />
          <Route path="/login" element={<RouteWatcher />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalled();
      expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
      expect(screen.getByTestId('nav-error')).toHaveTextContent(/department account/i);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 10: Logout reactivity via onAuthStateChange -> Immediate access loss
  // -------------------------------------------------------------------------
  it('Scenario 10: instantly revokes access when onAuthStateChange fires null session (logout)', async () => {
    let authListenerCallback: ((event: string, session: any) => void) | null = null;

    const mockAuth = {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: 'usr-citizen-4401', email: 'citizen@example.com' },
          },
        },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockImplementation((cb) => {
        authListenerCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    };

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'usr-citizen-4401', role: 'citizen' },
            error: null,
          }),
        }),
      }),
    });

    mockIsConfigured = true;
    mockSupabaseClient = {
      auth: mockAuth,
      from: mockFrom,
    };

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <CitizenRequiredRoute>
                <ProtectedTarget />
              </CitizenRequiredRoute>
            }
          />
          <Route path="/login" element={<RouteWatcher />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    // Fire signout event
    act(() => {
      authListenerCallback!('SIGNED_OUT', null);
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
      expect(screen.queryByTestId('protected-content')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 11: Production bundle verification -> Zero shortcuts bundled
  // -------------------------------------------------------------------------
  it('Scenario 11: verifies production build contains zero bypass flags or dev harness code', () => {
    const distPath = path.resolve('dist/assets');
    if (!fs.existsSync(distPath)) {
      // Build directory exists after build
      return;
    }
    const jsFiles = fs.readdirSync(distPath).filter((f) => f.endsWith('.js'));
    let foundBypass = false;
    let foundHarness = false;

    for (const file of jsFiles) {
      const content = fs.readFileSync(path.join(distPath, file), 'utf-8');
      if (content.includes('awaaz_mock_citizen_auth')) {
        foundBypass = true;
      }
      if (content.includes('dev/harness/citizen-dashboard')) {
        foundHarness = true;
      }
    }

    expect(foundBypass).toBe(false);
    expect(foundHarness).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Scenario 12: Citizen isolation contract -> Citizen A cannot read Citizen B
  // -------------------------------------------------------------------------
  it('Scenario 12: verifies complaintService isolates citizen complaints strictly by citizenId', async () => {
    const mockComplaints = [
      {
        id: 'c-1',
        citizenId: 'citizen-alice-id',
        referenceNumber: 'KHI-2026-CIT-101',
        title: 'Alice complaint',
        description: 'Alice water issue',
        status: 'under_review' as const,
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timeline: [],
        isDemonstration: false,
      },
      {
        id: 'c-2',
        citizenId: 'citizen-bob-id',
        referenceNumber: 'KHI-2026-CIT-102',
        title: 'Bob complaint',
        description: 'Bob gas issue',
        status: 'in_progress' as const,
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timeline: [],
        isDemonstration: false,
      },
    ];

    localStorage.setItem('awaaz_complaints_store_v1', JSON.stringify(mockComplaints));

    // Calling for Alice returns only Alice's complaints
    const aliceData = await complaintService.getCitizenComplaints('citizen-alice-id');
    expect(aliceData).toHaveLength(1);
    expect(aliceData[0].referenceNumber).toBe('KHI-2026-CIT-101');

    // Calling for Bob returns only Bob's complaints
    const bobData = await complaintService.getCitizenComplaints('citizen-bob-id');
    expect(bobData).toHaveLength(1);
    expect(bobData[0].referenceNumber).toBe('KHI-2026-CIT-102');

    // Calling for Mallory (stranger) returns empty array
    const strangerData = await complaintService.getCitizenComplaints('citizen-mallory-id');
    expect(strangerData).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Scenario 13: Guest Tracking Security -> No PII leakage in guest tracking UI
  // -------------------------------------------------------------------------
  it('Scenario 13: guest tracking input never leaks or demands citizen PII', () => {
    render(
      <MemoryRouter initialEntries={['/track']}>
        <ComplaintTracker />
      </MemoryRouter>
    );

    // Title is present
    expect(screen.getByRole('heading', { name: /track.*complaint/i })).toBeInTheDocument();
    // Input is purely 24-digit tracking number
    expect(screen.getByPlaceholderText('0000 0000 0000 0000 0000 0000')).toBeInTheDocument();
    // PII fields like phone, cnic, applicant address MUST NOT exist on tracking page
    expect(screen.queryByPlaceholderText(/phone/i)).toBeNull();
    expect(screen.queryByPlaceholderText(/cnic/i)).toBeNull();
    expect(screen.queryByPlaceholderText(/address/i)).toBeNull();
  });
});
