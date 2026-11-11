import React from 'react';
import { ComplaintWizard } from './complaint-wizard/ComplaintWizard';

export interface ComplaintFormProps {
  embedded?: boolean;
}

export const ComplaintForm: React.FC<ComplaintFormProps> = ({ embedded = false }) => {
  return <ComplaintWizard embedded={embedded} />;
};

export default ComplaintForm;
