import {
  BadgeCheck,
  Banknote,
  Bath,
  Blocks,
  Building2,
  Calculator,
  Circle,
  Compass,
  Factory,
  Fence,
  FileCheck2,
  FileSignature,
  FileText,
  Globe2,
  GraduationCap,
  Handshake,
  HardHat,
  HeartHandshake,
  Home,
  KeyRound,
  Landmark,
  Layers,
  LayoutGrid,
  MapPinned,
  PaintRoller,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Timer,
  Tractor,
  TreePine,
  TrendingUp,
  Upload,
  Users,
  Video,
  Wallet,
  Waves,
  Zap,
} from 'lucide-react'
import type { LucideIcon, LucideProps } from 'lucide-react'

/**
 * Explicit registry of every icon referenced *by name* from the data layer
 * (nav items, FORM_CONFIG categories, service lines, consultation types).
 *
 * A namespace import (`import * as Lucide`) would defeat tree-shaking and pull
 * the entire icon set into the bundle — so new data-driven icons must be added
 * here deliberately.
 */
const REGISTRY: Record<string, LucideIcon> = {
  Zap,
  Waves,
  Video,
  GraduationCap,
  Compass,
  Banknote,
  BadgeCheck,
  Bath,
  Blocks,
  Building2,
  Calculator,
  Factory,
  Fence,
  FileCheck2,
  FileSignature,
  FileText,
  Globe2,
  Handshake,
  HardHat,
  HeartHandshake,
  Home,
  KeyRound,
  Landmark,
  Layers,
  LayoutGrid,
  MapPinned,
  PaintRoller,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Timer,
  Tractor,
  TreePine,
  TrendingUp,
  Upload,
  Users,
  Wallet,
}

/** Renders a Lucide icon by name, falling back to a neutral circle. */
export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = REGISTRY[name] ?? Circle
  return <Cmp {...props} />
}
