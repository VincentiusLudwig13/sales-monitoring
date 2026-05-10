import React, { useEffect, useState } from 'react';
import { 
  Paper, Typography, Box, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, 
  Button, TextField, Dialog, DialogTitle, DialogContent, 
  DialogActions, CircularProgress, IconButton
} from '@mui/material';
import { Edit as EditIcon, PersonAdd as AddIcon } from '@mui/icons-material';
import { getUsers, addUser, editUser, type User } from '../api';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [nik, setNik] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpen = (user: User | null = null) => {
    if (user) {
      setEditingUser(user);
      setNik(user.nik);
      setName(user.name);
      setPassword('');
    } else {
      setEditingUser(null);
      setNik('');
      setName('');
      setPassword('');
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        await editUser(nik, { name, password: password || undefined });
      } else {
        await addUser({ nik, name, password, role: 'salesman' });
      }
      fetchUsers();
      handleClose();
    } catch (err) {
      alert('Error saving user');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E1B4B', letterSpacing: '-0.5px' }}>Salesman Accounts</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Manage salesman user accounts and credentials.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Salesman
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 500 }}>
          <TableHead sx={{ background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)' }}>
            <TableRow>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>NIK</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Role</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.nik}>
                <TableCell>{u.nik}</TableCell>
                <TableCell>{u.name}</TableCell>
                <TableCell sx={{ textTransform: 'capitalize' }}>{u.role}</TableCell>
                <TableCell align="right">
                  <IconButton color="primary" onClick={() => handleOpen(u)}>
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
        <DialogTitle>{editingUser ? 'Edit Salesman' : 'Add New Salesman'}</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="NIK"
            fullWidth
            value={nik}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNik(e.target.value)}
            disabled={!!editingUser}
            sx={{ mt: 1 }}
          />
          <TextField
            margin="dense"
            label="Name"
            fullWidth
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            value={password}
            placeholder={editingUser ? 'Leave blank to keep current' : ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
