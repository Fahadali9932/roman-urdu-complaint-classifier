import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters for your new password.');
    if (password !== confirmPassword) return setError('The passwords do not match.');
    if (!isSupabaseConfigured() || !supabase) return setError('Live password recovery is not configured.');
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) return setError('Your recovery link is invalid or has expired. Request a new password reset link.');
    navigate('/dashboard', { replace: true });
  };

  return <div className="py-12 sm:py-16"><Container size="sm"><div className="rounded-2xl bg-white border border-[#E5E3E0] p-6 sm:p-10 shadow-[0_12px_36px_rgba(20,20,20,0.06)]"><h1 className="font-display font-black text-2xl text-[#141414] uppercase">Set a new password</h1><p className="mt-2 text-sm text-[#323232]">Choose a new password for your citizen account.</p><form onSubmit={handleSubmit} className="mt-6 space-y-4">{error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}<Input id="new-password" label="New password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /><Input id="confirm-password" label="Confirm new password" type="password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /><Button type="submit" variant="primary" className="w-full" isLoading={saving}>Save new password</Button></form><Link to="/login" className="mt-5 inline-block text-xs font-semibold text-[#681822] hover:underline">Back to sign in</Link></div></Container></div>;
};
