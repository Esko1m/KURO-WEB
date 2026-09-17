import { useEffect, useState } from 'react'
import Dashboard from './components/Dashboard'
import { useSupabase } from './lib/supabase'
import './App.css'

const AUTH_SALT = 'koen-ios-2026-7'

const IconSparkle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
    <path d="M19 15l.9 2.4L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.6L19 15z" />
  </svg>
)

const IconGrid = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)

const IconDice = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
  </svg>
)

const IconKey = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="M10.7 12.3L21 2M15 6l3 3M12 9l2 2" />
  </svg>
)

const IconCopy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <line x1="12" y1="9" x2="12" y2="13.5" />
    <circle cx="12" cy="17" r="0.4" fill="currentColor" />
  </svg>
)

const asHex = (buf) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

async function sha256(text) {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return asHex(digest)
}

function randomString(length, chars) {
  let out = ''
  const values = crypto.getRandomValues(new Uint32Array(length))
  for (let i = 0; i < length; i++) out += chars[values[i] % chars.length]
  return out
}

function generatePassword(length = 16) {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const special = '!@#$%^&*'
  const all = upper + lower + digits + special
  const pw = randomString(length, all)
  return pw
    .split('')
    .map((c, i) => {
      if (i === 0) return upper[Math.floor(Math.random() * upper.length)]
      if (i === 1) return lower[Math.floor(Math.random() * lower.length)]
      if (i === 2) return digits[Math.floor(Math.random() * digits.length)]
      return c
    })
    .join('')
    .slice(0, length)
}

function generateUsername() {
  const prefixes = [
    'naomi', 'yuri', 'kuro', 'ren', 'aki', 'hina', 'sora', 'luna',
    'riku', 'yuki', 'kai', 'teo', 'mira', 'nina', 'zane', 'ella',
  ]
  const word = prefixes[Math.floor(Math.random() * prefixes.length)]
  const num = Math.floor(Math.random() * 99) + 1
  return word + num
}

const formatExpiry = (iso) => {
  const d = new Date(iso)
  const diff = Math.ceil((d - new Date()) / 86400000)
  const base = d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  if (diff < 0) return `${base} · expired ${Math.abs(diff)}d ago`
  if (diff === 0) return `${base} · expires today`
  return `${base} · in ${diff}d`
}

const KVRow = ({ label, value, tone, onCopy, copyLabel }) => (
  <div className="kv">
    <span className="kv-label">{label}</span>
    <code className={`kv-value ${tone || ''}`}>{value}</code>
    {onCopy && (
      <button type="button" className="copy-btn" onClick={() => onCopy(value)}>
        <IconCopy />
        {copyLabel}
      </button>
    )}
  </div>
)

