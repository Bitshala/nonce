import React from 'react';
import CohortInstructions from '../../components/instructions/CohortInstructions';
import { lnWeeks } from '../../data/lnWeeks';

const LNInstructions: React.FC = () => {
  return (
    <CohortInstructions
      cohortType="MASTERING_LIGHTNING_NETWORK"
      cohortName="LN"
      weeklyContent={lnWeeks}
    />
  );
};

export default LNInstructions;
