import { useState, useCallback, useRef } from 'react'

const DEFAULT_URL = 'https://ojzztzwhbkqwvehgdzev.supabase.co'
const STORAGE_URL = 'kuro.supabase.url'
const STORAGE_KEY = 'kuro.supabase.key'
const EXPIRY_COLUMN = 'expires_at'

const getStored = (k) => {
  try {
    return localStorage.getItem(k) || ''
  } catch {
    return ''
  }
}

export const MIGRATION_SQL = `-- Run once in the Supabase SQL editor
ALTER TABLE koen_users ADD COLUMN IF NOT EXISTS ${EXPIRY_COLUMN} timestamptz;
CREATE INDEX IF NOT EXISTS koen_users_expires_at_idx ON koen_users (${EXPIRY_COLUMN});`

export function useSupabase() {
  const [url, setUrl] = useState(() => getStored(STORAGE_URL) || DEFAULT_URL)
  const [key, setKey] = useState(() => getStored(STORAGE_KEY))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expirySupported, setExpirySupported] = useState(false)
  const urlRef = useRef(url)
  const keyRef = useRef(key)

  const saveSettings = (nextUrl, nextKey) => {
    setUrl(nextUrl)
    setKey(nextKey)
    urlRef.current = nextUrl
    keyRef.current = nextKey
    try {
      localStorage.setItem(STORAGE_URL, nextUrl)
      localStorage.setItem(STORAGE_KEY, nextKey)
    } catch {
      // ignore
    }
  }

  const request = useCallback(async (path, options = {}) => {
    const base = urlRef.current
    const apiKey = keyRef.current
    if (!base || !apiKey) throw new Error('Set the Supabase URL and key first')
    const res = await fetch(`${base.replace(/\/$/, '')}/rest/v1${path}`, {
      ...options,
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    if (!res.ok) {
      let msg = `HTTP ${res.status}`
      try {
        const body = await res.json()
        msg = body.message || body.msg || msg
      } catch {
        // keep default
      }
      const err = new Error(msg)
      err.status = res.status
      throw err
    }
    if (res.status === 204) return null
    return res.json()
  }, [])

  const checkExpiry = useCallback(async () => {
    try {
      await request(`/koen_users?select=${EXPIRY_COLUMN}&limit=1`)
      setExpirySupported(true)
      return true
    } catch {
      setExpirySupported(false)
      return false
    }
  }, [request])

  const listUsers = useCallback(
    async (search = '') => {
      setLoading(true)
      setError('')
      try {
        const cols = `id,username,password_hash,hwid,created_at,last_login_at,${EXPIRY_COLUMN}`
        let path =
          `/koen_users?select=${encodeURIComponent(cols)}&order=created_at.desc`
        if (search.trim()) {
          path += `&username=ilike.${encodeURIComponent(`%${search.trim()}%`)}`
        }
        try {
          const users = await request(path)
          setExpirySupported(true)
          return users || []
        } catch (err) {
          if (err.message.includes(EXPIRY_COLUMN)) {
            setExpirySupported(false)
            const cols2 =
              'id,username,password_hash,hwid,created_at,last_login_at'
            let path2 = `/koen_users?select=${encodeURIComponent(cols2)}&order=created_at.desc`
            if (search.trim()) {
              path2 += `&username=ilike.${encodeURIComponent(`%${search.trim()}%`)}`
            }
            const users = await request(path2)
            return users || []
          }
          throw err
        }
      } catch (err) {
        setError(err.message)
        return []
      } finally {
        setLoading(false)
      }
    },
    [request],
  )

  const createUser = useCallback(
    async ({ username, passwordHash, expiresAt }) => {
      setLoading(true)
      setError('')
      try {
        const body = { username, password_hash: passwordHash }
        if (expiresAt && expirySupported) body[EXPIRY_COLUMN] = expiresAt
        const rows = await request('/koen_users', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(body),
        })
        return rows?.[0] || null
      } catch (err) {
        setError(err.message)
        return null
      } finally {
        setLoading(false)
      }
    },
    [request, expirySupported],
  )

  const deleteUser = useCallback(
    async (id) => {
      setLoading(true)
      setError('')
      try {
        await request(`/koen_users?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Prefer: 'return=representation' },
        })
        return true
      } catch (err) {
        setError(err.message)
        return false
      } finally {
        setLoading(false)
      }
    },
    [request],
  )

  return {
    url,
    key,
    loading,
    error,
    expirySupported,
    saveSettings,
    setError,
    checkExpiry,
    listUsers,
    createUser,
    deleteUser,
  }
}