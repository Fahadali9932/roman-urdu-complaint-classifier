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
import { DepartmentPortalLayout } from '../features/department/DepartmentPortalLayout';
import { DepartmentDashboardPage } from '../features/department/DepartmentDashboardPage';
import { DepartmentLoginPage } from '../features/department/DepartmentLoginPage';
import { AdminLoginPage } from '../features/auth/pages/AdminLoginPage';
import { Card } from '../components/common/Card';
import { Container } from '../components/layout/Container';
import { Building2 } from 'lucide-react';

const FuturePortalPlaceholder: React.FC<{ role: 'department' | 'admin' }> = ({ role }) => (
  <div className="py-16">
    <Container size="md">
      <Card className="p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
          <Building2 className="w-6 h-6 text-[#111111]" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          {role === 'department' ? 'Department area' : 'Administrator area'}
        </h2>
        <p className="text-sm text-[#5B5B5B]">This area is not available in this preview.</p>
      </Card>
    </Container>
  </div>
);

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
        <Route path="/submit" element={<ComplaintForm />} />
        <Route path="/write-complaint" element={<Navigate to="/submit" replace />} />
        <Route path="/track" element={<ComplaintTracker />} />
        <Route path="/track/:referenceNumber" element={<ComplaintTracker />} />
        {/* Citizen Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Future Portals */}
        <Route path="/admin/*" element={<FuturePortalPlaceholder role="admin" />} />
      </Route>

      {/* Staff & Administrator Authentication Screens */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<Navigate to="/admin/login" replace />} />

      {/* Department Portal Workspace */}
      <Route element={<DepartmentPortalLayout />}>
        <Route path="/department" element={<DepartmentDashboardPage />} />
        <Route path="/department/login" element={<DepartmentLoginPage />} />
        <Route path="/department/:referenceNumber" element={<DepartmentDashboardPage />} />
      </Route>

      {/* Authenticated Citizen Workspace layout */}
      <Route element={<CitizenLayout />}>
        <Route path="/dashboard" element={<CitizenDashboard />} />
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
