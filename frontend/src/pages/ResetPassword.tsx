import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Divider, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import axios from 'axios';
import { LoadingButton } from '../components/LoadingButton';
import { api } from '../api/client';

interface ResetPasswordProps {
  onBack: () => void;
}

interface ResetPasswordResponse {
  success: boolean;
  message?: string;
}

export function ResetPassword({ onBack }: ResetPasswordProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [redirectTimer, setRedirectTimer] = useState<number | null>(null);
  const theme = useTheme();

  const disabled = useMemo(
    () => !email || !password || !confirmPassword || password !== confirmPassword,
    [email, password, confirmPassword]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const { data } = await api.post<ResetPasswordResponse>('/auth/reset-password', {
        email: email.trim(),
        password,
      });

      if (!data.success) {
        throw new Error(data.message || 'Не удалось обновить пароль.');
      }

      setSuccess('Пароль успешно обновлён. Теперь можете войти с новыми данными.');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      const timer = window.setTimeout(onBack, 1500);
      setRedirectTimer(timer);
    } catch (err) {
      const fallback = 'Не удалось обновить пароль. Проверьте email и попробуйте снова.';
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

  useEffect(() => {
    return () => {
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [redirectTimer]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `radial-gradient(circle at 16% 20%, rgba(59,143,101,0.12), transparent 36%), radial-gradient(circle at 82% 0%, rgba(47,64,60,0.08), transparent 26%), ${theme.palette.background.default}`,
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
          backgroundColor: 'rgba(255,255,255,0.94)',
          border: '1px solid #DBE4D6',
          boxShadow: '0 20px 45px rgba(47,64,60,0.12)',
        }}
      >
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
          <Box>
            <Typography variant="h5" gutterBottom fontWeight={700} color="secondary.main">
              Сброс пароля
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Укажите email и новый пароль. Мы обновим его без дополнительных подтверждений.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" variant="filled">
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" variant="filled">
              {success}
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
            label="Новый пароль"
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
            autoComplete="new-password"
          />

          <TextField
            label="Подтверждение пароля"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
            autoComplete="new-password"
            error={Boolean(confirmPassword) && password !== confirmPassword}
            helperText={password !== confirmPassword && confirmPassword ? 'Пароли должны совпадать' : ' '}
          />

          <LoadingButton type="submit" loading={loading} disabled={disabled || loading} fullWidth size="large">
            Обновить пароль
          </LoadingButton>

          <Divider textAlign="left">Возврат</Divider>
          <Typography
            variant="body2"
            color="primary"
            sx={{ cursor: 'pointer', textAlign: 'center' }}
            onClick={onBack}
          >
            Вернуться к входу
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
