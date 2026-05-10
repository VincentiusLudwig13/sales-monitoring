import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Grid, Paper, Typography, Box,
  CircularProgress, Card, CardContent,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  Button, TableSortLabel, MenuItem, Select, InputLabel, FormControl, Tooltip, Collapse
} from '@mui/material';
import {
  Search as SearchIcon, MoreHoriz as MoreHorizIcon, Close as CloseIcon,
  Inventory as InventoryIcon, AssignmentReturn as ReturnIcon, Payment as PaymentIcon,
  TrendingUp, ErrorOutline, LocalShipping, Edit as EditIcon, MoreVert as MoreVertIcon,
  PhotoLibrary as PhotoLibraryIcon, History as HistoryIcon,
  KeyboardArrowDown, KeyboardArrowUp
} from '@mui/icons-material';
import {
  getStats, getVisits, getStores, updateVisit, getUsers,
  type AdminStats, type Visit, type Store, type User, type VisitHistory
} from '../api';
import {
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area
} from 'recharts';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'primary' | 'error' | 'warning' | 'success';
  subtext: string;
}

const CARD_STYLES: Record<string, { gradient: string; iconBg: string; iconColor: string }> = {
  primary: { gradient: 'linear-gradient(135deg, #4F46E5, #6366F1)', iconBg: '#EEF2FF', iconColor: '#4F46E5' },
  success: { gradient: 'linear-gradient(135deg, #059669, #10B981)', iconBg: '#D1FAE5', iconColor: '#059669' },
  error: { gradient: 'linear-gradient(135deg, #DC2626, #EF4444)', iconBg: '#FEE2E2', iconColor: '#DC2626' },
  warning: { gradient: 'linear-gradient(135deg, #D97706, #F59E0B)', iconBg: '#FEF3C7', iconColor: '#D97706' },
};

