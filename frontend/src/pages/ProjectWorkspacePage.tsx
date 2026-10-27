import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Project, DocumentSource, Conversation } from '../types';
import { api } from '../services/api';
import { ConversationList } from '../components/workspace/ConversationList';
import { ChatView } from '../components/workspace/ChatView';
import { KnowledgeBasePanel } from '../components/workspace/KnowledgeBasePanel';
import { ProcessingInspectorModal } from '../components/inspector/ProcessingInspectorModal';

export const ProjectWorkspacePage: React.FC = () => {
  const { projectId, conversationId } = useParams<{ projectId: string; conversationId?: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<DocumentSource[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedDocForInspect, setSelectedDocForInspect] = useState<DocumentSource | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      const [projData, docsData, convsData] = await Promise.all([
        api.getProject(projectId),
        api.getDocuments(projectId),
        api.getConversations(projectId),
      ]);
      setProject(projData);
      setDocuments(docsData);
      setConversations(convsData);
    } catch (err) {
      console.error('Failed to load project workspace data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Handle file upload
  const handleUploadFile = async (file: File) => {
    if (!projectId) return;
    try {
      setIsUploading(true);
      const newDoc = await api.uploadDocument(projectId, file);
      setDocuments((prev) => [newDoc, ...prev]);
      showToast(`Uploaded ${file.name}`);
      // Open inspector modal to observe live processing stages
      setSelectedDocForInspect(newDoc);
      setIsInspectorOpen(true);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle URL ingestion
  const handleIngestUrl = async (url: string) => {
    if (!projectId) return;
    try {
      const newDoc = await api.ingestUrl(projectId, url);
      setDocuments((prev) => [newDoc, ...prev]);
      showToast(`Ingesting ${url}`);
      setSelectedDocForInspect(newDoc);
      setIsInspectorOpen(true);
    } catch (err: any) {
      alert(err.message || 'URL ingestion failed');
    }
  };

  // Handle document deletion
  const handleDeleteDocument = async (id: string) => {
    await api.deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  // Handle retry ingestion
  const handleRetryIngestion = async (id: string) => {
    const updated = await api.retryIngestion(id);
    setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)));
  };

  // Handle new conversation
  const handleNewConversation = async () => {
    if (!projectId) return;
    const count = conversations.length + 1;
    const title = `Chat #${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      const conv = await api.createConversation(projectId, title);
      setConversations((prev) => [conv, ...prev]);
      showToast('Chat created successfully');
      navigate(`/projects/${projectId}/c/${conv.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create conversation');
    }
  };

  // Handle conversation deletion
  const handleDeleteConversation = async (id: string) => {
    await api.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (conversationId === id) {
      navigate(`/projects/${projectId}`);
    }
  };

  const activeConversation = conversations.find((c) => c.id === conversationId);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0B0A10] text-[#A6A0B5] gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#A78BFA]" />
        <span className="text-xs">Loading project workspace...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0B0A10] text-[#F5F3FA] p-8">
        <h3 className="text-lg font-semibold mb-2">Project not found</h3>
        <button
          onClick={() => navigate('/projects')}
          className="text-xs text-[#A78BFA] hover:underline"
        >
          Return to projects dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden relative">
      {/* Toast Notification matching reference screenshot */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#171521] border border-[#302B3D] text-[#F5F3FA] text-xs font-semibold px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 animate-bounce-subtle">
          <CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Center workspace area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {activeConversation ? (
          <ChatView
            conversation={activeConversation}
            onBack={() => navigate(`/projects/${projectId}`)}
          />
        ) : (
          <ConversationList
            project={project}
            conversations={conversations}
            onNewConversation={handleNewConversation}
            onSelectConversation={(id) => navigate(`/projects/${projectId}/c/${id}`)}
            onDeleteConversation={handleDeleteConversation}
          />
        )}
      </div>

      {/* Right Knowledge Base Panel */}
      <KnowledgeBasePanel
        documents={documents}
        onUploadFile={handleUploadFile}
        onIngestUrl={handleIngestUrl}
        onDeleteDocument={handleDeleteDocument}
        onSelectDocument={(doc) => {
          setSelectedDocForInspect(doc);
          setIsInspectorOpen(true);
        }}
        isUploading={isUploading}
      />

      {/* Document Processing Inspector Modal */}
      <ProcessingInspectorModal
        document={selectedDocForInspect}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        onRetry={handleRetryIngestion}
      />
    </div>
  );
};
