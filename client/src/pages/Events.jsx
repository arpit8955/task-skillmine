import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Pagination,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { eventsApi } from '../services/api.js';
import { useSocket } from '../hooks/useSocket.js';

const STATUS_COLORS = {
  RECEIVED: 'default', QUEUED: 'info', INVESTIGATING: 'info',
  DECIDING: 'warning', PENDING_APPROVAL: 'warning', EXECUTING: 'info',
  COMPLETED: 'success', REJECTED: 'error', FAILED: 'error', EXPIRED: 'default',
};

export default function Events() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const fetchEvents = useCallback(async () => {
    try {
      const { data } = await eventsApi.list({ page, limit: 15 });
      setEvents(data.events);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  }, [page]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useSocket({ onActivity: () => { fetchEvents(); } });

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, background: 'linear-gradient(135deg, #7C4DFF, #B388FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Support Events
      </Typography>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, color: 'text.secondary', borderBottom: '1px solid rgba(124, 77, 255, 0.15)' } }}>
                  <TableCell>Event ID</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Risk</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.eventId} hover sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(124, 77, 255, 0.05)' },
                    '& td': { borderBottom: '1px solid rgba(124, 77, 255, 0.08)' },
                  }}
                    onClick={() => navigate(`/events/${event.eventId}`)}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                        {event.eventId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{event.customerId}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {event.message}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={event.status} size="small" color={STATUS_COLORS[event.status] || 'default'}
                        sx={{ fontWeight: 600 }} />
                    </TableCell>
                    <TableCell>
                      {event.riskClassification && (
                        <Chip label={event.riskClassification} size="small" variant="outlined"
                          color={event.riskClassification === 'LOW' ? 'success' : event.riskClassification === 'HIGH' ? 'error' : 'warning'} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(event.createdAt).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/events/${event.eventId}`); }}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {total > 15 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <Pagination count={Math.ceil(total / 15)} page={page} onChange={(_, p) => setPage(p)}
                color="primary" />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
