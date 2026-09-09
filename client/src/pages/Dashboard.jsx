import { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, List, ListItem, ListItemText,
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { systemApi, eventsApi } from '../services/api.js';
import { useSocket } from '../hooks/useSocket.js';

const STAT_CARDS = [
  { key: 'totalEvents', label: 'Total Events', color: '#7C4DFF' },
  { key: 'processing', label: 'Processing', color: '#00E5FF' },
  { key: 'autoExecuted', label: 'Auto-Executed', color: '#00E676' },
  { key: 'pendingApproval', label: 'Pending Approval', color: '#FFD740' },
  { key: 'rejected', label: 'Rejected', color: '#FF5252' },
  { key: 'failed', label: 'Failed', color: '#FF8A80' },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eventForm, setEventForm] = useState({ eventId: '', customerId: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await systemApi.dashboard();
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useSocket({
    onActivity: () => { fetchStats(); },
  });

  const handleSubmitEvent = async () => {
    setSubmitting(true);
    setSubmitResult(null);
    try {
      await eventsApi.create({
        eventId: eventForm.eventId || `EVENT-${Date.now()}`,
        type: 'support_ticket',
        customerId: eventForm.customerId,
        message: eventForm.message,
      });
      setSubmitResult({ type: 'success', message: 'Event submitted successfully' });
      setEventForm({ eventId: '', customerId: '', message: '' });
      fetchStats();
      setTimeout(() => setDialogOpen(false), 1500);
    } catch (err) {
      setSubmitResult({
        type: 'error',
        message: err.response?.data?.error || 'Failed to submit event',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ background: 'linear-gradient(135deg, #7C4DFF, #00E5FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Dashboard
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}
          sx={{ background: 'linear-gradient(135deg, #7C4DFF, #651FFF)' }}>
          Submit Event
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {STAT_CARDS.map(({ key, label, color }) => (
          <Grid item xs={6} sm={4} md={2} key={key}>
            <Card sx={{
              background: `linear-gradient(135deg, ${color}15, ${color}08)`,
              border: `1px solid ${color}30`,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 20px ${color}20` },
            }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" sx={{ color, fontWeight: 800 }}>
                  {stats?.[key] || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5 }}>
                  {label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Recent Activity</Typography>
              <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
                {stats?.recentActivity?.map((item, i) => (
                  <ListItem key={i} sx={{
                    borderRadius: 1, mb: 0.5,
                    bgcolor: 'rgba(124, 77, 255, 0.05)',
                    border: '1px solid rgba(124, 77, 255, 0.08)',
                  }}>
                    <ListItemText
                      primary={<Typography variant="body2" sx={{ fontWeight: 500 }}>{item.message}</Typography>}
                      secondary={
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
                          <Chip label={item.type} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                          {item.eventId && <Typography variant="caption" color="text.secondary">{item.eventId}</Typography>}
                          <Typography variant="caption" color="text.secondary">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                )) || <Typography color="text.secondary" variant="body2">No recent activity</Typography>}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Recent Actions</Typography>
              <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
                {stats?.recentActions?.map((action, i) => (
                  <ListItem key={i} sx={{
                    borderRadius: 1, mb: 0.5,
                    bgcolor: 'rgba(0, 229, 255, 0.05)',
                    border: '1px solid rgba(0, 229, 255, 0.08)',
                  }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{action.actionType}</Typography>
                          <Chip label={action.status} size="small"
                            color={action.status === 'completed' ? 'success' : action.status === 'failed' ? 'error' : 'default'}
                            sx={{ height: 20, fontSize: '0.7rem' }} />
                        </Box>
                      }
                      secondary={<Typography variant="caption" color="text.secondary">{action.eventId}</Typography>}
                    />
                  </ListItem>
                )) || <Typography color="text.secondary" variant="body2">No recent actions</Typography>}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', backgroundImage: 'none' } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Submit Support Event</DialogTitle>
        <DialogContent>
          {submitResult && (
            <Alert severity={submitResult.type} sx={{ mb: 2 }}>{submitResult.message}</Alert>
          )}
          <TextField fullWidth label="Event ID (optional)" value={eventForm.eventId}
            onChange={(e) => setEventForm(prev => ({ ...prev, eventId: e.target.value }))}
            placeholder="AUTO-GENERATED" sx={{ mt: 1, mb: 2 }} size="small" />
          <TextField fullWidth label="Customer ID" value={eventForm.customerId} required
            onChange={(e) => setEventForm(prev => ({ ...prev, customerId: e.target.value }))}
            placeholder="CUS-1001" sx={{ mb: 2 }} size="small" />
          <TextField fullWidth label="Message" value={eventForm.message} required multiline rows={3}
            onChange={(e) => setEventForm(prev => ({ ...prev, message: e.target.value }))}
            placeholder="Where is my order ORD-1001?" size="small" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitEvent}
            disabled={submitting || !eventForm.customerId || !eventForm.message}
            sx={{ background: 'linear-gradient(135deg, #7C4DFF, #651FFF)' }}>
            {submitting ? <CircularProgress size={20} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
