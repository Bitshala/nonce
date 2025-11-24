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


import WeekSelector from './pages/Students/weekSelector.tsx';
import StudentCohortSelector from './pages/Students/studentCohortSelector.tsx';

import MBInstructions from './pages/Students/MBInstructions.tsx';
import LBTCLInstructions from './pages/Students/LBTCLInstructions.tsx';
import StudentProfileData from './components/student/StudentProfileData.tsx';

import MyError from './pages/404error.tsx';
import MyStudentDashboard from './pages/myProfile/myStudentDashboard.tsx';
import ProfilePage from './pages/myProfile/profilePage.tsx';
import MyCohortInstructions from './pages/myProfile/myCohortInstructions.tsx';
import CohortFeedback from './pages/CohortFeedback.tsx';
import AdminPage from './pages/admin/page.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { UserRole } from './types/enums.ts';
import Layout from './components/Layout.tsx';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Layout><Login /></Layout>,
  },
  {
    path: '/',
    element: <Layout><Home /></Layout>,
  },
  {
    path: '/select',
    element: <Layout><CohortSelection /></Layout>,
  },
  {
    path: '/cohort/:id',
    element: <Layout><TableView /></Layout>,
  },
  {
    path: '/detailPage',
    element: <Layout><StudentDetailPage /></Layout>,
  },
  {
    path: '/results/:id',
    element: <Layout><ResultPage /></Layout>,
  },
  {
    path: '/mb-instructions',
    element: <Layout><MBInstructions /></Layout>,
  },
  {
    path: '/lbtcl-instructions',
    element: <Layout><LBTCLInstructions /></Layout>,
  },
  {
    path:'/me',
    element: <Layout><StudentProfileData /></Layout>
  },
    {
      path: '/weekSelector',
      element: <Layout><WeekSelector /></Layout>,
    },
        {
      path: '/cohortSelector',
      element: <Layout><StudentCohortSelector /></Layout>,
    },
    {
      path: '/*',
      element: <Layout><MyError /></Layout>,
    },
      {
      path: '/myDashboard',
      element: <Layout><MyStudentDashboard /></Layout>,
    },
    {
      path: '/:userId/aboutMe',
      element: <Layout><ProfilePage /></Layout>,
    },
    {
      path: '/:cohortId/instructions',
      element: <Layout><MyCohortInstructions /></Layout>,
    },
    {
      path: '/cohortfeedback',
      element: <Layout><CohortFeedback /></Layout>,
    },
    {
      path: '/admin',
      element: (
        <Layout>
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <AdminPage />
          </ProtectedRoute>
        </Layout>
      ),
    },
    {
      path: '/unauthorized',
      element: <Layout><div className="min-h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-400">Unauthorized</h1>
          <p className="text-zinc-400">You don't have permission to access this resource.</p>
        </div>
      </div></Layout>,
    }
]);



createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);