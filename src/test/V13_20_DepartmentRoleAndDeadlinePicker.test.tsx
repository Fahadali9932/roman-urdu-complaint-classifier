import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DepartmentDeadlinePicker } from '../features/department/components/DepartmentDeadlinePicker';
import { DepartmentLoginPage } from '../features/department/DepartmentLoginPage';
import { DepartmentAuthProvider } from '../context/DepartmentAuthContext';
import { DepartmentAuthContext, type DepartmentAuthContextType } from '../context/DepartmentAuthContext';
import { getLocalDemoCredentials } from '../services/localDemoCredentials';
import { DepartmentRoleBoundary } from '../features/department/DepartmentRoleBoundary';
import { fieldOperations } from '../features/department/services/fieldOperations';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('V13.20 role-specific portals and deadline input', () => {
  it('uses an in-flow calendar with no overlapping native datetime picker', () => {
    function TestPicker() {
      const [value, setValue] = useState('2026-11-25T17:00');
      return <DepartmentDeadlinePicker id="work-deadline" label="Work deadline" value={value} min="2026-11-22T10:00" onChange={setValue} />;
    }
    const { container } = render(<TestPicker />);
    expect(container.querySelector('input[type="datetime-local"]')).toBeNull();
    const trigger = screen.getByRole('button', { name: /Work deadline/i });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sunday, 22 November 2026/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Monday, 23 November 2026/i }));
    expect(screen.getByText(/23 Nov 2026/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Deadline hour' }), { target: { value: '4' } });
    expect(screen.getByText(/4:00/)).toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId('work-deadline')).getByRole('button', { name: 'Done' }));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('warns if an explicitly selected deadline is in the past', () => {
    render(<DepartmentDeadlinePicker id="past-deadline" label="Work deadline" value="2026-11-20T08:00" min="2026-11-22T10:00" onChange={() => undefined} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Select a future deadline.');
  });

  it('provides a distinct Field Officer sign-in with the correct demo identity', () => {
    render(
      <MemoryRouter initialEntries={['/department/officer/login?dept=kmc']}>
        <DepartmentAuthProvider>
          <Routes><Route path="/department/officer/login" element={<DepartmentLoginPage targetRole="officer" />} /></Routes>
        </DepartmentAuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Field Officer sign in' })).toBeInTheDocument();
    expect(screen.getByText(/Use the Field Officer account \(roads-02\)/)).toBeInTheDocument();
  });

  it('provides a distinct Department Head sign-in with the correct demo identity', () => {
    render(
      <MemoryRouter initialEntries={['/department/head/login?dept=kmc']}>
        <DepartmentAuthProvider>
          <Routes><Route path="/department/head/login" element={<DepartmentLoginPage targetRole="head" />} /></Routes>
        </DepartmentAuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Department Head sign in' })).toBeInTheDocument();
    expect(screen.getByText(/Use the Department Head account \(roads-01\)/)).toBeInTheDocument();
  });

  it('routes the correct officer account to the officer workspace', async () => {
    render(
      <MemoryRouter initialEntries={['/department/officer/login?dept=kmc']}>
        <DepartmentAuthProvider>
          <Routes>
            <Route path="/department/officer/login" element={<DepartmentLoginPage targetRole="officer" />} />
            <Route path="/department/officer" element={<h1>Officer workspace loaded</h1>} />
          </Routes>
        </DepartmentAuthProvider>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Username' }), { target: { value: 'roads-02' } });
    fireEvent.change(screen.getByLabelText(/Access key \(local demo\)/), { target: { value: getLocalDemoCredentials().staffPassword } });
    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));
    expect(await screen.findByRole('heading', { name: 'Officer workspace loaded' })).toBeInTheDocument();
  });

  it('refuses a Head account at the Officer sign-in instead of showing the Head workspace', async () => {
    render(
      <MemoryRouter initialEntries={['/department/officer/login?dept=kmc']}>
        <DepartmentAuthProvider>
          <Routes>
            <Route path="/department/officer/login" element={<DepartmentLoginPage targetRole="officer" />} />
            <Route path="/department/officer" element={<h1>Officer workspace loaded</h1>} />
          </Routes>
        </DepartmentAuthProvider>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Username' }), { target: { value: 'roads-01' } });
    fireEvent.change(screen.getByLabelText(/Access key \(local demo\)/), { target: { value: getLocalDemoCredentials().staffPassword } });
    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));
    expect(await screen.findByText(/Your account belongs to the Department Head workspace/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Officer workspace loaded' })).not.toBeInTheDocument();
  });

  it('blocks a Head session from entering an Officer URL by changing the address', async () => {
    vi.spyOn(fieldOperations, 'getMyRole').mockResolvedValue('head');
    const context = {
      isAuthenticated: true,
      isCheckingSession: false,
      departmentId: 'kmc',
      session: { userId: 'head-test-id', departmentId: 'kmc', departmentName: 'KMC', departmentCode: 'KMC', authenticatedAt: new Date().toISOString() },
      signOut: vi.fn(),
    } as unknown as DepartmentAuthContextType;
    render(<MemoryRouter initialEntries={['/department/officer']}>
      <DepartmentAuthContext.Provider value={context}>
        <Routes><Route path="/department/officer" element={<DepartmentRoleBoundary expectedRole="officer" />} /></Routes>
      </DepartmentAuthContext.Provider>
    </MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Different staff workspace' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open my workspace' })).toHaveAttribute('href', '/department/head');
  });
});
