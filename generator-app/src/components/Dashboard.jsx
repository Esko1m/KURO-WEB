import { useEffect, useMemo, useState } from 'react'
import { MIGRATION_SQL, useSupabase } from '../lib/supabase'

const IconRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-2.6-6.3" />
    <path d="M21 3v6h-6" />
  </svg>
)

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
  </svg>
)

const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
)

const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
)

const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const formatDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const shortHash = (hash) => (hash ? `${hash.slice(0, 8)}…${hash.slice(-8)}` : '—')

const expiryInfo = (iso) => {
  if (!iso) return null
  const diff = Math.ceil((new Date(iso) - new Date()) / 86400000)
  let label
  if (diff < 0) label = `expired ${Math.abs(diff)}d ago`
  else if (diff === 0) label = 'expires today'
  else label = `in ${diff}d`
  return { diff, label, expired: diff < 0 }
}

const initials = (name) => (name ? name.slice(0, 2) : '??')

function Dashboard() {
  const {
    url,
    key,
    loading,
    error,
    expirySupported,
    saveSettings,
    setError,
    checkExpiry,
    listUsers,
    deleteUser,
  } = useSupabase()
  const [urlInput, setUrlInput] = useState(url)
  const [keyInput, setKeyInput] = useState(key)
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [actionMsg, setActionMsg] = useState('')
  const [showHashes, setShowHashes] = useState(false)
  const [sqlCopied, setSqlCopied] = useState(false)

  const configured = Boolean(url && key)

  const refresh = async (term = search) => {
    const rows = await listUsers(term)
    setUsers(rows)
    setLoaded(true)
  }

  useEffect(() => {
    if (configured) {
      checkExpiry().then(() => refresh())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onConnect = (e) => {
    e.preventDefault()
    saveSettings(urlInput.trim(), keyInput.trim())
    setError('')
    checkExpiry().then(() => refresh(''))
  }

  const onDelete = async (id) => {
    const ok = await deleteUser(id)
    if (ok) {
      setUsers((rows) => rows.filter((u) => u.id !== id))
      setActionMsg('User deleted')
    } else {
      setActionMsg('Delete failed')
    }
    setConfirmId(null)
    setTimeout(() => setActionMsg(''), 3000)
  }

  const copySql = () => {
    navigator.clipboard.writeText(MIGRATION_SQL).then(() => {
      setSqlCopied(true)
      setTimeout(() => setSqlCopied(false), 2000)
    })
  }

  const stats = useMemo(() => {
    const locked = users.filter((u) => u.hwid).length
    const expired = users.filter((u) => {
      const info = expiryInfo(u.expires_at)
      return info && info.expired
    }).length
    return {
      total: users.length,
      locked,
      unlocked: users.length - locked,
      expired,
    }
  }, [users])

  return (
    <section className="dashboard">
      <form className="connect-panel" onSubmit={onConnect}>
        <div className="panel-head">
          <div className="panel-icon">
            <IconUsers />
          </div>
          <div>
            <h1 className="panel-title">Supabase Connection</h1>
            <p className="panel-sub">
              Key is stored only in your browser (localStorage) — never commit
              it to the repo.
            </p>
          </div>
        </div>
        <div className="row">
          <div className="field-control">
            <span>URL</span>
            <input
              className="control"
              type="text"
              value={urlInput}
              placeholder="https://<ref>.supabase.co"
              onChange={(e) => setUrlInput(e.target.value)}
              spellCheck="false"
            />
          </div>
          <div className="field-control">
            <span>Key</span>
            <input
              className="control"
              type="password"
              value={keyInput}
              placeholder="service role / anon key"
              onChange={(e) => setKeyInput(e.target.value)}
              spellCheck="false"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            <IconRefresh />
            Connect
          </button>
        </div>
      </form>

      {configured && (
        <div className="stat-grid">
          <div className="stat">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Users</span>
          </div>
          <div className="stat stat-locked">
            <span className="stat-value">{stats.locked}</span>
            <span className="stat-label">HWID-locked</span>
          </div>
          <div className="stat">
            <span className="stat-value">{stats.unlocked}</span>
            <span className="stat-label">Unlocked</span>
          </div>
          <div className={`stat ${stats.expired > 0 ? 'stat-expired' : ''}`}>
            <span className="stat-value">{stats.expired}</span>
            <span className="stat-label">Expired</span>
          </div>
        </div>
      )}

      {configured && !expirySupported && !loading && (
        <div className="setup">
          <div className="setup-head">
            <IconClock />
            <strong>One-time setup needed</strong>
          </div>
          <p>
            The <code>expires_at</code> column doesn&apos;t exist yet. Run this
            SQL in the Supabase SQL editor to enable expiry dates:
          </p>
          <pre>{MIGRATION_SQL}</pre>
          <div className="setup-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={copySql}>
              {sqlCopied ? 'Copied to clipboard' : 'Copy SQL'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => refresh()}>
              Recheck
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="banner error">{error}</p>
      )}
      {actionMsg && <p className="banner ok">{actionMsg}</p>}

      {configured && (
        <div className="toolbar">
          <input
            type="search"
            className="search"
            placeholder="Search username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                refresh(search)
              }
            }}
          />
          <label className="toggle">
            <input
              type="checkbox"
              checked={showHashes}
              onChange={(e) => setShowHashes(e.target.checked)}
            />
            <IconEye />
            Hashes
          </label>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => refresh()}>
            <IconRefresh />
            Refresh
          </button>
        </div>
      )}

      {configured && (
        <>
          {loading && (
            <div className="loading">
              <span className="spinner" />
              Loading users…
            </div>
          )}

          {!loading && loaded && users.length === 0 && (
            <div className="empty">No users found.</div>
          )}

          {!loading && users.length > 0 && (
            <div className="table-wrap">
              <table className="users">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>HWID</th>
                    <th>Expires</th>
                    <th>Created</th>
                    <th>Last login</th>
                    {showHashes && <th>Password hash</th>}
                    <th className="right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const exp = expiryInfo(u.expires_at)
                    return (
                      <tr key={u.id} className={exp && exp.expired ? 'expired-row' : ''}>
                        <td>
                          <span className="username-cell">
                            <span className="username-avatar">{initials(u.username)}</span>
                            <span className="username-name">{u.username}</span>
                          </span>
                        </td>
                        <td>
                          {u.hwid ? (
                            <span className="pill pill-lock">
                              <IconLock />
                              Locked
                            </span>
                          ) : (
                            <span className="pill pill-muted">Unset</span>
                          )}
                        </td>
                        <td className="mono">
                          {!expirySupported ? (
                            <span className="pill pill-muted">—</span>
                          ) : exp ? (
                            <span
                              className={`pill ${exp.expired ? 'pill-danger' : 'pill-ok'}`}
                              title={formatDate(u.expires_at)}
                            >
                              <IconClock />
                              {exp.expired ? 'Expired' : `In ${exp.diff}d`}
                            </span>
                          ) : (
                            <span className="pill pill-muted">No expiry</span>
                          )}
                        </td>
                        <td className="mono">{formatDate(u.created_at)}</td>
                        <td className="mono">{formatDate(u.last_login_at)}</td>
                        {showHashes && (
                          <td className="mono" title={u.password_hash}>
                            {shortHash(u.password_hash)}
                          </td>
                        )}
                        <td className="right">
                          {confirmId === u.id ? (
                            <span className="confirm">
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => onDelete(u.id)}
                              >
                                <IconTrash />
                                Confirm
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setConfirmId(null)}
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              disabled={loading}
                              onClick={() => setConfirmId(u.id)}
                            >
                              <IconTrash />
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default Dashboard