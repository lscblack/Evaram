import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { KeyRound, Plus, Users } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { RoleOut, UserOut } from '@/shared/api/types'
import { useAuth } from '@/shared/auth/AuthProvider'
import { formatDateTime } from '@/shared/lib/format'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { DataView, type Column } from '@/shared/ui/DataView'
import { Dialog } from '@/shared/ui/Dialog'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Checkbox, Field, FormError, FormGrid, Input, Select } from '@/shared/ui/Form'
import { Avatar, FilterBar, SearchInput } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'
import { PASSWORD_HINT, passwordProblem } from './passwords'

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<UserOut | null>(null)
  const [resetting, setResetting] = useState<UserOut | null>(null)
  const users = useQuery({ queryKey: ['users'], queryFn: () => api.get<UserOut[]>('/users') })
  const roles = useQuery({ queryKey: ['roles'], queryFn: () => api.get<RoleOut[]>('/roles') })

  const term = search.trim().toLowerCase()
  const rows = users.data?.filter(
    (u) => !term || u.full_name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term) || u.role.name.toLowerCase().includes(term),
  )

  const columns: Column<UserOut>[] = [
    {
      key: 'name',
      header: 'Staff member',
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.full_name} />
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{u.full_name}</p>
            <p className="text-slate-500">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', cell: (u) => u.phone || '—' },
    { key: 'role', header: 'Role', cell: (u) => <Badge tone="brand">{u.role.name}</Badge> },
    { key: 'status', header: 'Status', cell: (u) => (u.is_active ? <Badge tone="success" dot>Active</Badge> : <Badge dot>Deactivated</Badge>) },
    { key: 'login', header: 'Last sign-in', cell: (u) => (u.last_login_at ? formatDateTime(u.last_login_at) : 'Never') },
  ]

  return (
    <>
      <PageHeader
        title="Staff and users"
        description="People who can sign in to the management dashboard. Access is controlled by each user's role."
        actions={<Button icon={Plus} onClick={() => setCreating(true)}>Add staff member</Button>}
      />
      <Card padded={false}>
        <FilterBar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, email or role" className="sm:w-80" />
        </FilterBar>
        <DataView
          rows={rows}
          columns={columns}
          rowKey={(u) => u.id}
          onRowClick={setEditing}
          loading={users.isFetching}
          error={users.error}
          onRetry={users.refetch}
          empty={<EmptyState icon={Users} title="No staff found" />}
          mobile={(u) => (
            <div className="flex items-center gap-3">
              <Avatar name={u.full_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{u.full_name}</p>
                <p className="truncate text-sm text-slate-500">{u.role.name} · {u.email}</p>
              </div>
              {u.is_active ? <Badge tone="success" dot>Active</Badge> : <Badge dot>Off</Badge>}
            </div>
          )}
        />
      </Card>
      <CreateUserDialog open={creating} onClose={() => setCreating(false)} roles={roles.data ?? []} />
      <EditUserDialog
        user={editing}
        roles={roles.data ?? []}
        onClose={() => setEditing(null)}
        onReset={(u) => {
          setEditing(null)
          setResetting(u)
        }}
      />
      <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />
    </>
  )
}

function CreateUserDialog({ open, onClose, roles }: { open: boolean; onClose: () => void; roles: RoleOut[] }) {
  const empty = { email: '', full_name: '', phone: '', role_id: '', password: '' }
  const [v, setV] = useState(empty)
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (open) {
      setV(empty)
      setTouched(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const create = useApiMutation(
    () => api.post<UserOut>('/users', { ...v, role_id: Number(v.role_id), phone: v.phone || null }),
    { success: (u) => `${u.full_name} can now sign in`, invalidate: [['users'], ['roles']], onSuccess: onClose },
  )
  const pwError = touched ? passwordProblem(v.password) : null
  const valid = v.email.includes('@') && v.full_name.trim().length >= 2 && v.role_id && !passwordProblem(v.password)
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add staff member"
      description="Share the password with the person securely; they can change it after signing in."
      footer={
        <>
          <Button variant="outline" onClick={onClose} block className="sm:w-auto">Cancel</Button>
          <Button
            loading={create.isPending}
            onClick={() => {
              setTouched(true)
              if (valid) create.mutate(undefined)
            }}
            block
            className="sm:w-auto"
          >
            Create account
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormGrid>
          <Field label="Full name" required>
            <Input value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} autoComplete="off" />
          </Field>
          <Field label="Email" required>
            <Input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} autoComplete="off" />
          </Field>
          <Field label="Phone">
            <Input type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
          </Field>
          <Field label="Role" required error={touched && !v.role_id ? 'Choose a role' : undefined}>
            <Select value={v.role_id} onChange={(e) => setV({ ...v, role_id: e.target.value })}>
              <option value="">Select a role…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
          </Field>
        </FormGrid>
        <Field label="Initial password" required hint={PASSWORD_HINT} error={pwError ?? undefined}>
          <Input type="password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} autoComplete="new-password" />
        </Field>
        {v.role_id ? <p className="text-sm text-slate-500">{roles.find((r) => String(r.id) === v.role_id)?.description}</p> : null}
        <FormError message={create.errorText} />
      </div>
    </Dialog>
  )
}

