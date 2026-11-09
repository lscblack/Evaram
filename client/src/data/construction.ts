import type { ProjectKind, ProjectStatus } from '@/types/api'

/**
 * What the construction division calls its work, and where each job stands.
 *
 * One table read by the manager's console and by the public portfolio, so a
 * job is named the same way in both.
 */
export const PROJECT_KINDS: { id: ProjectKind; label: string }[] = [
  { id: 'land_survey', label: 'Land survey' },
  { id: 'architectural_drawing', label: 'Architectural drawings' },
  { id: 'structural_design', label: 'Structural design' },
  { id: 'bill_of_quantities', label: 'Bill of quantities' },
  { id: 'permit', label: 'Building permit' },
  { id: 'construction', label: 'Construction' },
  { id: 'renovation', label: 'Renovation' },
  { id: 'supervision', label: 'Site supervision' },
  { id: 'interior', label: 'Interior finishing' },
  { id: 'other', label: 'Other' },
]

export const kindLabel = (kind: ProjectKind) =>
  PROJECT_KINDS.find((k) => k.id === kind)?.label ?? kind.replace(/_/g, ' ')

/** In the order a job moves through them. */
export const PROJECT_STATUSES: {
  id: ProjectStatus
  label: string
  tone: 'neutral' | 'good' | 'warn' | 'bad' | 'info'
}[] = [
  { id: 'enquiry', label: 'Enquiry', tone: 'warn' },
  { id: 'quoted', label: 'Quoted', tone: 'info' },
  { id: 'approved', label: 'Approved', tone: 'info' },
  { id: 'in_progress', label: 'In progress', tone: 'good' },
  { id: 'on_hold', label: 'On hold', tone: 'warn' },
  { id: 'completed', label: 'Completed', tone: 'neutral' },
  { id: 'cancelled', label: 'Cancelled', tone: 'bad' },
]

export const statusMeta = (status: ProjectStatus) =>
  PROJECT_STATUSES.find((s) => s.id === status) ?? { id: status, label: status, tone: 'neutral' as const }

/** Statuses that are still someone's job to move. */
export const OPEN_STATUSES: ProjectStatus[] = ['enquiry', 'quoted', 'approved', 'in_progress', 'on_hold']
