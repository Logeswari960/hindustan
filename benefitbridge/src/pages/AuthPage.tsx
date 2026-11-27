import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, FormField, Input } from '../components/ui';
import { authApi } from '../services/api';
import { backendConfigured, startDemoSession } from '../services/backendClient';
import { GraduationCap, Sparkles } from 'lucide-react';

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const registering = mode === 'register';
  const enterDemo = () => {
    startDemoSession();
    navigate('/dashboard');
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (registering) {
        await authApi.register({ email, password, firstName, lastName });
      } else {
        await authApi.login({ email, password });
      }
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-7rem)] overflow-hidden px-4 py-10 sm:py-14 flex items-center justify-center">
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-300/30 blur-3xl" />
      <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-violet-300/30 blur-3xl" />
      <Card className="relative w-full max-w-md border-blue-100/80 bg-white/90 p-6 sm:p-8 shadow-2xl shadow-blue-900/10 backdrop-blur-xl">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-600/20">
          <GraduationCap size={24} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-950">{registering ? 'Create your account' : 'Welcome back'}</h1>
        <p className="mt-2 text-sm text-neutral-500">
          {registering ? 'Start discovering verified scholarship opportunities.' : 'Sign in to view your personalized scholarship matches.'}
        </p>
        {backendConfigured ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {registering && (
              <div className="grid sm:grid-cols-2 gap-3">
                <FormField label="First name" htmlFor="auth-first" required><Input id="auth-first" value={firstName} onChange={event => setFirstName(event.target.value)} required maxLength={80} /></FormField>
                <FormField label="Last name" htmlFor="auth-last" required><Input id="auth-last" value={lastName} onChange={event => setLastName(event.target.value)} required maxLength={80} /></FormField>
              </div>
            )}
            <FormField label="Email" htmlFor="auth-email" required>
              <Input id="auth-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} />
            </FormField>
            <FormField
              label="Password"
              htmlFor="auth-password"
              required
              hint={registering ? 'At least 12 characters with letters and numbers.' : undefined}
            >
              <Input
                id="auth-password"
                type="password"
                autoComplete={registering ? 'new-password' : 'current-password'}
                value={password}
                onChange={event => setPassword(event.target.value)}
                required
                minLength={registering ? 12 : 1}
                maxLength={128}
              />
            </FormField>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <Button type="submit" fullWidth loading={submitting}>{registering ? 'Create account' : 'Sign in'}</Button>
          </form>
        ) : (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Set `VITE_API_BASE_URL`, configure MongoDB and JWT secrets in the backend environment, then restart both services.
          </div>
        )}
        {!registering && (
          <button
            type="button"
            onClick={enterDemo}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-100"
          >
            <Sparkles size={16} />
            Use presentation demo
          </button>
        )}
        {backendConfigured && (
          <p className="mt-5 text-sm text-neutral-600">
            {registering ? 'Already registered?' : 'New to BenefitBridge?'}{' '}
            <Link className="font-medium text-navy-700 hover:text-navy-900" to={registering ? '/login' : '/register'}>
              {registering ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        )}
        {!backendConfigured && (
          <Link className="mt-5 inline-block text-sm font-medium text-navy-700 hover:text-navy-900" to="/onboarding">
            Continue in demo mode
          </Link>
        )}
      </Card>
    </div>
  );
}
