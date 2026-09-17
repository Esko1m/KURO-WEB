import { useEffect, useState } from 'react'
import Dashboard from './components/Dashboard'
import { useSupabase } from './lib/supabase'
import './App.css'

const AUTH_SALT = 'koen-ios-2026-7'

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
  if (diff < 0) return `${base} (expired ${Math.abs(diff)}d ago)`
  if (diff === 0) return `${base} (expires today)`
  return `${base} (in ${diff}d)`
}

const Field = ({ label, value, muted, ok, danger, onCopy }) => (
  <div className="field">
    <span className="label">{label}</span>
    <code
      className={`value ${muted ? 'muted' : ''} ${ok ? 'ok' : ''} ${danger ? 'danger' : ''}`}
      onClick={() => onCopy && onCopy(value)}
      title={onCopy ? 'Click to copy' : undefined}
    >
      {value}
    </code>
    {onCopy && (
      <button className="copy" onClick={() => onCopy(value)}>
        copy
      </button>
    )}
  </div>
)

function App() {
  const [tab, setTab] = useState('generator')

  return (
    <div className="page">
      <nav className="tabs">
        <button
          type="button"
          className={`tab ${tab === 'generator' ? 'active' : ''}`}
          onClick={() => setTab('generator')}
        >
          Generator
        </button>
        <button
          type="button"
          className={`tab ${tab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setTab('dashboard')}
        >
          Dashboard
        </button>
      </nav>

      <main className="card">
        {tab === 'generator' ? (
          <Generator onGoDashboard={() => setTab('dashboard')} />
        ) : (
          <Dashboard />
        )}
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
      <header>
        <h1>Account Generator</h1>
        <p>
          Creates credentials the way <code>mkuser.mjs</code> does — password
          hashed at rest with SHA-256, salted with <code>{AUTH_SALT}</code>, and
          persisted to <code>koen_users</code>.
        </p>
      </header>

      {error && <p className="banner error">{error}</p>}

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          onCreate()
        }}
      >
        <label>
          <span>Username</span>
          <input
            type="text"
            value={username}
            placeholder="e.g. naomi42"
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            value={password}
            placeholder="randomly generated if left empty"
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <label className="length">
          <span>Length</span>
          <input
            type="range"
            min="8"
            max="32"
            value={passwordLength}
            onChange={(e) => setPasswordLength(Number(e.target.value))}
          />
          <output>{passwordLength}</output>
        </label>

        <div className="expiry">
          <span className="expiry-label">Expires</span>
          <select
            value={expiryMode}
            onChange={(e) => setExpiryMode(e.target.value)}
          >
            <option value="none">Never</option>
            <option value="days">In N days</option>
            <option value="custom">Custom date</option>
          </select>
          {expiryMode === 'days' && (
            <input
              type="number"
              min="1"
              max="365"
              value={expiryDays}
              onChange={(e) => setExpiryDays(Number(e.target.value))}
            />
          )}
          {expiryMode === 'custom' && (
            <input
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

        <div className="actions">
          <button type="button" className="secondary" onClick={onGenerateRandom}>
            Randomize
          </button>
          <button type="submit" className="primary" disabled={!isValid || loading}>
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
        <section className="result">
          <h2>$ node scripts/mkuser.mjs {result.username} **** --key &quot;…&quot;</h2>
          <Field
            label="username"
            value={result.username}
            onCopy={(v) => copy(v, 'username')}
          />
          <Field
            label="password"
            value={result.password}
            onCopy={(v) => copy(v, 'password')}
          />
          <Field
            label="password_hash (SHA-256 + salt)"
            value={result.passwordHash}
            onCopy={(v) => copy(v, 'hash')}
          />
          <Field
            label="expires_at"
            value={result.expiresAt ? formatExpiry(result.expiresAt) : 'never'}
          />
          <Field label="hwid" value="unset — locked on first login" muted />
          <Field
            label="result"
            value={created ? 'ACCOUNT CREATED' : 'NOT CREATED — CONNECT TO SUPABASE'}
            ok={created}
            danger={!created}
          />
          {copied && <p className="copied">copied {copied} to clipboard</p>}
          {created && (
            <button type="button" className="secondary" onClick={onGoDashboard}>
              View user in Dashboard →
            </button>
          )}
          <p className="note">Verify (no-op) salt in sync: {AUTH_SALT}</p>
        </section>
      )}
    </>
  )
}

export default App