import { LoadingButton as MuiLoadingButton, LoadingButtonProps } from '@mui/lab';

export function LoadingButton(props: LoadingButtonProps) {
  return <MuiLoadingButton variant="contained" {...props} />;
}
