import { useState } from 'react'
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

const Field = ({ label, value, monospace, onCopy }) => (
  <div className="field">
    <span className="label">{label}</span>
    <code className="value" onClick={() => onCopy(value)} title="Click to copy">
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
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordLength, setPasswordLength] = useState(16)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState('')

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

  const onCreate = async () => {
    const user = username || generateUsername()
    const pass = password || generatePassword(passwordLength)
    const hash = await sha256(pass + AUTH_SALT)
    setResult({ username: user, password: pass, passwordHash: hash })
  }

  const hasUser = username.trim().length >= 3
  const hasPass = password.trim().length === 0 || password.trim().length >= 6
  const isValid = hasUser && hasPass

  return (
    <div className="page">
      <main className="card">
        <header>
          <h1>Account Generator</h1>
          <p>
            Creates credentials the way <code>mkuser.mjs</code> does —
            password hashed at rest with SHA-256, salted with{' '}
            <code>{AUTH_SALT}</code>.
          </p>
        </header>

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

          <div className="actions">
            <button type="button" className="secondary" onClick={onGenerateRandom}>
              Randomize
            </button>
            <button type="submit" className="primary" disabled={!isValid}>
              Create Account
            </button>
          </div>
        </form>

        {!isValid && (
          <p className="hint">
            Username must be at least 3 characters and password at least 6
            characters long.
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
            <div className="field">
              <span className="label">hwid</span>
              <code className="value muted">unset — locked on first login</code>
            </div>
            <div className="field">
              <span className="label">result</span>
              <code className="value ok">ACCOUNT CREATED</code>
            </div>
            {copied && <p className="copied">copied {copied} to clipboard</p>}
            <p className="note">
              Verify (no-op) salt in sync: {AUTH_SALT}
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

export default App