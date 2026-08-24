import { useState } from 'react'
import { Trash2, UserPlus } from 'lucide-react'
import {
  Badge,
  Empty,
  ErrorNote,
  FIELD,
  Field,
  Loading,
  PageHeader,
  Panel,
  Table,
  Td,
  Th,
} from '@/components/admin/ui'
import { api } from '@/lib/api'
import { invalidate, useQuery } from '@/lib/queries'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { TeamProfileDrawer } from '@/components/admin/TeamProfileDrawer'
import type { AdminUser, Page, UserRole } from '@/types/api'

const ROLES: UserRole[] = ['user', 'agent', 'admin', 'super_admin']
const STATUSES = ['active', 'pending', 'suspended']

const ROLE_TONE: Record<string, 'good' | 'warn' | 'info' | 'neutral'> = {
  super_admin: 'warn',
  admin: 'good',
  agent: 'info',
  user: 'neutral',
}

export default function UsersAdminPage() {
  const { user: me, can } = useAuth()
  const { data, loading, refetch } = useQuery<Page<AdminUser>>('/admin/users?per_page=48', {
    ttl: 0,
  })
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [draft, setDraft] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'agent' as UserRole,
    job_title: '',
  })

  const rows = data?.items ?? []

  /* ---------------- selection & deletion ---------------- */
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  /** Super admins and your own account are never deletable, so never selectable. */
  const canDelete = (row: AdminUser) =>
    row.role !== 'super_admin' && row.id !== me?.id && (row.role !== 'admin' || can('super_admin'))

  const selectable = rows.filter(canDelete)
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.id))

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(selectable.map((r) => r.id)))

  const chosen = rows.filter((r) => selected.has(r.id))

  const remove = async (targets: AdminUser[]) => {
    if (targets.length === 0) return
    const names = targets.map((r) => r.full_name).join(', ')
    if (
      !window.confirm(
        `Permanently delete ${targets.length} account${targets.length > 1 ? 's' : ''}?\n\n${names}\n\n` +
          'Listings, sales and the audit trail are kept — the name is simply removed from them. ' +
          'This cannot be undone.',
      )
    ) {
      return
    }

    setDeleting(true)
    setError(null)
    try {
      let result = await api.post<{
        deleted: number
        skipped: number
        detail: string
        outcomes: { email: string | null; deleted: boolean; reason: string | null }[]
      }>('/admin/users/bulk-delete', { ids: chosen.map((r) => r.id) })

      // Anything held back for bid history can still go, but only on a second,
      // explicit yes — the first refusal is the warning.
      const blocked = result.outcomes.filter((o) => !o.deleted && /offer\(s\) on record/.test(o.reason ?? ''))
      if (blocked.length > 0) {
        const detail = blocked.map((o) => `${o.email} — ${o.reason}`).join('\n')
        if (window.confirm(`${blocked.length} account(s) have offer history:\n\n${detail}\n\nDelete them anyway?`)) {
          const forced = await api.post<typeof result>('/admin/users/bulk-delete', {
            ids: targets
              .filter((r) => blocked.some((b) => b.email === r.email))
              .map((r) => r.id),
            force: true,
          })
          result = { ...result, deleted: result.deleted + forced.deleted, detail: forced.detail }
        }
      }

      const kept = result.outcomes.filter((o) => !o.deleted && !/offer\(s\) on record/.test(o.reason ?? ''))
      if (kept.length > 0) {
        setError(kept.map((o) => `${o.email}: ${o.reason}`).join(' · '))
      }

      setSelected(new Set())
      invalidate('/admin/users')
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Those accounts were not deleted.')
    } finally {
      setDeleting(false)
    }
  }

  const run = async (id: string | null, work: () => Promise<unknown>) => {
    setBusyId(id)
    setError(null)
    try {
      await work()
      invalidate('/admin/users')
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That change was not saved.')
    } finally {
      setBusyId(null)
    }
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    await run(null, () =>
      api.post('/admin/users', {
        ...draft,
        job_title: draft.job_title || null,
        send_welcome_email: true,
      }),
    )
    setDraft({ email: '', full_name: '', password: '', role: 'agent', job_title: '' })
    setCreating(false)
  }

  return (
    <>
      <PageHeader
        title="People"
        description="Admins, agents and registered users. Roles decide what each person can reach."
        action={
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-[0.8125rem] font-semibold text-canvas transition-opacity hover:opacity-90"
          >
            <UserPlus className="size-3.5" strokeWidth={2.2} />
            {creating ? 'Cancel' : 'Add person'}
          </button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      {creating && (
        <Panel title="New person" className="mb-5">
          <form onSubmit={create} className="grid gap-3.5 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Full name">
              <input
                required
                className={FIELD}
                value={draft.full_name}
                onChange={(e) => setDraft((d) => ({ ...d, full_name: e.target.value }))}
              />
            </Field>
            <Field label="Email">
              <input
                required
                type="email"
                className={FIELD}
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              />
            </Field>
            <Field label="Temporary password" hint="They are asked to change it on first sign-in">
              <input
                required
                minLength={8}
                className={FIELD}
                value={draft.password}
                onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
              />
            </Field>
            <Field label="Role">
              <select
                className={FIELD}
                value={draft.role}
                onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as UserRole }))}
              >
                {ROLES.filter((r) => r !== 'super_admin' || can('super_admin')).map((r) => (
                  <option key={r} value={r}>
                    {r.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Job title">
              <input
                className={FIELD}
                value={draft.job_title}
                onChange={(e) => setDraft((d) => ({ ...d, job_title: e.target.value }))}
              />
            </Field>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={busyId !== null}
                className="h-11 w-full rounded-xl bg-gold-500 text-[0.875rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Create account
              </button>
            </div>
          </form>
        </Panel>
      )}

      {chosen.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-300 bg-gold-50 px-4 py-3">
          <p className="text-[0.875rem] font-semibold text-gold-900">
            {chosen.length} account{chosen.length > 1 ? 's' : ''} selected
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-lg border border-gold-400 px-3 py-1.5 text-[0.8125rem] font-semibold text-gold-800 transition-colors hover:bg-gold-100"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => void remove(chosen)}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[0.8125rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Trash2 className="size-3.5" strokeWidth={2.4} />
              {deleting ? 'Deleting…' : `Delete ${chosen.length}`}
            </button>
          </div>
        </div>
      )}

      <Panel>
        {loading && rows.length === 0 ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty title="Nobody yet" detail="Add the first member of the team." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Select every deletable account"
                    className="size-4 accent-gold-500"
                    checked={allSelected}
                    disabled={selectable.length === 0}
                    onChange={toggleAll}
                  />
                </Th>
                <Th>Person</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Team page</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isMe = row.id === me?.id
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      'transition-colors hover:bg-canvas-alt',
                      selected.has(row.id) && 'bg-gold-50',
                    )}
                  >
                    <Td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.full_name}`}
                        className="size-4 accent-gold-500 disabled:opacity-30"
                        checked={selected.has(row.id)}
                        disabled={!canDelete(row)}
                        title={
                          canDelete(row)
                            ? undefined
                            : row.role === 'super_admin'
                              ? 'Super admins cannot be deleted'
                              : isMe
                                ? 'You cannot delete your own account'
                                : 'Only a super admin can delete another admin'
                        }
                        onChange={() => toggle(row.id)}
                      />
                    </Td>
                    <Td>
                      <p className="font-semibold text-ink">
                        {row.full_name}
                        {isMe && <span className="ml-2 text-[0.75rem] text-ink-faint">you</span>}
                      </p>
                      <p className="text-[0.75rem] text-ink-muted">{row.email}</p>
                    </Td>
                    <Td>
                      <Badge tone={ROLE_TONE[row.role]}>{row.role.replace('_', ' ')}</Badge>
                    </Td>
                    <Td>
                      <Badge tone={row.status === 'active' ? 'good' : 'warn'}>{row.status}</Badge>
                    </Td>
                    <Td>
                      {row.is_public ? (
                        <div className="flex items-center gap-2">
                          {row.photo_url ? (
                            <img
                              src={row.photo_url}
                              alt=""
                              className="size-7 rounded-full border border-line object-cover"
                            />
                          ) : (
                            <span className="grid size-7 place-items-center rounded-full bg-canvas-alt text-[0.625rem] font-bold text-ink-muted">
                              {row.full_name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <Badge tone="good">shown</Badge>
                        </div>
                      ) : (
                        <Badge tone="neutral">hidden</Badge>
                      )}
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing(row)}
                          className="h-8 rounded-lg border border-line px-2.5 text-[0.75rem] font-semibold text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
                        >
                          Profile
                        </button>
                        <label htmlFor={`role-${row.id}`} className="sr-only">
                          Change role
                        </label>
                        <select
                          id={`role-${row.id}`}
                          value={row.role}
                          disabled={isMe || busyId === row.id || !can('super_admin')}
                          onChange={(e) =>
                            run(row.id, () =>
                              api.patch(`/admin/users/${row.id}`, { role: e.target.value }),
                            )
                          }
                          className="h-8 rounded-lg border border-line bg-canvas px-2 text-[0.75rem] text-ink focus:border-gold-500 focus:outline-none disabled:opacity-40"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r.replace('_', ' ')}
                            </option>
                          ))}
                        </select>

                        <label htmlFor={`status-${row.id}`} className="sr-only">
                          Change status
                        </label>
                        <select
                          id={`status-${row.id}`}
                          value={row.status}
                          disabled={isMe || busyId === row.id}
                          onChange={(e) =>
                            run(row.id, () =>
                              api.patch(`/admin/users/${row.id}`, { status: e.target.value }),
                            )
                          }
                          className="h-8 rounded-lg border border-line bg-canvas px-2 text-[0.75rem] text-ink focus:border-gold-500 focus:outline-none disabled:opacity-40"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={!canDelete(row) || busyId === row.id}
                          onClick={() => void remove([row])}
                          aria-label={`Delete ${row.full_name}`}
                          title={
                            canDelete(row)
                              ? `Delete ${row.full_name}`
                              : row.role === 'super_admin'
                                ? 'Super admins cannot be deleted'
                                : isMe
                                  ? 'You cannot delete your own account'
                                  : 'Only a super admin can delete another admin'
                          }
                          className="grid size-8 place-items-center rounded-lg border border-line text-ink-soft transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink-soft"
                        >
                          <Trash2 className="size-3.5" strokeWidth={2.2} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Panel>

      <TeamProfileDrawer
        member={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          invalidate('/admin/users')
          invalidate('/public/team')
          void refetch()
        }}
      />
    </>
  )
}
