import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

type CitizenRequiredRouteProps = {
  children: React.ReactElement;
};

/** Prevents a public route from opening a live citizen workflow without a verified citizen role. */
export const CitizenRequiredRoute: React.FC<CitizenRequiredRouteProps> = ({ children }) => {
  const location = useLocation();
  const [state, setState] = useState<'checking' | 'authenticated' | 'unauthenticated' | 'wrong_portal'>('checking');
  const [notice, setNotice] = useState<string>('');

  useEffect(() => {
    let active = true;
    const client = supabase;
    if (!isSupabaseConfigured() || !client) {
      setState('unauthenticated');
      return () => {
        active = false;
      };
    }

    const checkRole = async () => {
      try {
        const { data: sessionData } = await client.auth.getSession();
        const user = sessionData.session?.user;
        if (!user) {
          if (active) setState('unauthenticated');
          return;
        }

        const { data: profile } = await client
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.role === 'citizen') {
          if (active) setState('authenticated');
        } else if (profile?.role === 'department_staff') {
          // Department staff trying to enter citizen dashboard
          await client.auth.signOut();
          if (active) {
            setNotice('This is a department account. Please use the department sign-in page.');
            setState('wrong_portal');
          }
        } else {
          // Unassigned or invalid role
          if (active) setState('unauthenticated');
        }
      } catch {
        if (active) setState('unauthenticated');
      }
    };

    void checkRole();

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        if (active) setState('unauthenticated');
      } else {
        void checkRole();
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (state === 'checking') {
    return (
      <div className="p-8 text-center text-sm text-[#625D58]" role="status">
        Checking secure session…
      </div>
    );
  }
  if (state === 'wrong_portal') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ error: notice || 'This is a department account. Please use the department sign-in page.' }}
      />
    );
  }
  if (state === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return children;
};
