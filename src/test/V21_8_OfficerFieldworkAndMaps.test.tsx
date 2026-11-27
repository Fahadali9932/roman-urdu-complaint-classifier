import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  isValidCoordinate,
  buildGoogleMapsSearchUrl,
  buildGoogleMapsDirectionsUrl,
  haversineDistanceMeters,
} from '../features/department/services/googleMapsLinks';
import { OfficerWorkList } from '../features/department/components/v19/work/OfficerWorkList';
import { OfficerWorkDetail } from '../features/department/components/v19/work/OfficerWorkDetail';
import { WorkResolutionForm } from '../features/department/components/v19/work/WorkResolutionForm';
import { WorkConfirmationModal } from '../features/department/components/v19/work/WorkConfirmationModal';
import { OfficerWorkView } from '../features/department/components/v19/OfficerWorkView';
import { type DepartmentWorkOrder } from '../features/department/services/fieldOperations';
import { type HeadIndependentComplaintRow } from '../services/CaseOperationsService';

describe('V21.8 Google Maps Integration & Geolocation Utilities', () => {
  it('validates coordinates strictly within valid ranges', () => {
    // Valid coordinates
    expect(isValidCoordinate(24.8607, 67.0011)).toBe(true);
    expect(isValidCoordinate(0, 0)).toBe(true); // 0 is explicitly valid
    expect(isValidCoordinate(-90, -180)).toBe(true);
    expect(isValidCoordinate(90, 180)).toBe(true);

    // Invalid coordinates
    expect(isValidCoordinate(90.1, 0)).toBe(false);
    expect(isValidCoordinate(-90.1, 0)).toBe(false);
    expect(isValidCoordinate(0, 180.1)).toBe(false);
    expect(isValidCoordinate(0, -180.1)).toBe(false);
    expect(isValidCoordinate(NaN, 67.0)).toBe(false);
    expect(isValidCoordinate(24.8, Infinity)).toBe(false);
    expect(isValidCoordinate('24.8', '67.0')).toBe(false);
    expect(isValidCoordinate(null, undefined)).toBe(false);
  });

  it('builds free Google Maps Search / View location URLs correctly', () => {
    // Valid coordinates
    const urlFromCoords = buildGoogleMapsSearchUrl(24.8607, 67.0011);
    expect(urlFromCoords).toBe('https://www.google.com/maps/search/?api=1&query=24.8607%2C67.0011');

    // Valid 0,0 coordinates
    expect(buildGoogleMapsSearchUrl(0, 0)).toBe('https://www.google.com/maps/search/?api=1&query=0%2C0');

    // Text address fallback when coordinates are missing or invalid
    const urlFromAddress = buildGoogleMapsSearchUrl(null, null, 'MA Jinnah Road, Saddar, Karachi');
    expect(urlFromAddress).toBe('https://www.google.com/maps/search/?api=1&query=MA%20Jinnah%20Road%2C%20Saddar%2C%20Karachi');

    // Null when neither valid coordinates nor address exists
    expect(buildGoogleMapsSearchUrl(null, null, null)).toBeNull();
    expect(buildGoogleMapsSearchUrl(undefined, undefined, '   ')).toBeNull();
  });

  it('builds free Google Maps Directions URLs with automatic officer origin', () => {
    // Valid coordinates
    const directionsUrl = buildGoogleMapsDirectionsUrl(24.8607, 67.0011);
    expect(directionsUrl).toBe('https://www.google.com/maps/dir/?api=1&destination=24.8607%2C67.0011');

    // Fallback to address
    const directionsFromAddress = buildGoogleMapsDirectionsUrl(null, null, 'Shahrah-e-Faisal, Karachi');
    expect(directionsFromAddress).toBe('https://www.google.com/maps/dir/?api=1&destination=Shahrah-e-Faisal%2C%20Karachi');

    // Null fallback
    expect(buildGoogleMapsDirectionsUrl(null, null, '')).toBeNull();
  });

  it('calculates truthful haversine distances in metres', () => {
    // Distance between two points in Karachi approx 1.1km
    const dist = haversineDistanceMeters(24.8607, 67.0011, 24.8700, 67.0011);
    expect(dist).toBeGreaterThan(1000);
    expect(dist).toBeLessThan(1200);

    // Distance between identical points is 0
    expect(haversineDistanceMeters(24.8607, 67.0011, 24.8607, 67.0011)).toBe(0);
  });
});

