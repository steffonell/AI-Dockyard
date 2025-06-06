/**
 * TaskList Component
 * 
 * Displays recent tasks across all projects with status filtering.
 * Provides quick overview of task priorities and due dates.
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  CheckSquare, 
  Clock, 
  AlertCircle, 
  Calendar,
  Loader,
  AlertTriangle,
  Filter
} from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';

import { fetchAllTasks, TASK_STATUS } from '../services/api';

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

const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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
`;const TaskItem = styled.div`
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #667eea;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
  }
  
  ${props => props.isOverdue && `
    border-left: 4px solid #e53e3e;
    background: #fef5e7;
  `}
  
  ${props => props.isDueSoon && `
    border-left: 4px solid #f6ad55;
    background: #fffaf0;
  `}
`;

const TaskHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const TaskTitle = styled.h4`
  font-size: 0.875rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
  line-height: 1.4;
  flex: 1;
`;

const TaskStatus = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  
  ${props => {
    switch (props.status) {
      case 'new':
        return 'background: #e3f2fd; color: #1565c0;';
      case 'completed':
        return 'background: #d4f6d4; color: #2d7d32;';
      case 'reopened':
        return 'background: #fff3e0; color: #ef6c00;';
      default:
        return 'background: #f5f5f5; color: #616161;';
    }
  }}
`;

const TaskMeta = styled.div`
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
  
  ${props => props.isOverdue && `
    color: #e53e3e;
    font-weight: 600;
  `}
  
  ${props => props.isDueSoon && `
    color: #d69e2e;
    font-weight: 600;
  `}
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
`;const TaskListComponent = () => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    filterTasks();
  }, [tasks, statusFilter]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch only open tasks by default
      const response = await fetchAllTasks({ 
        completedOnly: false 
      });
      
      const tasksData = response.data?.tasks || [];
      
      // Sort by due date and priority
      const sortedTasks = tasksData.sort((a, b) => {
        // Overdue tasks first
        const aOverdue = isTaskOverdue(a);
        const bOverdue = isTaskOverdue(b);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        
        // Then by due date
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        
        // Finally by creation date
        return new Date(b.createdOn || 0) - new Date(a.createdOn || 0);
      });
      
      setTasks(sortedTasks);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = [...tasks];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => 
        task.status?.toLowerCase() === statusFilter
      );
    }

    // Limit to recent tasks for overview
    setFilteredTasks(filtered.slice(0, 20));
  };

  const isTaskOverdue = (task) => {
    if (!task.dueDate) return false;
    return isBefore(new Date(task.dueDate), new Date());
  };

  const isTaskDueSoon = (task) => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    const threeDaysFromNow = addDays(today, 3);
    
    return isAfter(dueDate, today) && isBefore(dueDate, threeDaysFromNow);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
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
        Loading tasks...
      </LoadingState>
    );
  }

  if (error) {
    return (
      <ErrorState>
        <AlertTriangle size={20} />
        <div>
          <div>Failed to load tasks</div>
          <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {error}
          </div>
        </div>
      </ErrorState>
    );
  }  return (
    <Container>
      <Controls>
        <FilterSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="completed">Completed</option>
          <option value="reopened">Reopened</option>
        </FilterSelect>
      </Controls>

      <TaskList>
        {filteredTasks.length === 0 ? (
          <EmptyState>
            {tasks.length === 0 ? 'No tasks found' : 'No tasks match your filters'}
          </EmptyState>
        ) : (
          filteredTasks.map((task) => {
            const isOverdue = isTaskOverdue(task);
            const isDueSoon = isTaskDueSoon(task);
            
            return (
              <TaskItem 
                key={task.id}
                isOverdue={isOverdue}
                isDueSoon={isDueSoon}
              >
                <TaskHeader>
                  <TaskTitle>{task.content}</TaskTitle>
                  <TaskStatus status={task.status}>
                    {task.status || 'Unknown'}
                  </TaskStatus>
                </TaskHeader>
                
                {task.description && (
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#718096', 
                    marginBottom: '0.5rem',
                    lineHeight: '1.4'
                  }}>
                    {task.description.length > 80 
                      ? `${task.description.substring(0, 80)}...`
                      : task.description
                    }
                  </div>
                )}
                
                <TaskMeta>
                  <MetaItem 
                    isOverdue={isOverdue}
                    isDueSoon={isDueSoon}
                  >
                    {isOverdue ? (
                      <AlertCircle />
                    ) : isDueSoon ? (
                      <Clock />
                    ) : (
                      <Calendar />
                    )}
                    {formatDate(task.dueDate)}
                  </MetaItem>
                  
                  {task.priority && (
                    <MetaItem>
                      Priority: {task.priority}
                    </MetaItem>
                  )}
                </TaskMeta>
              </TaskItem>
            );
          })
        )}
      </TaskList>
    </Container>
  );
};

export default TaskListComponent;