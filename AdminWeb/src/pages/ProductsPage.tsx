import React, { useEffect, useState } from 'react';
import { 
  Paper, Typography, Box, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, 
  Button, TextField, Dialog, DialogTitle, DialogContent, 
  DialogActions, CircularProgress, IconButton, Stack
} from '@mui/material';
import { Edit as EditIcon, AddCircle as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { getProducts, addProduct, editProduct, deleteProduct, type Product } from '../api';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState<Product>({
    id: '',
    name: '',
    quantity: 0,
    price: 0,
    fresh_amount: 0,
    retur_amount: 0
  });

  const fetchProducts = async () => {
    try {
      const res = await getProducts();
      setProducts(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpen = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({
        id: '',
        name: '',
        quantity: 0,
        price: 0,
        fresh_amount: 0,
        retur_amount: 0
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: name === 'name' || name === 'id' ? value : Number(value)
      };
      // Auto-calculate quantity
      if (name === 'fresh_amount' || name === 'retur_amount') {
        updated.quantity = updated.fresh_amount + updated.retur_amount;
      }
      return updated;
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingProduct) {
        await editProduct(formData.id, formData);
      } else {
        await addProduct(formData);
      }
      fetchProducts();
      handleClose();
    } catch (err) {
      alert('Error saving product');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteProduct(id);
      fetchProducts();
    } catch (err) {
      alert('Error deleting product');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E1B4B', letterSpacing: '-0.5px' }}>Inventory Management</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Add, edit, and track product stock levels.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Product
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 700 }}>
          <TableHead sx={{ background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)' }}>
            <TableRow>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>ID</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Price</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Stock</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Fresh</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Retur</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.id}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{p.name}</TableCell>
                <TableCell>Rp {p.price.toLocaleString('id-ID')}</TableCell>
                <TableCell>{p.quantity}</TableCell>
                <TableCell>{p.fresh_amount}</TableCell>
                <TableCell>{p.retur_amount}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <IconButton color="primary" onClick={() => handleOpen(p)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(p.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              name="id"
              label="Product ID"
              fullWidth
              value={formData.id}
              onChange={handleChange}
              disabled={!!editingProduct}
            />
            <TextField
              name="name"
              label="Product Name"
              fullWidth
              value={formData.name}
              onChange={handleChange}
            />
            <TextField
              name="price"
              label="Price (Rp)"
              type="number"
              fullWidth
              value={formData.price}
              onChange={handleChange}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                name="quantity"
                label="Total Stock"
                type="number"
                fullWidth
                value={formData.quantity}
                disabled
                helperText="Auto-calculated (Fresh + Retur)"
              />
              <TextField
                name="fresh_amount"
                label="Fresh Amount"
                type="number"
                fullWidth
                value={formData.fresh_amount}
                onChange={handleChange}
              />
              <TextField
                name="retur_amount"
                label="Retur Amount"
                type="number"
                fullWidth
                value={formData.retur_amount}
                onChange={handleChange}
              />
            </Stack>
          </Stack>
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
