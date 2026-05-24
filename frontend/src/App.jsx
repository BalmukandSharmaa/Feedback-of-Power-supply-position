import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API = '/api'

const demoUsers = {
  'admin@power.test': {
    password: 'password123',
    user: { id: 1, name: 'Admin Officer', email: 'admin@power.test', role: 'admin', location_id: 1 },
  },
  'user@power.test': {
    password: 'password123',
    user: { id: 2, name: 'Demo Consumer', email: 'user@power.test', role: 'user', location_id: 2 },
  },
}

const demoLocations = [
  { id: 1, name: 'Civil Lines', zone: 'North', feeder_code: 'N-FDR-101', consumer_count: 12400, complaints_count: 8, current_status: { status: 'normal', voltage_level: 100, reason: 'Supply is stable across the feeder.', estimated_restoration_at: null } },
  { id: 2, name: 'Model Town', zone: 'North', feeder_code: 'N-FDR-204', consumer_count: 9800, complaints_count: 15, current_status: { status: 'outage', voltage_level: 0, reason: '11KV feeder tripped, field team dispatched.', estimated_restoration_at: '2026-05-16T18:30:00' } },
  { id: 3, name: 'Industrial Area', zone: 'East', feeder_code: 'E-FDR-317', consumer_count: 14250, complaints_count: 11, current_status: { status: 'low_voltage', voltage_level: 72, reason: 'Peak load fluctuation.', estimated_restoration_at: '2026-05-16T20:00:00' } },
  { id: 4, name: 'Green Park', zone: 'South', feeder_code: 'S-FDR-088', consumer_count: 7600, complaints_count: 6, current_status: { status: 'maintenance', voltage_level: 0, reason: 'Scheduled transformer maintenance.', estimated_restoration_at: '2026-05-16T22:15:00' } },
  { id: 5, name: 'Railway Colony', zone: 'West', feeder_code: 'W-FDR-512', consumer_count: 6350, complaints_count: 5, current_status: { status: 'restoring', voltage_level: 88, reason: 'Final restoration testing.', estimated_restoration_at: '2026-05-16T17:45:00' } },
]

const demoComplaints = [
  { id: 1, ticket_no: 'PWR-260516-D101', user_id: 2, title: 'Complete outage in lane 4', description: 'No electricity since early morning.', category: 'power_cut', priority: 'critical', status: 'in_progress', location_id: 2, location: { name: 'Model Town' }, created_at: '2026-05-16T10:20:00', updates: [{ status: 'in_progress', note: 'Field team assigned and feeder inspection started.' }] },
  { id: 2, ticket_no: 'PWR-260516-D102', user_id: 2, title: 'Low voltage at evening peak', description: 'Fans and appliances are running very slow.', category: 'low_voltage', priority: 'high', status: 'approved', location_id: 3, location: { name: 'Industrial Area' }, created_at: '2026-05-16T09:10:00', updates: [{ status: 'approved', note: 'Complaint approved for technical verification.' }] },
  { id: 3, ticket_no: 'PWR-260516-D103', user_id: 2, title: 'Transformer sparking', description: 'Transformer near gate produced sparks.', category: 'transformer_fault', priority: 'critical', status: 'resolved', location_id: 4, location: { name: 'Green Park' }, created_at: '2026-05-15T20:30:00', updates: [{ status: 'resolved', note: 'Transformer fuse assembly replaced.' }], rating: { rating: 4, comments: 'Resolved quickly.' } },
  { id: 4, ticket_no: 'PWR-260516-D104', user_id: 2, title: 'Restoration update needed', description: 'Need confirmation for restoration.', category: 'restoration_update', priority: 'medium', status: 'submitted', location_id: 5, location: { name: 'Railway Colony' }, created_at: '2026-05-15T18:45:00', updates: [{ status: 'submitted', note: 'Complaint submitted by consumer.' }] },
]

