import React from 'react';
import CohortInstructions from '../../components/instructions/CohortInstructions';
import { mbWeeks } from '../../data/mbWeeks';

const MBInstructions: React.FC = () => {
  return (
    <CohortInstructions
      cohortType="MASTERING_BITCOIN"
      cohortName="MB"
      weeklyContent={mbWeeks}
    />
  );
};

export default MBInstructions;
