import { Box, Button, Dialog, IconButton, Typography } from '@mui/material';
import { X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { redirectToDiscordAuth } from '../services/auth';
import { rememberReturnPath } from '../utils/returnPath';

/**
 * Sign-in prompt shown over whatever page you were on, rather than as a
 * separate screen — the point of the signed-out preview is that you don't lose
 * your place. Rendered once from Layout; opened from anywhere via
 * useAuth().openLogin().
 */
const LoginModal = () => {
  const { isLoginModalOpen, closeLogin } = useAuth();

  const signIn = () => {
    // Discord sends us back to `/`, which has no idea where we started, so
    // stash it first. See utils/returnPath.
    rememberReturnPath(window.location.pathname + window.location.search);
    redirectToDiscordAuth();
  };

  return (
    <Dialog
      open={isLoginModalOpen}
      onClose={closeLogin}
      maxWidth="xs"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
          },
        },
        paper: {
          sx: {
            bgcolor: '#18181b',
            backgroundImage: 'none',
            border: '1px solid #27272a',
            borderRadius: 3,
            overflow: 'hidden',
          },
        },
      }}
    >
      <Box sx={{ position: 'relative', px: 4, pt: 5, pb: 4, textAlign: 'center' }}>
        <IconButton
          onClick={closeLogin}
          aria-label="Close"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            color: '#71717a',
            '&:hover': { color: '#e4e4e7', bgcolor: 'rgba(255,255,255,0.05)' },
          }}
        >
          <X size={18} />
        </IconButton>

        <Typography
          sx={{
            fontFamily: 'monospace',
            fontWeight: 700,
            fontSize: '2rem',
            letterSpacing: '0.15em',
            color: '#fafafa',
            mb: 1,
          }}
        >
          ORACLE
        </Typography>
        <Typography sx={{ color: '#a1a1aa', fontSize: '0.9rem', mb: 4, lineHeight: 1.6 }}>
          Sign in to join cohorts, track your progress and apply for fellowships.
        </Typography>

        <Button
          onClick={signIn}
          fullWidth
          variant="contained"
          startIcon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          }
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            bgcolor: '#5865F2',
            py: 1.4,
            borderRadius: 2,
            '&:hover': { bgcolor: '#4752c4' },
          }}
        >
          Sign in with Discord
        </Button>

        <Typography sx={{ color: '#52525b', fontSize: '0.75rem', mt: 2.5 }}>
          You can keep browsing cohorts and curriculum without an account.
        </Typography>
      </Box>
    </Dialog>
  );
};

export default LoginModal;