describe('V21.8 Officer Work List Component', () => {
  const mockOrders: DepartmentWorkOrder[] = [
    {
      id: 'order-kmc-101',
      department_id: 'kmc',
      anchor_complaint_id: 'CMP-2026-001',
      case_label: 'Severed Sewerage Line on Nishtar Road',
      officer_id: 'officer-1',
      assigned_by: 'hod-1',
      instructions: 'Ensure safety cordon before repairing main collar.',
      assigned_at: '2026-11-27T08:00:00Z',
      due_at: '2026-11-30T08:00:00Z',
      original_due_at: '2026-11-30T08:00:00Z',
      started_at: '2026-11-27T09:00:00Z',
      status: 'in_progress',
      assigned_duration_hours: 72,
      extension_requested_due_at: null,
      extension_reason: null,
      reviewed_at: null,
      review_note: null,
      citizen_dispute_pending: false,
    },
    {
      id: 'order-kmc-102',
      department_id: 'kmc',
      anchor_complaint_id: 'CMP-2026-002',
      case_label: 'Broken Storm Drain Grate',
      officer_id: 'officer-1',
      assigned_by: 'hod-1',
      instructions: 'Replace damaged cast-iron grill.',
      assigned_at: '2026-11-27T10:00:00Z',
      due_at: '2026-11-29T10:00:00Z',
      original_due_at: '2026-11-29T10:00:00Z',
      started_at: null,
      status: 'assigned',
      assigned_duration_hours: 48,
      extension_requested_due_at: null,
      extension_reason: null,
      reviewed_at: null,
      review_note: null,
      citizen_dispute_pending: false,
    },
  ];

  const mockComplaints: HeadIndependentComplaintRow[] = [
    {
      id: 'CMP-2026-001',
      referenceNumber: 'REF-KMC-001',
      heading: 'Severed Sewerage Line on Nishtar Road',
      sanitizedText: 'Major sewage overflow flooding the pedestrian walkway.',
      rawText: 'Nishtar road pe gutter ka paani nikal raha hai.',
      factualSummary: 'Major sewage overflow on Nishtar Road.',
      submittedAt: '2026-11-27T07:00:00Z',
      department: 'kmc',
      departmentName: 'Karachi Municipal Corporation',
      priority: 'HIGH',
      status: 'assigned',
      publicPlace: 'Nishtar Road',
      locality: 'Garden West',
      district: 'Karachi South',
      latitude: 24.8765,
      longitude: 67.0234,
      photoUrl: 'https://example.com/photo1.jpg',
    },
    {
      id: 'CMP-2026-002',
      referenceNumber: 'REF-KMC-002',
      heading: 'Broken Storm Drain Grate',
      sanitizedText: 'Storm drain grill broken, hazard for motorcycles.',
      rawText: 'Grate toota hua hai.',
      factualSummary: 'Broken storm drain grill on street corner.',
      submittedAt: '2026-11-27T09:00:00Z',
      department: 'kmc',
      departmentName: 'Karachi Municipal Corporation',
      priority: 'NORMAL',
      status: 'assigned',
      publicPlace: 'Burns Road',
      locality: 'Saddar',
      district: 'Karachi South',
      latitude: 24.8589,
      longitude: 67.0145,
    },
  ];

  it('renders "My work" heading and complaint cards with full reference IDs', () => {
    const handleSelect = vi.fn();
    render(
      <OfficerWorkList
        orders={mockOrders}
        complaints={mockComplaints}
        onSelectOrder={handleSelect}
      />
    );

    // Heading "My work"
    expect(screen.getByText('My work')).toBeInTheDocument();
    expect(screen.getByText('2 tasks')).toBeInTheDocument();

    // Cards display full references (no truncated Order #local-)
    expect(screen.getByText('REF #REF-KMC-001')).toBeInTheDocument();
    expect(screen.getByText('Work Order #order-kmc-101')).toBeInTheDocument();
    expect(screen.getByText('REF #REF-KMC-002')).toBeInTheDocument();
    expect(screen.getByText('Work Order #order-kmc-102')).toBeInTheDocument();

    // Clicking "Open complaint" triggers callback
    const openBtn = screen.getByTestId('open-complaint-btn-order-kmc-101');
    fireEvent.click(openBtn);
    expect(handleSelect).toHaveBeenCalledWith('order-kmc-101');
  });

  it('filters between all, in-progress, and awaiting start', () => {
    render(
      <OfficerWorkList
        orders={mockOrders}
        complaints={mockComplaints}
        onSelectOrder={vi.fn()}
      />
    );

    // Tab buttons
    const inProgressTab = screen.getByText(/In Progress \(1\)/i);
    const assignedTab = screen.getByText(/Awaiting Start \(1\)/i);

    fireEvent.click(inProgressTab);
    expect(screen.getByText('REF #REF-KMC-001')).toBeInTheDocument();
    expect(screen.queryByText('REF #REF-KMC-002')).not.toBeInTheDocument();

    fireEvent.click(assignedTab);
    expect(screen.queryByText('REF #REF-KMC-001')).not.toBeInTheDocument();
    expect(screen.getByText('REF #REF-KMC-002')).toBeInTheDocument();
  });

  it('renders clean empty state when no tasks are assigned', () => {
    render(
      <OfficerWorkList
        orders={[]}
        complaints={[]}
        onSelectOrder={vi.fn()}
      />
    );

    expect(screen.getByText('No Field Tasks Currently In Progress')).toBeInTheDocument();
  });
});

