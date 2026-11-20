import type { Complaint } from '../../../types';
import { CitizenDashboard } from '../CitizenDashboard';

/**
 * Deterministic and deliberately fictional university showcase records.
 * This module is dynamically imported only by a Vite development-only route.
 * It must never query Supabase, inspect browser storage, or submit a complaint.
 */
const DEMONSTRATION_RECORDS: readonly Complaint[] = [
  {
    id: 'demo-only-sewer-001',
    citizenId: 'fictional-university-demo',
    referenceNumber: 'DEMO-KHI-0001',
    citizenName: 'Example Resident',
    district: 'District East',
    locality: 'Gulshan-e-Iqbal',
    publicLocation: 'Fictional Lane 1',
    title: 'Broken sewerage pipeline near a residential street',
    description: 'Hamari gali mein sewer line toot gayi hai aur pani jama ho raha hai.',
    detectedLanguage: 'roman_urdu',
    status: 'under_review',
    assignedDepartmentId: 'kwsc',
    assignedDepartmentName: 'Karachi Water & Sewerage Corporation',
    assignedDepartmentIds: ['kwsc'],
    submittedAt: '2026-11-18T09:00:00.000Z',
    updatedAt: '2026-11-18T09:00:00.000Z',
    timeline: [],
    isDemonstration: true,
  },
  {
    id: 'demo-only-road-002',
    citizenId: 'fictional-university-demo',
    referenceNumber: 'DEMO-KHI-0002',
    citizenName: 'Example Resident',
    district: 'District Central',
    locality: 'Liaquatabad',
    publicLocation: 'Fictional Street 2',
    title: 'Damaged road and potholes',
    description: 'Main road par bare khadde hain aur barish mein rasta mushkil ho jata hai.',
    detectedLanguage: 'roman_urdu',
    status: 'in_progress',
    assignedDepartmentId: 'kmc',
    assignedDepartmentName: 'Karachi Metropolitan Corporation',
    assignedDepartmentIds: ['kmc'],
    submittedAt: '2026-11-17T09:00:00.000Z',
    updatedAt: '2026-11-19T12:00:00.000Z',
    timeline: [],
    isDemonstration: true,
  },
];

export default function DevCitizenDashboard() {
  return <CitizenDashboard isDevHarness demoComplaints={DEMONSTRATION_RECORDS} />;
}
