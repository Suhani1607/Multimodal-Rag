import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Search,
  LayoutGrid,
  List,
  Plus,
  FolderKanban,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Project } from '../types';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { ProjectCard } from '../components/dashboard/ProjectCard';
import { useAppAuth } from '../context/AuthContext';

export const ProjectsDashboardPage: React.FC = () => {
  const { openNewProjectModal } = useOutletContext<{ openNewProjectModal: () => void }>();
  const { user } = useAppAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [user?.id]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this project and all its documents?')) {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleRename = async (id: string, newName: string) => {
    await api.updateProject(id, newName);
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: newName } : p))
    );
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-8 max-w-7xl mx-auto w-full select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#302B3D]/60 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F3FA] tracking-tight">
            Projects
          </h1>
          <p className="text-xs text-[#A6A0B5] mt-0.5">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>

        <Button
          variant="primary"
          onClick={openNewProjectModal}
          leftIcon={<Plus className="w-4 h-4" />}
          className="text-xs font-semibold px-4 py-2"
        >
          Create new
        </Button>
      </div>

      {/* Search and Grid/List View Filter Bar */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#6B657A] absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#171521] border border-[#302B3D] text-sm text-[#F5F3FA] placeholder-[#6B657A] rounded-xl pl-10 pr-4 py-2 outline-none focus:border-[#A78BFA] transition-colors"
          />
        </div>

        <div className="flex items-center bg-[#171521] p-1 rounded-lg border border-[#302B3D]">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'grid'
                ? 'bg-[#201D2B] text-[#A78BFA]'
                : 'text-[#6B657A] hover:text-[#F5F3FA]'
            }`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'list'
                ? 'bg-[#201D2B] text-[#A78BFA]'
                : 'text-[#6B657A] hover:text-[#F5F3FA]'
            }`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Recent Projects Section */}
      <div className="flex flex-col flex-1">
        <h2 className="text-sm font-semibold text-[#A6A0B5] uppercase tracking-wider mb-4">
          Recent projects
        </h2>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-20 text-[#A6A0B5] gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#A78BFA]" />
            <span className="text-xs">Loading projects...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border border-dashed border-[#302B3D] rounded-2xl bg-[#171521]/30">
            <div className="w-14 h-14 rounded-2xl bg-[#171521] border border-[#302B3D] flex items-center justify-center text-[#A6A0B5] mb-4">
              <FolderKanban className="w-7 h-7 text-[#A78BFA]" />
            </div>
            <h3 className="text-base font-semibold text-[#F5F3FA] mb-1">
              {search ? 'No projects match your search' : 'No projects yet'}
            </h3>
            <p className="text-xs text-[#A6A0B5] max-w-sm mb-6 leading-relaxed">
              {search
                ? 'Try a different search term or clear the filter.'
                : 'Create your first project to organize documents and chat with AI.'}
            </p>
            {!search && (
              <Button
                variant="primary"
                onClick={openNewProjectModal}
                leftIcon={<Plus className="w-4 h-4" />}
                className="text-xs font-semibold"
              >
                Create project
              </Button>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'flex flex-col gap-2.5'
            }
          >
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