describe('V21.8 Full Officer Complaint Document (OfficerWorkDetail)', () => {
  const mockOrder: DepartmentWorkOrder = {
    id: 'order-kmc-101',
    department_id: 'kmc',
    anchor_complaint_id: 'CMP-2026-001',
    case_label: 'Severed Sewerage Line on Nishtar Road',
    officer_id: 'officer-1',
    assigned_by: 'hod-1',
    instructions: 'Ensure safety cordon before repairing main collar.',
    assigned_at: '2026-11-27T08:00:00Z',
    due_at: '2026-11-30T08:00:00Z',
    original_due_at: '2026-11-30T08:00:00Z',
    started_at: '2026-11-27T09:00:00Z',
    status: 'in_progress',
    assigned_duration_hours: 72,
    extension_requested_due_at: null,
    extension_reason: null,
    reviewed_at: null,
    review_note: null,
    citizen_dispute_pending: false,
  };

  const mockComplaint: HeadIndependentComplaintRow = {
    id: 'CMP-2026-001',
    referenceNumber: 'REF-KMC-001',
    heading: 'Severed Sewerage Line on Nishtar Road',
    sanitizedText: 'Major sewage overflow flooding the pedestrian walkway.',
    rawText: 'Nishtar road pe gutter ka paani nikal raha hai.',
    factualSummary: 'Major sewage overflow on Nishtar Road.',
    submittedAt: '2026-11-27T07:00:00Z',
    department: 'kmc',
    departmentName: 'Karachi Municipal Corporation',
    priority: 'HIGH',
    status: 'assigned',
    publicPlace: 'Nishtar Road',
    locality: 'Garden West',
    district: 'Karachi South',
    latitude: 24.8765,
    longitude: 67.0234,
    photoUrl: 'https://example.com/citizen-evidence.jpg',
  };

  it('renders all Sections A through G in full-width document', () => {
    const handleBack = vi.fn();
    const handleOpenResolution = vi.fn();
    const handleOpenExtension = vi.fn();

    render(
      <OfficerWorkDetail
        order={mockOrder}
        complaint={mockComplaint}
        onBack={handleBack}
        onOpenResolution={handleOpenResolution}
        onOpenExtension={handleOpenExtension}
        onOpenLightbox={vi.fn()}
      />
    );

    // Section A: Header
    expect(screen.getByText('Back to my work')).toBeInTheDocument();
    expect(screen.getByText('REF #REF-KMC-001')).toBeInTheDocument();
    expect(screen.getByText('HIGH PRIORITY')).toBeInTheDocument();
    expect(screen.getByText('In Progress', { exact: true })).toBeInTheDocument();

    // Section B: Timeline & Deadline
    expect(screen.getByText('Assigned On')).toBeInTheDocument();
    expect(screen.getByText('Work Commenced')).toBeInTheDocument();
    expect(screen.getByText('Completion Deadline')).toBeInTheDocument();
    expect(screen.getByText('Remaining Time')).toBeInTheDocument();

    // Section C: Narrative
    expect(screen.getByText('Citizen Complaint Narrative')).toBeInTheDocument();
    expect(screen.getByText('Major sewage overflow flooding the pedestrian walkway.')).toBeInTheDocument();

    // Section D: Location & Google Maps
    const viewLocationBtn = screen.getByTestId('view-location-btn');
    const getDirectionsBtn = screen.getByTestId('get-directions-btn');
    expect(viewLocationBtn).toHaveAttribute('href', expect.stringContaining('google.com/maps/search/?api=1&query=24.8765%2C67.0234'));
    expect(getDirectionsBtn).toHaveAttribute('href', expect.stringContaining('google.com/maps/dir/?api=1&destination=24.8765%2C67.0234'));

    // Section E: Citizen Evidence
    expect(screen.getByText('Citizen Photographic Evidence')).toBeInTheDocument();
    expect(screen.getByAltText('Citizen submitted evidence')).toBeInTheDocument();

    // Section F: Supervisor Instructions
    expect(screen.getByText(/Supervisor Directives/i)).toBeInTheDocument();
    expect(screen.getByText('Ensure safety cordon before repairing main collar.')).toBeInTheDocument();

    // Section G: Work Actions
    const submitBtn = screen.getByTestId('submit-completed-work-btn');
    const extBtn = screen.getByTestId('request-more-time-btn');

    fireEvent.click(submitBtn);
    expect(handleOpenResolution).toHaveBeenCalled();

    fireEvent.click(extBtn);
    expect(handleOpenExtension).toHaveBeenCalled();

    const backBtn = screen.getByTestId('v21-8-back-to-work-list');
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalled();
  });

  it('renders "Start Working" button when order is assigned but not commenced', () => {
    const unstartedOrder: DepartmentWorkOrder = {
      ...mockOrder,
      started_at: null,
      status: 'assigned',
    };
    const handleStart = vi.fn();

    render(
      <OfficerWorkDetail
        order={unstartedOrder}
        complaint={mockComplaint}
        onBack={vi.fn()}
        onStartWork={handleStart}
        onOpenResolution={vi.fn()}
        onOpenExtension={vi.fn()}
        onOpenLightbox={vi.fn()}
      />
    );

    const startBtn = screen.getByTestId('start-working-btn');
    expect(startBtn).toBeInTheDocument();
    fireEvent.click(startBtn);
    expect(handleStart).toHaveBeenCalledWith('order-kmc-101');
  });
});

