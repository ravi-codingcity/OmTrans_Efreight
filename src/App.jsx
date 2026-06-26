import React, { useState, useEffect } from 'react'
import ImportExportQuotationForm, { prefetchSuggestionData } from './Quotation_Filing/ImportExportQuotationForm.jsx'
import Dashboard from './Dashboard/Dashboard.jsx'
import Login from './Login/Login.jsx'
import Signup from './Signup/Signup.jsx'
import ResetPassword from './ResetPassword/ResetPassword.jsx'
import Navbar from './components/Navbar.jsx'
import PreAdvice from './Pre_advice/PreAdvice.jsx'
import RateFiling from './Rate_Filing/RateFiling.jsx'
import QuotationFiling from './Quotation_Filing/QuotationFiling.jsx'
import AgentDatabase from './Agent_database/AgentDatabase.jsx'
import LoginInfo from './Login_Info/LoginInfo.jsx'
import Destination from './Destination/Destination.jsx'
import ImportModule from './Import/ImportModule.jsx'
import EmbeddedExportAI from './Export_AI/EmbeddedExportAI.jsx'
import './App.css'

// Users with the Import role are restricted to the Import module only.
const isImportRole = (user) =>
  (user?.role || '').toLowerCase().trim() === 'import'

// Users with the Export role are restricted to the Export AI module only.
const isExportRole = (user) =>
  (user?.role || '').toLowerCase().trim() === 'export'

