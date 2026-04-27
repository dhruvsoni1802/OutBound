import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginButton } from '@/components/auth/LoginButton'
import Image from 'next/image'

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/settings/integrations')
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      {/* Radial gradient background */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(99,102,241,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="animate-fade-in relative w-full max-w-sm">
        <div
          className="rounded-xl border border-border bg-card px-8 py-10 shadow-2xl"
          style={{ boxShadow: '0 0 0 1px #1E1E2E, 0 24px 48px rgba(0,0,0,0.5)' }}
        >
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Image
              src="/logo.svg"
              alt="Embra"
              width={100}
              height={28}
              priority
            />
          </div>

          {/* Tagline */}
          <h1 className="mb-1 text-center font-display text-xl font-semibold tracking-tight text-foreground">
            Welcome to Embra
          </h1>
          <p className="mb-8 text-center text-sm text-muted-foreground">
            Autonomous email outreach, powered by AI
          </p>

          <div className="mb-6 border-t border-border" />

          {/* Google sign-in */}
          <LoginButton />

          {/* Fine print */}
          <p className="mt-5 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <span className="underline underline-offset-2 cursor-pointer hover:text-foreground transition-colors">
              Terms
            </span>{' '}
            and{' '}
            <span className="underline underline-offset-2 cursor-pointer hover:text-foreground transition-colors">
              Privacy Policy
            </span>
          </p>
        </div>
      </div>
    </main>
  )
}
