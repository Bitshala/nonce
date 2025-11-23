import React from 'react';
import CohortInstructions from '../../components/instructions/CohortInstructions';
import { lbtclWeeks } from '../../data/lbtclWeeks';

const LBTCLInstructions: React.FC = () => {
  return (
    <CohortInstructions
      cohortType="LEARNING_BITCOIN_FROM_COMMAND_LINE"
      cohortName="LBTCL"
      weeklyContent={lbtclWeeks}
    />
  );
};

export default LBTCLInstructions;
