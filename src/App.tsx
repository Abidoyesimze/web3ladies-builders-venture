import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/auth'
import { ToastProvider } from '@/lib/toast'
import { roleHome } from '@/lib/roles'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { Login } from '@/pages/Login'
import { SetPassword } from '@/pages/SetPassword'
import { ForgotPassword } from '@/pages/ForgotPassword'
import { Join } from '@/pages/Join'

import { StudentLayout } from '@/layouts/StudentLayout'
import { MentorLayout } from '@/layouts/MentorLayout'
import { AdminLayout } from '@/layouts/AdminLayout'

import { StudentDashboard } from '@/pages/student/Dashboard'
import { StudentProfile } from '@/pages/student/Profile'
import { StudentSessions } from '@/pages/student/Sessions'
import { StudentWorkspace } from '@/pages/student/Workspace'
import { StudentProgress } from '@/pages/student/Progress'

import { MentorDashboard } from '@/pages/mentor/Dashboard'
import { MentorStudents } from '@/pages/mentor/Students'
import { MentorStudentReview } from '@/pages/mentor/StudentReview'
import { MentorSessions } from '@/pages/mentor/Sessions'
import { MentorReviews } from '@/pages/mentor/Reviews'
import { MentorReviewDetail } from '@/pages/mentor/ReviewDetail'

import { AdminDashboard } from '@/pages/admin/Dashboard'
import { AdminCohorts } from '@/pages/admin/Cohorts'
import { AdminCohortDetail } from '@/pages/admin/CohortDetail'
import { AdminUsers } from '@/pages/admin/Users'
import { AdminSessions } from '@/pages/admin/Sessions'
import { AdminProjects } from '@/pages/admin/Projects'
import { AdminSettings } from '@/pages/admin/Settings'

function RoleHomeRedirect() {
  const { role } = useAuth()
  return <Navigate to={roleHome[role]} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/join/:token" element={<Join />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<RoleHomeRedirect />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="*" element={<RoleHomeRedirect />} />
      </Route>

      <Route element={<ProtectedRoute allow={['student']} />}>
        <Route element={<StudentLayout />}>
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/profile" element={<StudentProfile />} />
          <Route path="/sessions" element={<StudentSessions />} />
          <Route path="/workspace" element={<StudentWorkspace />} />
          <Route path="/progress" element={<StudentProgress />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allow={['mentor']} />}>
        <Route element={<MentorLayout />}>
          <Route path="/mentor" element={<MentorDashboard />} />
          <Route path="/mentor/students" element={<MentorStudents />} />
          <Route path="/mentor/students/:studentId" element={<MentorStudentReview />} />
          <Route path="/mentor/sessions" element={<MentorSessions />} />
          <Route path="/mentor/reviews" element={<MentorReviews />} />
          <Route path="/mentor/reviews/:reviewId" element={<MentorReviewDetail />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allow={['admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/cohorts" element={<AdminCohorts />} />
          <Route path="/admin/cohorts/:cohortId" element={<AdminCohortDetail />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/sessions" element={<AdminSessions />} />
          <Route path="/admin/projects" element={<AdminProjects />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
