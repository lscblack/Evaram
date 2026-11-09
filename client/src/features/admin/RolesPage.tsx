import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Lock, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { PermissionOut, RoleOut } from '@/shared/api/types'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardHeader } from '@/shared/ui/Card'
import { ConfirmDialog, Dialog } from '@/shared/ui/Dialog'
import { ErrorState } from '@/shared/ui/EmptyState'
import { Field, FormError, Input } from '@/shared/ui/Form'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonRows } from '@/shared/ui/Spinner'
import { cn } from '@/shared/ui/cn'

const ADMIN = 'Administrator'

export default function RolesPage() {
  const roles = useQuery({ queryKey: ['roles'], queryFn: () => api.get<RoleOut[]>('/roles') })
  const perms = useQuery({ queryKey: ['permissions'], queryFn: () => api.get<PermissionOut[]>('/permissions') })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (roles.data?.length && !roles.data.some((r) => r.id === selectedId)) setSelectedId(roles.data[0].id)
  }, [roles.data, selectedId])

  const selected = roles.data?.find((r) => r.id === selectedId) ?? null

  return (
    <>
      <PageHeader
        title="Roles and permissions"
        description="A role is a set of permissions. Each staff member has exactly one role."
        actions={<Button icon={Plus} onClick={() => setCreating(true)}>New role</Button>}
      />
      {roles.error || perms.error ? (
        <Card><ErrorState error={roles.error || perms.error} onRetry={() => { roles.refetch(); perms.refetch() }} /></Card>
      ) : !roles.data || !perms.data ? (
        <Card padded={false}><SkeletonRows /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card padded={false} className="lg:col-span-1 lg:self-start">
            <ul className="divide-y divide-slate-100" role="listbox" aria-label="Roles">
              {roles.data.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={r.id === selectedId}
                    onClick={() => setSelectedId(r.id)}
                    className={cn('flex w-full items-start justify-between gap-3 px-4 py-3 text-left', r.id === selectedId ? 'bg-brand-50' : 'hover:bg-slate-50')}
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-medium text-slate-900">
                        {r.name}
                        {r.is_system ? <Badge tone="neutral">Built-in</Badge> : null}
                      </span>
                      <span className="mt-0.5 block text-sm text-slate-500">
                        {r.name === ADMIN ? 'All permissions' : `${r.permissions.length} permission${r.permissions.length === 1 ? '' : 's'}`} ·{' '}
                        {r.user_count} user{r.user_count === 1 ? '' : 's'}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          <div className="lg:col-span-2">
            {selected ? <RoleEditor key={selected.id} role={selected} permissions={perms.data} onDeleted={() => setSelectedId(null)} /> : null}
          </div>
        </div>
      )}
      <CreateRoleDialog open={creating} onClose={() => setCreating(false)} onCreated={(r) => setSelectedId(r.id)} />
    </>
  )
}

function groupPermissions(permissions: PermissionOut[]) {
  const groups: Record<string, PermissionOut[]> = {}
  permissions.forEach((p) => (groups[p.group] ??= []).push(p))
  return Object.entries(groups)
}

