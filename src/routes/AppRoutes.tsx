import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { CitizenLayout } from '../components/layout/CitizenLayout';
import { LandingPage } from '../features/landing/LandingPage';
import { AboutPage } from '../features/information/pages/AboutPage';
import { ContactPage } from '../features/information/pages/ContactPage';
import { PrivacyPolicyPage } from '../features/information/pages/PrivacyPolicyPage';
import { TermsOfUsePage } from '../features/information/pages/TermsOfUsePage';
import { ComplaintForm } from '../features/citizen/ComplaintForm';
import { ComplaintTracker } from '../features/citizen/ComplaintTracker';
import { CitizenDashboard } from '../features/citizen/CitizenDashboard';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { CitizenRequiredRoute } from '../features/auth/CitizenRequiredRoute';
import { DepartmentPortalLayout } from '../features/department/DepartmentPortalLayout';
import { DepartmentDashboardPage } from '../features/department/DepartmentDashboardPage';
import { DepartmentLoginPage } from '../features/department/DepartmentLoginPage';
import { AdminLoginPage } from '../features/auth/pages/AdminLoginPage';
import { AdminRequestsPage } from '../features/auth/pages/AdminRequestsPage';
import { AdminAccessPage } from '../features/auth/pages/AdminAccessPage';

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
        <Route path="/contact" element={<ContactPage />} />
        {/* Keep the in-progress form available so a failed or expired session never
            discards entered details. Submission itself checks for a live session. */}
        <Route path="/submit" element={<ComplaintForm />} />
        <Route path="/write-complaint" element={<Navigate to="/submit" replace />} />
        <Route path="/track" element={<ComplaintTracker />} />
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
      <Route path="/admin/overview" element={<Navigate to="/admin/requests" replace />} />
      <Route path="/admin" element={<Navigate to="/admin/requests" replace />} />

      {/* Department Portal Workspace */}
      <Route element={<DepartmentPortalLayout />}>
        <Route path="/department" element={<DepartmentDashboardPage />} />
        <Route path="/department/login" element={<DepartmentLoginPage />} />
        <Route path="/department/:referenceNumber" element={<DepartmentDashboardPage />} />
      </Route>

      {/* Authenticated Citizen Workspace layout */}
      <Route element={<CitizenLayout />}>
        <Route path="/dashboard" element={<CitizenRequiredRoute><CitizenDashboard /></CitizenRequiredRoute>} />
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
