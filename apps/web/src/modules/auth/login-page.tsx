import { useState } from 'react';
import { useAuth, sanitizeReturnUrl } from './auth-provider';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { FormField } from '../../components/ui/form-field';
import { AlertCircle, Mail, Lock, User as UserIcon, CheckCircle2, ArrowRight } from 'lucide-react';
import { BrandLogo } from '../../components/common/brand-logo';

export function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, user } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Execution states
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationPendingEmail, setVerificationPendingEmail] = useState<string | null>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const returnUrl = sanitizeReturnUrl(searchParams.get('returnUrl'));
  const errorParam = searchParams.get('error');

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle(returnUrl);
    } catch (err: unknown) {
      setIsGoogleLoading(false);
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to initiate Google sign in.'
      );
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setIsLoading(false);
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setIsLoading(false);
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    try {
      if (authMode === 'signup') {
        const cleanName = name.trim();
        if (!cleanName || cleanName.length < 2) {
          setIsLoading(false);
          setErrorMessage('Please enter your full name (minimum 2 characters).');
          return;
        }

        const res = await signUpWithEmail(cleanEmail, password, cleanName);
        setIsLoading(false);

        if (res.requiresVerification) {
          setVerificationPendingEmail(cleanEmail);
        } else {
          // Direct login redirect
          window.location.href = returnUrl;
        }
      } else {
        // Sign In
        await signInWithEmail(cleanEmail, password);
        window.location.href = returnUrl;
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const rawMsg = err instanceof Error ? err.message : String(err);

      // Translate common Supabase Auth messages to user-friendly text
      if (rawMsg.toLowerCase().includes('invalid login credentials')) {
        setErrorMessage('Invalid email or password. Please verify your credentials.');
      } else if (rawMsg.toLowerCase().includes('user already registered')) {
        setErrorMessage('An account with this email already exists. Please sign in instead.');
      } else if (rawMsg.toLowerCase().includes('email not confirmed')) {
        setErrorMessage('Please confirm your email address before signing in. Check your inbox.');
      } else {
        setErrorMessage(rawMsg || 'Authentication failed. Please try again.');
      }
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-surface p-5 shadow-card sm:space-y-6 sm:p-8">
        {/* Brand Header */}
        <div className="text-center">
          <div className="flex justify-center mb-1">
            <BrandLogo size="lg" showName={false} />
          </div>
          <h2 className="mt-4 text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
            {authMode === 'signin' ? 'Sign in to' : 'Join'} <span className="text-primary">Kalikkanundo</span>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Your Game. Your Squad.
          </p>
        </div>

        {/* Verification Pending Screen */}
        {verificationPendingEmail ? (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Check Your Email</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                We sent a confirmation link to <strong className="text-foreground">{verificationPendingEmail}</strong>.
                Click the link in your email to activate your player account.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setVerificationPendingEmail(null);
                setAuthMode('signin');
              }}
            >
              <span>Back to Sign In</span>
            </Button>
          </div>
        ) : (
          <>
            {/* Error notification */}
            {(errorMessage || errorParam) && (
              <div
                className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-xs text-danger"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage || errorParam}</span>
              </div>
            )}

            {/* Auth Mode Toggle Tabs */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-subtle p-1 border border-border">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setErrorMessage(null);
                }}
                className={`min-h-10 py-2 text-sm font-semibold rounded-lg transition-all ${
                  authMode === 'signin'
                    ? 'bg-surface text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setErrorMessage(null);
                }}
                className={`min-h-10 py-2 text-sm font-semibold rounded-lg transition-all ${
                  authMode === 'signup'
                    ? 'bg-surface text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {authMode === 'signup' && (
                <FormField label="Full Name" htmlFor="name" required>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="e.g. Rahul Nair"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </FormField>
              )}

              <FormField label="Email Address" htmlFor="email" required>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="player@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </FormField>

              <FormField
                label="Password"
                htmlFor="password"
                hint={authMode === 'signup' ? 'Minimum 6 characters' : undefined}
                required
              >
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </FormField>

              <Button
                type="submit"
                className="w-full h-11 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary-hover shadow-md"
                isLoading={isLoading}
              >
                <span>{authMode === 'signin' ? 'Sign In' : 'Create Player Account'}</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-border w-full" />
              <span className="bg-surface px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider absolute">
                Or
              </span>
            </div>

            {/* Google OAuth Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 text-xs font-bold flex items-center justify-center gap-2.5 border-border hover:bg-surface-subtle"
              onClick={handleGoogleLogin}
              isLoading={isGoogleLoading}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.28-2.09 3.66-5.17 3.66-9.14z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.39 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.28c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.59H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.41l4.03-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.61 1.25 6.59l4.03 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
                />
              </svg>
              <span>Continue with Google</span>
            </Button>

            {user && (
              <div className="pt-1 text-center">
                <a
                  href={returnUrl}
                  className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
                >
                  <CheckCircle2 className="h-3 w-3 text-success" />
                  <span>Already signed in as {user.email}. Enter App →</span>
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
