/**
 * ProjectList Component
 * 
 * Displays all projects with status filtering and search capabilities.
 * Handles loading states and error conditions gracefully.
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Folder, 
  Calendar, 
  Users, 
  Search, 
  Filter,
  Loader,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

import { fetchProjects, PROJECT_STATUS } from '../services/api';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Controls = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  
  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
  
  &::placeholder {
    color: #a0aec0;
  }
`;

const FilterSelect = styled.select`
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const ProjectGrid = styled.div`
  display: grid;
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #cbd5e0;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #a0aec0;
  }
`;const ProjectCard = styled.div`
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    border-color: #667eea;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  }
`;

const ProjectHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const ProjectTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
  line-height: 1.4;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  
  ${props => {
    switch (props.status) {
      case 'active':
        return 'background: #d4f6d4; color: #2d7d32;';
      case 'completed':
        return 'background: #e3f2fd; color: #1565c0;';
      case 'archived':
        return 'background: #f5f5f5; color: #616161;';
      default:
        return 'background: #fff3e0; color: #ef6c00;';
    }
  }}
`;

const ProjectMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.75rem;
  color: #718096;
  margin-top: 0.5rem;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  svg {
    width: 12px;
    height: 12px;
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #718096;
  
  svg {
    margin-right: 0.5rem;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ErrorState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #e53e3e;
  text-align: center;
  
  svg {
    margin-right: 0.5rem;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #718096;
`;const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, statusFilter]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchProjects();
      const projectsData = response.data?.projects || [];
      
      setProjects(projectsData);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    let filtered = [...projects];

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(project =>
        project.name?.toLowerCase().includes(term) ||
        project.description?.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => 
        project.status?.toLowerCase() === statusFilter
      );
    }

    setFilteredProjects(filtered);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <LoadingState>
        <Loader size={20} />
        Loading projects...
      </LoadingState>
    );
  }

  if (error) {
    return (
      <ErrorState>
        <AlertTriangle size={20} />
        <div>
          <div>Failed to load projects</div>
          <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {error}
          </div>
        </div>
      </ErrorState>
    );
  }  return (
    <Container>
      <Controls>
        <SearchInput
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <FilterSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </FilterSelect>
      </Controls>

      <ProjectGrid>
        {filteredProjects.length === 0 ? (
          <EmptyState>
            {projects.length === 0 ? 'No projects found' : 'No projects match your filters'}
          </EmptyState>
        ) : (
          filteredProjects.map((project) => (
            <ProjectCard key={project.id}>
              <ProjectHeader>
                <ProjectTitle>{project.name}</ProjectTitle>
                <StatusBadge status={project.status}>
                  {project.status || 'Unknown'}
                </StatusBadge>
              </ProjectHeader>
              
              {project.description && (
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: '#718096', 
                  marginBottom: '0.75rem',
                  lineHeight: '1.4'
                }}>
                  {project.description.length > 100 
                    ? `${project.description.substring(0, 100)}...`
                    : project.description
                  }
                </div>
              )}
              
              <ProjectMeta>
                <MetaItem>
                  <Calendar />
                  Start: {formatDate(project.startDate)}
                </MetaItem>
                <MetaItem>
                  <Calendar />
                  End: {formatDate(project.endDate)}
                </MetaItem>
              </ProjectMeta>
            </ProjectCard>
          ))
        )}
      </ProjectGrid>
    </Container>
  );
};

export default ProjectList;