describe('V21.8 Dedicated Work Resolution Form', () => {
  const mockOrder: DepartmentWorkOrder = {
    id: 'order-kmc-101',
    department_id: 'kmc',
    anchor_complaint_id: 'CMP-2026-001',
    case_label: 'Severed Sewerage Line on Nishtar Road',
    officer_id: 'officer-1',
    assigned_by: 'hod-1',
    instructions: 'Ensure safety cordon before repairing main collar.',
    assigned_at: '2026-11-27T08:00:00Z',
    due_at: '2026-11-30T08:00:00Z',
    original_due_at: '2026-11-30T08:00:00Z',
    started_at: '2026-11-27T09:00:00Z',
    status: 'in_progress',
    assigned_duration_hours: 72,
    extension_requested_due_at: null,
    extension_reason: null,
    reviewed_at: null,
    review_note: null,
    citizen_dispute_pending: false,
  };

  const mockComplaint: HeadIndependentComplaintRow = {
    id: 'CMP-2026-001',
    referenceNumber: 'REF-KMC-001',
    heading: 'Severed Sewerage Line on Nishtar Road',
    sanitizedText: 'Major sewage overflow flooding the pedestrian walkway.',
    rawText: 'Nishtar road pe gutter ka paani nikal raha hai.',
    factualSummary: 'Major sewage overflow on Nishtar Road.',
    submittedAt: '2026-11-27T07:00:00Z',
    department: 'kmc',
    departmentName: 'Karachi Municipal Corporation',
    priority: 'HIGH',
    status: 'assigned',
    publicPlace: 'Nishtar Road',
    locality: 'Garden West',
    district: 'Karachi South',
    latitude: 24.8765,
    longitude: 67.0234,
    photoUrl: 'https://example.com/citizen-photo.jpg',
  };

  it('renders dedicated form and handles camera capture and notes', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <WorkResolutionForm
        order={mockOrder}
        complaint={mockComplaint}
        onBack={vi.fn()}
        onSubmit={handleSubmit}
        onOpenLightbox={vi.fn()}
      />
    );

    expect(screen.getByText('Submit completed work')).toBeInTheDocument();
    expect(screen.getByText(/1\. Original Citizen Evidence/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Completed Work Evidence/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. On-Site GPS Location Verification/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Work Completion Notes/i)).toBeInTheDocument();

    // Verify rear-camera capture attribute
    const fileInput = screen.getByTestId('evidence-file-input');
    expect(fileInput).toHaveAttribute('accept', 'image/*');
    expect(fileInput).toHaveAttribute('capture', 'environment');

    // Add completion notes
    const notesInput = screen.getByTestId('completion-notes-input');
    fireEvent.change(notesInput, {
      target: { value: 'Replaced main collar and sealed sewer line pipe with high-density bitumen.' },
    });
    expect(notesInput).toHaveValue('Replaced main collar and sealed sewer line pipe with high-density bitumen.');

    // Attach mock photo file
    const file = new File(['dummy-evidence-content'], 'repaired-pipe.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Submit button should now be enabled
    const submitBtn = screen.getByTestId('submit-for-verification-btn');
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        'order-kmc-101',
        file,
        expect.objectContaining({
          latitude: expect.any(Number),
          longitude: expect.any(Number),
          accuracy: expect.any(Number),
        })
      );
    });
  });
});

