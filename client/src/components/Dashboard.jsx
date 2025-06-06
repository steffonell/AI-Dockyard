/**
 * Main Dashboard Component
 * 
 * Provides overview of projects and tasks with filtering capabilities.
 * Implements secure API calls through the Express proxy.
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  LayoutDashboard, 
  FolderOpen, 
  CheckSquare, 
  AlertCircle, 
  RefreshCw,
  Settings
} from 'lucide-react';

import ProjectList from './ProjectList';
import TaskList from './TaskList';
import { testConnection } from '../services/api';

const DashboardContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
`;

const Header = styled.header`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 1rem 2rem;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: #2d3748;
  
  svg {
    color: #667eea;
  }
`;

const ConnectionStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  
  ${props => props.connected ? `
    background: #d4f6d4;
    color: #2d7d32;
  ` : `
    background: #ffebee;
    color: #c62828;
  `}
`;const MainContent = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 1rem;
  }
`;

const Section = styled.section`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f7fafc;
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
  
  svg {
    color: #667eea;
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: #5a67d8;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;const Dashboard = () => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Test API connection on component mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setIsTestingConnection(true);
    try {
      await testConnection();
      setConnectionStatus(true);
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus(false);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    checkConnection();
  };

  return (
    <DashboardContainer>
      <Header>
        <HeaderContent>
          <Logo>
            <LayoutDashboard size={24} />
            Teamwork Dashboard
          </Logo>
          
          <ConnectionStatus connected={connectionStatus}>
            {isTestingConnection ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Testing...
              </>
            ) : connectionStatus ? (
              <>
                <CheckSquare size={16} />
                Connected
              </>
            ) : (
              <>
                <AlertCircle size={16} />
                Disconnected
              </>
            )}
          </ConnectionStatus>
        </HeaderContent>
      </Header>

      <MainContent>
        <Section>
          <SectionHeader>
            <SectionTitle>
              <FolderOpen size={20} />
              Projects
            </SectionTitle>
            <RefreshButton 
              onClick={handleRefresh}
              disabled={isTestingConnection}
            >
              <RefreshCw size={16} />
              Refresh
            </RefreshButton>
          </SectionHeader>
          <ProjectList key={`projects-${refreshKey}`} />
        </Section>

        <Section>
          <SectionHeader>
            <SectionTitle>
              <CheckSquare size={20} />
              Recent Tasks
            </SectionTitle>
            <RefreshButton 
              onClick={handleRefresh}
              disabled={isTestingConnection}
            >
              <RefreshCw size={16} />
              Refresh
            </RefreshButton>
          </SectionHeader>
          <TaskList key={`tasks-${refreshKey}`} />
        </Section>
      </MainContent>
    </DashboardContainer>
  );
};

export default Dashboard;