function EditUserDialog({
  user,
  roles,
  onClose,
  onReset,
}: {
  user: UserOut | null
  roles: RoleOut[]
  onClose: () => void
  onReset: (u: UserOut) => void
}) {
  const { user: me } = useAuth()
  const [v, setV] = useState({ full_name: '', phone: '', role_id: '', is_active: true })
  useEffect(() => {
    if (user) setV({ full_name: user.full_name, phone: user.phone ?? '', role_id: String(user.role.id), is_active: user.is_active })
  }, [user])
  const save = useApiMutation(
    () => api.patch<UserOut>(`/users/${user!.id}`, { full_name: v.full_name, phone: v.phone || null, role_id: Number(v.role_id), is_active: v.is_active }),
    { success: 'Staff account updated', invalidate: [['users'], ['roles']], onSuccess: onClose },
  )
  if (!user) return null
  const isSelf = me?.id === user.id
  return (
    <Dialog
      open
      onClose={onClose}
      title={user.full_name}
      description={user.email}
      footer={
        <>
          <Button variant="outline" icon={KeyRound} onClick={() => onReset(user)} block className="sm:mr-auto sm:w-auto">
            Reset password
          </Button>
          <Button variant="outline" onClick={onClose} block className="sm:w-auto">Cancel</Button>
          <Button loading={save.isPending} onClick={() => save.mutate(undefined)} block className="sm:w-auto">Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormGrid>
          <Field label="Full name">
            <Input value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
          </Field>
        </FormGrid>
        <Field label="Role" hint={isSelf ? 'You cannot change your own role.' : undefined}>
          <Select value={v.role_id} disabled={isSelf} onChange={(e) => setV({ ...v, role_id: e.target.value })}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </Select>
        </Field>
        <Checkbox
          label="Account active"
          hint={isSelf ? 'You cannot deactivate your own account.' : 'Deactivating signs the user out everywhere immediately.'}
          checked={v.is_active}
          disabled={isSelf}
          onChange={(e) => setV({ ...v, is_active: e.target.checked })}
        />
        <FormError message={save.errorText} />
      </div>
    </Dialog>
  )
}

function ResetPasswordDialog({ user, onClose }: { user: UserOut | null; onClose: () => void }) {
  const [pw, setPw] = useState('')
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    setPw('')
    setTouched(false)
  }, [user])
  const reset = useApiMutation(() => api.post(`/users/${user!.id}/reset-password`, { new_password: pw }), {
    success: 'Password reset. The user has been signed out.',
    onSuccess: onClose,
  })
  if (!user) return null
  const problem = passwordProblem(pw)
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Reset password · ${user.full_name}`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} block className="sm:w-auto">Cancel</Button>
          <Button
            loading={reset.isPending}
            onClick={() => {
              setTouched(true)
              if (!problem) reset.mutate(undefined)
            }}
            block
            className="sm:w-auto"
          >
            Reset password
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">All of this user's sessions end immediately. They must sign in with the new password.</p>
        <Field label="New password" hint={PASSWORD_HINT} error={touched && problem ? problem : undefined}>
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        </Field>
        <FormError message={reset.errorText} />
      </div>
    </Dialog>
  )
}