describe('V21.8 Centered Submission Confirmation Modal', () => {
  it('renders centered confirmation modal dialog with details', () => {
    const handleClose = vi.fn();
    render(
      <WorkConfirmationModal
        isOpen={true}
        referenceNumber="REF-KMC-001"
        orderId="order-kmc-101"
        onClose={handleClose}
      />
    );

    expect(screen.getByText('Submitted for verification')).toBeInTheDocument();
    expect(screen.getByText(/Your completed work has been submitted to the Head of Department for review\./i)).toBeInTheDocument();
    expect(screen.getByText('REF #REF-KMC-001')).toBeInTheDocument();
    expect(screen.getByText('#order-kmc-101')).toBeInTheDocument();
    expect(screen.getByText('Awaiting Verification')).toBeInTheDocument();

    const backBtn = screen.getByTestId('v21-8-back-to-work-btn');
    fireEvent.click(backBtn);
    expect(handleClose).toHaveBeenCalled();
  });
});

describe('V21.8 OfficerWorkView Complete Orchestration', () => {
  const mockOrders: DepartmentWorkOrder[] = [
    {
      id: 'order-kmc-101',
      department_id: 'kmc',
      anchor_complaint_id: 'CMP-2026-001',
      case_label: 'Severed Sewerage Line on Nishtar Road',
      officer_id: 'officer-1',
      assigned_by: 'hod-1',
      instructions: 'Ensure safety cordon before repairing main collar.',
      assigned_at: '2026-11-27T08:00:00Z',
      due_at: '2026-11-30T08:00:00Z',
      original_due_at: '2026-11-30T08:00:00Z',
      started_at: '2026-11-27T09:00:00Z',
      status: 'in_progress',
      assigned_duration_hours: 72,
      extension_requested_due_at: null,
      extension_reason: null,
      reviewed_at: null,
      review_note: null,
      citizen_dispute_pending: false,
    },
  ];

  const mockComplaints: HeadIndependentComplaintRow[] = [
    {
      id: 'CMP-2026-001',
      referenceNumber: 'REF-KMC-001',
      heading: 'Severed Sewerage Line on Nishtar Road',
      sanitizedText: 'Major sewage overflow flooding the pedestrian walkway.',
      rawText: 'Nishtar road pe gutter ka paani nikal raha hai.',
      factualSummary: 'Major sewage overflow on Nishtar Road.',
      submittedAt: '2026-11-27T07:00:00Z',
      department: 'kmc',
      departmentName: 'Karachi Municipal Corporation',
      priority: 'HIGH',
      status: 'assigned',
      publicPlace: 'Nishtar Road',
      locality: 'Garden West',
      district: 'Karachi South',
      latitude: 24.8765,
      longitude: 67.0234,
      photoUrl: 'https://example.com/photo.jpg',
    },
  ];

  it('navigates list -> detail -> resolution -> submit -> confirmation -> list', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const handleExt = vi.fn().mockResolvedValue(undefined);
    const handleStart = vi.fn().mockResolvedValue(undefined);

    render(
      <OfficerWorkView
        departmentCode="KMC"
        orders={mockOrders}
        complaints={mockComplaints}
        onSubmitCompletion={handleSubmit}
        onRequestMoreTime={handleExt}
        onStartWork={handleStart}
      />
    );

    // 1. Initial State: List
    expect(screen.getByText('My work')).toBeInTheDocument();
    expect(screen.getByText('REF #REF-KMC-001')).toBeInTheDocument();

    // 2. Click "Open complaint" to navigate to detail
    const openBtn = screen.getByTestId('open-complaint-btn-order-kmc-101');
    fireEvent.click(openBtn);

    // Now in detail view
    expect(screen.getByTestId('officer-work-detail')).toBeInTheDocument();
    expect(screen.getByText('Citizen Complaint Narrative')).toBeInTheDocument();

    // 3. Click "Submit completed work" to open resolution form
    const submitCompletedBtn = screen.getByTestId('submit-completed-work-btn');
    fireEvent.click(submitCompletedBtn);

    // Now in resolution form
    expect(screen.getByTestId('work-resolution-form')).toBeInTheDocument();

    // 4. Attach photo and submit
    const fileInput = screen.getByTestId('evidence-file-input');
    const file = new File(['evidence'], 'repaired.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const submitBtn = screen.getByTestId('submit-for-verification-btn');
    fireEvent.click(submitBtn);

    // 5. Confirmation dialog appears
    await waitFor(() => {
      expect(screen.getByText('Submitted for verification')).toBeInTheDocument();
    });

    // 6. Dismiss confirmation dialog -> Returns to list
    const backToWorkBtn = screen.getByTestId('v21-8-back-to-work-btn');
    fireEvent.click(backToWorkBtn);

    expect(screen.getByText('My work')).toBeInTheDocument();
  });
});
