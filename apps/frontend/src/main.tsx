import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from './services/queryClientFactory';

import Login from './pages/Login.tsx';
import Home from './pages/OAuthCallback.tsx';
import TableView from './pages/TableView.tsx';
import { CohortSelection } from './pages/CohortSelection.tsx';
import { ResultPage } from './pages/ResultPage.tsx';
// import StudentDetailPage from './StudentsPage.tsx';
import StudentDetailPage from './pages/StudentDetailPage.tsx';

import Instructions from './pages/Students/Instructions.tsx';


import 'virtual:uno.css';
import FeedbackTable from './pages/Feedback.tsx';
import InstructionsWeekOne from './pages/Students/InstructionsWeekOne.tsx';

import CohortParticipantLogin from './pages/Students/studentLogin.tsx';
import WeekSelector from './pages/Students/weekSelector.tsx';
import StudentCohortSelector from './pages/Students/studentCohortSelector.tsx';
import InstructionsWeekTwo from './pages/Students/InstructionsWeekTwo.tsx';
import InstructionsWeekThree from './pages/Students/InstructionsWeekThree.tsx';
import InstructionsWeekFour from './pages/Students/InstructionsWeekFour.tsx';
import InstructionsWeekFive from './pages/Students/InstructionsWeekFive.tsx';
import MBInstructions from './pages/Students/MBInstructions.tsx';
import StudentProfileData from './components/student/StudentProfileData.tsx';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/select',
    element: <CohortSelection />,
  },
  {
    path: '/admin',
    element: <TableView />,
  },
  {
    path: '/detailPage',
    element: <StudentDetailPage />,
  },
  {
    path: '/result',
    element: <ResultPage />,
  },
    {
    path: '/feedback',
    element: <FeedbackTable />,
  },
     {
    path: '/instructions',
    element: <Instructions/>,
  },
       {
    path: '/instructions/1',
    element: <InstructionsWeekOne />,
  },
       {
    path: '/instructions/2',
    element: <InstructionsWeekTwo />,
  },
         {
    path: '/instructions/3',
    element: <InstructionsWeekThree />,
  },
  {
    path: '/instructions/4',
    element: <InstructionsWeekFour />,
  },
  {
    path: '/instructions/5',
    element: <InstructionsWeekFive />,
  },
  {
    path: '/mb-instructions',
    element: <MBInstructions />,
  },
  {
    path:'/me',
    element:<StudentProfileData/>
  },
  {
    path: '/participants',
    element: <CohortParticipantLogin />,
  },
    {
      path: '/weekSelector',
      element: <WeekSelector />,
    },
        {
      path: '/cohortSelector',
      element: <StudentCohortSelector />,
    },
    {
      path: '/unauthorized',
      element: <div className="min-h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-400">Unauthorized</h1>
          <p className="text-zinc-400">You don't have permission to access this resource.</p>
        </div>
      </div>,
    }
]);

const queryClient = createQueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);