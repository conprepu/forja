import { Navigate, type RouteObject } from 'react-router'
import { Layout } from './Layout'
import { TodayScreen } from '../features/today/TodayScreen'
import { WorkoutScreen } from '../features/workout/WorkoutScreen'
import { NutritionScreen } from '../features/nutrition/NutritionScreen'
import { ProgressScreen } from '../features/progress/ProgressScreen'
import { ProfileScreen } from '../features/profile/ProfileScreen'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/hoy" replace /> },
      { path: 'hoy', element: <TodayScreen /> },
      { path: 'entreno', element: <WorkoutScreen /> },
      { path: 'comida', element: <NutritionScreen /> },
      { path: 'progreso', element: <ProgressScreen /> },
      { path: 'perfil', element: <ProfileScreen /> },
      { path: '*', element: <Navigate to="/hoy" replace /> },
    ],
  },
]
