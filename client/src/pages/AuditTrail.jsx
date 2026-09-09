import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, List, ListItem, ListItemText,
  Chip, Pagination, TextField,
} from '@mui/material';
import { systemApi } from '../services/api.js';

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [eventFilter, setEventFilter] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const params = { page, limit: 30 };
        if (eventFilter) params.eventId = eventFilter;
        const { data } = await systemApi.audit(params);
        setLogs(data.logs);
        setTotal(data.total);
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
      }
    };
    fetchLogs();
  }, [page, eventFilter]);

  const TYPE_COLORS = {
    event_received: '#7C4DFF',
    state_transition: '#90A4AE',
    agent_run_started: '#00E5FF',
    agent_decision: '#B388FF',
    risk_evaluated: '#FF9800',
    action_executed: '#00E676',
    action_failed: '#FF5252',
    approval_created: '#FFD740',
    approval_approved: '#00E676',
    approval_rejected: '#FF5252',
    approval_expired: '#9E9E9E',
    agent_error: '#FF1744',
    scheduler_recovery: '#FF9800',
    scheduler_retry: '#FFD740',
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, background: 'linear-gradient(135deg, #90A4AE, #7C4DFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Audit Trail
      </Typography>

      <TextField
        size="small" placeholder="Filter by Event ID..."
        value={eventFilter} onChange={(e) => { setEventFilter(e.target.value); setPage(1); }}
        sx={{ mb: 2, width: 300 }}
      />

      <Card>
        <CardContent>
          <List dense sx={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
            {logs.map((log, i) => (
              <ListItem key={i} sx={{
                borderLeft: `3px solid ${TYPE_COLORS[log.type] || '#78909C'}`,
                mb: 0.5, borderRadius: 1,
                bgcolor: 'rgba(124, 77, 255, 0.02)',
              }}>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {log.message}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Chip label={log.type} size="small" variant="outlined"
                        sx={{ height: 20, fontSize: '0.65rem', borderColor: TYPE_COLORS[log.type] || '#78909C', color: TYPE_COLORS[log.type] || '#78909C' }} />
                      {log.eventId && <Chip label={log.eventId} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />}
                      <Typography variant="caption" color="text.secondary">
                        {new Date(log.timestamp).toLocaleString()} · {log.actor}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
          {total > 30 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <Pagination count={Math.ceil(total / 30)} page={page} onChange={(_, p) => setPage(p)} color="primary" />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
