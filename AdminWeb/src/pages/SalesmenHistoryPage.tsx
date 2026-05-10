import { useEffect, useState } from 'react';
import {
  Paper, Typography, Box, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Avatar, Chip
} from '@mui/material';
import { History as HistoryIcon, Person as PersonIcon } from '@mui/icons-material';
import { getVisits, getStores, getUsers, type Visit, type Store, type User } from '../api';

export default function SalesmenHistoryPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vRes, sRes, uRes] = await Promise.all([getVisits(), getStores(), getUsers()]);
        setVisits(vRes.data);
        setStores(sRes.data);
        setUsers(uRes.data.filter(u => u.role === 'salesman'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  const getStoreName = (id: string) => stores.find(s => s.id === id)?.name || 'Unknown Store';

  const salesmenActivity = users.map(user => {
    const userVisits = visits
      .filter(v => v.salesmanId === user.nik)
      .sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());
    
    const lastVisit = userVisits[0] || null;

    return {
      ...user,
      lastVisit,
      totalVisits: userVisits.length
    };
  });

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E1B4B', letterSpacing: '-0.5px' }}>
          Salesmen Activity
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Track the latest activity and performance of your sales team.</Typography>
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead sx={{ background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)' }}>
            <TableRow>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Salesman</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Last Visit Store</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Last Visit Date</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Time</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Activity Status</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="center">Total Visits</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {salesmenActivity.map((s) => (
              <TableRow key={s.nik}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'secondary.light' }}><PersonIcon /></Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: '600' }}>{s.name}</Typography>
                      <Typography variant="caption" color="textSecondary">NIK: {s.nik}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  {s.lastVisit ? getStoreName(s.lastVisit.storeId) : '-'}
                </TableCell>
                <TableCell>
                  {s.lastVisit ? new Date(s.lastVisit.checkInTime).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>
                  {s.lastVisit ? new Date(s.lastVisit.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                </TableCell>
                <TableCell>
                  {s.lastVisit ? (
                    <Chip 
                      icon={<HistoryIcon sx={{ fontSize: '1rem !important' }} />} 
                      label="Active" 
                      color="success" 
                      size="small" 
                      variant="outlined" 
                    />
                  ) : (
                    <Chip label="No Activity" size="small" variant="outlined" />
                  )}
                </TableCell>
                <TableCell align="center">
                  <Typography sx={{ fontWeight: '700' }}>{s.totalVisits}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
