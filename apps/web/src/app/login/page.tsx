import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-ink-600">Loading…</div>}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
