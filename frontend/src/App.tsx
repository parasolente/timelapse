import { Route, Routes } from "react-router-dom"
import { AuthProvider } from "./hooks/useAuth"
import { Dashboard } from "./pages/Dashboard"
import { Insights } from "./pages/Insights"
import { Recover } from "./pages/Recover"
import { Welcome } from "./pages/Welcome"

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/recover" element={<Recover />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/insights" element={<Insights />} />
      </Routes>
    </AuthProvider>
  )
}
