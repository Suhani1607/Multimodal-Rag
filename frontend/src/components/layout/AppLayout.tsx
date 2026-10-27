import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { CreateProjectModal } from '../dashboard/CreateProjectModal';
import { SignInView } from '../auth/SignInView';
import { useAppAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const AppLayout: React.FC = () => {
  const { isSignedIn } = useAppAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const navigate = useNavigate();

  const handleCreateProject = async (name: string, description?: string) => {
    const project = await api.createProject(name, description);
    navigate(`/projects/${project.id}`);
  };

  // If user is not authenticated, show the elegant SignInView
  if (!isSignedIn) {
    return <SignInView />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0A10] text-[#F5F3FA]">
      <Sidebar
        onNewProject={() => setIsCreateOpen(true)}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Outlet context={{ openNewProjectModal: () => setIsCreateOpen(true) }} />
      </main>

      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateProject}
      />
    </div>
  );
};
