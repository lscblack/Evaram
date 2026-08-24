import { useEffect, useMemo, useState } from 'react'
import { Check, Lock, RotateCcw, Save, Undo2 } from 'lucide-react'
import { ErrorNote, FIELD, Loading, PageHeader, Panel } from '@/components/admin/ui'
import { api } from '@/lib/api'
import { invalidate, useQuery } from '@/lib/queries'
import { useSiteConfig } from '@/lib/siteConfig'
import { cn } from '@/lib/utils'
import type { SiteSetting } from '@/types/api'

/**
 * Every setting the public site reads — brand colours, logos, contact details,
 * social links, feature switches. Grouped exactly as the API groups them so a
 * new setting appears here without a code change.
 */
export default function SettingsAdminPage() {
  const { data, loading, refetch } = useQuery<SiteSetting[]>('/admin/settings', { ttl: 0 })
  const { reload } = useSiteConfig()

  const [draft, setDraft] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [resetting, setResetting] = useState<string | null>(null)

  const settings = useMemo(() => data ?? [], [data])

  useEffect(() => {
    setDraft(Object.fromEntries(settings.map((s) => [s.key, s.value ?? ''])))
  }, [settings])

  const groups = useMemo(() => {
    const map = new Map<string, SiteSetting[]>()
    for (const setting of settings) {
      const list = map.get(setting.group) ?? []
      list.push(setting)
      map.set(setting.group, list)
    }
    return [...map.entries()]
  }, [settings])

  const dirty = settings.filter((s) => (s.value ?? '') !== (draft[s.key] ?? ''))
  const dirtyKeys = new Set(dirty.map((s) => s.key))

  /**
   * Saves either everything, or just one group.
   *
   * Per-group saves matter because these panels are long: someone editing the
   * contact block should not have to reason about what else on the page is
   * dirty before pressing save.
   */
  const save = async (group?: string) => {
    const pending = group ? dirty.filter((s) => s.group === group) : dirty
    if (pending.length === 0) return
    setBusy(true)
    setError(null)
    try {
      await api.put('/admin/settings', {
        values: Object.fromEntries(pending.map((s) => [s.key, draft[s.key]])),
      })
      invalidate('/public/bootstrap')
      // Re-read both the console list and the public bootstrap so the change is
      // visible immediately, including the live theme.
      await Promise.all([refetch(), reload()])
      setSaved(group ?? 'all')
      window.setTimeout(() => setSaved(null), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Those settings were not saved.')
    } finally {
      setBusy(false)
    }
  }

  /** Puts one group back to the values the app shipped with. */
  const resetGroup = async (group: string) => {
    if (
      !window.confirm(
        `Restore every ${group} setting to its default? Anything you have customised here is lost.`,
      )
    ) {
      return
    }
    setResetting(group)
    setError(null)
    try {
      await api.post('/admin/settings/reset', { group })
      invalidate('/public/bootstrap')
      await Promise.all([refetch(), reload()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Those settings were not reset.')
    } finally {
      setResetting(null)
    }
  }

  if (loading && settings.length === 0) return <Loading label="Reading settings…" />

  return (
    <>
      <PageHeader
        title="Site settings"
        description="Brand, logos, contact details and switches. Saving here changes the public site immediately."
        action={
          <div className="flex items-center gap-3">
            {dirty.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setDraft(Object.fromEntries(settings.map((s) => [s.key, s.value ?? ''])))
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
              >
                <RotateCcw className="size-3.5" strokeWidth={2.2} />
                Discard
              </button>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy || dirty.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-[0.8125rem] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {saved === 'all' ? (
                <Check className="size-3.5" strokeWidth={2.6} />
              ) : (
                <Save className="size-3.5" strokeWidth={2.2} />
              )}
              {saved === 'all'
                ? 'Saved'
                : dirty.length
                  ? `Save all (${dirty.length})`
                  : 'Saved'}
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {groups.map(([group, items]) => (
          <Panel
            key={group}
            title={group.replace(/_/g, ' ')}
            action={
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void resetGroup(group)}
                  disabled={resetting === group}
                  title={`Restore the ${group} settings to their defaults`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[0.75rem] font-semibold text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50"
                >
                  <Undo2 className="size-3.5" strokeWidth={2.2} />
                  {resetting === group ? 'Resetting…' : 'Reset'}
                </button>
                <button
                  type="button"
                  onClick={() => void save(group)}
                  disabled={busy || !items.some((s) => dirtyKeys.has(s.key))}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-2.5 py-1.5 text-[0.75rem] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {saved === group ? (
                    <Check className="size-3.5" strokeWidth={2.6} />
                  ) : (
                    <Save className="size-3.5" strokeWidth={2.2} />
                  )}
                  {saved === group ? 'Saved' : 'Save'}
                </button>
              </div>
            }
          >
            <div className="divide-y divide-line/70">
              {items.map((setting) => (
                <div key={setting.key} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[0.875rem] font-semibold text-ink">
                        {setting.label}
                        {setting.is_protected && (
                          <Lock className="size-3 text-ink-faint" strokeWidth={2.4} />
                        )}
                      </p>
                      {setting.description && (
                        <p className="mt-0.5 text-[0.75rem] text-ink-muted">
                          {setting.description}
                        </p>
                      )}
                    </div>
                    <code className="shrink-0 font-mono text-[0.6875rem] text-ink-faint">
                      {setting.key}
                    </code>
                  </div>

                  <div className="mt-2.5">
                    <SettingInput
                      setting={setting}
                      value={draft[setting.key] ?? ''}
                      onChange={(next) => setDraft((d) => ({ ...d, [setting.key]: next }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </>
  )
}

function SettingInput({
  setting,
  value,
  onChange,
}: {
  setting: SiteSetting
  value: string
  onChange: (next: string) => void
}) {
  // A `select` carries its own choices, so a new font or locale is a data
  // change rather than a client deploy.
  if (setting.value_type === 'select' && setting.options?.length) {
    return (
      <select
        className={FIELD}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={
          setting.key.startsWith('theme.font')
            ? { fontFamily: `"${value}", sans-serif` }
            : undefined
        }
      >
        {setting.options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            style={
              setting.key.startsWith('theme.font')
                ? { fontFamily: `"${option.value}", sans-serif` }
                : undefined
            }
          >
            {option.label}
          </option>
        ))}
      </select>
    )
  }

  if (setting.value_type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-[0.875rem] text-ink-soft">
        <input
          type="checkbox"
          className="size-4 accent-gold-500"
          checked={value === 'true'}
          onChange={(e) => onChange(String(e.target.checked))}
        />
        {value === 'true' ? 'On' : 'Off'}
      </label>
    )
  }

  if (setting.value_type === 'color') {
    return (
      <div className="flex items-center gap-2.5">
        <input
          type="color"
          aria-label={setting.label}
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="size-10 shrink-0 cursor-pointer rounded-lg border border-line bg-canvas p-1"
        />
        <input
          className={cn(FIELD, 'font-mono')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    )
  }

  if (setting.value_type === 'text' || setting.value_type === 'longtext') {
    return (
      <textarea
        rows={3}
        className={cn(FIELD, 'h-auto py-2.5')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  if (setting.value_type === 'image' || setting.value_type === 'url') {
    return (
      <div className="flex items-center gap-3">
        {setting.value_type === 'image' && value && (
          <img
            src={value}
            alt=""
            aria-hidden
            className="size-11 shrink-0 rounded-lg border border-line bg-canvas-alt object-contain p-1"
          />
        )}
        <input
          type="url"
          className={FIELD}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
        />
      </div>
    )
  }

  return <input className={FIELD} value={value} onChange={(e) => onChange(e.target.value)} />
}
