import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  CircularProgress, Alert, Pagination,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { approvalsApi } from '../services/api.js';
import { useSocket } from '../hooks/useSocket.js';

export default function ApprovalQueue() {
  const [approvals, setApprovals] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [rejectDialog, setRejectDialog] = useState({ open: false, approvalId: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [alert, setAlert] = useState(null);
  const navigate = useNavigate();

  const fetchApprovals = useCallback(async () => {
    try {
      const { data } = await approvalsApi.list({ page, limit: 10 });
      setApprovals(data.approvals);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch approvals:', err);
    }
  }, [page]);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);
  useSocket({ onActivity: () => { fetchApprovals(); } });

  const handleApprove = async (approvalId) => {
    setActionLoading(approvalId);
    try {
      await approvalsApi.approve(approvalId, { reviewer: 'admin' });
      setAlert({ type: 'success', message: `Approval ${approvalId} approved and action executed` });
      fetchApprovals();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error || 'Failed to approve' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    setActionLoading(rejectDialog.approvalId);
    try {
      await approvalsApi.reject(rejectDialog.approvalId, {
        reviewer: 'admin',
        rejectionReason: rejectionReason || 'Rejected by reviewer',
      });
      setAlert({ type: 'info', message: `Approval ${rejectDialog.approvalId} rejected` });
      setRejectDialog({ open: false, approvalId: null });
      setRejectionReason('');
      fetchApprovals();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error || 'Failed to reject' });
    } finally {
      setActionLoading(null);
    }
  };

  const pendingApprovals = approvals.filter(a => a.status === 'PENDING');
  const otherApprovals = approvals.filter(a => a.status !== 'PENDING');

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, background: 'linear-gradient(135deg, #FF5252, #FFD740)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Approval Queue
      </Typography>

      {alert && <Alert severity={alert.type} onClose={() => setAlert(null)} sx={{ mb: 2 }}>{alert.message}</Alert>}

      {pendingApprovals.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: 'warning.main' }}>
            ⚠️ Pending Approval ({pendingApprovals.length})
          </Typography>
          <Grid container spacing={2}>
            {pendingApprovals.map((approval) => (
              <Grid item xs={12} key={approval.approvalId}>
                <Card sx={{
                  border: '1px solid rgba(255, 215, 64, 0.3)',
                  boxShadow: '0 0 30px rgba(255, 215, 64, 0.05)',
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { borderColor: 'rgba(255, 215, 64, 0.3)' },
                    '50%': { borderColor: 'rgba(255, 215, 64, 0.6)' },
                  },
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>{approval.approvalId}</Typography>
                          <Chip label="PENDING" color="warning" size="small" sx={{ fontWeight: 700 }} />
                          <Chip label={approval.risk?.level || 'UNKNOWN'} size="small"
                            color={approval.risk?.level === 'HIGH' ? 'error' : 'warning'} variant="outlined" />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                          onClick={() => navigate(`/events/${approval.eventId}`)}>
                          Event: {approval.eventId}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="contained" color="success" startIcon={
                          actionLoading === approval.approvalId ? <CircularProgress size={16} /> : <CheckCircleIcon />
                        }
                          disabled={!!actionLoading}
                          onClick={() => handleApprove(approval.approvalId)}
                          sx={{ fontWeight: 700 }}>
                          Approve
                        </Button>
                        <Button variant="outlined" color="error" startIcon={<CancelIcon />}
                          disabled={!!actionLoading}
                          onClick={() => setRejectDialog({ open: true, approvalId: approval.approvalId })}>
                          Reject
                        </Button>
                      </Box>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'warning.main' }}>
                          Proposed Action
                        </Typography>
                        <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'rgba(255, 87, 34, 0.08)', border: '1px solid rgba(255, 87, 34, 0.15)' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{approval.proposedAction?.type}</Typography>
                          {approval.proposedAction?.payload?.message && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                              {approval.proposedAction.payload.message}
                            </Typography>
                          )}
                          {approval.proposedAction?.payload?.amount != null && (
                            <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 700, mt: 0.5 }}>
                              ₹{approval.proposedAction.payload.amount.toLocaleString()}
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'secondary.main' }}>
                          Risk Assessment
                        </Typography>
                        <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.1)' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">Confidence</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {((approval.risk?.confidence || 0) * 100).toFixed(0)}%
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">Reversible</Typography>
                            <Typography variant="body2">{approval.risk?.reversible ? 'Yes' : 'No'}</Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">{approval.risk?.reason}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'success.main' }}>
                          Evidence
                        </Typography>
                        {approval.evidence?.map((e, i) => (
                          <Box key={i} sx={{ p: 1, mb: 0.5, borderRadius: 1, bgcolor: 'rgba(0, 230, 118, 0.05)', border: '1px solid rgba(0, 230, 118, 0.1)' }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main' }}>{e.tool}</Typography>
                            <Typography variant="body2">{e.finding}</Typography>
                          </Box>
                        ))}
                      </Grid>
                    </Grid>

                    {approval.reasoningSummary && (
                      <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: 'rgba(124, 77, 255, 0.05)', border: '1px solid rgba(124, 77, 255, 0.1)' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Agent Reasoning</Typography>
                        <Typography variant="body2" color="text.secondary">{approval.reasoningSummary}</Typography>
                      </Box>
                    )}

                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Expires: {new Date(approval.expiresAt).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {otherApprovals.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>History</Typography>
          {otherApprovals.map((approval) => (
            <Card key={approval.approvalId} sx={{ mb: 1, opacity: 0.7 }}>
              <CardContent sx={{ py: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{approval.approvalId}</Typography>
                    <Chip label={approval.status} size="small"
                      color={approval.status === 'APPROVED' || approval.status === 'EXECUTED' ? 'success' : approval.status === 'REJECTED' ? 'error' : 'default'} />
                    <Typography variant="body2">{approval.proposedAction?.type}</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {approval.reviewedAt ? new Date(approval.reviewedAt).toLocaleString() : new Date(approval.createdAt).toLocaleString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {total > 10 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <Pagination count={Math.ceil(total / 10)} page={page} onChange={(_, p) => setPage(p)} color="primary" />
        </Box>
      )}

      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, approvalId: null })}
        PaperProps={{ sx: { bgcolor: 'background.paper', backgroundImage: 'none' } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Reject Approval</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Provide a reason for rejecting this action. The action will NOT be executed.
          </Typography>
          <TextField fullWidth label="Rejection Reason" value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            multiline rows={3} placeholder="Reason for rejection..." />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false, approvalId: null })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleReject}
            disabled={!!actionLoading}>
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