const demoNotifications = [
  { id: 1, type: 'restoration', title: 'Restoration expected soon', message: 'Model Town repair work is underway. Estimated restoration is within 2 hours.', location: { name: 'Model Town' } },
  { id: 2, type: 'maintenance', title: 'Scheduled transformer maintenance', message: 'Green Park feeder will remain under planned maintenance until 10:15 PM.', location: { name: 'Green Park' } },
]

const statusLabels = {
  normal: 'Normal',
  outage: 'Outage',
  low_voltage: 'Low Voltage',
  maintenance: 'Maintenance',
  restoring: 'Restoring',
}

const complaintStatuses = ['submitted', 'approved', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected']
const categories = ['power_cut', 'low_voltage', 'transformer_fault', 'maintenance', 'restoration_update', 'billing', 'other']
const priorities = ['low', 'medium', 'high', 'critical']

function App() {
  const [authMode, setAuthMode] = useState('login')
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('power_user') || 'null'))
  const [token, setToken] = useState(() => localStorage.getItem('power_token') || '')
  const [activeView, setActiveView] = useState('dashboard')
  const [locations, setLocations] = useState(demoLocations)
  const [complaints, setComplaints] = useState(demoComplaints)
  const [notifications, setNotifications] = useState(demoNotifications)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [toast, setToast] = useState('')
  const [authForm, setAuthForm] = useState({ name: '', email: 'admin@power.test', password: 'password123', phone: '', location_id: 2, role: 'admin' })
  const [complaintForm, setComplaintForm] = useState({ title: '', category: 'power_cut', priority: 'medium', location_id: 2, description: '', address: '' })
  const [statusForm, setStatusForm] = useState({ location_id: 2, status: 'outage', voltage_level: 0, reason: '', estimated_restoration_at: '' })
  const [reportRange, setReportRange] = useState('monthly')

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token])

  useEffect(() => {
    loadPublicData()
  }, [])

  useEffect(() => {
    if (token) {
      loadPrivateData()
    }
  }, [token])

  const visibleComplaints = useMemo(() => {
    return complaints
      .filter((complaint) => user?.role === 'admin' || complaint.user_id === user?.id)
      .filter((complaint) => {
        const text = `${complaint.ticket_no} ${complaint.title} ${complaint.location?.name || ''}`.toLowerCase()
        return text.includes(query.toLowerCase())
          && (status === 'all' || complaint.status === status)
          && (category === 'all' || complaint.category === category)
      })
  }, [complaints, query, status, category, user])

  const analytics = useMemo(() => {
    const activeEvents = locations.filter((item) => current(item).status !== 'normal').length
    const avgVoltage = Math.round(locations.reduce((sum, item) => sum + Number(current(item).voltage_level || 0), 0) / Math.max(locations.length, 1))
    const open = complaints.filter((item) => !['resolved', 'closed', 'rejected'].includes(item.status)).length
    const resolved = complaints.filter((item) => ['resolved', 'closed'].includes(item.status)).length
    const categoryCounts = categories.map((name) => ({ name, total: complaints.filter((item) => item.category === name).length }))
    const monthly = [
      { month: 'Jan', total: 42 },
      { month: 'Feb', total: 38 },
      { month: 'Mar', total: 51 },
      { month: 'Apr', total: 46 },
      { month: 'May', total: complaints.length + 58 },
    ]
    return { activeEvents, avgVoltage, open, resolved, categoryCounts, monthly }
  }, [locations, complaints])

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.message || 'Request failed')
    return payload
  }

  async function loadPublicData() {
    try {
      const payload = await fetch(`${API}/locations`).then((res) => res.ok ? res.json() : Promise.reject())
      setLocations(payload.length ? payload.map(normalizeLocation) : demoLocations)
    } catch {
      setLocations(demoLocations)
    }
  }

  async function loadPrivateData() {
    try {
      const payload = await request('/complaints')
      setComplaints((payload.data || payload).map(normalizeComplaint))
    } catch {
      setComplaints(demoComplaints)
    }
  }

  async function login(event) {
    event.preventDefault()
    try {
      const payload = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: authForm.email, password: authForm.password }),
      })
      saveSession(payload.user, payload.access_token)
      setToast('Login successful.')
    } catch {
      const demo = demoUsers[authForm.email]
      if (!demo || demo.password !== authForm.password) {
        setToast('Invalid email or password.')
        return
      }
      saveSession(demo.user, `demo-${demo.user.role}-token`)
      setToast('Demo login successful.')
    }
  }

  async function register(event) {
    event.preventDefault()
    try {
      const payload = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(authForm),
      })
      saveSession(payload.user, payload.access_token)
      setToast('Registration successful.')
    } catch {
      const newUser = {
        id: Date.now(),
        name: authForm.name || 'New Consumer',
        email: authForm.email,
        role: authForm.role,
        location_id: Number(authForm.location_id),
      }
      saveSession(newUser, 'demo-user-token')
      setToast('Demo registration successful.')
    }
  }

  async function logout() {
    try {
      if (token && !token.startsWith('demo-')) await request('/auth/logout', { method: 'POST' })
    } catch {
      // Session is cleared locally even if the API is offline.
    }
    localStorage.removeItem('power_user')
    localStorage.removeItem('power_token')
    setUser(null)
    setToken('')
    setActiveView('dashboard')
    setToast('Logged out.')
  }

  function saveSession(nextUser, nextToken) {
    setUser(nextUser)
    setToken(nextToken)
    localStorage.setItem('power_user', JSON.stringify(nextUser))
    localStorage.setItem('power_token', nextToken)
  }

  async function submitComplaint(event) {
    event.preventDefault()
    const location = locations.find((item) => item.id === Number(complaintForm.location_id)) || locations[0]
    const optimistic = {
      id: Date.now(),
      ticket_no: `PWR-NEW-${String(complaints.length + 1).padStart(3, '0')}`,
      user_id: user.id,
      ...complaintForm,
      location_id: Number(complaintForm.location_id),
      status: 'submitted',
      location: { name: location.name },
      created_at: new Date().toISOString(),
      updates: [{ status: 'submitted', note: 'Complaint submitted by consumer.' }],
    }

    try {
      const payload = await request('/complaints', { method: 'POST', body: JSON.stringify(complaintForm) })
      setComplaints([normalizeComplaint(payload), ...complaints])
      setToast('Complaint submitted to the API.')
    } catch {
      setComplaints([optimistic, ...complaints])
      setToast('Complaint saved in demo mode.')
    }
    setComplaintForm({ title: '', category: 'power_cut', priority: 'medium', location_id: 2, description: '', address: '' })
  }

  async function updateComplaint(complaint, nextStatus) {
    const updated = complaints.map((item) => item.id === complaint.id
      ? { ...item, status: nextStatus, updates: [{ status: nextStatus, note: `Status changed to ${label(nextStatus)}.` }, ...(item.updates || [])] }
      : item)
    setComplaints(updated)
    try {
      await request(`/complaints/${complaint.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus, note: `Status changed to ${label(nextStatus)}.` }),
      })
      setToast('Complaint workflow updated.')
    } catch {
      setToast('Workflow updated in demo mode.')
    }
  }

  async function submitPowerStatus(event) {
    event.preventDefault()
    setLocations(locations.map((location) => location.id === Number(statusForm.location_id)
      ? { ...location, current_status: { ...statusForm, location_id: Number(statusForm.location_id), voltage_level: Number(statusForm.voltage_level) } }
      : location))
    const location = locations.find((item) => item.id === Number(statusForm.location_id))
    setNotifications([
      { id: Date.now(), type: statusForm.status, title: `${statusLabels[statusForm.status]} update`, message: statusForm.reason || 'Supply status updated.', location: { name: location?.name || 'Area' } },
      ...notifications,
    ])
    try {
      await request('/power-statuses', { method: 'POST', body: JSON.stringify(statusForm) })
      setToast('Power status updated in API.')
    } catch {
      setToast('Power status updated in demo mode.')
    }
  }

  function rateComplaint(complaint, rating) {
    setComplaints(complaints.map((item) => item.id === complaint.id ? { ...item, rating: { rating, comments: 'Consumer rating submitted.' } } : item))
    setToast('Feedback rating saved.')
  }

  if (!user) {
    return (
      <AuthScreen
        mode={authMode}
        setMode={setAuthMode}
        form={authForm}
        setForm={setAuthForm}
        locations={locations}
        login={login}
        register={register}
        toast={toast}
      />
    )
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">PS</div>
          <div>
            <strong>PowerDesk</strong>
            <span>{user.role === 'admin' ? 'Admin Control' : 'Consumer Portal'}</span>
          </div>
        </div>
        <div className={`role-banner ${user.role}`}>
          <span>{user.role === 'admin' ? 'Admin Panel' : 'User Panel'}</span>
          <strong>{user.role === 'admin' ? 'Control Room Access' : 'Consumer Self Service'}</strong>
          <small>{user.role === 'admin' ? 'Manage areas, outages, users, reports and complaints.' : 'View area supply, submit complaints and track restoration.'}</small>
        </div>
        <nav>
          {['dashboard', 'areas', 'complaints', 'notifications', 'reports'].map((item) => (
            <button className={activeView === item ? 'active' : ''} key={item} type="button" onClick={() => setActiveView(item)}>
              {label(item)}
            </button>
          ))}
          {user.role === 'admin' && (
            <button className={activeView === 'admin' ? 'active' : ''} type="button" onClick={() => setActiveView('admin')}>Admin</button>
          )}
        </nav>
        <div className="profile-card">
          <span>{user.name?.slice(0, 1) || 'U'}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
          <button type="button" onClick={logout}>Logout</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Live electricity operations</p>
            <h1>Feedback of Power supply position</h1>
            <div className="role-summary">
              <span className={`mode-chip ${user.role}`}>{user.role === 'admin' ? 'Admin Dashboard' : 'User Dashboard'}</span>
              <span>{user.role === 'admin' ? 'You can update supply status, resolve complaints, manage reports and monitor all areas.' : 'You can check your area status, submit complaints, track progress and rate resolution.'}</span>
            </div>
          </div>
          <div className="top-actions">
            <button type="button" className="ghost" onClick={loadPublicData}>Refresh</button>
            <button type="button" onClick={() => setActiveView('complaints')}>New Complaint</button>
          </div>
        </header>

        {toast && <div className="toast" onClick={() => setToast('')}>{toast}</div>}

        {activeView === 'dashboard' && (
          <>
            <section className="kpi-grid">
              <Metric label="Consumers" value={locations.reduce((sum, item) => sum + Number(item.consumer_count || 0), 0).toLocaleString()} note="registered in covered areas" />
              <Metric label="Active Events" value={analytics.activeEvents} note="outage, maintenance, restoring" tone="warn" />
              <Metric label="Avg Voltage" value={`${analytics.avgVoltage}%`} note="across monitored feeders" />
              <Metric label="Open Tickets" value={analytics.open} note="complaints needing action" tone="info" />
            </section>
            <FeatureGuide role={user.role} setActiveView={setActiveView} />
            <section className="content-grid">
              <LiveStatus locations={locations} />
              <Reports analytics={analytics} reportRange={reportRange} setReportRange={setReportRange} />
            </section>
          </>
        )}

        {activeView === 'areas' && <LiveStatus locations={locations} full />}

        {activeView === 'complaints' && (
          <section className="content-grid">
            <ComplaintRegister
              complaints={visibleComplaints}
              query={query}
              setQuery={setQuery}
              status={status}
              setStatus={setStatus}
              category={category}
              setCategory={setCategory}
              user={user}
              updateComplaint={updateComplaint}
              rateComplaint={rateComplaint}
            />
            <ComplaintForm form={complaintForm} setForm={setComplaintForm} locations={locations} submit={submitComplaint} />
          </section>
        )}

        {activeView === 'notifications' && <Notifications notifications={notifications} />}

        {activeView === 'reports' && <Reports analytics={analytics} reportRange={reportRange} setReportRange={setReportRange} full />}

        {activeView === 'admin' && user.role === 'admin' && (
          <AdminPanel
            locations={locations}
            complaints={complaints}
            statusForm={statusForm}
            setStatusForm={setStatusForm}
            submitPowerStatus={submitPowerStatus}
            updateComplaint={updateComplaint}
          />
        )}
      </section>
    </main>
  )
}

function AuthScreen({ mode, setMode, form, setForm, locations, login, register, toast }) {
  const isLogin = mode === 'login'
  function chooseRole(role) {
    const demo = role === 'admin'
      ? { email: 'admin@power.test', password: 'password123' }
      : { email: 'user@power.test', password: 'password123' }
    setForm({ ...form, role, ...demo })
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <div className="hero-copy">
          <div className="brand-mark">PS</div>
          <p className="eyebrow">Electricity supply intelligence</p>
          <h1>Feedback of Power supply position</h1>
          <p>Monitor live area supply, submit power complaints, track restoration, and manage outage workflows from one responsive control room.</p>
        </div>
        <div className="power-map">
          {demoLocations.map((location) => <span key={location.id} className={current(location).status}>{location.name}</span>)}
        </div>
      </section>
      <form className="auth-card" onSubmit={isLogin ? login : register}>
        <div>
          <p className="eyebrow">{isLogin ? 'Welcome back' : 'Create account'}</p>
          <h2>{isLogin ? 'Login' : 'Register'}</h2>
        </div>
        <div className="account-switch" role="group" aria-label="Account type">
          <button type="button" className={form.role === 'admin' ? 'selected' : ''} onClick={() => chooseRole('admin')}>
            <span>Admin</span>
            <small>Control room</small>
          </button>
          <button type="button" className={form.role === 'user' ? 'selected' : ''} onClick={() => chooseRole('user')}>
            <span>User</span>
            <small>Consumer portal</small>
          </button>
        </div>
        {!isLogin && <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Full name" />}
        {!isLogin && (
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            <option value="admin">Admin Account</option>
            <option value="user">User Account</option>
          </select>
        )}
        <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email address" />
        {!isLogin && <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Phone number" />}
        {!isLogin && (
          <select value={form.location_id} onChange={(event) => setForm({ ...form, location_id: Number(event.target.value) })}>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        )}
        <input required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Password" />
        <p className="login-hint">
          Selected login type: <strong>{form.role === 'admin' ? 'Admin Account' : 'User Account'}</strong>
        </p>
        <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
        <button type="button" className="link-button" onClick={() => setMode(isLogin ? 'register' : 'login')}>
          {isLogin ? 'Need an account? Register' : 'Already registered? Login'}
        </button>
        <div className="demo-logins">
          <button type="button" onClick={() => chooseRole('admin')}>Use Admin Demo</button>
          <button type="button" onClick={() => chooseRole('user')}>Use User Demo</button>
        </div>
        <div className="role-preview">
          <article>
            <strong>Admin</strong>
            <span>Users, areas, outages, analytics, reports, complaint resolution.</span>
          </article>
          <article>
            <strong>User</strong>
            <span>Area status, complaint submit, live tracking, notifications, rating.</span>
          </article>
        </div>
        {toast && <p className="form-message">{toast}</p>}
      </form>
    </main>
  )
}

function FeatureGuide({ role, setActiveView }) {
  const cards = role === 'admin'
    ? [
        ['Admin', 'Update power supply status area-wise', 'admin'],
        ['Complaints', 'Approve, assign, resolve and close tickets', 'complaints'],
        ['Reports', 'View outage frequency and complaint analytics', 'reports'],
      ]
    : [
        ['Area Status', 'Check electricity status in your selected location', 'areas'],
        ['Complaints', 'Submit power cut, low voltage and transformer issues', 'complaints'],
        ['Notifications', 'Receive restoration and maintenance updates', 'notifications'],
      ]

  return (
    <section className="feature-guide">
      {cards.map(([title, text, view]) => (
        <button type="button" key={title} onClick={() => setActiveView(view)}>
          <span>{title}</span>
          <strong>{text}</strong>
        </button>
      ))}
    </section>
  )
}

function LiveStatus({ locations, full = false }) {
  return (
    <section className={`panel ${full ? 'full-panel' : ''}`}>
      <div className="panel-head">
        <div>
          <p className="eyebrow">Area-wise supply</p>
          <h2>Live Power Status</h2>
        </div>
      </div>
      <div className="status-grid">
        {locations.map((location) => {
          const status = current(location)
          return (
            <article className="status-card" key={location.id}>
              <div>
                <span className={`status-dot ${status.status}`}></span>
                <strong>{location.name}</strong>
                <p>{location.zone} Zone - {location.feeder_code}</p>
              </div>
              <span className={`pill ${status.status}`}>{statusLabels[status.status] || status.status}</span>
              <div className="voltage-track">
                <span style={{ width: `${status.voltage_level || 0}%` }}></span>
              </div>
              <small>{status.reason || 'No issue reported.'}</small>
              <footer>{location.consumer_count?.toLocaleString?.() || 0} consumers</footer>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function ComplaintRegister({ complaints, query, setQuery, status, setStatus, category, setCategory, user, updateComplaint, rateComplaint }) {
  return (
    <section className="panel wide">
      <div className="panel-head wrap">
        <div>
          <p className="eyebrow">Tracking workflow</p>
          <h2>Complaint Register</h2>
        </div>
        <div className="filters">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ticket, title, area" />
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All status</option>
            {complaintStatuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
        </div>
      </div>
      <div className="ticket-list">
        {complaints.map((complaint) => (
          <article className="ticket" key={complaint.id}>
            <div>
              <span className="ticket-no">{complaint.ticket_no}</span>
              <h3>{complaint.title}</h3>
              <p>{complaint.description}</p>
              <small>{complaint.location?.name} - {new Date(complaint.created_at).toLocaleString()}</small>
            </div>
            <div className="ticket-meta">
              <span className={`pill ${complaint.priority}`}>{complaint.priority}</span>
              <span className={`pill ${complaint.status}`}>{label(complaint.status)}</span>
              {user.role === 'admin' && (
                <select value={complaint.status} onChange={(event) => updateComplaint(complaint, event.target.value)}>
                  {complaintStatuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}
                </select>
              )}
              {user.role !== 'admin' && ['resolved', 'closed'].includes(complaint.status) && (
                <div className="rating-row">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button key={rating} type="button" onClick={() => rateComplaint(complaint, rating)} className={complaint.rating?.rating >= rating ? 'star active' : 'star'}>*</button>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
        {!complaints.length && <div className="empty-state">No complaints match your filters.</div>}
      </div>
    </section>
  )
}

function ComplaintForm({ form, setForm, locations, submit }) {
  return (
    <form className="panel complaint-form" onSubmit={submit}>
      <div>
        <p className="eyebrow">Consumer feedback</p>
        <h2>Submit Issue</h2>
      </div>
      <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Issue title" />
      <select value={form.location_id} onChange={(event) => setForm({ ...form, location_id: Number(event.target.value) })}>
        {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
      </select>
      <div className="form-pair">
        <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
          {categories.map((item) => <option key={item} value={item}>{label(item)}</option>)}
        </select>
        <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
          {priorities.map((item) => <option key={item} value={item}>{label(item)}</option>)}
        </select>
      </div>
      <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Address or landmark" />
      <textarea required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe the issue"></textarea>
      <button type="submit">Submit Complaint</button>
    </form>
  )
}

function Notifications({ notifications }) {
  return (
    <section className="panel full-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Outage and restoration notices</p>
          <h2>Notifications</h2>
        </div>
      </div>
      <div className="notice-grid">
        {notifications.map((notice) => (
          <article className="notice" key={notice.id}>
            <span className={`pill ${notice.type}`}>{label(notice.type)}</span>
            <h3>{notice.title}</h3>
            <p>{notice.message}</p>
            <small>{notice.location?.name || 'All areas'}</small>
          </article>
        ))}
      </div>
    </section>
  )
}

function Reports({ analytics, reportRange, setReportRange, full = false }) {
  const maxMonthly = Math.max(...analytics.monthly.map((item) => item.total), 1)
  const maxCategory = Math.max(...analytics.categoryCounts.map((item) => item.total), 1)
  return (
    <section className={`panel ${full ? 'full-panel' : ''}`}>
      <div className="panel-head">
        <div>
          <p className="eyebrow">Charts and reports</p>
          <h2>Power Analysis</h2>
        </div>
        <select value={reportRange} onChange={(event) => setReportRange(event.target.value)}>
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <div className="chart-layout">
        <div className="bar-chart">
          {analytics.monthly.map((item) => (
            <div className="bar-column" key={item.month}>
              <span style={{ height: `${(item.total / maxMonthly) * 100}%` }}></span>
              <small>{item.month}</small>
            </div>
          ))}
        </div>
        <div className="category-chart">
          {analytics.categoryCounts.map((item) => (
            <div key={item.name}>
              <label>{label(item.name)}</label>
              <span><i style={{ width: `${(item.total / maxCategory) * 100}%` }}></i></span>
              <strong>{item.total}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function AdminPanel({ locations, complaints, statusForm, setStatusForm, submitPowerStatus, updateComplaint }) {
  return (
    <section className="admin-grid">
      <form className="panel complaint-form" onSubmit={submitPowerStatus}>
        <div>
          <p className="eyebrow">Admin control</p>
          <h2>Update Power Status</h2>
          <small className="helper-text">Ye update users ke area cards aur notifications me dikhega.</small>
        </div>
        <select value={statusForm.location_id} onChange={(event) => setStatusForm({ ...statusForm, location_id: Number(event.target.value) })}>
          {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select>
        <select value={statusForm.status} onChange={(event) => setStatusForm({ ...statusForm, status: event.target.value })}>
          {Object.keys(statusLabels).map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
        </select>
        <input type="number" min="0" max="120" value={statusForm.voltage_level} onChange={(event) => setStatusForm({ ...statusForm, voltage_level: event.target.value })} placeholder="Voltage level" />
        <input value={statusForm.estimated_restoration_at} onChange={(event) => setStatusForm({ ...statusForm, estimated_restoration_at: event.target.value })} placeholder="Estimated restoration time" />
        <textarea value={statusForm.reason} onChange={(event) => setStatusForm({ ...statusForm, reason: event.target.value })} placeholder="Reason or maintenance details"></textarea>
        <button type="submit">Publish Status</button>
      </form>
      <section className="panel">
        <div>
          <p className="eyebrow">Resolution workflow</p>
          <h2>Priority Queue</h2>
          <small className="helper-text">Admin yahan se pending complaint ko one-click resolve kar sakta hai.</small>
        </div>
        <div className="mini-queue">
          {complaints.filter((item) => !['resolved', 'closed'].includes(item.status)).slice(0, 6).map((complaint) => (
            <article key={complaint.id}>
              <strong>{complaint.title}</strong>
              <span>{complaint.location?.name}</span>
              <button type="button" onClick={() => updateComplaint(complaint, 'resolved')}>Resolve</button>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

function Metric({ label, value, note, tone = '' }) {
  return (
    <article className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  )
}

function current(location) {
  return location.current_status || location.currentStatus || { status: 'normal', voltage_level: 100, reason: 'Supply is stable.' }
}

function normalizeLocation(location) {
  return { ...location, current_status: current(location) }
}

function normalizeComplaint(complaint) {
  return { ...complaint, location: complaint.location || { name: 'Unknown area' }, updates: complaint.updates || [] }
}

function label(value) {
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export default App