function PermissionMatrix({
  permissions,
  value,
  onChange,
  readOnly,
}: {
  permissions: PermissionOut[]
  value: Set<string>
  onChange?: (next: Set<string>) => void
  readOnly?: boolean
}) {
  const groups = useMemo(() => groupPermissions(permissions), [permissions])
  const toggle = (code: string) => {
    if (readOnly || !onChange) return
    const next = new Set(value)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    onChange(next)
  }
  return (
    <div className="space-y-5">
      {groups.map(([group, items]) => {
        const allOn = items.every((p) => value.has(p.code))
        return (
          <fieldset key={group}>
            <div className="mb-1 flex items-center justify-between">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</legend>
              {!readOnly ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-brand-700 hover:underline"
                  onClick={() => {
                    const next = new Set(value)
                    items.forEach((p) => (allOn ? next.delete(p.code) : next.add(p.code)))
                    onChange?.(next)
                  }}
                >
                  {allOn ? 'Clear group' : 'Select group'}
                </button>
              ) : null}
            </div>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {items.map((p) => (
                <li key={p.code}>
                  <label className={cn('flex min-h-11 items-center gap-3 px-3 py-2', readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50')}>
                    <input
                      type="checkbox"
                      className="size-5 shrink-0 accent-brand-900"
                      checked={value.has(p.code)}
                      disabled={readOnly}
                      onChange={() => toggle(p.code)}
                    />
                    <span className="min-w-0 text-sm">
                      <span className="block text-slate-800">{p.description}</span>
                      <span className="block font-mono text-xs text-slate-400">{p.code}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )
      })}
    </div>
  )
}

function RoleEditor({ role, permissions, onDeleted }: { role: RoleOut; permissions: PermissionOut[]; onDeleted: () => void }) {
  const isAdmin = role.name === ADMIN
  const [selected, setSelected] = useState(() => new Set(isAdmin ? permissions.map((p) => p.code) : role.permissions))
  const [name, setName] = useState(role.name)
  const [description, setDescription] = useState(role.description)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const dirty =
    name !== role.name ||
    description !== role.description ||
    selected.size !== role.permissions.length ||
    role.permissions.some((c) => !selected.has(c))

  const save = useApiMutation(
    () =>
      api.patch<RoleOut>(`/roles/${role.id}`, {
        ...(role.is_system ? {} : { name }),
        description,
        ...(isAdmin ? {} : { permission_codes: [...selected] }),
      }),
    { success: 'Role saved', invalidate: [['roles']] },
  )
  const remove = useApiMutation(() => api.del(`/roles/${role.id}`), {
    success: 'Role deleted',
    invalidate: [['roles']],
    onSuccess: () => {
      setConfirmDelete(false)
      onDeleted()
    },
  })

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-brand-700" /> {role.name}
          </span>
        }
        description={`${role.user_count} user${role.user_count === 1 ? '' : 's'} with this role`}
        action={
          !role.is_system ? (
            <Button variant="ghost" size="sm" icon={Trash2} className="text-red-700 hover:bg-red-50" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          ) : undefined
        }
      />
      <div className="space-y-4">
        {isAdmin ? (
          <div className="flex items-start gap-3 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2.5 text-sm text-brand-900">
            <Lock className="mt-0.5 size-4 shrink-0" />
            The Administrator role always holds every permission, including permissions added in future releases. It cannot be edited.
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" hint={role.is_system ? 'Built-in roles keep their name.' : undefined}>
            <Input value={name} disabled={role.is_system} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Description">
            <Input value={description} disabled={isAdmin} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
        <PermissionMatrix permissions={permissions} value={selected} onChange={setSelected} readOnly={isAdmin} />
        <FormError message={save.errorText} />
        {!isAdmin ? (
          <div className="sticky bottom-16 flex justify-end gap-2 border-t border-slate-100 bg-white pt-3 lg:bottom-0">
            <Button
              variant="outline"
              disabled={!dirty}
              onClick={() => {
                setSelected(new Set(role.permissions))
                setName(role.name)
                setDescription(role.description)
              }}
            >
              Discard
            </Button>
            <Button disabled={!dirty || selected.size === 0} loading={save.isPending} onClick={() => save.mutate(undefined)}>
              Save changes
            </Button>
          </div>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate(undefined)}
        title={`Delete role "${role.name}"?`}
        description={role.user_count ? 'Reassign the users of this role before deleting it.' : 'This cannot be undone.'}
        confirmLabel="Delete role"
        tone="danger"
        loading={remove.isPending}
        error={remove.errorText}
      />
    </Card>
  )
}

function CreateRoleDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (r: RoleOut) => void }) {
  const perms = useQuery({ queryKey: ['permissions'], queryFn: () => api.get<PermissionOut[]>('/permissions'), enabled: open })
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState(new Set<string>())
  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setSelected(new Set())
    }
  }, [open])
  const create = useApiMutation(
    () => api.post<RoleOut>('/roles', { name, description, permission_codes: [...selected] }),
    {
      success: (r) => `Role "${r.name}" created`,
      invalidate: [['roles']],
      onSuccess: (r) => {
        onCreated(r)
        onClose()
      },
    },
  )
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New role"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} block className="sm:w-auto">Cancel</Button>
          <Button
            disabled={name.trim().length < 2 || selected.size === 0}
            loading={create.isPending}
            onClick={() => create.mutate(undefined)}
            block
            className="sm:w-auto"
          >
            Create role
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Caretaker" />
          </Field>
          <Field label="Description">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
        {perms.data ? <PermissionMatrix permissions={perms.data} value={selected} onChange={setSelected} /> : <SkeletonRows rows={3} />}
        <FormError message={create.errorText} />
      </div>
    </Dialog>
  )
}
