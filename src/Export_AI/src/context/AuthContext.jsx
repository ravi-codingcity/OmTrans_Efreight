import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/endpoints.js';

const AuthContext = createContext(null);

const MODEL_KEY = 'edai_model';
const DEFAULT_MODEL = 'gemini-2.5-flash';

// The user is ALREADY authenticated by the main app. We adapt the existing
// account shape ({ username, fullName, role, location, preferredAiModel }) and
// derive admin from the existing role enum — no separate auth/login here.
const isAdminRole = (role) => {
  const r = String(role || '').toLowerCase().trim();
  return r === 'super admin' || r === 'admin';
};

const normalizeUser = (u) =>
  u
    ? {
        ...u,
        // Compatibility shims for components that read name/email.
        name: u.fullName || u.name || u.username || '',
        email: u.email || u.username || '',
        role: isAdminRole(u.role) ? 'admin' : 'export_user',
        roleLabel: u.role,
        preferredAiModel: u.preferredAiModel || DEFAULT_MODEL,
      }
    : null;

export function AuthProvider({ children, initialUser }) {
  const [user, setUser] = useState(() => normalizeUser(initialUser));
  const [loading, setLoading] = useState(false);
  const [aiModel, setAiModelState] = useState(
    () => (initialUser && initialUser.preferredAiModel) || localStorage.getItem(MODEL_KEY) || DEFAULT_MODEL
  );

  const syncModel = (model) => {
    if (!model) return;
    setAiModelState(model);
    localStorage.setItem(MODEL_KEY, model);
  };

  // Refresh the full profile (incl. saved model preference) from the backend.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { user: me } = await authApi.me();
        if (!active || !me) return;
        setUser(normalizeUser(me));
        syncModel(me.preferredAiModel);
      } catch {
        /* keep the initial user on transient errors */
      }
    })();
    return () => { active = false; };
  }, []);

  const updateAiModel = async (model) => {
    syncModel(model); // optimistic
    const { user: me } = await authApi.updatePreferences({ preferredAiModel: model });
    if (me) {
      setUser(normalizeUser(me));
      syncModel(me.preferredAiModel);
    }
    return model;
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin: user?.role === 'admin', aiModel, updateAiModel }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
