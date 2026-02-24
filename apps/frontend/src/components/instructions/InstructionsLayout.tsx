import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Link,
  Button,
} from '@mui/material';
import {
  Info,
  Link2,
  FileText,
  ClipboardList,
  ExternalLink,
} from 'lucide-react';
import type { WeekContent } from '../../types/instructions';

interface InstructionsLayoutProps {
  cohortName: string;
  cohortType: 'MASTERING_BITCOIN' | 'LEARNING_BITCOIN_FROM_COMMAND_LINE' | 'MASTERING_LIGHTNING_NETWORK' | 'BITCOIN_PROTOCOL_DEVELOPMENT';
  weeklyContent: WeekContent[];
  activeWeek: number | 'links' | 'exercises';
  setActiveWeek: (week: number | 'links' | 'exercises') => void;
  canViewBonusQuestions: boolean;
  seasonNumber?: number;
}

const InstructionsLayout: React.FC<InstructionsLayoutProps> = ({
  cohortName,
  cohortType,
  weeklyContent,
  activeWeek,
  setActiveWeek,
  canViewBonusQuestions,
  seasonNumber,
}) => {
  const navigate = useNavigate();

  const getAssignmentLink = (week: WeekContent): string | undefined => {
    // Prefer classroomUrl from API if available
    if (week.classroomUrl) return week.classroomUrl;
    // Fall back to static assignmentLinks
    if (!week.assignmentLinks) return undefined;
    if (seasonNumber && week.assignmentLinks[seasonNumber]) {
      return week.assignmentLinks[seasonNumber];
    }
    const seasons = Object.keys(week.assignmentLinks).map(Number);
    if (seasons.length === 0) return undefined;
    const latestSeason = Math.max(...seasons);
    return week.assignmentLinks[latestSeason];
  };

  const activeChipSx = {
    bgcolor: '#ea580c',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.9rem',
    height: 34,
    cursor: 'pointer',
    '& .MuiChip-icon': { color: '#fff' },
    '&:hover': { bgcolor: '#c2410c' },
  };

  const inactiveChipSx = {
    bgcolor: '#27272a',
    color: '#a1a1aa',
    fontWeight: 500,
    fontSize: '0.9rem',
    height: 34,
    cursor: 'pointer',
    border: '1px solid #3f3f46',
    '& .MuiChip-icon': { color: '#a1a1aa' },
    '&:hover': { bgcolor: '#3f3f46', color: '#e4e4e7' },
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fafafa' }}>
      {/* Top Header */}
      <Box sx={{ borderBottom: '1px solid #27272a', px: { xs: 2, sm: 3, md: 4 }, py: 2.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#fb923c', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          {cohortName}
        </Typography>
      </Box>

      {/* Navigation Bar */}
      <Box
        sx={{
          borderBottom: '1px solid #27272a',
          px: { xs: 2, sm: 3, md: 4 },
          py: 1.5,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { height: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#3f3f46', borderRadius: 2 },
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap', minWidth: 'max-content' }}>
          {/* General Instructions */}
          <Chip
            icon={<Info size={16} />}
            label="General Instructions"
            onClick={() => navigate('/general-instructions')}
            sx={inactiveChipSx}
          />

          {/* Links */}
          <Chip
            icon={<Link2 size={16} />}
            label="Links"
            onClick={() => setActiveWeek('links')}
            sx={activeWeek === 'links' ? activeChipSx : inactiveChipSx}
          />

          {/* Exercises - Only for Lightning Network */}
          {cohortType === 'MASTERING_LIGHTNING_NETWORK' && (
            <Chip
              icon={<ClipboardList size={16} />}
              label="Exercises"
              onClick={() => setActiveWeek('exercises')}
              sx={activeWeek === 'exercises' ? activeChipSx : inactiveChipSx}
            />
          )}

          {/* Week Chips */}
          {weeklyContent.map((week) => (
            <Chip
              key={week.week}
              label={`Week ${week.week}`}
              onClick={() => setActiveWeek(week.week)}
              sx={activeWeek === week.week ? activeChipSx : inactiveChipSx}
            />
          ))}
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 6 }, py: { xs: 3, md: 5 }, maxWidth: 900, mx: 'auto' }}>
        {activeWeek === 'exercises' ? (
          /* Exercises Content */
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#fb923c', mb: 4, fontSize: { xs: '1.5rem', md: '2rem' } }}>
              Lightning Network Exercises
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { num: 1, title: 'First Node Setup and Invoice Generation', concepts: 'Node initialization, wallet funding, invoice creation', problem: 'Set up and run your first C-Lightning (Core Lightning) node. Once the node is operational, fund it with some test Bitcoin (on regtest or testnet). Using the CLN RPC interface, create a Lightning invoice for 50,000 satoshis with a description "Coffee Payment" and a 1-hour expiry.', output: ['A running Lightning node with a funded on-chain wallet', 'A valid Lightning invoice (BOLT11 format) that can be decoded to show the amount, description, and expiry time', 'Verification that the invoice was generated by your node'] },
                { num: 2, title: 'Peer Connection and Channel Establishment', concepts: 'Node discovery, peer connection, channel opening, channel capacity', problem: 'Create and run two separate Lightning nodes (Alice and Bob). Connect them as peers using their respective node IDs and network addresses. Once connected, have Alice open a payment channel to Bob with a capacity of 500,000 satoshis. Verify that the channel is active and check the channel state on both nodes.', output: ['Two running Lightning nodes that recognize each other as peers', 'An active payment channel between Alice and Bob', 'Channel details showing: capacity, local/remote balance, channel ID, and state (CHANNELD_NORMAL)'] },
                { num: 3, title: 'Multi-Hop Payment Routing', concepts: 'Network topology, pathfinding, multi-hop payments, routing fees', problem: 'Building on Exercise 2, create a third node (Carol). Establish a network topology where: Alice has a channel with Bob (500k sats), and Bob has a channel with Carol (300k sats). Carol should generate an invoice for 100,000 satoshis. Alice should pay this invoice, which will require the payment to route through Bob as an intermediate hop. Monitor and verify that the payment successfully traverses the network.', output: ['A 3-node network with appropriate channel topology (Alice\u2192Bob\u2192Carol)', 'Successful payment from Alice to Carol via Bob', 'Proof of payment (preimage) received by Alice', 'Updated channel balances reflecting the routed payment and routing fees collected by Bob'] },
                { num: 4, title: 'Circular Rebalancing', concepts: 'Channel liquidity, circular payments, channel balance management', problem: 'Using your 3-node network from Exercise 3, create a circular topology by opening a new channel from Carol back to Alice with 400,000 satoshis capacity. Now you have: Alice\u2192Bob, Bob\u2192Carol, and Carol\u2192Alice. Execute a circular rebalancing payment where Alice pays herself 150,000 satoshis by routing the payment through Bob and Carol (Alice\u2192Bob\u2192Carol\u2192Alice). Verify that the payment completes successfully and observe how the balances shift in each channel.', output: ['A circular network topology with three bidirectional channels (Alice\u2194Bob\u2194Carol\u2194Alice)', 'Successful self-payment from Alice to Alice via the circular route', 'Before and after channel balance snapshots for all three channels', 'Proof that liquidity has been redistributed: Alice\'s outbound capacity increased on the Alice\u2192Bob channel, while her inbound capacity decreased on the Carol\u2192Alice channel'] },
              ].map((ex) => {
                const weekData = weeklyContent.find(w => w.week === ex.num);
                const link = weekData ? getAssignmentLink(weekData) : undefined;
                return (
                  <Paper key={ex.num} elevation={0} sx={{ bgcolor: 'rgba(39,39,42,0.5)', border: '1px solid #3f3f46', borderRadius: 2, p: { xs: 3, md: 4 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#fb923c', mb: 2, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                      Exercise {ex.num}: {ex.title}
                    </Typography>
                    {link && (
                      <Link href={link} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 2, fontSize: '1rem' }}>
                        Exercise {ex.num} Assignment <ExternalLink size={14} />
                      </Link>
                    )}
                    <Typography variant="body2" sx={{ color: '#d4d4d8', mb: 2 }}>
                      <strong style={{ color: '#fafafa' }}>Concepts:</strong> {ex.concepts}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#fafafa', fontWeight: 600, mb: 1 }}>Problem Statement:</Typography>
                    <Typography variant="body2" sx={{ color: '#d4d4d8', mb: 2, lineHeight: 1.7 }}>{ex.problem}</Typography>
                    <Typography variant="body2" sx={{ color: '#fafafa', fontWeight: 600, mb: 1 }}>Expected Output:</Typography>
                    <Box component="ul" sx={{ pl: 3, m: 0 }}>
                      {ex.output.map((item, i) => (
                        <Typography key={i} component="li" variant="body2" sx={{ color: '#d4d4d8', mb: 0.5, lineHeight: 1.6 }}>{item}</Typography>
                      ))}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        ) : activeWeek === 'links' ? (
          /* Links Content */
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#fb923c', mb: 4, fontSize: { xs: '1.5rem', md: '2rem' } }}>
              Frequently Accessed Links
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { label: 'Wheel of Names', url: 'https://wheelofnames.com/' },
                { label: 'MultiBuzz', url: 'https://www.multibuzz.app/' },
              ].map((link) => (
                <Link key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: '#fafafa', display: 'inline-flex', alignItems: 'center', gap: 1, fontSize: '1.1rem', '&:hover': { color: '#fb923c' } }}>
                  {link.label} <ExternalLink size={16} />
                </Link>
              ))}

              {canViewBonusQuestions && cohortType === 'LEARNING_BITCOIN_FROM_COMMAND_LINE' && (
                <>
                  <Link href="https://docs.google.com/document/d/1YXsW3gRVbBxBEAAcI84W3KCFBbevzVXUUznH8w2XohM/preview" target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: '#fafafa', display: 'inline-flex', alignItems: 'center', gap: 1, fontSize: '1.1rem', '&:hover': { color: '#fb923c' } }}>
                    lbtcl-playbook <ExternalLink size={16} />
                  </Link>
                  <Link href="https://gist.github.com/rajarshimaitra/f83eaf3295b88ac180a965b3daab4d8a" target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: '#fafafa', display: 'inline-flex', alignItems: 'center', gap: 1, fontSize: '1.1rem', '&:hover': { color: '#fb923c' } }}>
                    lbtcl-bonus-questions <ExternalLink size={16} />
                  </Link>
                  <Link href="https://github.com/Bitshala/LBTCL" target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: '#fafafa', display: 'inline-flex', alignItems: 'center', gap: 1, fontSize: '1.1rem', '&:hover': { color: '#fb923c' } }}>
                    lbtcl-main-repo <ExternalLink size={16} />
                  </Link>
                </>
              )}
            </Box>
          </Box>
        ) : (
          /* Week Questions Content */
          <>
            {weeklyContent.find(week => week.week === activeWeek) && (() => {
              const currentWeek = weeklyContent.find(week => week.week === activeWeek)!;
              const assignmentLink = getAssignmentLink(currentWeek);

              // Parse reading material and activity from content
              const sections = (currentWeek.content || '').split('## ').filter(s => s.trim());
              const readingSection = sections.find(s => s.trim().startsWith('Reading Material'));
              const activitySection = sections.find(s => s.trim().startsWith('Activity'));

              const readingLinks = readingSection
                ? readingSection.split('\n').filter(line => line.match(/\[([^\]]+)\]\(([^)]+)\)/)).map(line => {
                    const match = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
                    return match ? { label: match[1], url: match[2] } : null;
                  }).filter(Boolean) as { label: string; url: string }[]
                : [];

              const activityContent = activitySection
                ? activitySection.split('\n').slice(1).join('\n').trim()
                : null;

              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {/* Title */}
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#fb923c', fontSize: { xs: '1.5rem', md: '2rem' } }}>
                    {currentWeek.title}
                  </Typography>

                  {/* Assignment */}
                  {(assignmentLink || currentWeek.classroomInviteLink) && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: '#a1a1aa', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Assignment
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        {assignmentLink && (
                          <Chip
                            label={`Week ${activeWeek} Assignment`}
                            component="a"
                            href={assignmentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            clickable
                            sx={{
                              bgcolor: 'rgba(96,165,250,0.12)',
                              color: '#93c5fd',
                              border: '1px solid rgba(96,165,250,0.25)',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              height: 36,
                              '&:hover': { bgcolor: 'rgba(96,165,250,0.2)', color: '#bfdbfe' },
                            }}
                          />
                        )}
                        {currentWeek.classroomInviteLink && (
                          <Chip
                            label="Classroom Invite"
                            component="a"
                            href={currentWeek.classroomInviteLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            clickable
                            sx={{
                              bgcolor: 'rgba(74,222,128,0.12)',
                              color: '#86efac',
                              border: '1px solid rgba(74,222,128,0.25)',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              height: 36,
                              '&:hover': { bgcolor: 'rgba(74,222,128,0.2)', color: '#bbf7d0' },
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Reading Material */}
                  {readingLinks.length > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: '#a1a1aa', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Reading Material
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        {readingLinks.map((link, i) => (
                          <Chip
                            key={i}
                            label={link.label}
                            component="a"
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            clickable
                            sx={{
                              bgcolor: 'rgba(251,146,60,0.1)',
                              color: '#fdba74',
                              border: '1px solid rgba(251,146,60,0.2)',
                              fontWeight: 500,
                              fontSize: '0.85rem',
                              height: 36,
                              '&:hover': { bgcolor: 'rgba(251,146,60,0.18)', color: '#fed7aa' },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Questions */}
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#fb923c', fontSize: { xs: '1.5rem', md: '2rem' } }}>
                    List of Questions
                  </Typography>

                  {/* Group Round */}
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#fafafa', mb: 3 }}>Group Round</Typography>
                    <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {currentWeek.gdQuestions.map((question, index) => (
                        <Box key={index} component="li" sx={{ display: 'flex', alignItems: 'flex-start' }}>
                          <Typography sx={{ color: '#fb923c', fontWeight: 600, mr: 1.5, mt: 0.1, minWidth: 24, fontSize: '1.1rem' }}>
                            {index + 1}.
                          </Typography>
                          <Typography sx={{ color: '#e4e4e7', lineHeight: 1.7, fontSize: '1.1rem' }}>
                            {question}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  {/* Bonus Round */}
                  {canViewBonusQuestions && currentWeek.bonusQuestions && (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#fafafa', mb: 3 }}>Bonus Round</Typography>
                      <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {currentWeek.bonusQuestions.map((item, index) => {
                          const question = typeof item === 'string' ? item : item.question;
                          const image = typeof item === 'string' ? undefined : item.image;
                          return (
                            <Box key={index} component="li">
                              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                <Typography sx={{ color: '#60a5fa', fontWeight: 600, mr: 1.5, mt: 0.1, minWidth: 24, fontSize: '1.1rem' }}>
                                  {index + 1}.
                                </Typography>
                                <Typography sx={{ color: '#e4e4e7', lineHeight: 1.7, fontSize: '1.1rem' }}>
                                  {question}
                                </Typography>
                              </Box>
                              {image && (
                                <Box sx={{ mt: 1.5, ml: 4 }}>
                                  <Box component="img" src={image} alt={`Question ${index + 1} reference`} sx={{ maxWidth: '100%', borderRadius: 2, border: '1px solid #3f3f46' }} />
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  )}

                  {/* Activity */}
                  {activityContent && (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#60a5fa', mb: 2 }}>Activity</Typography>
                      <Typography sx={{ color: '#e4e4e7', fontSize: '1.1rem', lineHeight: 1.7 }}>
                        {activityContent}
                      </Typography>
                    </Box>
                  )}
                </Box>
              );
            })()}
          </>
        )}
      </Box>
    </Box>
  );
};

export default InstructionsLayout;