// Convert any stored Rate Filing transit value (e.g. "5", "5 Days",
// "5 days (approx)") into the Quotation dropdown's exact option format
// ("5 days (approx)") so the controlled <select> auto-selects it.
const normalizeTransitTime = (raw) => {
  if (!raw && raw !== 0) return ''
  const m = String(raw).match(/\d+/)
  if (!m) return ''
  const n = parseInt(m[0], 10)
  if (!n || n < 1) return ''
  return `${n} ${n === 1 ? 'day (approx)' : 'days (approx)'}`
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [currentView, setCurrentView] = useState(() => sessionStorage.getItem('currentView') || 'dashboard') // 'dashboard', 'form', 'quotation', 'preadvice', 'ratefiling', 'agentdb', 'booking'
  const [draftQuotation, setDraftQuotation] = useState(null) // For editing draft quotations
  const [copyQuotation, setCopyQuotation] = useState(null) // For copying quotations
  const [compareQuotation, setCompareQuotation] = useState(null) // For Compare Rates → Pre-Advice
  const [dashboardKey, setDashboardKey] = useState(0) // Key to force Dashboard remount after form submission

  // Check if accessing secret signup page via URL hash
  const isSignupPage = window.location.hash === '#/admin-signup'
  const isResetPasswordPage = window.location.hash === '#/admin-reset-password'

  // Check if user is already logged in on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      setCurrentUser(user)
      setIsAuthenticated(true)
      // Import-role users are confined to the Import module.
      if (isImportRole(user)) {
        setCurrentView('import')
        sessionStorage.setItem('currentView', 'import')
      }
      // Export-role users are confined to the Export AI module.
      if (isExportRole(user)) {
        setCurrentView('exportai')
        sessionStorage.setItem('currentView', 'exportai')
      }
    }
  }, [])

  // Handle successful login
  const handleLoginSuccess = (user) => {
    setCurrentUser({
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      location: user.location,
    })
    setIsAuthenticated(true)

    // Import-role users land directly in (and are confined to) the Import module.
    if (isImportRole(user)) {
      setCurrentView('import')
      sessionStorage.setItem('currentView', 'import')
      return
    }

    // Export-role users land directly in (and are confined to) the Export AI module.
    if (isExportRole(user)) {
      setCurrentView('exportai')
      sessionStorage.setItem('currentView', 'exportai')
      return
    }

    // Prefetch suggestion data immediately after login for faster form loading
    prefetchSuggestionData()
  }

  // Handle logout
  const handleLogout = async () => {
    // Record logout time
    const recordId = localStorage.getItem('loginRecordId')
    if (recordId) {
      try {
        await fetch(`https://papayawhip-antelope-424743.hostingersite.com/api/login-info/${recordId}/logout`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        })
      } catch {
        // Silently ignore if logout tracking fails
      }
    }
    localStorage.removeItem('currentUser')
    localStorage.removeItem('loginRecordId')
    localStorage.removeItem('authToken')
    setCurrentUser(null)
    setIsAuthenticated(false)
    setCurrentView('dashboard')
    sessionStorage.removeItem('currentView')
  }

  // Handle navigation
  const handleNavigate = (view) => {
    // Route protection: Import-role users may only stay in the Import module.
    if (isImportRole(currentUser)) {
      setCurrentView('import')
      sessionStorage.setItem('currentView', 'import')
      return
    }
    // Route protection: Export-role users may only stay in the Export AI module.
    if (isExportRole(currentUser)) {
      setCurrentView('exportai')
      sessionStorage.setItem('currentView', 'exportai')
      return
    }
    // Prefetch suggestion data when navigating to form
    if (view === 'form') {
      prefetchSuggestionData()
    }
    // Clear draft/copy quotation when navigating away from form or to a fresh form
    if (view !== 'form') {
      setDraftQuotation(null)
      setCopyQuotation(null)
    }
    // If coming back to dashboard from form, increment key to force refresh
    if (view === 'dashboard' && currentView === 'form') {
      setDashboardKey(prev => prev + 1)
    }
    setCurrentView(view)
    sessionStorage.setItem('currentView', view)
  }

  const handleEditDraft = (quotation) => {
    setDraftQuotation(quotation)
    setCopyQuotation(null)
    prefetchSuggestionData()
    setCurrentView('form')
    sessionStorage.setItem('currentView', 'form')
  }

  // Handle copying a quotation from Dashboard
  const handleCopyQuotation = (quotation) => {
    setCopyQuotation(quotation)
    setDraftQuotation(null)
    prefetchSuggestionData()
    setCurrentView('form')
    sessionStorage.setItem('currentView', 'form')
  }

  // Handle Compare Rates from Quotation → navigates to Pre-Advice
  const handleCompareRates = (quotation) => {
    setCompareQuotation(quotation)
    setCurrentView('preadvice')
    sessionStorage.setItem('currentView', 'preadvice')
  }

  // Handle Create Quotation from Rate Filing
  const handleCreateQuotationFromRate = (rate) => {
    // Parse ocean freight string: "USD $100" → { currency, amount }
    const parseAmount = (raw) => {
      if (!raw || typeof raw !== 'string') return { currency: 'INR', amount: '' }
      const m = raw.match(/^(USD|INR|EUR|GBP|AED|JPY|AUD)\s*[^\d]*([\d,.]+)$/i)
      if (m) return { currency: m[1].toUpperCase(), amount: m[2] }
      if (/^[\d,.]+$/.test(raw.trim())) return { currency: 'INR', amount: raw.trim() }
      return { currency: 'INR', amount: raw }
    }

    // Parse ACD/ENS/AFR string: "ACD $50" → { type, currency, amount }
    const parseAcd = (raw) => {
      if (!raw || typeof raw !== 'string') return null
      const m = raw.match(/^(ACD|ENS|AFR)\s*(?:(USD|INR|EUR|GBP|AED|JPY|AUD)\s*)?[^\d]*([\d,.]+)$/i)
      if (m) {
        let currency = m[2] ? m[2].toUpperCase() : 'USD'
        if (!m[2] && raw.includes('₹')) currency = 'INR'
        return { type: m[1].toUpperCase(), currency, amount: m[3] }
      }
      return null
    }

    // Resolve container type list: prefer new multi-container array, fall back to legacy single
    const containerTypes = rate.container_types?.length > 0
      ? rate.container_types
      : (rate.container_type ? [rate.container_type] : [])
    const isMulti = containerTypes.length > 1

    // Parse per-container charge maps saved by AddRates
    let parsedContainerCharges = null
    if (rate.containerCharges) {
      try {
        parsedContainerCharges = typeof rate.containerCharges === 'string'
          ? JSON.parse(rate.containerCharges)
          : rate.containerCharges
      } catch {}
    }

    let parsedOriginChargeMap = null
    if (rate.originChargeMap) {
      try {
        parsedOriginChargeMap = typeof rate.originChargeMap === 'string'
          ? JSON.parse(rate.originChargeMap)
          : rate.originChargeMap
      } catch {}
    }

    // ── Build Origin Charges (BL Fees / THC / MUC / TOLL) ───────────────────
    const originCharges = []
    const ts = Date.now()
    if (isMulti && parsedOriginChargeMap) {
      // One charge row per charge type; amounts keyed by container type
      const chargeTypes = [
        { key: 'bl_fees', label: 'BL Fees',  unit: 'Per BL'        },
        { key: 'thc',     label: 'THC',       unit: 'Per Container' },
        { key: 'muc',     label: 'MUC',       unit: 'Per BL'        },
        { key: 'toll',    label: 'Toll',      unit: 'Per Container' },
      ]
      chargeTypes.forEach(({ key, label, unit }, i) => {
        const containerAmounts = {}
        let hasAny = false
        containerTypes.forEach((ct) => {
          const val = parsedOriginChargeMap[ct]?.[key]
          if (val) { containerAmounts[ct] = val; hasAny = true }
        })
        if (hasAny) {
          originCharges.push({ id: ts + i, charges: label, currency: 'INR', amount: '', unit, containerAmounts })
        }
      })
    } else {
      // Single container: flat values
      if (rate.bl_fees) originCharges.push({ id: ts,     charges: 'BL Fees', currency: 'INR', amount: rate.bl_fees, unit: 'Per BL',        containerAmounts: {} })
      if (rate.thc)     originCharges.push({ id: ts + 1, charges: 'THC',     currency: 'INR', amount: rate.thc,     unit: 'Per Container', containerAmounts: {} })
      if (rate.muc)     originCharges.push({ id: ts + 2, charges: 'MUC',     currency: 'INR', amount: rate.muc,     unit: 'Per BL',        containerAmounts: {} })
      if (rate.toll)    originCharges.push({ id: ts + 3, charges: 'Toll',    currency: 'INR', amount: rate.toll,    unit: 'Per Container', containerAmounts: {} })
    }

    // ── Build Freight Charges (Ocean Freight + ACD/ENS/AFR + Custom) ────────
    const freightCharges = []
    if (isMulti && parsedContainerCharges) {
      // Ocean Freight — one row with per-container amounts
      const ofAmounts = {}
      let ofCurrency = 'USD'
      let hasOF = false
      containerTypes.forEach((ct) => {
        const cc = parsedContainerCharges[ct]
        if (cc?.ocean_freight) {
          ofAmounts[ct] = cc.ocean_freight
          ofCurrency = cc.ocean_freight_currency || 'USD'
          hasOF = true
        }
      })
      if (hasOF) {
        freightCharges.push({ id: ts + 10, charges: 'Ocean Freight', currency: ofCurrency, amount: '', unit: 'Per Container', containerAmounts: ofAmounts })
      }

      // ACD/ENS/AFR — group by type; one row per distinct type
      const acdGroups = {} // acdType → { currency, amounts: { ct: val } }
      containerTypes.forEach((ct) => {
        const cc = parsedContainerCharges[ct]
        if (cc?.acd_value) {
          const acdType = cc.acd_type || 'ACD'
          if (!acdGroups[acdType]) acdGroups[acdType] = { currency: cc.acd_currency || 'USD', amounts: {} }
          acdGroups[acdType].amounts[ct] = cc.acd_value
        }
      })
      Object.entries(acdGroups).forEach(([acdType, { currency, amounts }], i) => {
        freightCharges.push({ id: ts + 11 + i, charges: acdType, currency, amount: '', unit: 'Per BL', containerAmounts: amounts })
      })
    } else {
      // Single container: flat values
      const of = parseAmount(rate.ocean_freight)
      const acd = parseAcd(rate.acd_ens_afr)
      if (of.amount) freightCharges.push({ id: ts + 10, charges: 'Ocean Freight', currency: of.currency, amount: of.amount, unit: 'Per Container', containerAmounts: {} })
      if (acd)       freightCharges.push({ id: ts + 11, charges: acd.type,        currency: acd.currency, amount: acd.amount, unit: 'Per BL',        containerAmounts: {} })
    }

    // Custom charges — support per-container containerType field
    let customs = []
    try {
      customs = rate.customCharges ? (typeof rate.customCharges === 'string' ? JSON.parse(rate.customCharges) : rate.customCharges) : []
    } catch { customs = [] }

    if (isMulti && customs.length > 0) {
      // Group by label; container-specific charges go into containerAmounts
      const customGroups = {} // label → { currency, unit, amounts: { ct: val } }
      customs.forEach((cc) => {
        if (!cc.label || !cc.value) return
        if (!customGroups[cc.label]) customGroups[cc.label] = { currency: cc.currency || 'INR', unit: cc.unit || 'Per Container', amounts: {} }
        if (cc.containerType) {
          customGroups[cc.label].amounts[cc.containerType] = cc.value
        } else {
          containerTypes.forEach((ct) => { customGroups[cc.label].amounts[ct] = cc.value })
        }
      })
      Object.entries(customGroups).forEach(([label, { currency, unit, amounts }], i) => {
        freightCharges.push({ id: ts + 20 + i, charges: label, currency, amount: '', unit, containerAmounts: amounts })
      })
    } else {
      customs.forEach((cc, idx) => {
        if (cc.label && cc.value) {
          freightCharges.push({ id: ts + 20 + idx, charges: cc.label, currency: cc.currency || 'INR', amount: cc.value, unit: cc.unit || 'Per Container', containerAmounts: {} })
        }
      })
    }

    // ── Build equipment / containerSelections ────────────────────────────────
    // equipmentList uses { type, qty } shape (quotation form's containerSelections format)
    const equipmentList = containerTypes.map((ct) => ({ type: ct, qty: 1 }))

    const quotationData = {
      por: rate.por || '',
      pol: rate.pol || '',
      pod: rate.pod || '',
      finalDestination: rate.finalDestination || rate.fdrr || rate.pod || '',
      shippingLine: rate.shipping_lines || '',
      // For single container, populate the text field directly
      // For multi, it will be recomputed by the form's containerSelections sync effect
      equipment: containerTypes.length === 1 ? containerTypes[0] : '',
      equipmentList: equipmentList.length > 0 ? equipmentList : undefined,
      commodity: rate.commodity || '',
      // Normalize to the Quotation dropdown's option format ("5 days (approx)")
      // so the select auto-matches even for rates saved in the older "5 Days" format.
      transitTime: normalizeTransitTime(rate.transit),
      remarks: rate.remarks || '',
      railRamp: rate.railRamp || '',
      originCharges: originCharges.length > 0 ? originCharges : undefined,
      freightCharges: freightCharges.length > 0 ? freightCharges : undefined,
      // Marks this as created from Rate Filing → show read-only Buying Rates
      // column in the quotation Charges sections for buy-vs-sell comparison.
      fromRateFile: true,
    }

    setCopyQuotation(quotationData)
    setDraftQuotation(null)
    prefetchSuggestionData()
    setCurrentView('form')
    sessionStorage.setItem('currentView', 'form')
  }

  const handleSignupSuccess = () => {
    window.location.hash = ''
  }

  // If accessing secret reset password page, show reset password form
  if (isResetPasswordPage) {
    return (
      <ResetPassword
        onSwitchToLogin={() => { window.location.hash = '' }}
      />
    )
  }

  // If accessing secret signup page, show signup form
  if (isSignupPage) {
    return (
      <Signup
        onSignupSuccess={handleSignupSuccess}
        onSwitchToLogin={() => { window.location.hash = '' }}
      />
    )
  }

  // If not authenticated, show login page
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        currentView={currentView}
      />

      {/* Content */}
      <div>
        {/* Export-role users are fully confined to the Export AI module — no other
            module is ever rendered for them, even via stale state or direct access. */}
        {isExportRole(currentUser) ? (
          <EmbeddedExportAI currentUser={currentUser} />
        ) : (
          <>
        {/* Import module — Super Admin and Import-role users */}
        {currentView === 'import' && <ImportModule currentUser={currentUser} />}

        {/* Standard modules — never rendered for Import-only users (route-protected above) */}
        {!isImportRole(currentUser) && (
          <>
        {currentView === 'dashboard' && <Dashboard key={dashboardKey} currentUser={currentUser} />}
        {currentView === 'quotation' && <QuotationFiling currentUser={currentUser} onBack={() => handleNavigate('dashboard')} onCreateQuotation={() => handleNavigate('form')} onEditDraft={handleEditDraft} onCopyQuotation={handleCopyQuotation} onCompareRates={handleCompareRates} />}
        {currentView === 'form' && <ImportExportQuotationForm currentUser={currentUser} onNavigate={handleNavigate} draftQuotation={draftQuotation} onDraftCleared={() => setDraftQuotation(null)} copyQuotation={copyQuotation} onCopyCleared={() => setCopyQuotation(null)} />}
        {currentView === 'preadvice' && <PreAdvice onBack={() => handleNavigate('dashboard')} initialQuotation={compareQuotation} onInitialQuotationConsumed={() => setCompareQuotation(null)} />}
        {currentView === 'ratefiling' && <RateFiling currentUser={currentUser} onBack={() => handleNavigate('dashboard')} onCreateQuotation={handleCreateQuotationFromRate} />}
        {currentView === 'agentdb' && <AgentDatabase currentUser={currentUser} />}
        {currentView === 'destination' && <Destination currentUser={currentUser} onBack={() => handleNavigate('dashboard')} />}
        {currentView === 'logininfo' && <LoginInfo currentUser={currentUser} />}
        {currentView === 'exportai' && <EmbeddedExportAI currentUser={currentUser} />}
        {currentView === 'booking' && (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="mb-6">
                  <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-10 h-10 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    Booking Module
                  </h2>
                  <p className="text-lg text-gray-600 mb-4">
                    Coming Soon!
                  </p>
                  <p className="text-sm text-gray-500 max-w-md mx-auto">
                    The booking management system is currently under development. 
                    This feature will allow you to manage and track all your freight bookings.
                  </p>
                </div>
                <button
                  onClick={() => { setCurrentView('dashboard'); sessionStorage.setItem('currentView', 'dashboard') }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        )}
          </>
        )}
      </div>
    </div>
  )
}

export default App
