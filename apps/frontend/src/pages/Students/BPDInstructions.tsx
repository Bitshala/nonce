import React from 'react';
import CohortInstructions from '../../components/instructions/CohortInstructions';
import { bpdWeeks } from '../../data/bpdWeeks';

const BPDInstructions: React.FC = () => {
  return (
    <CohortInstructions
      cohortType="BITCOIN_PROTOCOL_DEVELOPMENT"
      cohortName="BPD"
      weeklyContent={bpdWeeks}
    />
  );
};

export default BPDInstructions;
