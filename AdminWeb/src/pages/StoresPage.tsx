import { useEffect, useState } from 'react';
import { 
  Paper, Typography, Box, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, 
  CircularProgress, Chip, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, MenuItem, Select, InputLabel, FormControl
} from '@mui/material';
import { Search as SearchIcon, Store as StoreIcon, Edit as EditIcon } from '@mui/icons-material';
import { IconButton, Tooltip, Avatar } from '@mui/material';
import { getStores, getUsers, updateStore, type Store, type User } from '../api';

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editStore, setEditStore] = useState<Store | null>(null);
  const [selectedSalesman, setSelectedSalesman] = useState('');

  useEffect(() => {
    Promise.all([getStores(), getUsers()]).then(([storesRes, usersRes]) => {
      setStores(storesRes.data);
      setUsers(usersRes.data.filter(u => u.role === 'salesman'));
      setLoading(false);
    });
  }, []);

  const handleOpenEdit = (store: Store) => {
    setEditStore(store);
    setSelectedSalesman(store.salesmanId || '');
  };

  const handleSaveEdit = async () => {
    if (!editStore) return;
    try {
      await updateStore(editStore.id, { salesmanId: selectedSalesman });
      setEditStore(null);
      const res = await getStores();
      setStores(res.data);
    } catch (e) {
      alert('Failed to update store');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  const filteredStores = stores.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const formatCurrency = (val: number) => (val || 0).toLocaleString('id-ID');

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E1B4B', letterSpacing: '-0.5px' }}>
          Stores Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Manage store assignments and track outstanding balances.</Typography>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <TextField
          size="small"
          placeholder="Search store name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ bgcolor: '#fff', width: 300 }}
        />
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 900 }}>
          <TableHead sx={{ background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)' }}>
            <TableRow>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Store Name</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Salesman</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Photo</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Outstanding</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Hist. Sales</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Hist. Retur</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>First Visit</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Last Visited</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStores.map((s) => {
              const salesman = users.find(u => u.nik === s.salesmanId);
              return (
              <TableRow key={s.id}>
                <TableCell sx={{ fontWeight: '600' }}>{s.name}</TableCell>
                <TableCell>
                  {salesman ? `${salesman.name} (${salesman.nik})` : <Typography color="textSecondary" variant="caption">Unassigned</Typography>}
                </TableCell>
                <TableCell>
                  {s.photo_url ? (
                    <Tooltip title="View Store Photo">
                      <IconButton 
                        size="small" 
                        href={`${s.photo_url}`} 
                        target="_blank"
                      >
                        <Avatar 
                          src={`${s.photo_url}`} 
                          variant="rounded" 
                          sx={{ width: 40, height: 40, border: '1px solid #e2e8f0' }}
                        />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <StoreIcon color="disabled" />
                  )}
                </TableCell>
                <TableCell sx={{ color: s.outstanding > 0 ? 'error.main' : 'inherit', fontWeight: s.outstanding > 0 ? '700' : '400' }}>
                   {formatCurrency(s.outstanding)}
                </TableCell>
                <TableCell>{formatCurrency(s.historicalSales)}</TableCell>
                <TableCell>{formatCurrency(s.historicalRetur)}</TableCell>
                <TableCell variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  {s.first_visit_date ? new Date(s.first_visit_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}
                </TableCell>
                <TableCell variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  {s.last_visited_date ? new Date(s.last_visited_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}
                </TableCell>
                <TableCell>
                  {s.outstanding > 0 ? (
                    <Chip label="Has Balance" color="error" variant="outlined" size="small" />
                  ) : (
                    <Chip label="Clear" color="success" variant="outlined" size="small" />
                  )}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Reassign Salesman">
                    <IconButton size="small" color="primary" onClick={() => handleOpenEdit(s)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Store / Reassign Dialog */}
      <Dialog open={!!editStore} onClose={() => setEditStore(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Reassign Store</DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <Typography variant="body2" sx={{ mb: 2, mt: 1 }}>
            Assign <b>{editStore?.name}</b> to a different salesman:
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Salesman</InputLabel>
            <Select
              value={selectedSalesman}
              label="Salesman"
              onChange={(e) => setSelectedSalesman(e.target.value)}
            >
              <MenuItem value=""><em>None / Unassigned</em></MenuItem>
              {users.map(u => (
                <MenuItem key={u.nik} value={u.nik}>{u.name} ({u.nik})</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditStore(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit}>Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
