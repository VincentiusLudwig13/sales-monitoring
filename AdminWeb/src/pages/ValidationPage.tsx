import { useEffect, useState } from 'react';
import {
  Paper, Typography, Box, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  Button, CircularProgress, Alert, Chip,
  IconButton, Tooltip, Stack
} from '@mui/material';
import { 
  Check as ApproveIcon, PhotoCamera as PhotoIcon, Close as RejectIcon, 
  MoreHoriz as MoreHorizIcon, Close as CloseIcon, Inventory as InventoryIcon,
  AssignmentReturn as ReturnIcon, MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Grid 
} from '@mui/material';
import { getVisits, getStores, validateVisit, rejectVisit, type Visit, type Store } from '../api';

interface Message {
  type: 'success' | 'error';
  text: string;
}

export default function ValidationPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [viewVisit, setViewVisit] = useState<Visit | null>(null);
  const [viewAttachments, setViewAttachments] = useState<Visit | null>(null);

  const handleOpenAttachments = (visit: Visit) => {
    setViewAttachments(visit);
  };


  const fetchVisits = async () => {
    try {
      const [vRes, sRes] = await Promise.all([getVisits(), getStores()]);
      const pendingVisits = vRes.data.filter((v: Visit) => v.status === 'pending');
      setVisits(pendingVisits);
      setStores(sRes.data);

    } finally {
      setLoading(false);
    }
  };

  const getStoreName = (id: string) => {
    return stores.find(s => s.id === id)?.name || id;
  };

  useEffect(() => {
    fetchVisits();
  }, []);
  const handleValidate = async (id: string) => {
    try {
      await validateVisit(id);
      setMessage({ type: 'success', text: 'Visit validated successfully' });
      fetchVisits();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to validate visit' });
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm('Are you sure you want to REJECT this visit? This will restore the product stock.')) return;
    try {
      await rejectVisit(id);
      setMessage({ type: 'success', text: 'Visit rejected and stock restored' });
      fetchVisits();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to reject visit' });
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  const formatCurrency = (val: number) => (val || 0).toLocaleString('id-ID');

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E1B4B', letterSpacing: '-0.5px' }}>
          Validation Queue
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Review and approve pending salesman visits.</Typography>
      </Box>

      {message && (
        <Alert
          severity={message.type}
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 1000 }}>
          <TableHead sx={{ background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)' }}>
            <TableRow>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Store</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Payment</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Salesman</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Order (Net)</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Retur</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Tagihan</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Attachment</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="center">Items</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 5 }}>
                  <Typography color="textSecondary">No pending visits to validate.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              visits.map((v) => {
                return (
                  <TableRow key={v.id}>
                    <TableCell>{new Date(v.checkInTime).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{getStoreName(v.storeId)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={v.paymentStatus || '-'} 
                        size="small" 
                        color={v.paymentStatus === 'Full Payment' ? 'success' : v.paymentStatus === 'Partial Payment' ? 'info' : 'default'}
                        variant="filled"
                        sx={{ fontSize: '0.65rem', height: 18 }}
                      />
                    </TableCell>
                    <TableCell>{v.salesmanId}</TableCell>
                    <TableCell>
                      <Box>
                        {v._original && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textDecoration: 'line-through' }}>
                            Prev: {formatCurrency(v._original.orderAmount)}
                          </Typography>
                        )}
                        <Typography sx={{ fontWeight: 'bold', color: v._original ? 'primary.main' : 'inherit' }}>
                          {formatCurrency(v.orderAmount)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        {v._original && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textDecoration: 'line-through' }}>
                            Prev: {formatCurrency(v._original.returAmount)}
                          </Typography>
                        )}
                        <Typography sx={{ color: v._original ? 'error.main' : 'inherit' }}>
                          {formatCurrency(v.returAmount)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        {v._original && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textDecoration: 'line-through' }}>
                            Prev: {formatCurrency(v._original.tagihanAmount)}
                          </Typography>
                        )}
                        <Typography sx={{ color: v._original ? 'success.main' : 'inherit' }}>
                          {formatCurrency(v.tagihanAmount)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {(v as any).attachments && (v as any).attachments.length > 0 ? (
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleOpenAttachments(v)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      ) : (
                        <Typography variant="caption" color="textSecondary">None</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          onClick={() => setViewVisit(v)}
                          sx={{ color: 'primary.main' }}
                        >
                          <MoreHorizIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          startIcon={<RejectIcon />}
                          color="error"
                          onClick={() => handleReject(v.id)}
                          size="small"
                          variant="outlined"
                        >
                          Reject
                        </Button>
                        <Button
                          startIcon={<ApproveIcon />}
                          color="success"
                          onClick={() => handleValidate(v.id)}
                          size="small"
                          variant="contained"
                        >
                          Approve
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* View Items Dialog */}
      <Dialog 
        open={!!viewVisit} 
        onClose={() => setViewVisit(null)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ bgcolor: 'grey.900', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Activity Details</Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {viewVisit && getStoreName(viewVisit.storeId)} • {viewVisit && new Date(viewVisit.checkInTime).toLocaleDateString()}
            </Typography>
          </Box>
          <IconButton onClick={() => setViewVisit(null)} size="small" sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Grid container sx={{ minHeight: 300 }}>
            <Grid item xs={12} md={6} sx={{ borderRight: { md: '1px solid #eee' }, p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InventoryIcon color="primary" /> Order Items
                </Typography>
                {viewVisit?.items && viewVisit.items.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {viewVisit.items.map((item, idx) => (
                            <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: '600' }}>{item.name}</Typography>
                                    <Typography variant="caption" color="textSecondary">{formatCurrency(item.price)} per unit</Typography>
                                </Box>
                                <Typography sx={{ fontWeight: 'bold' }}>x{item.quantity}</Typography>
                            </Box>
                        ))}
                        <Box sx={{ mt: 2, textAlign: 'right', p: 1 }}>
                            <Typography variant="caption" color="textSecondary">Total Order Amount</Typography>
                            <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
                                {formatCurrency(viewVisit.orderAmount)}
                            </Typography>
                        </Box>
                    </Box>
                ) : (
                    <Typography color="textSecondary" sx={{ fontStyle: 'italic' }}>No order items</Typography>
                )}
            </Grid>
            <Grid item xs={12} md={6} sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ReturnIcon color="error" /> Return Items
                </Typography>
                {viewVisit?.returns && viewVisit.returns.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {viewVisit.returns.map((item, idx) => (
                            <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'error.50', borderRadius: 2 }}>
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: '600' }}>{item.name}</Typography>
                                    <Typography variant="caption" color="textSecondary">Quantity: {item.quantity}</Typography>
                                </Box>
                                <Chip label="Returned" size="small" color="error" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                            </Box>
                        ))}
                        <Box sx={{ mt: 2, textAlign: 'right', p: 1 }}>
                            <Typography variant="caption" color="textSecondary">Total Return Value</Typography>
                            <Typography variant="h6" color="error.main" sx={{ fontWeight: 'bold' }}>
                                {formatCurrency(viewVisit.returAmount)}
                            </Typography>
                        </Box>
                    </Box>
                ) : (
                    <Typography color="textSecondary" sx={{ fontStyle: 'italic' }}>No return items</Typography>
                )}
            </Grid>
            <Grid item xs={12} sx={{ p: 3, bgcolor: 'grey.50', borderTop: '1px solid #eee' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                Attachments & Photos ({(viewVisit as any)?.attachments?.length || 0})
              </Typography>
              {(viewVisit as any)?.attachments && (viewVisit as any).attachments.length > 0 ? (
                <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
                  {(viewVisit as any).attachments.map((att: any, idx: number) => (
                    <Box 
                      key={idx} 
                      component="img"
                      src={att.url}
                      sx={{ 
                        width: 150, 
                        height: 150, 
                        objectFit: 'cover', 
                        borderRadius: 2, 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'scale(1.05)' }
                      }}
                      onClick={() => window.open(att.url, '_blank')}
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary">No attachments found.</Typography>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
          <Button onClick={() => setViewVisit(null)} variant="contained" sx={{ borderRadius: 2 }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Attachments List Modal */}
      <Dialog
        open={!!viewAttachments}
        onClose={() => setViewAttachments(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Visit Attachments</Typography>
          <IconButton onClick={() => setViewAttachments(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pb: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(viewAttachments as any)?.attachments?.map((att: any, idx: number) => (
              <Paper 
                key={idx} 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  bgcolor: 'grey.50', 
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  border: '1px solid #eee',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'grey.100' }
                }}
                onClick={() => window.open(att.url, '_blank')}
              >
                <Box 
                  component="img"
                  src={att.url}
                  sx={{ width: 80, height: 80, borderRadius: 1, objectFit: 'cover' }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Attachment #{idx + 1}</Typography>
                  <Typography variant="caption" color="textSecondary">Click to view full size</Typography>
                </Box>
                <PhotoIcon color="action" />
              </Paper>
            ))}
            {(!viewAttachments as any)?.attachments?.length && (
              <Typography align="center" color="textSecondary">No attachments available.</Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
          <Button onClick={() => setViewAttachments(null)} variant="contained" sx={{ borderRadius: 2 }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
