import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock } from 'lucide-react'
import { errorMessage } from '@/shared/api/client'
import { useAuth } from '@/shared/auth/AuthProvider'
import { LOGO } from '@/shared/lib/brand'
import { Button } from '@/shared/ui/Button'
import { Field, FormError, Input } from '@/shared/ui/Form'
import { FullPageSpinner } from '@/shared/ui/Spinner'

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})
type Values = z.infer<typeof schema>

export default function LoginPage() {
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const from = (location.state as { from?: string } | null)?.from || '/admin'
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema) })

  if (status === 'loading') return <FullPageSpinner />
  if (status === 'authenticated') return <Navigate to={from} replace />

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      await login(values.email, values.password)
      navigate(from, { replace: true })
    } catch (e) {
      setError(errorMessage(e))
    }
  })

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 lg:flex-row">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-brand-900 p-10 text-white lg:flex">
        <img src={LOGO.horizontalReversed} alt="Evaramu Group Ltd" className="h-12 w-auto self-start" />
        <div className="max-w-md">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold-300">Property & Rent Management</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight">Every unit, tenant and payment in one place.</h1>
          <p className="mt-4 text-brand-100/80">
            Manage availability, agreements, monthly invoicing and payment approvals across the Evaramu portfolio.
          </p>
        </div>
        <p className="text-sm text-brand-200/60">© {new Date().getFullYear()} Evaramu Group Ltd · Kigali, Rwanda</p>
        <div className="pointer-events-none absolute -bottom-24 -right-24 size-80 rounded-full border-[40px] border-gold-500/15" />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-block lg:hidden">
            <img src={LOGO.horizontal} alt="Evaramu Group Ltd" className="h-11 w-auto" />
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Staff sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Use the account your administrator created for you.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <FormError message={error} />
            <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
              <Input id="email" type="email" autoComplete="username" inputMode="email" {...register('email')} aria-invalid={!!formState.errors.email} />
            </Field>
            <Field label="Password" htmlFor="password" error={formState.errors.password?.message}>
              <Input id="password" type="password" autoComplete="current-password" {...register('password')} aria-invalid={!!formState.errors.password} />
            </Field>
            <Button type="submit" block size="lg" loading={formState.isSubmitting} icon={Lock}>
              Sign in
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            <Link to="/" className="font-medium text-brand-700 hover:text-brand-900">
              ← Back to the website
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
