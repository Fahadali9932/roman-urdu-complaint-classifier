import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { CitizenLayout } from '../components/layout/CitizenLayout';
import { LandingPage } from '../features/landing/LandingPage';
import { AboutPage } from '../features/information/pages/AboutPage';
import { ContactPage } from '../features/information/pages/ContactPage';
import { PrivacyPolicyPage } from '../features/information/pages/PrivacyPolicyPage';
import { TermsOfUsePage } from '../features/information/pages/TermsOfUsePage';
import { FaqPage } from '../features/information/pages/FaqPage';
import { ComplaintForm } from '../features/citizen/ComplaintForm';
import { ComplaintTracker } from '../features/citizen/ComplaintTracker';
import { KarachiIssuesMapPage } from '../features/citizen/KarachiIssuesMapPage';
import { CitizenDashboard } from '../features/citizen/CitizenDashboard';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { CitizenRequiredRoute } from '../features/auth/CitizenRequiredRoute';
import { DepartmentPortalLayout } from '../features/department/DepartmentPortalLayout';
import { DepartmentDashboardPage } from '../features/department/DepartmentDashboardPage';
import { DepartmentLoginPage } from '../features/department/DepartmentLoginPage';
import { DepartmentRoleBoundary } from '../features/department/DepartmentRoleBoundary';
import { StaffAccessRequestPage } from '../features/department/StaffAccessRequestPage';
import { AdminLoginPage } from '../features/auth/pages/AdminLoginPage';
import { AdminRequestsPage } from '../features/auth/pages/AdminRequestsPage';
import { AdminAccessPage } from '../features/auth/pages/AdminAccessPage';
import { AiControlCenterPage } from '../features/admin/ai/AiControlCenterPage';

// Lazy, development-only chunk. The import is eliminated from production builds.
const DevCitizenDashboard = import.meta.env.DEV
  ? React.lazy(() => import('../features/citizen/dev/DevCitizenDashboard'))
  : null;

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Citizen Portal routes */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
        <Route path="/terms-of-use" element={<TermsOfUsePage />} />
        <Route path="/terms" element={<Navigate to="/terms-of-use" replace />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/contact" element={<ContactPage />} />
        {/* Keep the in-progress form available so a failed or expired session never
            discards entered details. Submission itself checks for a live session. */}
        <Route path="/submit" element={<ComplaintForm />} />
        <Route path="/write-complaint" element={<Navigate to="/submit" replace />} />
        <Route path="/track" element={<ComplaintTracker />} />
        <Route path="/karachi-map" element={<KarachiIssuesMapPage />} />
        <Route path="/track/:referenceNumber" element={<ComplaintTracker />} />
        {/* Citizen Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Staff & Administrator Management Routes */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/requests" element={<AdminRequestsPage />} />
      <Route path="/admin/access" element={<AdminAccessPage />} />
      <Route path="/admin/ai" element={<AiControlCenterPage />} />
      <Route path="/admin/overview" element={<Navigate to="/admin/requests" replace />} />
      <Route path="/admin" element={<Navigate to="/admin/requests" replace />} />

      {/* Department Portal Workspace */}
      <Route element={<DepartmentPortalLayout />}>
        <Route path="/department" element={<DepartmentDashboardPage />} />
        <Route path="/department/dashboard" element={<Navigate to="/department" replace />} />
        <Route path="/department/login" element={<DepartmentLoginPage />} />
        <Route path="/department/head/login" element={<DepartmentLoginPage targetRole="head" />} />
        <Route path="/department/officer/login" element={<DepartmentLoginPage targetRole="officer" />} />
        <Route path="/department/request-access" element={<StaffAccessRequestPage />} />
        <Route path="/department/head" element={<DepartmentRoleBoundary expectedRole="head" />} />
        <Route path="/department/officer" element={<DepartmentRoleBoundary expectedRole="officer" />} />
        <Route path="/department/settings" element={<Navigate to="/department?view=overview" replace />} />
        <Route path="/department/complaints/:referenceNumber" element={<DepartmentDashboardPage />} />
        <Route path="/department/:referenceNumber" element={<DepartmentDashboardPage />} />
      </Route>

      {/* Authenticated Citizen Workspace layout */}
      <Route element={<CitizenLayout />}>
        <Route path="/dashboard" element={<CitizenRequiredRoute><CitizenDashboard /></CitizenRequiredRoute>} />
      </Route>

      {/* Isolated development-only demonstration harness (stripped in production builds) */}
      {import.meta.env.DEV && DevCitizenDashboard && (
        <Route element={<CitizenLayout />}>
          <Route
            path="/dev/harness/citizen-dashboard"
            element={<React.Suspense fallback={<div role="status">Loading demonstration…</div>}><DevCitizenDashboard /></React.Suspense>}
          />
        </Route>
      )}

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
