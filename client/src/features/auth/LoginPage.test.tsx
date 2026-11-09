import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthProvider } from '@/shared/auth/AuthProvider'
import LoginPage from './LoginPage'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function renderLogin() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<p>Dashboard home</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('validates input before calling the API', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(401, { detail: 'no session' }))
    renderLogin()
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByText('Enter your password')).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/auth/login'))).toHaveLength(0)
  })

  it('shows the server error for bad credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) =>
      String(input).endsWith('/auth/login')
        ? json(401, { detail: 'Incorrect email or password', code: 'bad_credentials' })
        : json(401, { detail: 'no session' }),
    )
    renderLogin()
    await userEvent.type(await screen.findByLabelText('Email'), 'staff@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password')
  })

  it('signs in and goes to the dashboard', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) =>
      String(input).endsWith('/auth/login')
        ? json(200, {
            access_token: 't',
            token_type: 'bearer',
            expires_in: 900,
            user: { id: 1, email: 'a@b.c', full_name: 'Alice', phone: null, is_active: true, role: { id: 1, name: 'Administrator' }, last_login_at: null, created_at: '2026-01-01T00:00:00Z', permissions: ['dashboard.view'] },
          })
        : json(401, { detail: 'no session' }),
    )
    renderLogin()
    await userEvent.type(await screen.findByLabelText('Email'), 'alice@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'Correct!Passw0rd')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(screen.getByText('Dashboard home')).toBeInTheDocument())
  })
})
