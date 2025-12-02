import React, { useState } from "react";
import {
  Ship,
  User,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  Package,
} from "lucide-react";

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Trial accounts
  const validAccounts = [
    { username: "vikram", password: "123", fullName: "Vikram", role: "Admin" , location: "Delhi"},
    { username: "ravi", password: "123", fullName: "Ravi", role: "Manager", location: "Mumbai" },
    {
      username: "harmeet",
      password: "123",
      fullName: "Harmeet",
      role: "Manager",
      location: "Chennai"
    },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Simulate a small delay for better UX
    setTimeout(() => {
      const account = validAccounts.find(
        (acc) => acc.username === username && acc.password === password
      );

      if (account) {
        // Store user info in localStorage
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            username: account.username,
            fullName: account.fullName,
            role: account.role,
            location: account.location,
            loginTime: new Date().toISOString(),
          })
        );

        // Call the success callback
        onLoginSuccess(account);
      } else {
        setError("Invalid username or password. Please try again.");
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden">
      {/* Logistics-Themed Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
        {/* Subtle Container Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20h20v20h-20zM60 20h20v20h-20zM20 60h20v20h-20zM60 60h20v20h-20z' fill='%23334155' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: "80px 80px",
          }}
        ></div>

        {/* Logistics Icons/Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Top-left decorative element */}
          <div className="absolute top-20 left-20 text-slate-200">
            <Ship size={180} strokeWidth={0.5} />
          </div>
          {/* Bottom-right decorative element */}
          <div className="absolute bottom-20 right-20 text-cyan-200 opacity-60">
            <Package size={160} strokeWidth={0.5} />
          </div>
          {/* Subtle accent lines */}
          <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-transparent via-slate-200 to-transparent"></div>
          <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-blue-200 to-transparent"></div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-[420px]">
          {/* Logo/Brand Section */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg mb-4">
              <Ship className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-1">
              OmTrans Freight
            </h1>
            <p className="text-slate-600 text-sm font-medium">
              Global Logistics & Freight Solutions
            </p>
          </div>

          {/* Login Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-1">
                Welcome Back
              </h2>
              <p className="text-slate-500 text-sm">Sign in to your account</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 animate-shake">
                <AlertCircle
                  className="text-red-600 flex-shrink-0 mt-0.5"
                  size={18}
                />
                <div className="flex-1">
                  <p className="text-sm text-red-800 font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Field */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="text-slate-400" size={18} />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 hover:bg-white focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="text-slate-400" size={18} />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-10 pr-11 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 hover:bg-white focus:bg-white text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all transform hover:translate-y-[-1px] active:translate-y-[0px] mt-6 ${
                  isLoading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-slate-500 text-xs">
              © 2025 OmTrans Freight Services. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Login;