function App() {
  const [tab, setTab] = useState('generator')

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">K</span>
            <span className="brand-name">KURO</span>
            <span className="brand-tag">ADMIN</span>
          </div>
          <nav className="tabs">
            <button
              type="button"
              className={`tab ${tab === 'generator' ? 'active' : ''}`}
              onClick={() => setTab('generator')}
            >
              <IconSparkle />
              Generator
            </button>
            <button
              type="button"
              className={`tab ${tab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setTab('dashboard')}
            >
              <IconGrid />
              Dashboard
            </button>
          </nav>
        </div>
      </header>

      <main className="main">
        <div className="card">
          {tab === 'generator' ? (
            <Generator onGoDashboard={() => setTab('dashboard')} />
          ) : (
            <Dashboard />
          )}
        </div>
      </main>
    </div>
  )
}

function Generator({ onGoDashboard }) {
  const { url, key, loading, error, expirySupported, checkExpiry, createUser, setError } =
    useSupabase()
  const configured = Boolean(url && key)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordLength, setPasswordLength] = useState(16)
  const [expiryMode, setExpiryMode] = useState('none')
  const [expiryDays, setExpiryDays] = useState(7)
  const [expiryDate, setExpiryDate] = useState('')
  const [result, setResult] = useState(null)
  const [created, setCreated] = useState(false)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    if (configured) checkExpiry()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured])

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(''), 1500)
    })
  }

  const onGenerateRandom = () => {
    setUsername(generateUsername())
    setPassword(generatePassword(passwordLength))
  }

  const computeExpiryISO = () => {
    if (expiryMode === 'days') {
      const d = new Date()
      d.setUTCHours(0, 0, 0, 0)
      d.setUTCDate(d.getUTCDate() + expiryDays)
      return d.toISOString()
    }
    if (expiryMode === 'custom' && expiryDate) {
      return new Date(expiryDate).toISOString()
    }
    return ''
  }

  const onCreate = async () => {
    const user = username || generateUsername()
    const pass = password || generatePassword(passwordLength)
    const hash = await sha256(pass + AUTH_SALT)
    const expiresAt = computeExpiryISO()

    if (!configured) {
      setResult({
        username: user,
        password: pass,
        passwordHash: hash,
        expiresAt,
      })
      setCreated(false)
      setError('Connect to Supabase in the Dashboard tab first to create the account.')
      return
    }

    setError('')
    const row = await createUser({
      username: user,
      passwordHash: hash,
      expiresAt,
    })
    if (row) {
      setResult({
        username: row.username,
        password: pass,
        passwordHash: hash,
        expiresAt: row.expires_at || '',
      })
      setCreated(true)
    } else {
      setResult(null)
      setCreated(false)
    }
  }

  const hasUser = username.trim().length >= 3
  const hasPass = password.trim().length === 0 || password.trim().length >= 6
  const isValid = hasUser && hasPass

  return (
    <>
      <div className="panel-head">
        <div className="panel-icon">
          <IconKey />
        </div>
        <div>
          <h1 className="panel-title">Account Generator</h1>
          <p className="panel-sub">
            Creates credentials the way <code>mkuser.mjs</code> does — SHA-256
            hashed with salt <code>{AUTH_SALT}</code> and persisted to{' '}
            <code>koen_users</code>.
          </p>
        </div>
      </div>

      {error && (
        <p className="banner error">
          <IconAlert />
          {error}
        </p>
      )}

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          onCreate()
        }}
      >
        <div className="form-grid">
          <div className="field-control">
            <span>Username</span>
            <input
              className="control"
              type="text"
              value={username}
              placeholder="e.g. naomi42"
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="field-control">
            <span>Password</span>
            <input
              className="control"
              type="password"
              value={password}
              placeholder="random if left empty"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="control-row">
          <span className="field-label">Length</span>
          <input
            className="range"
            type="range"
            min="8"
            max="32"
            value={passwordLength}
            onChange={(e) => setPasswordLength(Number(e.target.value))}
          />
          <output className="range-output">{passwordLength}</output>
        </div>

        <div className="expiry-row">
          <span className="field-label">Expires</span>
          <select
            className="control"
            value={expiryMode}
            onChange={(e) => setExpiryMode(e.target.value)}
          >
            <option value="none">Never</option>
            <option value="days">In N days</option>
            <option value="custom">Custom date</option>
          </select>
          {expiryMode === 'days' && (
            <input
              className="control"
              type="number"
              min="1"
              max="365"
              value={expiryDays}
              onChange={(e) => setExpiryDays(Number(e.target.value))}
            />
          )}
          {expiryMode === 'custom' && (
            <input
              className="control"
              type="datetime-local"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          )}
          {expiryMode !== 'none' && configured && !expirySupported && (
            <span className="expiry-warn">
              Add the <code>expires_at</code> column first (see Dashboard)
            </span>
          )}
        </div>

        <div className="btn-flex">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onGenerateRandom}
          >
            <IconDice />
            Randomize
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!isValid || loading}
          >
            {configured ? 'Create Account' : 'Preview (not connected)'}
          </button>
        </div>
      </form>

      {!isValid && (
        <p className="hint">
          Username must be at least 3 characters and password at least 6
          characters long.
        </p>
      )}

      {!configured && (
        <p className="hint">
          Not connected to Supabase. Open the Dashboard tab, enter your URL and
          key, then accounts will be created in the database.
        </p>
      )}

      {result && (
        <section className="terminal">
          <div className="terminal-bar">
            <span className="terminal-dot red" />
            <span className="terminal-dot yellow" />
            <span className="terminal-dot green" />
            <span className="terminal-title">mkuser · result</span>
          </div>
          <div className="terminal-body">
            <div className="terminal-cmd">
              <span className="prompt">$</span> node scripts/mkuser.mjs{' '}
              {result.username} **** --key &quot;…&quot;
            </div>
            <KVRow label="username" value={result.username} onCopy={(v) => copy(v, 'username')} copyLabel={copied === 'username' ? 'Copied' : 'Copy'} />
            <KVRow label="password" value={result.password} onCopy={(v) => copy(v, 'password')} copyLabel={copied === 'password' ? 'Copied' : 'Copy'} />
            <KVRow label="password hash" value={result.passwordHash} onCopy={(v) => copy(v, 'hash')} copyLabel={copied === 'hash' ? 'Copied' : 'Copy'} />
            <KVRow label="expires_at" value={result.expiresAt ? formatExpiry(result.expiresAt) : 'never'} muted={!result.expiresAt} />
            <KVRow label="hwid" value="unset — locked on first login" muted />
            <KVRow
              label="result"
              value={created ? 'ACCOUNT CREATED' : 'NOT CREATED — CONNECT TO SUPABASE'}
              tone={created ? 'ok' : 'danger'}
            />
            <div className="terminal-footer">
              {created && (
                <button type="button" className="btn btn-primary btn-sm" onClick={onGoDashboard}>
                  View user in Dashboard
                </button>
              )}
              <span className="terminal-note">
                salt in sync: {AUTH_SALT}
              </span>
            </div>
          </div>
        </section>
      )}
    </>
  )
}

export default App