import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FieldOperationsDesk } from '../features/department/components/FieldOperationsDesk';
import { fieldOperations } from '../features/department/services/fieldOperations';
import { caseOperationsService } from '../services/CaseOperationsService';
import type { DepartmentWorkOrder } from '../features/department/services/fieldOperations';

const assigned: DepartmentWorkOrder = {
  id:'record-1', department_id:'kmc', anchor_complaint_id:'complaint-1',
  case_label:'Dangerous uncovered manhole', officer_id:'officer-1',assigned_by:'head-1',
  instructions:'Install a proper sealed cover and upload on-site proof.',
  assigned_at:'2026-11-20T10:00:00Z', original_due_at:'2026-11-24T10:00:00Z',
  due_at:'2026-11-24T10:00:00Z',started_at:null,status:'assigned',
  extension_requested_due_at:null,extension_reason:null,reviewed_at:null,review_note:null,
  citizen_dispute_pending:false,
};

afterEach(()=>vi.restoreAllMocks());

describe('V13.18 role-specific department workspace',()=>{
  it('presents a supervisor dispatch and team selection without exposing personal complaint details',async()=>{
    vi.spyOn(fieldOperations,'orders').mockResolvedValue([assigned]);
    vi.spyOn(fieldOperations,'team').mockResolvedValue([{user_id:'officer-1',display_name:'Officer Javed',staff_role:'officer',active_cases:1,verified_cases:5,on_time_cases:4,overdue_cases:0,disputed_cases:0}]);
    vi.spyOn(caseOperationsService,'listDepartmentCases').mockResolvedValue({items:[],nextCursor:null,prevCursor:null,total:0,page:0,pageSize:100,totalPages:1});
    render(<FieldOperationsDesk departmentId="kmc" userId="head-1" role="head" view="dispatch"/>);
    await waitFor(()=>expect(screen.getByText('Dangerous uncovered manhole')).toBeInTheDocument());
    expect(screen.queryByText('Assign this case')).not.toBeInTheDocument();
    expect(screen.getByText('Ready for assignment')).toBeInTheDocument();
    expect(screen.getByText('Assigned work orders')).toBeInTheDocument();
  });
  it('shows the officer only their own work and no assignment form',async()=>{
    vi.spyOn(fieldOperations,'orders').mockResolvedValue([assigned,{...assigned,id:'record-2',officer_id:'other-officer',case_label:'Private other officer task'}]);
    render(<FieldOperationsDesk departmentId="kmc" userId="officer-1" role="officer" view="field"/>);
    await waitFor(()=>expect(screen.getByText('Dangerous uncovered manhole')).toBeInTheDocument());
    expect(screen.queryByText('Private other officer task')).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:/Start work/i})).toBeInTheDocument();
    expect(screen.queryByText('Ready for assignment')).not.toBeInTheDocument();
  });
  it('keeps completed orders out of active work and in a separate archive',async()=>{
    vi.spyOn(fieldOperations,'orders').mockResolvedValue([{...assigned,status:'verified'}]);
    const {rerender}=render(<FieldOperationsDesk departmentId="kmc" userId="officer-1" role="officer" view="field"/>);
    await waitFor(()=>expect(screen.getByText('No active work orders in this view.')).toBeInTheDocument());
    rerender(<FieldOperationsDesk departmentId="kmc" userId="officer-1" role="officer" view="field_archive"/>);
    await waitFor(()=>expect(screen.getByText('Dangerous uncovered manhole')).toBeInTheDocument());
    expect(screen.getByText('Verified work history')).toBeInTheDocument();
  });
  it('places a citizen-disputed repair back into the assigned officer workflow',async()=>{
    vi.spyOn(fieldOperations,'orders').mockResolvedValue([{
      ...assigned,status:'returned',citizen_dispute_pending:true,
    }]);
    render(<FieldOperationsDesk departmentId="kmc" userId="officer-1" role="officer" view="field"/>);
    expect(await screen.findByText('CITIZEN DISPUTE / REWORK')).toBeInTheDocument();
    expect(screen.getByText(/revisit the issue and provide new evidence/i)).toBeInTheDocument();
    expect(screen.getByRole('button',{name:/Start work/i})).toBeInTheDocument();
  });
  it('lets a head document a nonresponse closure without silently bypassing the 72-hour gate',async()=>{
    const close=vi.spyOn(fieldOperations,'closeVerified').mockResolvedValue(1);
    vi.spyOn(fieldOperations,'orders').mockResolvedValue([{...assigned,status:'verified'}]);
    vi.spyOn(fieldOperations,'team').mockResolvedValue([]);
    vi.spyOn(caseOperationsService,'listDepartmentCases').mockResolvedValue({items:[],nextCursor:null,prevCursor:null,total:0,page:0,pageSize:100,totalPages:1});
    render(<FieldOperationsDesk departmentId="kmc" userId="head-1" role="head" view="field_archive"/>);
    const field=await screen.findByLabelText(/Reason for closure without a citizen response/i);
    fireEvent.change(field,{target:{value:'No citizen responded within the published review period; proof reviewed manually.'}});
    fireEvent.click(screen.getByRole('button',{name:/Close verified reports/i}));
    await waitFor(()=>expect(close).toHaveBeenCalledWith('record-1','No citizen responded within the published review period; proof reviewed manually.'));
  });
  it('assigns real linked complaint ids, officer identity and a deadline through the service',async()=>{
    const assignment = vi.spyOn(fieldOperations,'assign').mockResolvedValue('new-order-id');
    vi.spyOn(fieldOperations,'orders').mockResolvedValue([]);
    vi.spyOn(fieldOperations,'team').mockResolvedValue([{user_id:'officer-1',display_name:'Officer Javed',staff_role:'officer',active_cases:0,verified_cases:0,on_time_cases:0,overdue_cases:0,disputed_cases:0}]);
    vi.spyOn(caseOperationsService,'listDepartmentCases').mockResolvedValue({items:[{id:'C-2001',title:'Broken pipe on Tariq Road',caseNumber:'C-2001',locality:'PECHS',publicPlace:'Tariq Road',linkedReportCount:2,priority:'high'} as never],nextCursor:null,prevCursor:null,total:1,page:0,pageSize:100,totalPages:1});
    vi.spyOn(caseOperationsService,'listCaseReports').mockResolvedValue({items:[{complaintId:'af6b4fad-79e1-47c4-82cf-ef63b8b63288'},{complaintId:'ad792c1a-82f5-4abc-9330-06f934734ab2'}] as never,nextCursor:null,prevCursor:null,total:2,page:0,pageSize:100,totalPages:1});
    render(<FieldOperationsDesk departmentId="kmc" userId="head-1" role="head" view="dispatch"/>);
    fireEvent.click(await screen.findByRole('button',{name:/Broken pipe on Tariq Road/i}));
    // Stage 1: Case Review -> Proceed to Stage 2
    fireEvent.click(screen.getByRole('button', { name: /Next: Choose Officer/i }));
    // Stage 2: Select Officer -> Proceed to Stage 3
    fireEvent.change(screen.getByLabelText('Responsible officer'),{target:{value:'officer-1'}});
    fireEvent.click(screen.getByRole('button', { name: /Next: Set Deadline/i }));
    // Stage 3: Deadline -> Proceed to Stage 4
    fireEvent.click(screen.getByRole('button', { name: /Next: Write Instructions/i }));
    // Stage 4: Enter Instructions (min 8 chars) -> Proceed to Stage 5
    fireEvent.change(screen.getByLabelText(/Instructions/i), { target: { value: 'Inspect and fix broken pipe urgently.' } });
    fireEvent.click(screen.getByRole('button', { name: /Next: Review Summary/i }));
    // Stage 5: Confirm & Dispatch
    fireEvent.click(screen.getByRole('button',{name:/Assign with deadline/i}));
    await waitFor(()=>expect(assignment).toHaveBeenCalledOnce());
    const input=assignment.mock.calls[0][0];
    expect(input.anchorComplaintId).toBe('af6b4fad-79e1-47c4-82cf-ef63b8b63288');
    expect(input.reportIds).toHaveLength(2);
    expect(input.officerId).toBe('officer-1');
    expect(new Date(input.dueAt).getTime()).toBeGreaterThan(Date.now());
  });
});