function StatCard({ title, value, icon, color, subtext }: StatCardProps) {
  const styles = CARD_STYLES[color];
  return (
    <Card sx={{ height: '100%', overflow: 'hidden', position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: styles.gradient }} />
      <CardContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
              {title}
            </Typography>
            <Typography variant="h5" sx={{ my: 0.5, fontWeight: 800, color: '#1E1B4B' }}>
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {subtext}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: styles.iconBg, color: styles.iconColor, width: 44, height: 44 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

type Order = 'asc' | 'desc';

function VisitRow({ v, getStoreName, formatCurrency }: any) {
  const [open, setOpen] = useState(false);
  const hasHistory = v.history && v.history.length > 0;

  return (
    <React.Fragment>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          {hasHistory && (
            <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
              {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </IconButton>
          )}
        </TableCell>
        <TableCell>
          <Typography variant="body2">{new Date(v.checkInTime).toLocaleDateString()}</Typography>
          {v.updated_at && <Typography variant="caption" color="textSecondary" display="block">Updated: {new Date(v.updated_at).toLocaleDateString()}</Typography>}
        </TableCell>
        <TableCell>
          <Typography variant="caption" display="block"><b>In:</b> {new Date(v.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
          <Typography variant="caption" display="block"><b>Out:</b> {new Date(v.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
        </TableCell>
        <TableCell sx={{ fontWeight: '500' }}>{getStoreName(v.storeId)}</TableCell>
        <TableCell align="right">{formatCurrency(v.orderAmount)}</TableCell>
        <TableCell align="right" sx={{ color: 'error.main' }}>{formatCurrency(v.returAmount)}</TableCell>
        <TableCell align="right" sx={{ color: 'success.main' }}>{formatCurrency(v.tagihanAmount)}</TableCell>
        <TableCell>
          <Chip 
            label={v.status} 
            size="small" 
            color={v.status === 'validated' ? 'success' : 'warning'} 
            variant="outlined"
            sx={{ textTransform: 'capitalize' }}
          />
        </TableCell>
      </TableRow>
      {hasHistory && (
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ margin: 1, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Typography variant="subtitle2" gutterBottom component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HistoryIcon fontSize="small" color="info" /> Edit History
                </Typography>
                <Table size="small" aria-label="purchases">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Time</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Old Order</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>New Order</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Old Return</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'error.main' }}>New Return</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Old Collected</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'success.main' }}>New Collected</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {v.history.map((h: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell component="th" scope="row">
                          {new Date(h.change_time).toLocaleString()}
                        </TableCell>
                        <TableCell>{formatCurrency(h.old_order)}</TableCell>
                        <TableCell sx={{ color: 'primary.main', fontWeight: 'bold' }}>{formatCurrency(h.new_order)}</TableCell>
                        <TableCell>{formatCurrency(h.old_retur)}</TableCell>
                        <TableCell sx={{ color: 'error.main', fontWeight: 'bold' }}>{formatCurrency(h.new_retur)}</TableCell>
                        <TableCell>{formatCurrency(h.old_tagihan)}</TableCell>
                        <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>{formatCurrency(h.new_tagihan)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search State
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [orderBy, setOrderBy] = useState<keyof Visit | 'storeName'>('checkInTime');
  const [order, setOrder] = useState<Order>('desc');

  // Edit Modal State
  const [editVisit, setEditVisit] = useState<Visit | null>(null);
  const [editForm, setEditForm] = useState({ order: 0, retur: 0, tagihan: 0 });

  // View Details State
  const [viewVisit, setViewVisit] = useState<Visit | null>(null);
  const [viewAttachments, setViewAttachments] = useState<Visit | null>(null);
  const [historySalesman, setHistorySalesman] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    Promise.all([getStats(), getVisits(), getStores(), getUsers()]).then(([st, vi, str, usr]) => {
      setStats(st.data);
      setAllVisits(vi.data);
      setStores(str.data);
      setUsers(usr.data.filter(u => u.role === 'salesman'));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStoreName = useCallback((id: string) => stores.find(s => s.id === id)?.name || id, [stores]);

  const filteredAndSortedVisits = useMemo(() => {
    let result = [...allVisits];

    // Search
    if (search) {
      result = result.filter(v =>
        getStoreName(v.storeId).toLowerCase().includes(search.toLowerCase()) ||
        v.salesmanId.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter
    if (paymentFilter !== 'All') {
      result = result.filter(v => v.paymentStatus === paymentFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[orderBy as keyof Visit];
      let bVal: any = b[orderBy as keyof Visit];

      if (orderBy === 'storeName') {
        aVal = getStoreName(a.storeId);
        bVal = getStoreName(b.storeId);
      }

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [allVisits, search, paymentFilter, orderBy, order, getStoreName]);

  const salesmanPerformance = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const performanceMap: Record<string, { name: string; gross: number; retur: number; net: number; stores: Set<string> }> = {};

    users.forEach(u => {
      performanceMap[u.nik] = { name: u.name, gross: 0, retur: 0, net: 0, stores: new Set() };
    });

    allVisits.forEach(v => {
      if (v.status !== 'validated') return;
      const vDate = new Date(v.checkInTime);
      if (vDate.getMonth() === currentMonth && vDate.getFullYear() === currentYear) {
        if (!performanceMap[v.salesmanId]) {
          performanceMap[v.salesmanId] = { name: v.salesmanId, gross: 0, retur: 0, net: 0, stores: new Set() };
        }
        performanceMap[v.salesmanId].gross += v.orderAmount || 0;
        performanceMap[v.salesmanId].retur += v.returAmount || 0;
        performanceMap[v.salesmanId].net += ((v.orderAmount || 0) - (v.returAmount || 0));
        if (v.storeId) performanceMap[v.salesmanId].stores.add(v.storeId);
      }
    });

    return Object.values(performanceMap).map(p => ({ ...p, activeStoresCount: p.stores.size }));
  }, [allVisits, users]);
  const dailyTrends = useMemo(() => {
    const last15Days = [...Array(15)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last15Days.map(date => {
      const dayVisits = allVisits.filter(v => v.checkInTime.startsWith(date));
      const sales = dayVisits.reduce((sum, v) => sum + (v.status === 'validated' ? (v.orderAmount || 0) : 0), 0);
      const visits = dayVisits.length;
      return {
        date: new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
        sales,
        visits
      };
    });
  }, [allVisits]);

  if (loading || !stats) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  const formatCurrency = (val: number) => 'Rp ' + (val || 0).toLocaleString('id-ID');

  const handleRequestSort = (property: keyof Visit | 'storeName') => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleOpenEdit = (v: Visit) => {
    setEditVisit(v);
    setEditForm({ order: v.orderAmount, retur: v.returAmount, tagihan: v.tagihanAmount });
  };

  const handleSaveEdit = async () => {
    if (!editVisit) return;
    try {
      await updateVisit(editVisit.id, {
        ...editVisit,
        orderAmount: editForm.order,
        returAmount: editForm.retur,
        tagihanAmount: editForm.tagihan
      });
      setEditVisit(null);
      fetchData();
    } catch (err) {
      alert('Failed to update visit');
    }
  };

  const getStatusInfo = (visit: Visit) => {
    if (!visit.dueDate) return { label: '-', color: 'default' as const, sub: '-' };

    const now = new Date();
    const due = new Date(visit.dueDate);
    const diff = now.getTime() - due.getTime();

    if (diff > 0) {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      return {
        label: 'Overdue',
        color: 'error' as const,
        sub: `${days} days late`
      };
    } else {
      return {
        label: 'Due',
        color: 'primary' as const,
        sub: due.toLocaleDateString()
      };
    }
  };

  const storeData = [
    { name: 'Active', value: stats.active_stores, color: '#10B981' }, // Emerald 500
    { name: 'Inactive', value: stats.inactive_stores, color: '#F43F5E' }, // Rose 500
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E1B4B', letterSpacing: '-0.5px' }}>
          Admin Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Welcome back! Here's your sales overview.</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Stat Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Gross Sales MTD"
            value={formatCurrency(stats.sales_mtd)}
            icon={<TrendingUp />}
            color="primary"
            subtext="Total order value"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Net Sales MTD"
            value={formatCurrency(stats.sales_mtd - stats.retur_mtd)}
            icon={<TrendingUp />}
            color="success"
            subtext="Gross sales minus returns"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Outstanding"
            value={formatCurrency(stats.total_outstanding)}
            icon={<ErrorOutline />}
            color="error"
            subtext="Awaiting collection"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Returns MTD"
            value={formatCurrency(stats.retur_mtd)}
            icon={<LocalShipping />}
            color="warning"
            subtext="Product returns processed"
          />
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 350, borderRadius: 4, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold', color: '#1e293b' }}>Store Activity Status</Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 2 }}>Monthly active vs inactive stores</Typography>
            
            <Box sx={{ flexGrow: 1, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={storeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={0}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {storeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Central Stat */}
              <Box sx={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                  {stats.total_stores}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '10px' }}>
                  Total Stores
                </Typography>
              </Box>
            </Box>

            {/* Custom Legend to ensure perfect Pie centering */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 2 }}>
              {storeData.map((entry, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: entry.color }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569' }}>
                    {entry.name}: {entry.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 350, borderRadius: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Sales Trend (Last 15 Days)</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <RechartsTooltip formatter={(val: number) => formatCurrency(val)} />
                <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Salesman Performance Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              Salesman Performance (MTD)
            </Typography>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 700 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Salesman Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Active Stores Visited</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Gross Sales</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Returns</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Net Sales</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salesmanPerformance.map((sp, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ fontWeight: '600' }}>{sp.name}</TableCell>
                      <TableCell align="center">{sp.activeStoresCount}</TableCell>
                      <TableCell align="right">{formatCurrency(sp.gross)}</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main' }}>{formatCurrency(sp.retur)}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>{formatCurrency(sp.net)}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Visit History">
                          <IconButton size="small" color="primary" onClick={() => setHistorySalesman(sp.id || sp.name)}>
                            <HistoryIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {salesmanPerformance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>No salesman data found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Activity Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Activities & Due Status
              </Typography>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  size="small"
                  placeholder="Search store or salesman..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                  }}
                  sx={{ width: 250 }}
                />

                <FormControl size="small" sx={{ width: 180 }}>
                  <InputLabel>Payment Status</InputLabel>
                  <Select
                    value={paymentFilter}
                    label="Payment Status"
                    onChange={(e) => setPaymentFilter(e.target.value)}
                  >
                    <MenuItem value="All">All Status</MenuItem>
                    <MenuItem value="Full Payment">Full Payment</MenuItem>
                    <MenuItem value="Partial Payment">Partial Payment</MenuItem>
                    <MenuItem value="Unpaid">Unpaid</MenuItem>
                    <MenuItem value="Collection Only">Collection Only</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'checkInTime'}
                        direction={orderBy === 'checkInTime' ? order : 'asc'}
                        onClick={() => handleRequestSort('checkInTime')}
                        sx={{ fontWeight: 'bold' }}
                      >
                        Date
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'storeName'}
                        direction={orderBy === 'storeName' ? order : 'asc'}
                        onClick={() => handleRequestSort('storeName')}
                        sx={{ fontWeight: 'bold' }}
                      >
                        Store Name
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Payment</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Due Info</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Order</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Items</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAndSortedVisits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                        <Typography color="textSecondary">No activities found matching criteria</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedVisits.map((v) => {
                      const status = getStatusInfo(v);
                      const getPaymentColor = (s: string) => {
                        if (s === 'Full Payment') return 'success';
                        if (s === 'Partial Payment') return 'info';
                        if (s === 'Unpaid') return 'error';
                        return 'default';
                      };
                      return (
                        <TableRow key={v.id} hover>
                          <TableCell>{new Date(v.checkInTime).toLocaleDateString()}</TableCell>
                          <TableCell sx={{ fontWeight: '600' }}>{getStoreName(v.storeId)}</TableCell>
                          <TableCell>
                            <Chip
                              label={v.paymentStatus || '-'}
                              size="small"
                              color={getPaymentColor(v.paymentStatus) as any}
                              variant="filled"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Chip label={status.label} size="small" color={status.color} variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{status.sub}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">{formatCurrency(v.orderAmount)}</TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <Tooltip title="View Items">
                                <IconButton
                                  size="small"
                                  onClick={() => setViewVisit(v)}
                                  sx={{ color: 'primary.main' }}
                                >
                                  <MoreHorizIcon />
                                </IconButton>
                              </Tooltip>
                              
                              {(v as any).attachments?.length > 0 && (
                                <Tooltip title="View Attachments">
                                  <IconButton
                                    size="small"
                                    onClick={() => setViewAttachments(v)}
                                    sx={{ color: 'secondary.main' }}
                                  >
                                    <MoreVertIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(v)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <Dialog
        open={!!editVisit}
        onClose={() => setEditVisit(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Edit Activity Details</Typography>
          <IconButton onClick={() => setEditVisit(null)} size="small" sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <Box>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PaymentIcon fontSize="small" /> Financial Overview
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Order (Gross)"
                    type="number"
                    fullWidth
                    value={editForm.order}
                    onChange={(e) => setEditForm({ ...editForm, order: Number(e.target.value) })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Returns"
                    type="number"
                    fullWidth
                    value={editForm.retur}
                    onChange={(e) => setEditForm({ ...editForm, retur: Number(e.target.value) })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Collection"
                    type="number"
                    fullWidth
                    value={editForm.tagihan}
                    onChange={(e) => setEditForm({ ...editForm, tagihan: Number(e.target.value) })}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 2 }}>
              <Typography variant="caption" color="textSecondary">
                * Note: Manually editing amounts will not automatically update individual item quantities in this version.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: 'grey.50' }}>
          <Button onClick={() => setEditVisit(null)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            color="primary"
            sx={{ borderRadius: 2, px: 4, fontWeight: 'bold' }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

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

            {/* Audit Log / History Section */}
            {viewVisit?.history && viewVisit.history.length > 0 && (
              <Grid item xs={12} sx={{ p: 3, bgcolor: '#f1f5f9', borderTop: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HistoryIcon color="info" /> Change Audit Log
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Time</TableCell>
                        <TableCell sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Old Order</TableCell>
                        <TableCell sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>New Order</TableCell>
                        <TableCell sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Old Return</TableCell>
                        <TableCell sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>New Return</TableCell>
                        <TableCell sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Old Collected</TableCell>
                        <TableCell sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>New Collected</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {viewVisit.history.map((h: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ fontSize: '0.7rem' }}>{new Date(h.change_time).toLocaleString()}</TableCell>
                          <TableCell sx={{ fontSize: '0.7rem' }}>{formatCurrency(h.old_order)}</TableCell>
                          <TableCell sx={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'primary.main' }}>{formatCurrency(h.new_order)}</TableCell>
                          <TableCell sx={{ fontSize: '0.7rem' }}>{formatCurrency(h.old_retur)}</TableCell>
                          <TableCell sx={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'error.main' }}>{formatCurrency(h.new_retur)}</TableCell>
                          <TableCell sx={{ fontSize: '0.7rem' }}>{formatCurrency(h.old_tagihan)}</TableCell>
                          <TableCell sx={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'success.main' }}>{formatCurrency(h.new_tagihan)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            )}

            {/* Gallery Section */}
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
                    <Typography variant="body2" color="textSecondary">No attachments found for this visit.</Typography>
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
                <Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.main' }}>
                  <PhotoLibraryIcon />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{att.filename || `Photo ${idx + 1}`}</Typography>
                  <Typography variant="caption" color="textSecondary">Uploaded at {new Date(att.created_at).toLocaleString()}</Typography>
                </Box>
                <Button size="small" variant="outlined">View Full</Button>
              </Paper>
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Salesman History Dialog */}
      <Dialog
        open={!!historySalesman}
        onClose={() => setHistorySalesman(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Visit History: {historySalesman}</Typography>
          <IconButton onClick={() => setHistorySalesman(null)} sx={{ color: 'white' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <TableContainer sx={{ maxHeight: '70vh' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>In / Out</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Store</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Order</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Return</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Collected</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allVisits
                  .filter(v => {
                    const salesman = users.find(u => u.name === historySalesman || u.nik === historySalesman);
                    return v.salesmanId === historySalesman || v.salesmanId === salesman?.nik;
                  })
                  .sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime())
                  .map(v => (
                    <VisitRow key={v.id} v={v} getStoreName={getStoreName} formatCurrency={formatCurrency} />
                  ))}
                {allVisits.filter(v => {
                  const salesman = users.find(u => u.name === historySalesman || u.nik === historySalesman);
                  return v.salesmanId === historySalesman || v.salesmanId === salesman?.nik;
                }).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No visit history found for this salesman.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
