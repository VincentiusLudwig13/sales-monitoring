import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, List, Typography, 
  ListItem, ListItemButton, ListItemIcon, ListItemText, 
  Button, Container, IconButton
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CheckCircle as ValidateIcon,
  Store as StoreIcon,
  People as PeopleIcon,
  Logout as LogoutIcon,
  History as HistoryIcon,
  Inventory as InventoryIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';

// Page Imports (will create these next)
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ValidationPage from './pages/ValidationPage';
import StoresPage from './pages/StoresPage';
import UsersPage from './pages/UsersPage';
import SalesmenHistoryPage from './pages/SalesmenHistoryPage';
import ProductsPage from './pages/ProductsPage';

import { type User } from './api';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

function Layout({ children, onLogout }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Validation Queue', icon: <ValidateIcon />, path: '/validation' },
    { text: 'Stores Analysis', icon: <StoreIcon />, path: '/stores' },
    { text: 'Manage Users', icon: <PeopleIcon />, path: '/users' },
    { text: 'Salesmen Activity', icon: <HistoryIcon />, path: '/salesmen' },
    { text: 'Inventory', icon: <InventoryIcon />, path: '/products' },
  ];

  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawerContent = (
    <>
      <Toolbar sx={{ background: 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)', mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
          📊 SalesAdmin
        </Typography>
      </Toolbar>
      <Box sx={{ overflow: 'auto', px: 1 }}>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                    color: 'white',
                    '& .MuiListItemIcon-root': { color: 'white' },
                    '&:hover': { background: 'linear-gradient(135deg, #4338CA 0%, #4F46E5 100%)' },
                  },
                  '&:hover': { bgcolor: 'rgba(79, 70, 229, 0.08)' },
                }}
              >
                <ListItemIcon sx={{ color: location.pathname === item.path ? 'white' : '#6B7280', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: location.pathname === item.path ? 700 : 500 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" elevation={0} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, background: 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 800, fontSize: { xs: '1rem', sm: '1.15rem' }, letterSpacing: '-0.5px' }}>
            📊 Sales Monitoring Admin
          </Typography>
          <Button color="inherit" onClick={onLogout} startIcon={<LogoutIcon />} sx={{ bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }, borderRadius: 2, px: 2 }}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid #E8E8F0', bgcolor: '#FAFAFE' },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid #E8E8F0', bgcolor: '#FAFAFE' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 1.5, sm: 3 }, backgroundColor: '#F8FAFC', minHeight: '100vh', width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        <Container maxWidth="lg" disableGutters>
          {children}
        </Container>
      </Box>
    </Box>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => JSON.parse(localStorage.getItem('admin_user') || 'null'));

  const handleLogin = (userData: User) => {
    if (userData.role !== 'admin') {
      alert('Access denied. Only admin can log in.');
      return;
    }
    setUser(userData);
    localStorage.setItem('admin_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('admin_user');
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" /> : <LoginPage onLogin={handleLogin} />} 
        />
        <Route
          path="/*"
          element={
            user ? (
              <Layout onLogout={handleLogout}>
                <Routes>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/validation" element={<ValidationPage />} />
                  <Route path="/stores" element={<StoresPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/salesmen" element={<SalesmenHistoryPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
}
