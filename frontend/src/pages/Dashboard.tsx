import { Card, CardContent, Grid, Typography, Box } from '@mui/material';

export function Dashboard() {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Дашборд
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Текущая дата</Typography>
              <Typography variant="h6">{new Date().toLocaleDateString('ru-RU')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Суммарный баланс</Typography>
              <Typography variant="h6">—</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Доходность</Typography>
              <Typography variant="h6">—</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
