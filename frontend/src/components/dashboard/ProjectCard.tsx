import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, MoreVertical, Trash2, Edit2, FileText, MessageSquare } from 'lucide-react';
import { Project } from '../../types';

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onDelete,
  onRename,
}) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(project.name);

  const formattedDate = new Date(project.updatedAt || project.createdAt).toLocaleDateString(
    'en-GB',
    { day: '2-digit', month: '2-digit', year: 'numeric' }
  );

  const handleCardClick = () => {
    navigate(`/projects/${project.id}`);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.stopPropagation();
    if (name.trim() && name !== project.name) {
      onRename(project.id, name.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-[#171521] border border-[#302B3D] hover:border-[#4A435C] rounded-xl p-5 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between min-h-[170px]"
    >
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#201D2B] border border-[#302B3D] flex items-center justify-center text-[#A78BFA] group-hover:border-[#A78BFA]/40 transition-colors">
            <Folder className="w-5 h-5 fill-[#A78BFA]/20 text-[#A78BFA]" />
          </div>

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded text-[#A6A0B5] hover:text-[#F5F3FA] hover:bg-[#201D2B] transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-7 w-36 bg-[#201D2B] border border-[#302B3D] rounded-lg shadow-xl py-1 z-20">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setIsEditing(true);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left text-[#F5F3FA] hover:bg-[#171521] flex items-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#A78BFA]" />
                  Rename
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(project.id);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left text-[#FB7185] hover:bg-[#171521] flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5 text-[#FB7185]" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveRename} onClick={(e) => e.stopPropagation()} className="mb-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSaveRename}
              autoFocus
              className="w-full bg-[#0B0A10] border border-[#A78BFA] text-[#F5F3FA] text-sm font-semibold rounded px-2 py-1 outline-none"
            />
          </form>
        ) : (
          <h3 className="text-base font-semibold text-[#F5F3FA] group-hover:text-[#A78BFA] transition-colors truncate mb-1">
            {project.name}
          </h3>
        )}

        <p className="text-xs text-[#A6A0B5] line-clamp-2">
          {project.description || 'No description provided'}
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#302B3D]/50 text-xs text-[#6B657A]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1" title="Documents">
            <FileText className="w-3.5 h-3.5" />
            {project.documentCount}
          </span>
          <span className="flex items-center gap-1" title="Conversations">
            <MessageSquare className="w-3.5 h-3.5" />
            {project.conversationCount}
          </span>
        </div>
        <span>{formattedDate}</span>
      </div>
    </div>
  );
};
