import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

type CitizenRequiredRouteProps = {
  children: React.ReactElement;
};

/** Prevents a public route from opening a live citizen workflow without a JWT. */
export const CitizenRequiredRoute: React.FC<CitizenRequiredRouteProps> = ({ children }) => {
  const location = useLocation();
  const [state, setState] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured() || !supabase) {
      setState('unauthenticated');
      return () => {
        active = false;
      };
    }

    const update = (hasSession: boolean) => {
      if (active) setState(hasSession ? 'authenticated' : 'unauthenticated');
    };

    void supabase.auth.getSession().then(({ data, error }) => update(!error && Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => update(Boolean(session)));

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (state === 'checking') {
    return <div className="p-8 text-center text-sm text-[#625D58]" role="status">Checking secure session…</div>;
  }
  if (state === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return children;
};
