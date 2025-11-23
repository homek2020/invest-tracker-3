import { useMemo, useState } from 'react';
import { Box, Typography, Paper, Stack, TextField, InputAdornment, IconButton, Divider, Alert } from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Visibility from '@mui/icons-material/Visibility';
import axios from 'axios';
import { LoadingButton } from '../components/LoadingButton';
import { api } from '../api/client';

interface LoginProps {
  onLogin: (session: { email: string; token: string }) => void;
}

interface AuthResponse {
  success: boolean;
  userId: string;
  email: string;
  token: string;
  message?: string;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = useMemo(() => !email || !password, [email, password]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', {
        email: email.trim(),
        password,
      });

      if (!data.success) {
        throw new Error(data.message || 'Invalid credentials');
      }

      onLogin({ email: data.email, token: data.token });
    } catch (err) {
      const fallback = 'Не удалось войти. Проверьте почту и пароль и попробуйте снова.';
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message as string | undefined;
        setError(message || fallback);
      } else {
        setError(fallback);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 15% 20%, rgba(34,211,238,0.08), transparent 35%), radial-gradient(circle at 80% 0%, rgba(139,92,246,0.12), transparent 25%), #0b1224',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 440,
          width: '100%',
          p: { xs: 3, sm: 4 },
          backdropFilter: 'blur(10px)',
          background: 'rgba(22, 29, 53, 0.75)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
          <Box>
            <Typography variant="h5" gutterBottom fontWeight={700}>
              Добро пожаловать
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Авторизуйтесь, чтобы открыть ваш инвестиционный дашборд. Войти могут только зарегистрированные пользователи.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" variant="filled" sx={{ backgroundColor: '#ff4545' }}>
              {error}
            </Alert>
          )}

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
            autoComplete="email"
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
            autoComplete="current-password"
          />

          <LoadingButton type="submit" loading={loading} disabled={disabled || loading} fullWidth size="large">
            Войти
          </LoadingButton>

          <Divider textAlign="left">Совет</Divider>
          <Typography variant="body2" color="text.secondary">
            Если вы ещё не зарегистрированы, обратитесь к администратору. Для успешного входа email должен быть в базе, а пароль —
            корректным.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
