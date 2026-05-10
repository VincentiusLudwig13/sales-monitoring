import React, { useState } from 'react';
import { 
  Box, Paper, TextField, Button, Typography, Alert
} from '@mui/material';
import { LockOutlined as LockIcon } from '@mui/icons-material';
import { login, type User } from '../api';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await login(nik, password);
      onLogin(response.data);
    } catch (err) {
      setError('Invalid NIK or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1E1B4B 0%, #4F46E5 50%, #06B6D4 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2,
    }}>
      <Paper elevation={0} sx={{ p: 4, width: '100%', maxWidth: 400, borderRadius: 4, boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.4)' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: 3,
            background: 'linear-gradient(135deg, #4F46E5, #06B6D4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2,
          }}>
            <LockIcon sx={{ color: 'white', fontSize: 28 }} />
          </Box>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 800, color: '#1E1B4B', letterSpacing: '-0.5px' }}>
            Sales Monitoring
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Admin Portal — Sign in to continue
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="NIK"
            value={nik}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNik(e.target.value)}
            autoFocus
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 3, mb: 2, py: 1.5, borderRadius: 2, fontWeight: 700,
              background: 'linear-gradient(135deg, #4F46E5, #06B6D4)',
              '&:hover': { background: 'linear-gradient(135deg, #4338CA, #0891B2)', transform: 'translateY(-1px)', boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.5)' },
              transition: 'all 0.2s ease',
            }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
