import React from 'react';
import { CinematicGlassContainer } from './cinematic-glass/CinematicGlassContainer';

export interface ComplaintFormProps {
  embedded?: boolean;
}

export const ComplaintForm: React.FC<ComplaintFormProps> = () => {
  return <CinematicGlassContainer />;
};

export default ComplaintForm;
