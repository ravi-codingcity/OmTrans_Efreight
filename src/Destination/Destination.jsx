import React, { useState, useEffect, useCallback } from 'react'
import POD_lines from './POD_lines.jsx'
import POD_Management from './POD_Management.jsx'

const API_BASE_URL = 'https://papayawhip-antelope-424743.hostingersite.com/api'

const isAdminUser = (currentUser) => {
  if (!currentUser) return false
  const role = String(currentUser.role || '').toLowerCase().trim()
  if (role === 'admin' || role === 'super admin' || role === 'superadmin') {
    return true
  }
  const name = String(
    currentUser.fullName || currentUser.username || ''
  ).toLowerCase()
  const adminNames = ['ravi', 'harmeet', 'vikram']
  return adminNames.some((a) => name.includes(a))
}

// Strict role-only check — does NOT include name-based whitelist
const isRoleBasedAdmin = (currentUser) => {
  if (!currentUser) return false
  const role = String(currentUser.role || '').toLowerCase().trim()
  return role === 'admin' || role === 'super admin' || role === 'superadmin'
}

function Destination({ currentUser, onBack }) {
  const [view, setView] = useState('lines') // 'lines' | 'management'
  const [destinations, setDestinations] = useState([])
  const [freightRates, setFreightRates] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const admin = isAdminUser(currentUser)
  const roleAdmin = isRoleBasedAdmin(currentUser)

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [destRes, rateRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/destinations`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/rate-filings`, { headers: getAuthHeaders() }),
      ])

      if (destRes.status === 'fulfilled' && destRes.value.ok) {
        const j = await destRes.value.json().catch(() => ({}))
        const data = j?.data ?? j
        setDestinations(Array.isArray(data) ? data : [])
      } else {
        setDestinations([])
      }

      if (rateRes.status === 'fulfilled' && rateRes.value.ok) {
        const j = await rateRes.value.json().catch(() => ({}))
        const data = j?.data ?? j
        setFreightRates(Array.isArray(data) ? data : [])
      } else {
        setFreightRates([])
      }
    } catch (err) {
      console.error('[Destination] Failed to load data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSyncFromRates = useCallback(
    async (podName) => {
      if (!podName) return null
      const res = await fetch(
        `${API_BASE_URL}/destinations/sync-from-rates`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ destinationName: podName }),
        }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || `Sync failed (HTTP ${res.status})`)
      }
      await loadData()
      return json?.data || null
    },
    [loadData]
  )

  // If user lost admin privileges while on management view, kick back
  useEffect(() => {
    if (view === 'management' && !admin) setView('lines')
  }, [view, admin])

  if (view === 'management' && admin) {
    return (
      <POD_Management
        onBack={() => setView('lines')}
        onDataChanged={loadData}
      />
    )
  }

  return (
    <POD_lines
      destinations={destinations}
      freightRates={freightRates}
      isLoading={isLoading}
      onRefresh={loadData}
      onOpenManagement={admin ? () => setView('management') : undefined}
      onSyncFromRates={admin ? handleSyncFromRates : undefined}
      isAdmin={admin}
      isRoleAdmin={roleAdmin}
    />
  )
}

export default Destination
