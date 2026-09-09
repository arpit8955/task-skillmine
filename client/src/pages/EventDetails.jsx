import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Divider, List, ListItem,
  ListItemText, Button, CircularProgress, Stepper, Step, StepLabel,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { eventsApi, systemApi } from '../services/api.js';
import { useSocket } from '../hooks/useSocket.js';

const STATE_ORDER = ['RECEIVED', 'QUEUED', 'INVESTIGATING', 'DECIDING', 'PENDING_APPROVAL', 'EXECUTING', 'COMPLETED'];

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [eventRes, auditRes] = await Promise.all([
        eventsApi.getById(id),
        systemApi.audit({ eventId: id, limit: 50 }),
      ]);
      setData(eventRes.data);
      setAuditLogs(auditRes.data.logs);
    } catch (err) {
      console.error('Failed to fetch event:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);
  useSocket({ onActivity: ({ data: d }) => { if (d.eventId === id) fetchData(); } });

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (!data?.event) return <Typography color="error">Event not found</Typography>;

  const { event, agentRun, toolCalls, actionExecution, approval } = data;
  const activeStep = STATE_ORDER.indexOf(event.status);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/events')} size="small">Back</Button>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{event.eventId}</Typography>
        <Chip label={event.status} color={event.status === 'COMPLETED' ? 'success' : event.status === 'FAILED' ? 'error' : 'warning'} />
      </Box>

      <Stepper activeStep={activeStep >= 0 ? activeStep : 0} alternativeLabel sx={{ mb: 3, '& .MuiStepLabel-label': { fontSize: '0.7rem' } }}>
        {STATE_ORDER.map((label) => (
          <Step key={label} completed={STATE_ORDER.indexOf(label) < activeStep}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Event Information</Typography>
              <InfoRow label="Event ID" value={event.eventId} />
              <InfoRow label="Customer ID" value={event.customerId} />
              <InfoRow label="Type" value={event.type} />
              <InfoRow label="Risk" value={event.riskClassification} />
              <InfoRow label="Attempts" value={event.processingAttempts} />
              <InfoRow label="Created" value={new Date(event.createdAt).toLocaleString()} />
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Message</Typography>
              <Typography variant="body2" sx={{
                p: 1.5, borderRadius: 1, bgcolor: 'rgba(124, 77, 255, 0.05)',
                border: '1px solid rgba(124, 77, 255, 0.12)', whiteSpace: 'pre-wrap',
              }}>
                {event.message}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          {agentRun && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Agent Decision</Typography>
                {agentRun.decision && (
                  <>
                    <InfoRow label="Intent" value={agentRun.decision.intent} />
                    <InfoRow label="Action" value={agentRun.decision.proposedAction?.type} />
                    <InfoRow label="Risk Level" value={agentRun.decision.risk?.level} />
                    <InfoRow label="Confidence" value={`${((agentRun.decision.risk?.confidence || 0) * 100).toFixed(0)}%`} />
                    <InfoRow label="Reversible" value={agentRun.decision.risk?.reversible ? 'Yes' : 'No'} />
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Reasoning Summary</Typography>
                    <Typography variant="body2" color="text.secondary">{agentRun.decision.reasoningSummary}</Typography>
                    {agentRun.decision.evidence?.length > 0 && (
                      <>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Evidence</Typography>
                        {agentRun.decision.evidence.map((e, i) => (
                          <Box key={i} sx={{ p: 1, mb: 0.5, borderRadius: 1, bgcolor: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.1)' }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'secondary.main' }}>{e.tool}</Typography>
                            <Typography variant="body2">{e.finding}</Typography>
                          </Box>
                        ))}
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {approval && (
            <Card sx={{
              border: approval.status === 'PENDING' ? '1px solid rgba(255, 215, 64, 0.4)' : undefined,
              boxShadow: approval.status === 'PENDING' ? '0 0 20px rgba(255, 215, 64, 0.1)' : undefined,
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Approval</Typography>
                <InfoRow label="ID" value={approval.approvalId} />
                <InfoRow label="Status" value={<Chip label={approval.status} size="small"
                  color={approval.status === 'APPROVED' || approval.status === 'EXECUTED' ? 'success' : approval.status === 'REJECTED' ? 'error' : 'warning'} />} />
                {approval.reviewer && <InfoRow label="Reviewer" value={approval.reviewer} />}
                {approval.rejectionReason && <InfoRow label="Rejection Reason" value={approval.rejectionReason} />}
                <InfoRow label="Expires" value={new Date(approval.expiresAt).toLocaleString()} />
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Tool Calls</Typography>
              {toolCalls?.length > 0 ? toolCalls.map((tc, i) => (
                <Box key={i} sx={{
                  p: 1.5, mb: 1, borderRadius: 1,
                  bgcolor: 'rgba(255, 215, 64, 0.03)',
                  border: '1px solid rgba(255, 215, 64, 0.1)',
                }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                    <Chip label={tc.toolName} size="small" variant="outlined" color="warning" />
                    <Chip label={tc.status} size="small" color={tc.status === 'completed' ? 'success' : 'error'} sx={{ height: 20 }} />
                    {tc.durationMs && <Typography variant="caption" color="text.secondary">{tc.durationMs}ms</Typography>}
                  </Box>
                  <Typography variant="caption" color="text.secondary" component="div">
                    Input: {JSON.stringify(tc.input)}
                  </Typography>
                  {tc.output && (
                    <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5, maxHeight: 100, overflow: 'auto' }}>
                      Output: {JSON.stringify(tc.output).substring(0, 300)}
                    </Typography>
                  )}
                </Box>
              )) : <Typography color="text.secondary" variant="body2">No tool calls recorded</Typography>}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Audit History</Typography>
              <List dense>
                {auditLogs.map((log, i) => (
                  <ListItem key={i} sx={{ borderLeft: '2px solid rgba(124, 77, 255, 0.3)', mb: 0.5, borderRadius: 1 }}>
                    <ListItemText
                      primary={<Typography variant="body2" sx={{ fontWeight: 500 }}>{log.message}</Typography>}
                      secondary={
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          <Chip label={log.type} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(log.timestamp).toLocaleString()} · {log.actor}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function InfoRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{typeof value === 'object' ? value : String(value ?? '—')}</Typography>
    </Box>
  );
}
