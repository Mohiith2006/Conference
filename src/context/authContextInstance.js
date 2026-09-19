import { createContext } from "react";

// Kept in its own file (no components, no hooks) purely so both AuthContext.jsx
// (the provider component) and useAuth.js (the hook) can import the same
// context instance without either file mixing component and non-component
// exports, which is what breaks React Fast Refresh.
export const AuthContext = createContext(null);
