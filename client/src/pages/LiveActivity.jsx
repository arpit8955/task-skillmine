import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, List, ListItem, ListItemIcon, ListItemText,
} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { systemApi } from '../services/api.js';
import { useSocket } from '../hooks/useSocket.js';

const EVENT_COLORS = {
  'agent:event_received': '#7C4DFF',
  'agent:investigating': '#00E5FF',
  'agent:event_processing': '#00E5FF',
  'agent:tool_started': '#FFD740',
  'agent:tool_completed': '#FFD740',
  'agent:decision_created': '#B388FF',
  'agent:risk_evaluated': '#FF9800',
  'agent:action_started': '#00E676',
  'agent:action_completed': '#00E676',
  'agent:approval_required': '#FF5252',
  'agent:approval_updated': '#FF9800',
  'agent:state_changed': '#90A4AE',
  'agent:retrying': '#FFD740',
  'agent:failed_safe': '#FF5252',
  'agent:error': '#FF1744',
  'agent:audit': '#78909C',
};

function formatEventMessage(event, data) {
  const prefix = data.eventId ? `[${data.eventId}] ` : '';
  switch (event) {
    case 'agent:event_received': return `${prefix}Event received from customer ${data.customerId}`;
    case 'agent:investigating': return `${prefix}Starting investigation`;
    case 'agent:event_processing': return `${prefix}Processing (attempt ${data.attempt})`;
    case 'agent:tool_started': return `${prefix}Tool: ${data.toolName} started`;
    case 'agent:tool_completed': return `${prefix}Tool: ${data.toolName} completed${data.status === 'failed' ? ' (FAILED)' : ''} ${data.durationMs ? `(${data.durationMs}ms)` : ''}`;
    case 'agent:decision_created': return `${prefix}Decision: ${data.actionType} (${data.riskLevel}, confidence: ${data.confidence})`;
    case 'agent:risk_evaluated': return `${prefix}Risk evaluated: ${data.riskLevel} - ${data.allowed ? 'AUTO-EXECUTE' : 'REQUIRES APPROVAL'}`;
    case 'agent:action_started': return `${prefix}Action: ${data.actionType} started`;
    case 'agent:action_completed': return `${prefix}Action: ${data.actionType} ${data.status}`;
    case 'agent:approval_required': return `${prefix}⚠️ Approval required for ${data.actionType} (risk: ${data.riskLevel})`;
    case 'agent:approval_updated': return `${prefix}Approval ${data.approvalId}: ${data.status}`;
    case 'agent:state_changed': return `${prefix}State: ${data.from} → ${data.to}`;
    case 'agent:retrying': return `${prefix}Retrying (attempt ${data.attempt}): ${data.reason}`;
    case 'agent:failed_safe': return `${prefix}❌ Failed safe: ${data.reason}`;
    case 'agent:error': return `${prefix}Error: ${data.message || 'Unknown error'}`;
    default: return `${prefix}${event}`;
  }
}

export default function LiveActivity() {
  const [activities, setActivities] = useState([]);
  const listRef = useRef(null);

  useEffect(() => {
    systemApi.activity({ limit: 50 }).then(({ data }) => {
      setActivities(data.activity.map((a, i) => ({
        id: `hist-${i}`,
        event: `agent:${a.type}`,
        message: a.message,
        eventId: a.eventId,
        timestamp: a.timestamp,
      })).reverse());
    }).catch(() => {});
  }, []);

  useSocket({
    onActivity: ({ event, data, timestamp }) => {
      setActivities((prev) => {
        const next = [...prev, {
          id: `live-${Date.now()}-${Math.random()}`,
          event,
          message: formatEventMessage(event, data),
          eventId: data.eventId,
          timestamp,
          isLive: true,
        }];
        return next.slice(-200);
      });
    },
  });

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [activities]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, background: 'linear-gradient(135deg, #00E5FF, #7C4DFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Live Activity Stream
      </Typography>

      <Card>
        <CardContent>
          <List ref={listRef} sx={{
            maxHeight: 'calc(100vh - 240px)', overflow: 'auto',
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(124, 77, 255, 0.3)', borderRadius: 3 },
          }}>
            {activities.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Waiting for activity...
              </Typography>
            ) : activities.map((activity) => {
              const color = EVENT_COLORS[activity.event] || '#78909C';
              return (
                <ListItem key={activity.id} sx={{
                  borderRadius: 1, mb: 0.5, py: 0.5,
                  bgcolor: activity.isLive ? `${color}08` : 'transparent',
                  borderLeft: `3px solid ${color}`,
                  transition: 'background-color 0.5s ease',
                  animation: activity.isLive ? 'fadeIn 0.3s ease' : 'none',
                  '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateX(-10px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
                }}>
                  <ListItemIcon sx={{ minWidth: 24 }}>
                    <FiberManualRecordIcon sx={{ fontSize: 8, color }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', minWidth: 70 }}>
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {activity.message}
                        </Typography>
                        {activity.isLive && <Chip label="LIVE" size="small" color="success" sx={{ height: 16, fontSize: '0.6rem' }} />}
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}
