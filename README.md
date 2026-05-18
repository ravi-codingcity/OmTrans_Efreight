# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Application Routes & URLs

The application uses hash-based routing for authentication pages:

| Page | URL | Description |
|------|-----|-------------|
| **Login** | `/` | Default landing page for unauthenticated users |
| **Signup** | `/#/admin-signup` | Admin user registration (secret page) |
| **Reset Password** | `/#/admin-reset-password` | Password reset for admin users (secret page) |
| **Dashboard** | `/` | Main dashboard (after login) |
| **Quotation Form** | `/` | Create quotations (internal navigation) |
| **Booking** | `/` | Booking module - Coming Soon (internal navigation) |

### Example URLs (Development)
```
Login:          http://localhost:5173/
Signup:         http://localhost:5173/#/admin-signup
Reset Password: http://localhost:5173/#/admin-reset-password
```

### Example URLs (Production)
```
Login:          https://your-domain.com/
Signup:         https://your-domain.com/#/admin-signup
Reset Password: https://your-domain.com/#/admin-reset-password
```

> **Note:** Dashboard, Quotation Form, and Booking views are accessed through internal navigation after authentication, not via direct URLs.

---

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
