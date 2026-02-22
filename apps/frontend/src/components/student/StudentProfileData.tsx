import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  Autocomplete,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import { AlertTriangle } from 'lucide-react';
import { useUser, useUpdateUser } from '../../hooks/userHooks';

interface UserProfile {
  id: string;
  email: string;
  discordUsername: string;
  discordGlobalName: string;
  name: string | null;
  role: string;
  description: string | null;
  background: string | null;
  githubProfileUrl: string | null;
  skills: string[];
  firstHeardAboutBitcoinOn: string | null;
  bitcoinBooksRead: string[];
  whyBitcoin: string | null;
  weeklyCohortCommitmentHours: number | null;
  location: string | null;
  referral: string | null;
}

const SKILLS_OPTIONS = [
  "No skills",
  "Full-stack",
  "Front-end",
  "Back-end",
  "Dev ops",
  "UI/UX design",
  "Prompt engineering",
  "Rust",
  "Python",
  "C++",
  "Golang",
  "Graphic Design",
  "Video Editing",
  "Product Management",
  "Accounting",
  "Law",
  "Sales",
  "Business Operations",
  "Others"
];

const BITCOIN_BOOKS_OPTIONS = [
  "Haven't read any",
  "Mastering Bitcoin",
  "Mastering Lightning Network",
  "BPD",
  "LPD",
  "Learning Bitcoin through Command Line",
  "Programming Bitcoin",
  "The Bitcoin Standard",
  "Sovereign Individual",
  "The Broken Money",
  "The Blocksize War",
  "Others"
];

const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(63,63,70,0.8)',
    borderRadius: 3,
    color: '#fafafa',
    '& fieldset': { border: 'none' },
    '&:hover': { bgcolor: 'rgba(63,63,70,0.95)' },
    '&.Mui-focused': { bgcolor: 'rgba(63,63,70,0.95)' },
  },
  '& .MuiInputBase-input': { color: '#fafafa', py: 1.5, px: 2 },
  '& .MuiInputBase-input::placeholder': { color: '#71717a', opacity: 1 },
  '& .MuiOutlinedInput-root.Mui-disabled': {
    bgcolor: 'rgba(82,82,91,0.6)',
    '& .MuiInputBase-input': { color: '#a1a1aa', WebkitTextFillColor: '#a1a1aa' },
  },
};

const autocompleteSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(63,63,70,0.8)',
    borderRadius: 3,
    color: '#fafafa',
    '& fieldset': { border: 'none' },
    '&:hover': { bgcolor: 'rgba(63,63,70,0.95)' },
    '&.Mui-focused': { bgcolor: 'rgba(63,63,70,0.95)' },
  },
  '& .MuiInputBase-input': { color: '#fafafa' },
  '& .MuiInputBase-input::placeholder': { color: '#71717a', opacity: 1 },
  '& .MuiAutocomplete-popupIndicator': { color: '#fb923c' },
  '& .MuiAutocomplete-clearIndicator': { color: '#a1a1aa' },
};

