import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  Paper,
  Badge,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Assignment,
  Description,
  Settings,
  Logout,
  AccountCircle,
  AutoAwesome,
  WorkOutline,
  Psychology,
  Anchor,
  BugReport,
  Code,
  Article,
  SmartToy,
  RocketLaunch,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

const drawerWidth = 280;

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  badge?: string;
  requiredRole?: 'admin' | 'lead' | 'developer';
  gradient?: string;
}

const navigationItems: NavigationItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: <Dashboard />,
    description: 'Overview & Analytics',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    requiredRole: 'admin',
  },
  {
    path: '/issues',
    label: 'Teamwork Issues',
    icon: <Assignment />,
    description: 'Browse & Manage Tasks',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    path: '/issue-to-prompt',
    label: 'AI Instructions',
    icon: <AutoAwesome />,
    description: 'Generate AI-Powered Instructions',
    badge: 'New',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  {
    path: '/prompts/new',
    label: 'Prompt Wizard',
    icon: <Psychology />,
    description: 'Advanced AI Chat Interface',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  },
  {
    path: '/templates',
    label: 'Template Manager',
    icon: <Article />,
    description: 'Manage Prompt Templates',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    requiredRole: 'admin',
  },
];

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleProfileMenuClose();
  };

  const isItemVisible = (item: NavigationItem): boolean => {
    if (!item.requiredRole || !user) return true;
    
    const roleHierarchy = {
      developer: 1,
      lead: 2,
      admin: 3,
    };

    return roleHierarchy[user.role] >= roleHierarchy[item.requiredRole];
  };

  const currentPageLabel = navigationItems.find(item => item.path === location.pathname)?.label || 'AI Dockyard';

  const drawer = (
    <Box sx={{ height: '100%', background: 'linear-gradient(180deg, #1e3c72 0%, #2a5298 100%)' }}>
      {/* Brand Header */}
      <Box sx={{ 
        p: 3, 
        textAlign: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          position: 'absolute', 
          top: -20, 
          right: -20, 
          width: 100, 
          height: 100, 
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
        }} />
        <Box sx={{ 
          position: 'absolute', 
          bottom: -30, 
          left: -30, 
          width: 80, 
          height: 80, 
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />
        
        <Avatar sx={{ 
          width: 56, 
          height: 56, 
          mx: 'auto', 
          mb: 1,
          background: 'rgba(255,255,255,0.2)',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(255,255,255,0.3)'
        }}>
          <Anchor sx={{ fontSize: 32, color: 'white' }} />
        </Avatar>
        <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold', mb: 0.5 }}>
          AI Dockyard
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem' }}>
          Intelligent Development Hub
        </Typography>
      </Box>

      {/* User Info Card */}
      <Box sx={{ p: 2 }}>
        <Paper sx={{ 
          p: 2, 
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ 
              width: 40, 
              height: 40,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}>
              {user?.name?.charAt(0) || 'U'}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 600 }}>
                {user?.name || 'User'}
              </Typography>
              <Chip 
                label={user?.role || 'developer'} 
                size="small"
                sx={{ 
                  height: 20,
                  fontSize: '0.6rem',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  '& .MuiChip-label': { px: 1 }
                }}
              />
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Navigation Menu */}
      <Box sx={{ px: 2, pb: 2 }}>
        <Typography variant="overline" sx={{ 
          color: 'rgba(255,255,255,0.7)', 
          fontSize: '0.7rem',
          fontWeight: 600,
          px: 1,
          display: 'block',
          mb: 1
        }}>
          Navigation
        </Typography>
        
        <List sx={{ p: 0 }}>
          {navigationItems.filter(isItemVisible).map((item) => {
            const isSelected = location.pathname === item.path;
            return (
              <ListItem key={item.path} sx={{ px: 0, mb: 0.5 }}>
                <Tooltip title={item.description} placement="right" arrow>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => {
                      navigate(item.path);
                      setMobileOpen(false);
                    }}
                    sx={{
                      borderRadius: 2,
                      mx: 1,
                      background: isSelected 
                        ? 'rgba(255,255,255,0.15)' 
                        : 'transparent',
                      '&:hover': {
                        background: 'rgba(255,255,255,0.1)',
                        transform: 'translateX(4px)',
                      },
                      '&.Mui-selected': {
                        background: 'rgba(255,255,255,0.15)',
                        '&:hover': {
                          background: 'rgba(255,255,255,0.2)',
                        },
                      },
                      transition: 'all 0.2s ease-in-out',
                      border: isSelected ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Box sx={{
                        background: item.gradient || 'rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        p: 0.8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
                      }}>
                        {item.icon}
                      </Box>
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ 
                            color: 'white', 
                            fontWeight: isSelected ? 600 : 500,
                            fontSize: '0.875rem'
                          }}>
                            {item.label}
                          </Typography>
                          {item.badge && (
                            <Chip 
                              label={item.badge} 
                              size="small"
                              sx={{ 
                                height: 16,
                                fontSize: '0.6rem',
                                background: '#ff4081',
                                color: 'white',
                                '& .MuiChip-label': { px: 0.5 }
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ 
                          color: 'rgba(255,255,255,0.7)',
                          fontSize: '0.7rem',
                          display: isSelected ? 'block' : 'none'
                        }}>
                          {item.description}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        p: 2,
        background: 'rgba(0,0,0,0.2)',
        backdropFilter: 'blur(10px)'
      }}>
        <Typography variant="caption" sx={{ 
          color: 'rgba(255,255,255,0.6)', 
          textAlign: 'center',
          display: 'block',
          fontSize: '0.65rem'
        }}>
          AI Dockyard v2.0 🚀
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
        }}
      >
        <Toolbar sx={{ minHeight: '70px !important' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
            <SmartToy sx={{ fontSize: 28 }} />
            <Box>
              <Typography variant="h6" component="div" sx={{ 
                fontWeight: 700,
                fontSize: '1.1rem'
              }}>
                {currentPageLabel}
              </Typography>
              <Typography variant="caption" sx={{ 
                color: 'rgba(255,255,255,0.8)',
                fontSize: '0.7rem'
              }}>
                {navigationItems.find(item => item.path === location.pathname)?.description || 'AI-Powered Development Platform'}
              </Typography>
            </Box>
          </Box>
          
          <Box>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
              sx={{ 
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  background: 'rgba(255,255,255,0.2)',
                }
              }}
            >
              <Avatar sx={{ 
                width: 36, 
                height: 36,
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                fontWeight: 'bold'
              }}>
                {user?.name?.charAt(0) || <AccountCircle />}
              </Avatar>
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 2,
                  minWidth: 200
                }
              }}
            >
              <MenuItem disabled sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                mb: 1,
                mx: 1,
                borderRadius: 1
              }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {user?.name}
                  </Typography>
                  <Typography variant="caption">
                    {user?.role} • AI Dockyard
                  </Typography>
                </Box>
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ 
                mx: 1, 
                borderRadius: 1,
                '&:hover': {
                  background: 'rgba(255,67,54,0.1)'
                }
              }}>
                <ListItemIcon>
                  <Logout fontSize="small" color="error" />
                </ListItemIcon>
                <Typography color="error">Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              border: 'none'
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              border: 'none'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          minHeight: '100vh'
        }}
      >
        <Toolbar sx={{ minHeight: '70px !important' }} />
        <Outlet />
      </Box>
    </Box>
  );
};

export default AppLayout; 