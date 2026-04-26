import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import StudentDashboard from '../../StudentDashboard';
import TeacherDashboard from '../teacher/TeacherDashboard';
import AdminDashboard from '../admin/AdminDashboard';

const DashboardPage = () => {
  const { user } = useAuth();
  if (user?.role === 'admin') return <AdminDashboard />;
  if (user?.role === 'teacher') return <TeacherDashboard />;
  return <StudentDashboard />;
};

export default DashboardPage;
