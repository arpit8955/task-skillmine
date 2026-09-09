import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  AppBar, Toolbar, Typography, Chip, IconButton,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ApprovalIcon from '@mui/icons-material/FactCheck';
import TimelineIcon from '@mui/icons-material/Timeline';
import HistoryIcon from '@mui/icons-material/History';
import MenuIcon from '@mui/icons-material/Menu';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useSocket } from '../hooks/useSocket.js';

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/events', label: 'Events', icon: <EventNoteIcon /> },
  { path: '/activity', label: 'Live Activity', icon: <TimelineIcon /> },
  { path: '/approvals', label: 'Approval Queue', icon: <ApprovalIcon /> },
  { path: '/audit', label: 'Audit Trail', icon: <HistoryIcon /> },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { connected } = useSocket();
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: 'background.paper' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: '8px',
          background: 'linear-gradient(135deg, #7C4DFF, #00E5FF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: '14px', color: '#fff',
        }}>
          OA
        </Box>
        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
          Ops Agent
        </Typography>
      </Box>
      <List sx={{ px: 1 }}>
        {NAV_ITEMS.map(({ path, label, icon }) => (
          <ListItemButton
            key={path}
            selected={location.pathname === path}
            onClick={() => { navigate(path); setMobileOpen(false); }}
            sx={{
              borderRadius: 2, mb: 0.5,
              '&.Mui-selected': {
                bgcolor: 'rgba(124, 77, 255, 0.15)',
                '&:hover': { bgcolor: 'rgba(124, 77, 255, 0.25)' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: location.pathname === path ? 'primary.main' : 'text.secondary' }}>
              {icon}
            </ListItemIcon>
            <ListItemText primary={label} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="fixed" sx={{
        bgcolor: 'rgba(17, 24, 39, 0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(124, 77, 255, 0.12)',
        boxShadow: 'none', zIndex: (theme) => theme.zIndex.drawer + 1,
      }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, fontSize: '1.1rem' }}>
            Support Operations Agent
          </Typography>
          <Chip
            icon={<FiberManualRecordIcon sx={{ fontSize: 10 }} />}
            label={connected ? 'Live' : 'Disconnected'}
            size="small"
            color={connected ? 'success' : 'error'}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" sx={{
        display: { xs: 'none', md: 'block' }, width: DRAWER_WIDTH,
        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', borderRight: '1px solid rgba(124, 77, 255, 0.12)' },
      }}>
        <Toolbar />
        {drawer}
      </Drawer>

      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, ml: { md: `${DRAWER_WIDTH}px` } }}>
        <Outlet />
      </Box>
    </Box>
  );
}
