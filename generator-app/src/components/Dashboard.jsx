import { useEffect, useMemo, useState } from 'react'
import { MIGRATION_SQL, useSupabase } from '../lib/supabase'

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
  else if (diff === 0) label = `expires today`
  else label = `in ${diff}d`
  return { diff, label, expired: diff < 0 }
}

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
      <form className="connect" onSubmit={onConnect}>
        <h2>Supabase Connection</h2>
        <div className="row">
          <label>
            <span>URL</span>
            <input
              type="text"
              value={urlInput}
              placeholder="https://<ref>.supabase.co"
              onChange={(e) => setUrlInput(e.target.value)}
            />
          </label>
          <label>
            <span>Key</span>
            <input
              type="password"
              value={keyInput}
              placeholder="service role / anon key"
              onChange={(e) => setKeyInput(e.target.value)}
            />
          </label>
          <button type="submit" className="primary">
            Connect
          </button>
        </div>
        <p className="hint">
          Stored only in your browser (localStorage). Never commit the key to
          the repo.
        </p>
      </form>

      {configured && !expirySupported && !loading && (
        <div className="setup">
          <strong>One-time setup needed</strong>
          <p>
            The <code>expires_at</code> column doesn&apos;t exist yet. Run this
            SQL in the Supabase SQL editor to enable expiry dates:
          </p>
          <pre>{MIGRATION_SQL}</pre>
          <button type="button" className="secondary" onClick={copySql}>
            {sqlCopied ? 'Copied!' : 'Copy SQL'}
          </button>
          <button type="button" className="ghost-btn" onClick={() => refresh()}>
            Recheck
          </button>
        </div>
      )}

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
          <button type="button" className="secondary" onClick={() => refresh()}>
            Refresh
          </button>
          <span className="hint">
            {stats.total} users · {stats.locked} HWID-locked · {stats.unlocked}{' '}
            unlocked
            {stats.expired > 0 && ` · ${stats.expired} expired`}
          </span>
        </div>
      )}

      {error && <p className="banner error">{error}</p>}
      {actionMsg && <p className="banner ok">{actionMsg}</p>}

      {configured && (
        <>
          <div className="hash-toggle">
            <label>
              <input
                type="checkbox"
                checked={showHashes}
                onChange={(e) => setShowHashes(e.target.checked)}
              />
              Reveal password hashes
            </label>
          </div>

          {loading && <p className="hint">Loading…</p>}

          {!loading && loaded && users.length === 0 && (
            <p className="empty">No users found.</p>
          )}

          {!loading && users.length > 0 && (
            <div className="table-wrap">
              <table className="users">
                <thead>
                  <tr>
                    <th>Username</th>
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
                        <td className="strong">{u.username}</td>
                        <td className={u.hwid ? 'hwid' : 'muted'}>
                          {u.hwid || 'unset'}
                        </td>
                        <td>
                          {!expirySupported ? (
                            <span className="muted">—</span>
                          ) : exp ? (
                            <span
                              className={`expiry ${exp.expired ? 'expired-badge' : ''}`}
                              title={formatDate(u.expires_at)}
                            >
                              {exp.expired ? 'EXPIRED' : formatDate(u.expires_at)}
                              {' · '}
                              {exp.label}
                            </span>
                          ) : (
                            <span className="muted">never</span>
                          )}
                        </td>
                        <td>{formatDate(u.created_at)}</td>
                        <td>{formatDate(u.last_login_at)}</td>
                        {showHashes && (
                          <td className="hash" title={u.password_hash}>
                            {shortHash(u.password_hash)}
                          </td>
                        )}
                        <td className="right">
                          {confirmId === u.id ? (
                            <span className="confirm">
                              <button
                                type="button"
                                className="danger"
                                onClick={() => onDelete(u.id)}
                              >
                                Confirm delete
                              </button>
                              <button
                                type="button"
                                className="ghost"
                                onClick={() => setConfirmId(null)}
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="danger ghost"
                              disabled={loading}
                              onClick={() => setConfirmId(u.id)}
                            >
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