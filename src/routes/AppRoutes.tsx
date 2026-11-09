import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { CitizenLayout } from '../components/layout/CitizenLayout';
import { LandingPage } from '../features/landing/LandingPage';
import { ProjectInformation } from '../features/landing/ProjectInformation';
import { ComplaintForm } from '../features/citizen/ComplaintForm';
import { ComplaintTracker } from '../features/citizen/ComplaintTracker';
import { CitizenDashboard } from '../features/citizen/CitizenDashboard';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
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
        <Route path="/about" element={<ProjectInformation page="about" />} />
        <Route path="/privacy" element={<ProjectInformation page="privacy" />} />
        <Route path="/terms" element={<ProjectInformation page="terms" />} />
        <Route path="/contact" element={<ProjectInformation page="contact" />} />
        <Route path="/submit" element={<ComplaintForm />} />
        <Route path="/track" element={<ComplaintTracker />} />
        <Route path="/track/:referenceNumber" element={<ComplaintTracker />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Future Phase 4 Portals */}
        <Route path="/department/*" element={<FuturePortalPlaceholder role="department" />} />
        <Route path="/admin/*" element={<FuturePortalPlaceholder role="admin" />} />
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
