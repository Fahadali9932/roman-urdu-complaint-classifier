import React from 'react';
import { SimplifiedComplaintContainer } from './simplified-complaint/SimplifiedComplaintContainer';

export interface ComplaintFormProps {
  embedded?: boolean;
}

export const ComplaintForm: React.FC<ComplaintFormProps> = () => {
  return <SimplifiedComplaintContainer />;
};

export default ComplaintForm;
