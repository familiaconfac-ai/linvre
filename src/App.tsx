import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import LocalModePage from './pages/LocalModePage'
import SetupFamilyPage from './pages/SetupFamilyPage'
import ParentDashboard from './pages/parent/ParentDashboard'
import ChildDetailPage from './pages/parent/ChildDetailPage'
import TasksPage from './pages/parent/TasksPage'
import AddChildPage from './pages/parent/AddChildPage'
import ChildDashboard from './pages/child/ChildDashboard'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/local-mode" element={<LocalModePage />} />
          <Route path="/setup-family" element={<SetupFamilyPage />} />

          {/* Parent-only routes */}
          <Route element={<ProtectedRoute allowedRole="parent" />}>
            <Route path="/parent" element={<ParentDashboard />} />
            <Route path="/parent/child/:id" element={<ChildDetailPage />} />
            <Route path="/parent/tasks" element={<TasksPage />} />
            <Route path="/parent/add-child" element={<AddChildPage />} />
          </Route>

          {/* Child-only routes */}
          <Route element={<ProtectedRoute allowedRole="child" />}>
            <Route path="/child" element={<ChildDashboard />} />
          </Route>

          {/* Catch all → login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
