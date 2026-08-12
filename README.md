# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Application Routes & Authentication

The app is a single authenticated shell. **Login is the only entry point** — there is
**no public sign-up page and no public password-reset page** (both were removed). After
login, all sections are reached through in-app navigation (the Navbar), not via direct
URLs.

| Page | How it's reached | Access |
|------|------------------|--------|
| **Login** | `/` (only screen shown when logged out) | Public |
| **Dashboard / Quotation / Rate Filing / Pre-Advice / Agent / Destination** | Navbar after login | Standard roles + Super Admin |
| **Import module** | Navbar → Import | Super Admin, Import role |
| **Export AI** | Navbar → Export AI | Everyone except Import-only |
| **Login Info** | Navbar → Login Info | Super Admin only |
| **User Management** | Navbar → **User Management** | **Super Admin only** |

> There are **no** `#/admin-signup` or `#/admin-reset-password` routes anymore. New users
> are created, and passwords are reset, only by a Super Admin from **User Management**.

---

## User Management (Super Admin only)

The **User Management** dashboard is the single place where user accounts are created and
maintained. It is visible and usable **only by users with the `Super Admin` role**.

### Components & wiring

| File | Responsibility |
|------|----------------|
| `src/UserManagement/UserManagement.jsx` | The dashboard: user table, search/filters, and Create / Edit / Reset Password / Delete / Activate-Deactivate modals |
| `src/components/Navbar.jsx` | Renders the **User Management** menu item only when `role === 'Super Admin'` |
| `src/App.jsx` | Routes the `usermanagement` view and re-checks `isSuperAdminRole(currentUser)` before rendering (so a stale view state can't expose it) |

All requests go to the backend `/api/users` API with the Super Admin's JWT
(`Authorization: Bearer <token>` from `localStorage.authToken`). The backend re-enforces
the role and returns **403** to anyone else, so the UI restriction is backed by real
server-side security.

### What a Super Admin can do

- **Create a user** — set **Full Name, Username, Initial Password, Role, Location**, and
  whether the account starts **Active or Inactive** (checkbox). Roles: `Super Admin,
  Admin, Manager, User, Viewer, Import, Export, Agent`.
- **Edit a user** — change full name, role, location, and active status (username is
  immutable — it is the login identity).
- **Reset password** — set a new password for any user (no public reset exists).
- **Activate / deactivate** — toggle access without deleting; a deactivated user cannot
  log in.
- **Delete** — permanently remove an account (a Super Admin can't delete themselves, and
  the last Super Admin is protected).
- **View, search & filter** — the table shows **Name, Username, Role, Status, Created**,
  and **Last Login**; search by name/username and filter by **role** and **status**.

### Authentication flow (frontend)

1. User logs in on the **Login** screen → `POST /api/auth/login`.
2. On success, `authToken`, `currentUser` (incl. `role`) are stored in `localStorage`.
3. `App.jsx` renders the shell; the Navbar shows menu items based on `currentUser.role`.
   Super Admin additionally sees **Login Info** and **User Management**.
4. All User Management actions send the JWT to `/api/users`; the backend validates the
   token (`protect`) and the role (`superAdmin`).
5. Deactivating a user (or deleting them) immediately blocks their next login.

---

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