const StudentProfileData: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const { data: userData, isLoading: isLoadingUser } = useUser();
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();

  useEffect(() => {
    if (userData) {
      setProfile({
        ...userData,
        skills: userData.skills || [],
        bitcoinBooksRead: userData.bitcoinBooksRead || [],
      });
    }
  }, [userData]);

  useEffect(() => {
    if (location.state?.showEmailPopup) {
      setShowEmailPopup(true);
    }
  }, [location]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (!profile) return;

    setProfile(prev => {
      if (!prev) return prev;
      if (name === 'weeklyCohortCommitmentHours') {
        return { ...prev, [name]: value ? parseInt(value) : null };
      }
      return { ...prev, [name]: value || null };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (profile.skills.length === 0) {
      setNotification({ show: true, message: 'Please select at least one skill', type: 'error' });
      return;
    }

    if (profile.bitcoinBooksRead.length === 0) {
      setNotification({ show: true, message: 'Please select at least one book/resource', type: 'error' });
      return;
    }

    updateUser(profile, {
      onSuccess: () => {
        setNotification({ show: true, message: 'Profile updated successfully!', type: 'success' });
        setTimeout(() => navigate('/myDashboard'), 1200);
      },
      onError: () => {
        setNotification({ show: true, message: 'Error updating profile', type: 'error' });
      },
    });
  };

  if (isLoadingUser) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#000' }}>
        <CircularProgress sx={{ color: '#f97316' }} />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#000' }}>
        <Typography sx={{ color: '#fafafa', fontWeight: 500 }}>Failed to load profile</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', p: { xs: 2, sm: 3 } }}>
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#fafafa', mb: 4, textAlign: { xs: 'center', lg: 'left' }, fontSize: { xs: '1.875rem', sm: '2.125rem' } }}>
          Profile Settings
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          {/* Top grid: basic info */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: { xs: 3, lg: 5 } }}>
            {/* Left column */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#d4d4d8', mb: 1.5 }}>Certificate Name*</Typography>
                <TextField
                  fullWidth
                  name="name"
                  value={profile.name || ''}
                  onChange={handleInputChange}
                  required
                  size="small"
                  sx={inputSx}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#d4d4d8', mb: 1.5 }}>Email*</Typography>
                <TextField
                  fullWidth
                  name="email"
                  type="email"
                  value={profile.email || ''}
                  onChange={handleInputChange}
                  required
                  size="small"
                  sx={inputSx}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#d4d4d8', mb: 1.5 }}>Discord Username</Typography>
                <TextField
                  fullWidth
                  name="discordUsername"
                  value={profile.discordUsername}
                  disabled
                  size="small"
                  sx={inputSx}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#d4d4d8', mb: 1.5 }}>Discord Display Name</Typography>
                <TextField
                  fullWidth
                  name="discordGlobalName"
                  value={profile.discordGlobalName}
                  disabled
                  size="small"
                  sx={inputSx}
                />
              </Box>
            </Box>

            {/* Right column */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#d4d4d8', mb: 1.5 }}>Location*</Typography>
                <TextField
                  fullWidth
                  name="location"
                  value={profile.location || ''}
                  onChange={handleInputChange}
                  required
                  size="small"
                  sx={inputSx}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#d4d4d8', mb: 1.5 }}>Portfolio/Github/Side-project link:*</Typography>
                <TextField
                  fullWidth
                  name="githubProfileUrl"
                  type="url"
                  value={profile.githubProfileUrl || ''}
                  onChange={handleInputChange}
                  required
                  size="small"
                  sx={inputSx}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#d4d4d8', mb: 1.5 }}>Hours per week willing to dedicate to this cohort?*</Typography>
                <TextField
                  fullWidth
                  name="weeklyCohortCommitmentHours"
                  type="number"
                  value={profile.weeklyCohortCommitmentHours ?? ''}
                  onChange={handleInputChange}
                  required
                  size="small"
                  slotProps={{ htmlInput: { min: 0 } }}
                  sx={inputSx}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#d4d4d8', mb: 1.5 }}>Which year did you start taking Bitcoin seriously?*</Typography>
                <TextField
                  fullWidth
                  name="firstHeardAboutBitcoinOn"
                  type="date"
                  value={profile.firstHeardAboutBitcoinOn || ''}
                  onChange={handleInputChange}
                  required
                  size="small"
                  slotProps={{ htmlInput: { max: new Date().toISOString().split('T')[0], style: { colorScheme: 'dark' } } }}
                  sx={inputSx}
                />
              </Box>
            </Box>
          </Box>

          {/* Full-width fields */}
          <Box sx={{ mt: 5, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#d4d4d8', mb: 1.5 }}>How would you describe yourself?*</Typography>
              <TextField
                fullWidth
                name="description"
                value={profile.description || ''}
                onChange={handleInputChange}
                required
                multiline
                rows={3}
                sx={inputSx}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: { xs: 3, lg: 5 } }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#d4d4d8', mb: 1.5 }}>Why is Bitcoin important to you?*</Typography>
                <TextField
                  fullWidth
                  name="background"
                  value={profile.background || ''}
                  onChange={handleInputChange}
                  required
                  multiline
                  rows={3}
                  sx={inputSx}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#d4d4d8', mb: 1.5 }}>What do you hope to achieve through this Cohort?*</Typography>
                <TextField
                  fullWidth
                  name="whyBitcoin"
                  value={profile.whyBitcoin || ''}
                  onChange={handleInputChange}
                  required
                  multiline
                  rows={3}
                  sx={inputSx}
                />
              </Box>
            </Box>

            {/* Skills multi-select */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#d4d4d8', mb: 1.5 }}>Please select list of skills*</Typography>
              <Autocomplete
                multiple
                options={SKILLS_OPTIONS}
                value={profile.skills}
                onChange={(_, newValue) => setProfile({ ...profile, skills: newValue })}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...rest } = getTagProps({ index });
                    return (
                      <Chip
                        key={key}
                        label={option}
                        {...rest}
                        sx={{
                          bgcolor: '#ea580c',
                          color: '#fff',
                          fontWeight: 500,
                          '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } },
                        }}
                      />
                    );
                  })
                }
                renderInput={(params) => (
                  <TextField {...params} placeholder="Add a skill..." size="small" />
                )}
                slotProps={{
                  paper: {
                    sx: {
                      bgcolor: '#27272a',
                      border: '1px solid #3f3f46',
                      '& .MuiAutocomplete-option': { color: '#fafafa', '&:hover': { bgcolor: '#ea580c' } },
                      '& .MuiAutocomplete-option[aria-selected="true"]': { bgcolor: 'rgba(234,88,12,0.2)' },
                    },
                  },
                }}
                sx={autocompleteSx}
              />
            </Box>

            {/* Books multi-select */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#d4d4d8', mb: 1.5 }}>Select books that you have gone through?*</Typography>
              <Autocomplete
                multiple
                options={BITCOIN_BOOKS_OPTIONS}
                value={profile.bitcoinBooksRead}
                onChange={(_, newValue) => setProfile({ ...profile, bitcoinBooksRead: newValue })}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...rest } = getTagProps({ index });
                    return (
                      <Chip
                        key={key}
                        label={option}
                        {...rest}
                        sx={{
                          bgcolor: '#ea580c',
                          color: '#fff',
                          fontWeight: 500,
                          '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } },
                        }}
                      />
                    );
                  })
                }
                renderInput={(params) => (
                  <TextField {...params} placeholder="Add a book..." size="small" />
                )}
                slotProps={{
                  paper: {
                    sx: {
                      bgcolor: '#27272a',
                      border: '1px solid #3f3f46',
                      '& .MuiAutocomplete-option': { color: '#fafafa', '&:hover': { bgcolor: '#ea580c' } },
                      '& .MuiAutocomplete-option[aria-selected="true"]': { bgcolor: 'rgba(234,88,12,0.2)' },
                    },
                  },
                }}
                sx={autocompleteSx}
              />
            </Box>

            {/* Referral */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#d4d4d8', mb: 1.5 }}>Where did you hear about this cohort?*</Typography>
              <TextField
                fullWidth
                name="referral"
                value={profile.referral || ''}
                onChange={handleInputChange}
                required
                size="small"
                sx={inputSx}
              />
            </Box>
          </Box>

          {/* Submit */}
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={isUpdating}
              startIcon={isUpdating ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : undefined}
              sx={{
                bgcolor: '#ea580c',
                fontWeight: 600,
                textTransform: 'none',
                px: 4,
                py: 1.5,
                borderRadius: 3,
                fontSize: '0.95rem',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#c2410c' },
                '&.Mui-disabled': { bgcolor: '#ea580c', opacity: 0.6, color: '#fff' },
              }}
            >
              {isUpdating ? 'Updating...' : 'Update Profile'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Email Required Dialog */}
      <Dialog
        open={showEmailPopup}
        onClose={() => setShowEmailPopup(false)}
        PaperProps={{
          sx: { bgcolor: '#27272a', borderRadius: 4, border: '1px solid #3f3f46', maxWidth: 440, textAlign: 'center' },
        }}
      >
        <DialogTitle sx={{ pt: 4, pb: 1 }}>
          <Box sx={{ width: 64, height: 64, bgcolor: 'rgba(249,115,22,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <AlertTriangle size={32} color="#f97316" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fafafa' }}>
            Information Required
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#d4d4d8' }}>
            Please fill in your profile information to join a cohort
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            onClick={() => setShowEmailPopup(false)}
            sx={{ color: '#fafafa', bgcolor: '#3f3f46', textTransform: 'none', fontWeight: 600, px: 4, '&:hover': { bgcolor: '#52525b' } }}
          >
            Got it
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.show}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, show: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setNotification({ ...notification, show: false })}
          severity={notification.type}
          variant="filled"
          sx={{ width: '100%', fontWeight: 500 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentProfileData;
