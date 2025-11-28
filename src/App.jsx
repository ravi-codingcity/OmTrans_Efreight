import React, { useState, useEffect } from 'react'
import ImportExportQuotationForm from './components/ImportExportQuotationForm.jsx'
import Dashboard from './Dashboard/Dashboard.jsx'
import Login from './Login/Login.jsx'
import Navbar from './components/Navbar.jsx'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard', 'form', 'approval', or 'booking'

  // Check if user is already logged in on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      setCurrentUser(user)
      setIsAuthenticated(true)
    }
  }, [])

  // Handle successful login
  const handleLoginSuccess = (user) => {
    setCurrentUser({
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    })
    setIsAuthenticated(true)
  }

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    setCurrentUser(null)
    setIsAuthenticated(false)
    setCurrentView('dashboard')
  }

  // Handle navigation
  const handleNavigate = (view) => {
    setCurrentView(view)
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
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'form' && <ImportExportQuotationForm currentUser={currentUser} />}
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
                  onClick={() => setCurrentView('dashboard')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
