import { useMemo, useState } from 'react';
import { Box, Typography, Paper, Stack, TextField, InputAdornment, IconButton, Divider } from '@mui/material';
import { LoadingButton } from '../components/LoadingButton';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Visibility from '@mui/icons-material/Visibility';

interface LoginProps {
  onLogin: (email: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const disabled = useMemo(() => !email || !password, [email, password]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin(email.trim());
    }, 550);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 15% 20%, rgba(34,211,238,0.08), transparent 35%), radial-gradient(circle at 80% 0%, rgba(139,92,246,0.12), transparent 25%), #0b1224',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Paper elevation={0} sx={{ maxWidth: 420, width: '100%', p: { xs: 3, sm: 4 }, backdropFilter: 'blur(8px)' }}>
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Добро пожаловать
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Войдите, чтобы получить доступ к вашему инвестиционному дашборду.
            </Typography>
          </Box>

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MailOutlineIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Пароль"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton edge="end" onClick={() => setShowPassword((prev) => !prev)}>
                    {showPassword ? <Visibility /> : <VisibilityOff />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <LoadingButton type="submit" loading={loading} disabled={disabled || loading} fullWidth size="large">
            Войти
          </LoadingButton>

          <Divider textAlign="left">Совет</Divider>
          <Typography variant="body2" color="text.secondary">
            Используйте любой email и пароль для демонстрации. После входа ваша почта появится в правом верхнем углу.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
