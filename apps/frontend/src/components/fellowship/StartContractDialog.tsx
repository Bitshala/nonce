import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { useStartFellowshipContract } from '../../hooks/fellowshipHooks';
import type { GetFellowshipResponseDto } from '../../types/fellowship';
import { extractErrorMessage } from '../../utils/errorUtils';

type Props = {
  fellowship: GetFellowshipResponseDto | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
};

// Mirrors @Max(5000) on StartFellowshipContractDto in the backend.
const MAX_AMOUNT_USD = 5000;
// Mirrors the backend's 24-month cap on the contract end date.
const MAX_MONTHS = 24;

// Field-level validators return the error to show, or null. They run on every
// keystroke so mistakes surface immediately, not on submit.
const validateAmount = (raw: string): string | null => {
  if (!raw.trim()) return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return 'Enter a numeric amount.';
  if (n <= 0) return 'Amount must be positive.';
  if (n > MAX_AMOUNT_USD)
    return `Amount cannot exceed $${MAX_AMOUNT_USD.toLocaleString('en-US')}/mo.`;
  if (!/^\d+(\.\d{1,2})?$/.test(raw.trim())) return 'Amount supports up to 2 decimals.';
  return null;
};

const StartContractDialog = ({ fellowship, onClose, onSuccess, onError }: Props) => {
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [amountUsd, setAmountUsd] = useState('');
  const startMut = useStartFellowshipContract();

  const amountError = validateAmount(amountUsd);
  const startDateError =
    startDate && !startDate.isValid() ? 'Enter a valid date.' : null;
  const endDateError = !endDate
    ? null
    : !endDate.isValid()
      ? 'Enter a valid date.'
      : startDate && startDate.isValid() && !endDate.isAfter(startDate)
        ? 'End date must be after start date.'
        : endDate.isAfter(dayjs().add(MAX_MONTHS, 'month'), 'day')
          ? `End date cannot be more than ${MAX_MONTHS} months from today.`
          : null;

  const canSubmit =
    !!startDate &&
    !startDateError &&
    !!endDate &&
    !endDateError &&
    !!amountUsd.trim() &&
    !amountError &&
    !startMut.isPending;

  const reset = () => {
    setStartDate(null);
    setEndDate(null);
    setAmountUsd('');
  };

  const handleSubmit = async () => {
    if (!fellowship || !canSubmit) return;
    try {
      await startMut.mutateAsync({
        id: fellowship.id,
        body: {
          startDate: startDate!.format('YYYY-MM-DD'),
          endDate: endDate!.format('YYYY-MM-DD'),
          amountUsd: Number(amountUsd),
        },
      });
      onSuccess('Contract started.');
      reset();
    } catch (e) {
      onError(extractErrorMessage(e));
    }
  };

  return (
    <Dialog
      open={!!fellowship}
      onClose={() => {
        reset();
        onClose();
      }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        Start contract — {fellowship?.userName ?? fellowship?.userEmail ?? 'Fellowship'}
      </DialogTitle>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <DatePicker
                label="Start date"
                value={startDate}
                onChange={setStartDate}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    error: !!startDateError,
                    helperText: startDateError ?? ' ',
                  },
                }}
              />
              <DatePicker
                label="End date"
                value={endDate}
                onChange={setEndDate}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    error: !!endDateError,
                    helperText: endDateError ?? ' ',
                  },
                }}
              />
            </Stack>
            <TextField
              label="Amount (USD, per month)"
              size="small"
              fullWidth
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value)}
              placeholder="500.00"
              error={!!amountError}
              helperText={
                amountError ?? `Up to $${MAX_AMOUNT_USD.toLocaleString('en-US')}/mo.`
              }
            />
          </Stack>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            reset();
            onClose();
          }}
        >
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
          {startMut.isPending ? 'Starting…' : 'Start contract'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StartContractDialog;
