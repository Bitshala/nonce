import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from './http/queryClient.ts';
import Login from './pages/Login.tsx';
import Home from './pages/Home.tsx';
import TableView from './pages/TableView.tsx';
import { CohortSelection } from './pages/CohortSelection.tsx';
import { ResultPage } from './pages/ResultPage.tsx';
// import StudentDetailPage from './StudentsPage.tsx';
import StudentDetailPage from './pages/StudentDetailPage.tsx';

import '@fontsource/sora';
import 'virtual:uno.css';
import FeedbackTable from './pages/Feedback.tsx';


import CohortParticipantLogin from './pages/Students/studentLogin.tsx';
import WeekSelector from './pages/Students/weekSelector.tsx';
import StudentCohortSelector from './pages/Students/studentCohortSelector.tsx';

import MBInstructions from './pages/Students/MBInstructions.tsx';
import StudentProfileData from './components/student/StudentProfileData.tsx';

import MyError from './pages/404error.tsx';
import MyStudentDashboard from './pages/myProfile/myStudentDashboard.tsx';
import ProfilePage from './pages/myProfile/profilePage.tsx';
import MyCohortInstructions from './pages/myProfile/myCohortInstructions.tsx';
import CohortFeedback from './pages/CohortFeedback.tsx';
import AdminPage from './pages/admin/page.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { UserRole } from './types/enums.ts';

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
    path: '/cohort/:id',
    element: (
      <ProtectedRoute requiredRole={UserRole.ADMIN || UserRole.TEACHING_ASSISTANT}>
        <TableView />
      </ProtectedRoute>
    ),
  },
  {
    path: '/detailPage',
    element: <StudentDetailPage />,
  },
  {
    path: '/results/:id',
    element: <ResultPage />,
  },
    {
    path: '/feedback',
    element: <FeedbackTable />,
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
      path: '/*',
      element: <MyError />,
    },
      {
      path: '/myDashboard',
      element: <MyStudentDashboard />,
    },
    {
      path: '/:userId/aboutMe',
      element: <ProfilePage />,
    },
    {
      path: '/:cohortId/instructions',
      element: <MyCohortInstructions />,
    },
    {
      path: '/cohort/feedback',
      element: <CohortFeedback />,
    },
    {
      path: '/admin',
      element: (
        <ProtectedRoute requiredRole={UserRole.ADMIN}>
          <AdminPage />
        </ProtectedRoute>
      ),
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



createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);