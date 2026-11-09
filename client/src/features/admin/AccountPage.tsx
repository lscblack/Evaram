import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { KeyRound } from 'lucide-react'
import { api, errorMessage } from '@/shared/api/client'
import { useAuth } from '@/shared/auth/AuthProvider'
import { formatDateTime } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardHeader, DescriptionList } from '@/shared/ui/Card'
import { Field, FormError, Input } from '@/shared/ui/Form'
import { Avatar } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'
import { PASSWORD_HINT, passwordProblem } from './passwords'

const schema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password'),
    new_password: z.string().superRefine((v, ctx) => {
      const p = passwordProblem(v)
      if (p) ctx.addIssue({ code: 'custom', message: p })
    }),
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })
type Values = z.infer<typeof schema>

export default function AccountPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema) })
  if (!user) return null

  const onSubmit = handleSubmit(async (v) => {
    setError(null)
    try {
      await api.post('/auth/change-password', { current_password: v.current_password, new_password: v.new_password })
      toast.success('Password changed. Please sign in with your new password.')
      await logout().catch(() => undefined)
      navigate('/login', { replace: true })
    } catch (e) {
      setError(errorMessage(e))
    }
  })

  return (
    <>
      <PageHeader title="Account" description="Your profile and sign-in security." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-5 flex items-center gap-3">
            <Avatar name={user.full_name} className="size-12 text-base" />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-slate-900">{user.full_name}</p>
              <Badge tone="brand">{user.role.name}</Badge>
            </div>
          </div>
          <DescriptionList
            items={[
              { label: 'Email', value: user.email },
              { label: 'Phone', value: user.phone || '—' },
              { label: 'Permissions', value: `${user.permissions.length} granted by your role` },
              { label: 'Last sign-in', value: formatDateTime(user.last_login_at) },
            ]}
          />
          <p className="mt-5 text-sm text-slate-500">To change your name, phone or role, ask an administrator.</p>
        </Card>
        <Card>
          <CardHeader title="Change password" description="You will be signed out of every device after changing it." />
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <FormError message={error} />
            <Field label="Current password" htmlFor="cur" error={formState.errors.current_password?.message}>
              <Input id="cur" type="password" autoComplete="current-password" {...register('current_password')} />
            </Field>
            <Field label="New password" htmlFor="new" hint={PASSWORD_HINT} error={formState.errors.new_password?.message}>
              <Input id="new" type="password" autoComplete="new-password" {...register('new_password')} />
            </Field>
            <Field label="Confirm new password" htmlFor="conf" error={formState.errors.confirm?.message}>
              <Input id="conf" type="password" autoComplete="new-password" {...register('confirm')} />
            </Field>
            <Button type="submit" icon={KeyRound} loading={formState.isSubmitting}>
              Change password
            </Button>
          </form>
        </Card>
      </div>
    </>
  )
}
