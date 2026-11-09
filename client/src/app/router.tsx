import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { FullPageSpinner } from '@/shared/ui/Spinner'
import { RequireAuth, RequirePermission } from '@/shared/auth/guards'
import { AdminLayout } from './AdminLayout'
import { NotFoundPage, RouteError } from './NotFound'

function page(load: () => Promise<{ default: ComponentType }>, perm?: string | string[]) {
  const Component = lazy(load)
  const el: ReactNode = (
    <Suspense fallback={<FullPageSpinner />}>
      <Component />
    </Suspense>
  )
  return perm ? <RequirePermission perm={perm}>{el}</RequirePermission> : el
}

export const router = createBrowserRouter([
  {
    // Public website
    element: page(() => import('@/features/public/PublicLayout')),
    errorElement: <RouteError />,
    children: [
      { index: true, element: page(() => import('@/features/public/HomePage')) },
      { path: 'listings/:code', element: page(() => import('@/features/public/ListingPage')) },
      { path: 'verify', element: page(() => import('@/features/public/VerifyDocumentPage')) },
    ],
  },
  {
    path: '/print/documents/:docId',
    element: <RequireAuth>{page(() => import('@/features/agreements/documents/PrintDocumentPage'), 'agreements.view')}</RequireAuth>,
    errorElement: <RouteError />,
  },
  { path: '/login', element: page(() => import('@/features/auth/LoginPage')), errorElement: <RouteError /> },
  {
    path: '/admin',
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: page(() => import('@/features/dashboard/DashboardPage'), 'dashboard.view') },

      // Property management
      { path: 'properties', element: page(() => import('@/features/properties/PropertiesPage'), 'properties.view') },
      { path: 'properties/new', element: page(() => import('@/features/properties/PropertyFormPage'), 'properties.manage') },
      { path: 'properties/:id', element: page(() => import('@/features/properties/PropertyDetailPage'), 'properties.view') },
      { path: 'properties/:id/edit', element: page(() => import('@/features/properties/PropertyFormPage'), 'properties.manage') },
      { path: 'buildings', element: page(() => import('@/features/properties/BuildingsPage'), 'properties.view') },
      { path: 'units', element: page(() => import('@/features/properties/UnitsPage'), 'properties.view') },
      { path: 'units/:id', element: page(() => import('@/features/properties/UnitDetailPage'), 'properties.view') },
      { path: 'availability', element: page(() => import('@/features/properties/AvailabilityPage'), 'properties.view') },

      // People
      { path: 'tenants', element: page(() => import('@/features/tenants/TenantsPage'), 'tenants.view') },
      { path: 'tenants/:id', element: page(() => import('@/features/tenants/TenantDetailPage'), 'tenants.view') },
      { path: 'agreements', element: page(() => import('@/features/agreements/AgreementsPage'), 'agreements.view') },
      { path: 'agreements/new', element: page(() => import('@/features/agreements/AgreementFormPage'), 'agreements.manage') },
      { path: 'agreements/:id', element: page(() => import('@/features/agreements/AgreementDetailPage'), 'agreements.view') },
      { path: 'agreements/:id/documents/:docId', element: page(() => import('@/features/agreements/documents/DocumentPage'), 'agreements.view') },
      { path: 'agreement-templates', element: page(() => import('@/features/agreements/documents/TemplatesPage'), 'agreements.manage') },
      { path: 'inquiries', element: page(() => import('@/features/tenants/InquiriesPage'), 'inquiries.manage') },

      // Financial management
      { path: 'finance', element: <Navigate to="/admin/finance/invoices" replace /> },
      { path: 'finance/invoices', element: page(() => import('@/features/finance/InvoicesPage'), 'invoices.view') },
      { path: 'finance/invoices/:id', element: page(() => import('@/features/finance/InvoiceDetailPage'), 'invoices.view') },
      { path: 'finance/payments', element: page(() => import('@/features/finance/PaymentsPage'), 'payments.view') },
      { path: 'finance/payments/:id', element: page(() => import('@/features/finance/PaymentDetailPage'), 'payments.view') },
      { path: 'finance/approvals', element: page(() => import('@/features/finance/ApprovalsPage'), 'payments.approve') },
      { path: 'finance/outstanding', element: page(() => import('@/features/finance/OutstandingPage'), 'invoices.view') },
      { path: 'finance/reports', element: page(() => import('@/features/finance/ReportsPage'), 'reports.view') },

      // Administration
      { path: 'users', element: page(() => import('@/features/admin/UsersPage'), 'users.manage') },
      { path: 'roles', element: page(() => import('@/features/admin/RolesPage'), 'roles.manage') },
      { path: 'settings', element: page(() => import('@/features/admin/SettingsPage'), 'settings.manage') },
      { path: 'audit', element: page(() => import('@/features/admin/AuditLogPage'), 'audit.view') },
      { path: 'notifications', element: page(() => import('@/features/admin/NotificationsPage')) },
      { path: 'account', element: page(() => import('@/features/admin/AccountPage')) },
      { path: '*', element: <NotFoundPage inAdmin /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
