import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Save,
  ArrowLeft,
  Trash2,
  Ship,
  Shield,
  MapPin,
  Eye,
  Search,
  RefreshCw,
  Check,
  Plus,
  Globe,
  AlertCircle,
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  SkipForward,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { getShippingLinesForPOD, isValidShippingLine } from './ShippingLines_for_POD.js'

const API_BASE_URL = 'https://papayawhip-antelope-424743.hostingersite.com/api'

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const handleResponse = async (response, action) => {
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`${action} failed: ${response.status} ${text}`)
  }
  const result = await response.json().catch(() => ({}))
  return result?.data ?? result
}

const apiFetchDestinations = async () => {
  const r = await fetch(`${API_BASE_URL}/destinations`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })
  const data = await handleResponse(r, 'Fetch destinations')
  return Array.isArray(data) ? data : []
}

const apiCreateDestination = async (destinationName, shippingLines = []) => {
  const r = await fetch(`${API_BASE_URL}/destinations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ destinationName, shippingLines }),
  })
  return handleResponse(r, 'Create destination')
}

const apiUpdateDestination = async (id, body) => {
  const r = await fetch(`${API_BASE_URL}/destinations/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse(r, 'Update destination')
}

const apiDeleteDestination = async (id) => {
  const r = await fetch(`${API_BASE_URL}/destinations/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  return handleResponse(r, 'Delete destination')
}

const apiAddShippingLine = async (id, lineName) => {
  const r = await fetch(`${API_BASE_URL}/destinations/${id}/shipping-lines`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ lineName }),
  })
  return handleResponse(r, 'Add shipping line')
}

const apiRemoveShippingLine = async (destId, lineId) => {
  const r = await fetch(
    `${API_BASE_URL}/destinations/${destId}/shipping-lines/${lineId}`,
    { method: 'DELETE', headers: getAuthHeaders() }
  )
  return handleResponse(r, 'Remove shipping line')
}

function POD_Management({ onBack, onDataChanged }) {
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [notification, setNotification] = useState({ show: false, message: '', type: '' })

  // ── Excel upload state ───────────────────────────────────────────────
  const fileInputRef = useRef(null)
  const [xlsxFile, setXlsxFile] = useState(null)       // selected File object
  const [xlsxPreview, setXlsxPreview] = useState([])   // first 5 rows for preview
  const [xlsxRowCount, setXlsxRowCount] = useState(0)  // total data rows
  const [xlsxError, setXlsxError] = useState('')
  const [xlsxUploading, setXlsxUploading] = useState(false)
  const [xlsxResult, setXlsxResult] = useState(null)   // upload result summary

  const [podInput, setPodInput] = useState('')
  const [shippingLineInput, setShippingLineInput] = useState('')
  const [showPodSuggestions, setShowPodSuggestions] = useState(false)
  const [showShippingLineSuggestions, setShowShippingLineSuggestions] = useState(false)

  const [destinationsData, setDestinationsData] = useState([])
  const [expandedDestId, setExpandedDestId] = useState(null)
  const [editingDestId, setEditingDestId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const allShippingLines = useMemo(() => getShippingLinesForPOD(), [])

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3500)
  }

  const refreshDestinations = async () => {
    try {
      const list = await apiFetchDestinations()
      setDestinationsData(list)
      onDataChanged && onDataChanged()
      return list
    } catch (e) {
      console.error(e)
      showNotification('Failed to load destinations', 'error')
      return []
    }
  }

  useEffect(() => {
    refreshDestinations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const existingPodNames = useMemo(
    () => destinationsData.map((d) => d.destinationName),
    [destinationsData]
  )

  const filteredPodSuggestions = useMemo(() => {
    const term = podInput.trim().toLowerCase()
    if (!term) return []
    return existingPodNames
      .filter(
        (n) => n.toLowerCase().includes(term) && n.toLowerCase() !== term
      )
      .slice(0, 8)
  }, [podInput, existingPodNames])

  const filteredShippingLineSuggestions = useMemo(() => {
    const term = shippingLineInput.trim().toLowerCase()
    if (!term) return []
    return allShippingLines
      .filter(
        (l) => l.toLowerCase().includes(term) && l.toLowerCase() !== term
      )
      .slice(0, 10)
  }, [shippingLineInput, allShippingLines])

  // Currently typed POD's existing shipping lines
  const currentDestination = useMemo(() => {
    const term = podInput.trim().toLowerCase()
    if (!term) return null
    return (
      destinationsData.find(
        (d) => d.destinationName.toLowerCase() === term
      ) || null
    )
  }, [podInput, destinationsData])

  const currentDestinationId = currentDestination?._id || null
  const currentLines = useMemo(
    () =>
      currentDestination?.shippingLines?.map((l) => ({
        id: l._id,
        name: l.lineName,
        isActive: l.isActive !== false,
      })) || [],
    [currentDestination]
  )

  // Click outside
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.pod-search-container')) setShowPodSuggestions(false)
      if (!e.target.closest('.shipping-line-search-container'))
        setShowShippingLineSuggestions(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    setShowPodSuggestions(podInput.length > 0 && filteredPodSuggestions.length > 0)
  }, [podInput, filteredPodSuggestions])

  useEffect(() => {
    setShowShippingLineSuggestions(
      shippingLineInput.length > 0 && filteredShippingLineSuggestions.length > 0
    )
  }, [shippingLineInput, filteredShippingLineSuggestions])

  // ── Excel helpers ────────────────────────────────────────────────────
  const parseExcelFile = (file) => {
    setXlsxError('')
    setXlsxResult(null)
    setXlsxPreview([])
    setXlsxRowCount(0)

    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setXlsxError('Only .xlsx, .xls, or .csv files are supported.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        if (raw.length < 2) {
          setXlsxError('File appears empty or has no data rows.')
          return
        }

        // Detect header row vs data-only: if row[0][0] looks like a header skip it
        const firstCell = String(raw[0][0] || '').toLowerCase().trim()
        const isHeader = ['shipping line', 'shippingline', 'line', 'carrier', 'shipping_line'].includes(firstCell)
        const dataRows = isHeader ? raw.slice(1) : raw

        const valid = dataRows.filter(
          (r) => String(r[0] || '').trim() && String(r[1] || '').trim()
        )
        if (valid.length === 0) {
          setXlsxError(
            'No valid rows found. Column A = Shipping Line, Column B = Destination.'
          )
          return
        }

        setXlsxRowCount(valid.length)
        setXlsxPreview(valid.slice(0, 5))
      } catch (err) {
        setXlsxError('Failed to read file: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setXlsxFile(file)
    parseExcelFile(file)
  }

  const handleExcelUpload = async () => {
    if (!xlsxFile || xlsxRowCount === 0) return
    setXlsxUploading(true)
    setXlsxError('')
    setXlsxResult(null)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
          const firstCell = String(raw[0]?.[0] || '').toLowerCase().trim()
          const isHeader = ['shipping line', 'shippingline', 'line', 'carrier', 'shipping_line'].includes(firstCell)
          const dataRows = isHeader ? raw.slice(1) : raw

          const rows = dataRows
            .filter((r) => String(r[0] || '').trim() && String(r[1] || '').trim())
            .map((r) => ({
              shippingLine: String(r[0]).trim(),
              destination: String(r[1]).trim(),
            }))

          const token = localStorage.getItem('authToken')
          const resp = await fetch(
            `${API_BASE_URL}/destinations/bulk-upload`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ rows }),
            }
          )
          const json = await resp.json().catch(() => ({}))
          if (!resp.ok) throw new Error(json.message || `Server error ${resp.status}`)

          setXlsxResult(json.data)
          await refreshDestinations()
          showNotification(json.message || 'Upload complete', 'success')
        } catch (err) {
          setXlsxError(err.message || 'Upload failed')
          showNotification(err.message || 'Upload failed', 'error')
        } finally {
          setXlsxUploading(false)
        }
      }
      reader.readAsArrayBuffer(xlsxFile)
    } catch (err) {
      setXlsxError(err.message)
      setXlsxUploading(false)
    }
  }

  const handleClearExcel = () => {
    setXlsxFile(null)
    setXlsxPreview([])
    setXlsxRowCount(0)
    setXlsxError('')
    setXlsxResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  // ── End Excel helpers ─────────────────────────────────────────────────

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setPodInput('')
    setShippingLineInput('')
    await refreshDestinations()
    setIsRefreshing(false)
    showNotification('Data refreshed', 'success')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const podName = podInput.trim()
    const lineName = shippingLineInput.trim()

    if (!podName) return showNotification('Please enter a POD destination', 'error')
    if (!lineName) return showNotification('Please enter a shipping line', 'error')
    if (!isValidShippingLine(lineName))
      return showNotification('Please pick a valid shipping line from the list', 'error')

    if (
      currentLines.some(
        (l) => l.name.toLowerCase() === lineName.toLowerCase()
      )
    ) {
      return showNotification('Shipping line already exists for this POD', 'error')
    }

    setIsLoading(true)
    try {
      let destId = currentDestinationId
      if (!destId) {
        const created = await apiCreateDestination(podName, [lineName])
        destId = created?._id || created?.id
        if (!destId) throw new Error('Destination ID missing in response')
        showNotification(`Created POD "${podName}" with "${lineName}"`)
      } else {
        await apiAddShippingLine(destId, lineName)
        showNotification(`Added "${lineName}" to "${podName}"`)
      }
      await refreshDestinations()
      setShippingLineInput('')
    } catch (err) {
      console.error(err)
      showNotification(err.message || 'Failed to save', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveLine = async (destId, lineId, lineName) => {
    if (!window.confirm(`Remove "${lineName}" from this POD?`)) return
    setIsLoading(true)
    try {
      await apiRemoveShippingLine(destId, lineId)
      await refreshDestinations()
      showNotification(`Removed "${lineName}"`)
    } catch (err) {
      console.error(err)
      showNotification(err.message || 'Failed to remove', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteDestination = async (destId, name) => {
    if (
      !window.confirm(
        `Delete destination "${name}" and ALL its shipping lines? This cannot be undone.`
      )
    )
      return
    setIsLoading(true)
    try {
      await apiDeleteDestination(destId)
      await refreshDestinations()
      showNotification(`Deleted "${name}"`)
    } catch (err) {
      console.error(err)
      showNotification(err.message || 'Failed to delete', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartRename = (dest) => {
    setEditingDestId(dest._id)
    setEditingName(dest.destinationName)
  }

  const handleSaveRename = async (destId) => {
    const newName = editingName.trim()
    if (!newName) return showNotification('Name cannot be empty', 'error')
    setIsLoading(true)
    try {
      await apiUpdateDestination(destId, { destinationName: newName })
      await refreshDestinations()
      setEditingDestId(null)
      setEditingName('')
      showNotification('Destination renamed')
    } catch (err) {
      console.error(err)
      showNotification(err.message || 'Failed to rename', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const sortedDestinations = useMemo(
    () =>
      [...destinationsData].sort((a, b) =>
        a.destinationName.localeCompare(b.destinationName)
      ),
    [destinationsData]
  )

  const [destSearch, setDestSearch] = useState('')

  const filteredDestinations = useMemo(() => {
    const term = destSearch.trim().toLowerCase()
    if (!term) return sortedDestinations
    return sortedDestinations.filter((d) =>
      d.destinationName.toLowerCase().includes(term)
    )
  }, [destSearch, sortedDestinations])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {notification.show && (
        <div
          className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-lg shadow-lg flex items-center text-sm ${
            notification.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {notification.type === 'success' ? (
            <Check className="mr-2" size={16} />
          ) : (
            <AlertCircle className="mr-2" size={16} />
          )}
          {notification.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            {onBack && (
              <button
                onClick={onBack}
                className="mr-4 p-2.5 rounded-lg bg-white shadow-md hover:shadow-lg hover:bg-gray-50 transition"
                title="Back to POD Lines"
              >
                <ArrowLeft className="text-gray-600" size={18} />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">POD Data Management</h1>
              <p className="text-gray-600 text-sm mt-1">
                Manage destinations and their shipping lines
              </p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md px-3 py-2 border border-gray-200">
            <div className="flex items-center text-sm">
              <Shield className="text-purple-600 mr-2" size={16} />
              <span className="text-gray-700">Admin mode</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Form */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center">
                  <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg p-2.5 mr-3">
                    <Ship className="text-indigo-600" size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Add POD &amp; Shipping Line
                    </h2>
                    <p className="text-xs text-gray-600">
                      Create a new POD or add a line to an existing one
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center px-3 py-2 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50 text-xs"
                >
                  <RefreshCw
                    className={`mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`}
                    size={14}
                  />
                  Refresh
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* POD input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <MapPin className="inline mr-1 text-purple-600" size={14} />
                    POD Destination <span className="text-red-500">*</span>
                  </label>
                  <div className="relative pod-search-container">
                    <input
                      type="text"
                      value={podInput}
                      onChange={(e) => setPodInput(e.target.value)}
                      placeholder="Type POD destination name..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      required
                    />
                    {showPodSuggestions && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredPodSuggestions.map((p, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setPodInput(p)
                              setShowPodSuggestions(false)
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-purple-50 transition border-b border-gray-100 last:border-b-0 flex items-center"
                          >
                            <MapPin
                              className="text-purple-600 mr-2 flex-shrink-0"
                              size={14}
                            />
                            <span className="text-sm text-gray-900">{p}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {podInput.trim()
                      ? existingPodNames.some(
                          (n) => n.toLowerCase() === podInput.trim().toLowerCase()
                        )
                        ? '✓ Existing destination'
                        : '⚡ New destination will be created'
                      : 'Start typing to see suggestions'}
                  </p>
                </div>

                {/* Shipping line input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Ship className="inline mr-1 text-indigo-600" size={14} />
                    Shipping Line <span className="text-red-500">*</span>
                  </label>
                  <div className="relative shipping-line-search-container">
                    <input
                      type="text"
                      value={shippingLineInput}
                      onChange={(e) => setShippingLineInput(e.target.value)}
                      onFocus={() =>
                        setShowShippingLineSuggestions(
                          shippingLineInput.length > 0 &&
                            filteredShippingLineSuggestions.length > 0
                        )
                      }
                      placeholder="Type shipping line name..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      required
                    />
                    {showShippingLineSuggestions &&
                      filteredShippingLineSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredShippingLineSuggestions.map((l, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setShippingLineInput(l)
                                setShowShippingLineSuggestions(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-indigo-50 transition border-b border-gray-100 last:border-b-0 flex items-center"
                            >
                              <Ship
                                className="text-indigo-600 mr-2 flex-shrink-0"
                                size={14}
                              />
                              <span className="text-sm text-gray-900">{l}</span>
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {shippingLineInput
                      ? isValidShippingLine(shippingLineInput)
                        ? '✓ Valid shipping line'
                        : '⚠️ Pick from the suggestion list'
                      : `${allShippingLines.length} shipping lines available`}
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={
                      isLoading || !podInput.trim() || !shippingLineInput.trim()
                    }
                    className="flex items-center px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition shadow-md text-sm font-medium"
                  >
                    {isLoading ? (
                      <RefreshCw className="animate-spin mr-2" size={14} />
                    ) : (
                      <Save className="mr-2" size={14} />
                    )}
                    {isLoading ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Lines for current POD */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg p-2.5 mr-3">
                  <Eye className="text-blue-600" size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Shipping Lines
                  </h2>
                  <p className="text-xs text-gray-600">Auto-updates as you type</p>
                </div>
              </div>
              {podInput.trim() ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900 truncate pr-2">
                      Lines for {podInput.trim()}
                    </h3>
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0">
                      {currentLines.length}
                    </span>
                  </div>
                  {currentLines.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">
                      No shipping lines yet for this POD.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                      {currentLines.map((l) => (
                        <li
                          key={l.id}
                          className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded text-sm hover:bg-red-50 group"
                        >
                          <span className="text-gray-800 truncate pr-2">
                            {l.name}
                          </span>
                          <button
                            onClick={() =>
                              handleRemoveLine(currentDestinationId, l.id, l.name)
                            }
                            disabled={!currentDestinationId || isLoading}
                            className="p-1 text-red-500 hover:bg-red-100 rounded disabled:opacity-50 flex-shrink-0"
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">
                  Type a POD name to view its shipping lines.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Excel Upload Panel ───────────────────────────────────── */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg p-2.5 mr-3">
                <FileSpreadsheet className="text-emerald-600" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Upload Excel</h2>
                <p className="text-xs text-gray-500">
                  Column A: Shipping Line &nbsp;|&nbsp; Column B: Destination
                </p>
              </div>
            </div>
          </div>

          {/* Drop / select area */}
          {!xlsxFile ? (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-emerald-300 rounded-xl cursor-pointer bg-emerald-50 hover:bg-emerald-100 transition">
              <Upload className="text-emerald-400 mb-2" size={28} />
              <p className="text-sm font-medium text-emerald-700">Click to choose Excel / CSV file</p>
              <p className="text-xs text-gray-500 mt-1">.xlsx&nbsp;·&nbsp;.xls&nbsp;·&nbsp;.csv</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          ) : (
            <div className="space-y-4">
              {/* File info bar */}
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="text-emerald-600" size={18} />
                  <span className="text-sm font-medium text-gray-800 truncate max-w-xs">{xlsxFile.name}</span>
                  {xlsxRowCount > 0 && (
                    <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {xlsxRowCount.toLocaleString()} rows
                    </span>
                  )}
                </div>
                <button
                  onClick={handleClearExcel}
                  className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded transition"
                  title="Remove file"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Error */}
              {xlsxError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-4 py-3">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{xlsxError}</span>
                </div>
              )}

              {/* Preview table */}
              {xlsxPreview.length > 0 && !xlsxResult && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">
                    Preview (first {xlsxPreview.length} of {xlsxRowCount} rows)
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">#</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">Shipping Line</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">Destination</th>
                        </tr>
                      </thead>
                      <tbody>
                        {xlsxPreview.map((row, i) => (
                          <tr key={i} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                            <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                            <td className="px-3 py-1.5 text-gray-800 font-medium">{String(row[0] || '')}</td>
                            <td className="px-3 py-1.5 text-gray-800">{String(row[1] || '')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {xlsxRowCount > 5 && (
                    <p className="text-xs text-gray-400 mt-1">… and {xlsxRowCount - 5} more rows</p>
                  )}
                </div>
              )}

              {/* Result summary */}
              {xlsxResult && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 flex items-center gap-2">
                    <CheckCircle2 className="text-white" size={18} />
                    <span className="text-white font-semibold text-sm">Upload Complete</span>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-gray-100">
                    <div className="px-4 py-3 text-center">
                      <div className="text-2xl font-bold text-gray-800">{xlsxResult.total.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Total Processed</div>
                    </div>
                    <div className="px-4 py-3 text-center">
                      <div className="text-2xl font-bold text-emerald-600">{xlsxResult.added.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 mt-0.5">New Records Added</div>
                    </div>
                    <div className="px-4 py-3 text-center">
                      <div className="text-2xl font-bold text-amber-500">{xlsxResult.skipped.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Duplicates Skipped</div>
                    </div>
                  </div>
                  {/* Per-destination breakdown */}
                  {xlsxResult.details?.length > 0 && (
                    <div className="border-t border-gray-100 max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left text-gray-600 font-semibold">Destination</th>
                            <th className="px-3 py-2 text-center text-emerald-600 font-semibold">Added</th>
                            <th className="px-3 py-2 text-center text-amber-500 font-semibold">Skipped</th>
                            <th className="px-3 py-2 text-center text-gray-500 font-semibold">New?</th>
                          </tr>
                        </thead>
                        <tbody>
                          {xlsxResult.details.map((d, i) => (
                            <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-3 py-1.5 text-gray-800 font-medium">{d.destination}</td>
                              <td className="px-3 py-1.5 text-center">
                                <span className="text-emerald-600 font-semibold">{d.added}</span>
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                <span className="text-amber-500 font-semibold">{d.skipped}</span>
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                {d.isNew ? (
                                  <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">NEW</span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="px-4 py-3 border-t border-gray-100">
                    <button
                      onClick={handleClearExcel}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Upload another file
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {!xlsxResult && xlsxRowCount > 0 && !xlsxError && (
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleClearExcel}
                    className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExcelUpload}
                    disabled={xlsxUploading}
                    className="flex items-center px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 transition shadow-md text-sm font-medium"
                  >
                    {xlsxUploading ? (
                      <RefreshCw className="animate-spin mr-2" size={14} />
                    ) : (
                      <Upload className="mr-2" size={14} />
                    )}
                    {xlsxUploading ? `Uploading…` : `Upload ${xlsxRowCount.toLocaleString()} Rows`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* All destinations */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Globe className="text-purple-600 mr-2" size={18} />
              <h2 className="text-lg font-semibold text-gray-900">
                All Destinations ({filteredDestinations.length}{destSearch.trim() ? ` of ${sortedDestinations.length}` : ''})
              </h2>
            </div>
            {/* Search bar */}
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={destSearch}
                onChange={(e) => setDestSearch(e.target.value)}
                placeholder="Search destinations…"
                className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none"
              />
              {destSearch && (
                <button
                  onClick={() => setDestSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
          {sortedDestinations.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No destinations yet. Add one above.
            </div>
          ) : filteredDestinations.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No destinations match &ldquo;{destSearch}&rdquo;.
            </div>
          ) : (
            <div className="space-y-2 max-h-[28rem] overflow-y-auto">
              {filteredDestinations.map((dest) => {
                const isExpanded = expandedDestId === dest._id
                const isEditing = editingDestId === dest._id
                return (
                  <div
                    key={dest._id}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100">
                      <button
                        onClick={() =>
                          setExpandedDestId(isExpanded ? null : dest._id)
                        }
                        className="flex-1 flex items-center text-left"
                      >
                        <MapPin className="text-purple-600 mr-2" size={14} />
                        {isEditing ? (
                          <input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-1 border border-gray-300 rounded text-sm w-full max-w-xs"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-900">
                            {dest.destinationName}
                          </span>
                        )}
                        <span className="ml-3 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                          {dest.shippingLines?.length || 0}
                        </span>
                      </button>
                      <div className="flex items-center gap-1 ml-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveRename(dest._id)}
                              className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                              title="Save"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingDestId(null)
                                setEditingName('')
                              }}
                              className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartRename(dest)}
                              className="px-2 py-1 text-xs text-purple-600 hover:bg-purple-100 rounded"
                              title="Rename"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteDestination(
                                  dest._id,
                                  dest.destinationName
                                )
                              }
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                              title="Delete destination"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-4 py-3 bg-white border-t border-gray-200">
                        {(dest.shippingLines || []).length === 0 ? (
                          <p className="text-xs text-gray-500 italic">
                            No shipping lines for this destination.
                          </p>
                        ) : (
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {dest.shippingLines.map((l) => (
                              <li
                                key={l._id}
                                className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded text-sm group"
                              >
                                <span className="text-gray-800 truncate pr-2">
                                  {l.lineName}
                                </span>
                                <button
                                  onClick={() =>
                                    handleRemoveLine(
                                      dest._id,
                                      l._id,
                                      l.lineName
                                    )
                                  }
                                  className="p-1 text-red-500 hover:bg-red-100 rounded flex-shrink-0"
                                  title="Remove"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default POD_Management
