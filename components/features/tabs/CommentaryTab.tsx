'use client';

import { useState, useEffect, useRef } from 'react';
import cricketApi from '@/services/cricketApi';
import pollyService from '@/services/pollyService';

// Custom Select Component with Tooltip
interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; title: string }[];
  placeholder?: string;
  disabled?: boolean;
}

function CustomSelect({ value, onChange, options, placeholder = 'Select...', disabled = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleOptionHover = (optionValue: string, event: React.MouseEvent<HTMLButtonElement>) => {
    setHoveredOption(optionValue);
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      top: rect.top,
      left: rect.right + 8
    });
  };

  const selectedOption = options.find(opt => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Select Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 hover:border-emerald-400 transition-all cursor-pointer text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        title={selectedOption?.title || placeholder}
      >
        <span className="truncate pr-2 block">{displayText}</span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="absolute z-50 w-full mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-80 overflow-y-auto overflow-x-hidden">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                onMouseEnter={(e) => handleOptionHover(option.value, e)}
                onMouseLeave={() => setHoveredOption(null)}
                className={`w-full px-4 py-3 text-left text-sm transition-colors overflow-hidden ${value === option.value
                  ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                  : 'text-gray-300 hover:bg-gray-800'
                  }`}
              >
                <span className="truncate block">{option.label}</span>
              </button>
            ))}
          </div>

          {/* Tooltip - rendered outside dropdown to avoid clipping */}
          {hoveredOption && hoveredOption !== '' && (
            <div
              className="fixed z-[100] px-3 py-2 bg-gray-950 border border-emerald-500/50 rounded-lg shadow-2xl text-xs text-gray-200 pointer-events-none whitespace-normal break-words max-w-md"
              style={{
                left: `${tooltipPosition.left}px`,
                top: `${tooltipPosition.top}px`,
              }}
            >
              {options.find(opt => opt.value === hoveredOption)?.title}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Backend WebSocket URL from environment variable
const BACKEND_WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL || 'http://localhost:8000/api/commentary/ws/match/';

interface Match {
  id: string;
  displayName: string;
  status?: string;
  seriesName?: string;
  isLive: boolean;
  team1: string;
  team2: string;
}

interface CommentaryEntry {
  key: string;
  text: string;
  over?: number;
  ball?: number;
  event?: string;
  runs: number;
  wicket: boolean;
  isNew: boolean;
  updated: boolean;
  timestamp: number;
  inningsId?: number;
}

export default function CommentaryTab() {
  // State management
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  const [commentaryEntries, setCommentaryEntries] = useState<CommentaryEntry[]>([]);
  const [miniscore, setMiniscore] = useState<any>(null);
  const [matchHeader, setMatchHeader] = useState<any>(null);
  const [newEntries, setNewEntries] = useState<CommentaryEntry[]>([]);

  const [pendingFirstSpeech, setPendingFirstSpeech] = useState<CommentaryEntry | null>(null);

  const [isCommentaryFetching, setIsCommentaryFetching] = useState(false);
  const [commentaryError, setCommentaryError] = useState<string | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  const [commentaryLanguage, setCommentaryLanguage] = useState('English');
  const [commentaryTone, setCommentaryTone] = useState('Professional');
  const [commentaryVoice, setCommentaryVoice] = useState('Male');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [audioService, setAudioService] = useState('Browser Speech Synthesis');

  // Load More State
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreBalls, setHasMoreBalls] = useState(true);

  // WebSocket Reference
  const wsRef = useRef<WebSocket | null>(null);

  // Data Queues
  const incomingQueue = useRef<CommentaryEntry[]>([]);
  const processedKeys = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef<boolean>(true);
  const lastFiveBalls = useRef<CommentaryEntry[]>([]);

  useEffect(() => {
    setAudioService(pollyService.getAudioServiceName());
  }, [isVoiceEnabled]);

  // Handle pending first speech
  useEffect(() => {
    if (pendingFirstSpeech) {
      if (isVoiceEnabled) {
        pollyService.speakCommentary(pendingFirstSpeech.text, commentaryLanguage, commentaryVoice, commentaryTone);
      }
      setPendingFirstSpeech(null);
    }
  }, [pendingFirstSpeech, isVoiceEnabled, commentaryLanguage, commentaryVoice, commentaryTone]);

  // Initialize API key from environment variable and load matches
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
    if (apiKey) {
      cricketApi.setApiKey(apiKey);
      loadMatches();
    } else {
      setMatchesError('API key not configured. Please set NEXT_PUBLIC_RAPIDAPI_KEY in .env.local');
    }
  }, []);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Reconnect WebSocket when language changes during active commentary
  useEffect(() => {
    if (isCommentaryFetching && selectedMatchId && wsRef.current) {
      // Reconnect with new language
      console.log('Language changed, reconnecting WebSocket...');
      connectWebSocket(selectedMatchId);
    }
  }, [commentaryLanguage]);

  // Process Commentary Queue
  useEffect(() => {
    const processQueue = () => {
      if (incomingQueue.current.length > 0) {
        const nextEntry = incomingQueue.current.shift();
        if (nextEntry) {
          setCommentaryEntries(prev => {
            // Add new entry to the top (descending order for display)
            const updated = [nextEntry, ...prev];

            // Update lastFiveBalls reference
            lastFiveBalls.current = updated.slice(0, 5);

            return updated.slice(0, 50); // Keep last 50
          });

          // Voice Commentary for the single entry being displayed
          if (isVoiceEnabled) {
            pollyService.speakCommentary(nextEntry.text, commentaryLanguage, commentaryVoice, commentaryTone);
          }
        }
      }
    };

    const intervalId = setInterval(processQueue, 6000); // 6 second delay between balls
    return () => clearInterval(intervalId);
  }, [isVoiceEnabled, commentaryLanguage, commentaryVoice, commentaryTone]);

  // Helper function to map language names to language codes
  const getLanguageCode = (language: string): string => {
    const languageMap: { [key: string]: string } = {
      'English': 'en',
      'Hindi': 'hi',
      'Tamil': 'ta',
      'Telugu': 'te',
      'Spanish': 'es'
    };
    return languageMap[language] || 'en';
  };

  const loadMatches = async () => {
    setMatchesLoading(true);
    setMatchesError(null);
    try {
      const matchesData = await cricketApi.fetchLiveMatches();
      setMatches(matchesData);
    } catch (error: any) {
      setMatchesError(error.message);
    } finally {
      setMatchesLoading(false);
    }
  };

  const connectWebSocket = (matchId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Reset queues on new connection
    incomingQueue.current = [];
    processedKeys.current.clear();
    lastFiveBalls.current = [];
    isFirstLoad.current = true;
    setCommentaryEntries([]);
    setHasMoreBalls(true);

    try {
      // Get language code and add it as query parameter
      const languageCode = getLanguageCode(commentaryLanguage);
      const wsUrl = `${BACKEND_WS_URL}${matchId}?language=${languageCode}`;
      console.log('Connecting to WebSocket with language:', languageCode);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket Connected');
        setCommentaryError(null);
        setIsCommentaryFetching(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'status') {
            console.log('Status:', message.data);
          } else if (message.type === 'commentary') {
            const data = message.data;

            // Map Backend CommentaryLine to Frontend CommentaryEntry
            const incomingEntries: CommentaryEntry[] = (data.lines || []).map((line: any) => ({
              key: line.id,
              text: line.text,
              over: line.over_number,
              ball: line.ball_number,
              event: line.event_type,
              runs: line.runs || 0,
              wicket: line.event_type === 'wicket' || (line.wickets && line.wickets > 0),
              isNew: true,
              updated: false,
              timestamp: new Date(line.timestamp).getTime(),
              inningsId: line.metadata?.raw_data?.inningsid || line.metadata?.inningsid,
            }));

            if (incomingEntries.length > 0) {
              // Sort by timestamp DESCENDING (Newest first for display)
              incomingEntries.sort((a, b) => b.timestamp - a.timestamp);

              if (isFirstLoad.current) {
                // First load: Display all 20 balls immediately without delay
                const ballsToDisplay = incomingEntries.slice(0, 20);

                // Mark all as processed
                ballsToDisplay.forEach(entry => {
                  processedKeys.current.add(entry.key);
                });

                // Set all balls immediately without queuing (no delay)
                setCommentaryEntries(ballsToDisplay);

                // Update lastFiveBalls reference
                lastFiveBalls.current = ballsToDisplay.slice(0, 5);

                // Trigger speech for the most recent ball (first in the list)
                if (ballsToDisplay.length > 0) {
                  setPendingFirstSpeech(ballsToDisplay[0]);
                }

                isFirstLoad.current = false;
              } else {
                // Subsequent loads: Update last 5 balls with more descriptive text
                const timestampMap = new Map<number, CommentaryEntry>();
                incomingEntries.forEach(entry => {
                  timestampMap.set(entry.timestamp, entry);
                });

                // Update existing entries if they match by timestamp
                const updatedLastFive: CommentaryEntry[] = [];
                lastFiveBalls.current.forEach(existingEntry => {
                  const updatedEntry = timestampMap.get(existingEntry.timestamp);
                  if (updatedEntry && updatedEntry.text.length > existingEntry.text.length) {
                    // Found a more descriptive version
                    updatedLastFive.push(updatedEntry);
                    timestampMap.delete(existingEntry.timestamp);
                  } else {
                    updatedLastFive.push(existingEntry);
                  }
                });

                // Update the commentary entries with the enhanced descriptions
                if (updatedLastFive.length > 0) {
                  setCommentaryEntries(prev => {
                    const updated = [...prev];
                    updatedLastFive.forEach((enhancedEntry, idx) => {
                      if (idx < updated.length) {
                        const existingIdx = updated.findIndex(e => e.timestamp === enhancedEntry.timestamp);
                        if (existingIdx !== -1) {
                          updated[existingIdx] = { ...enhancedEntry, updated: true };
                        }
                      }
                    });
                    return updated;
                  });
                }

                // Get the maximum timestamp from existing entries to filter truly new balls
                setCommentaryEntries(prev => {
                  const maxExistingTimestamp = prev.length > 0 ? Math.max(...prev.map(e => e.timestamp)) : 0;

                  // Add only new balls with greater timestamp (not in processedKeys and timestamp > max existing)
                  const newBalls = incomingEntries.filter(entry =>
                    !processedKeys.current.has(entry.key) && entry.timestamp > maxExistingTimestamp
                  );

                  // Sort by timestamp ascending for proper order in queue
                  newBalls.sort((a, b) => a.timestamp - b.timestamp);

                  newBalls.forEach(entry => {
                    processedKeys.current.add(entry.key);
                    incomingQueue.current.push(entry);
                  });

                  return prev;
                });
              }
            }

            // Update Match Status / Miniscore immediately
            if (data.miniscore) {
              setMiniscore(data.miniscore);
            } else if (data.match_status_info || data.score) {
              const statusInfo = data.match_status_info || {};
              const score = data.score || statusInfo.score || {};

              // Fallback: Construct a partial miniscore object if full miniscore is missing
              const constructedMiniscore = {
                inningsid: '1', // Placeholder
                inningsscores: {
                  inningsscore: [
                    {
                      inningsid: '1',
                      runs: score.runs,
                      wickets: score.wickets,
                      overs: score.overs,
                      batteamshortname: statusInfo.team1 || 'Team 1', // Simplified
                    }
                  ]
                },
                custstatus: statusInfo.status || data.match_status,
                batsmanstriker: null,
                batsmannonstriker: null,
                bowlerstriker: null,
                crr: null,
                partnership: null,
                lastwkt: null
              };

              setMiniscore(constructedMiniscore);
            }

            if (data.match_status_info) {
              setMatchHeader({
                status: data.match_status_info.status,
                state: data.match_status_info.state,
                team1: { name: data.match_status_info.team1 },
                team2: { name: data.match_status_info.team2 }
              });
            }
          } else if (message.type === 'error') {
            setCommentaryError(message.data.error);
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
        setCommentaryError('Connection error. Retrying...');
      };

      ws.onclose = () => {
        console.log('WebSocket Disconnected');
        if (isCommentaryFetching) {
          // Optional: Implement reconnection logic here if needed
          // For now, we just update state
          setIsCommentaryFetching(false);
        }
      };

    } catch (error: any) {
      setCommentaryError(`Failed to connect: ${error.message}`);
      setIsCommentaryFetching(false);
    }
  };

  const handleStartCommentary = () => {
    if (!selectedMatchId) return;
    connectWebSocket(selectedMatchId);
  };

  const handleStopCommentary = () => {
    setIsCommentaryFetching(false);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    pollyService.stop();
  };

  const handleLoadMore = async () => {
    if (!selectedMatchId || isLoadingMore || !hasMoreBalls) return;

    // Get the last ball's timestamp and innings ID
    const lastBall = commentaryEntries[commentaryEntries.length - 1];
    if (!lastBall) return;

    // Get innings ID from the last ball, fallback to miniscore if not available
    const inningsId = lastBall.inningsId || (miniscore?.inningsid ? parseInt(miniscore.inningsid) : 1);
    const timestamp = lastBall.timestamp;

    // Get language code for the API request
    const languageCode = getLanguageCode(commentaryLanguage);

    setIsLoadingMore(true);
    try {
      const previousBalls = await cricketApi.fetchPreviousCommentary(
        selectedMatchId,
        inningsId,
        timestamp,
        languageCode  // Pass the selected language
      );

      if (previousBalls.length > 0) {
        // Append the previous balls to the existing entries and sort by timestamp (descending - newest first)
        setCommentaryEntries(prev => {
          const combined = [...prev, ...previousBalls];
          // Sort by timestamp in descending order (newest first)
          return combined.sort((a, b) => b.timestamp - a.timestamp);
        });
        // Mark all new balls as processed
        previousBalls.forEach(ball => processedKeys.current.add(ball.key));
      } else {
        // No more balls available
        setHasMoreBalls(false);
      }
    } catch (error: any) {
      console.error('Error loading more commentary:', error);
      setCommentaryError(`Failed to load more: ${error.message}`);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const getEventBadge = (entry: CommentaryEntry) => {
    const eventType = (entry.event || '').toUpperCase();
    if (entry.wicket || eventType === 'WICKET') {
      return { emoji: '🎯', label: 'WICKET', className: 'bg-gradient-to-r from-red-600 to-red-800' };
    }
    if (entry.runs === 6 || eventType === 'SIX') {
      return { emoji: '6️⃣', label: 'SIX', className: 'bg-gradient-to-r from-amber-500 to-orange-600' };
    }
    if (entry.runs === 4 || eventType === 'FOUR') {
      return { emoji: '4️⃣', label: 'FOUR', className: 'bg-gradient-to-r from-emerald-500 to-green-600' };
    }
    if (eventType === 'OVER-BREAK' || eventType === 'OVER') {
      return { emoji: '⏸️', label: 'OVER BREAK', className: 'bg-gradient-to-r from-cyan-500 to-blue-600' };
    }
    return null;
  };

  // Display all commentary entries (both ball commentary and informational text)
  const displayEntries = commentaryEntries;

  const inningsScores = miniscore?.inningsscores?.inningsscore || [];
  const primaryInnings = inningsScores.find((inning: any) => inning.inningsid === miniscore?.inningsid) || inningsScores[0];
  const striker = miniscore?.batsmanstriker;
  const nonStriker = miniscore?.batsmannonstriker;
  const bowler = miniscore?.bowlerstriker;
  const statusText = matchHeader?.status || miniscore?.custstatus || matchHeader?.state || '';

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 text-emerald-400">
          Live Commentary
        </h1>
        <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto px-2">
          Choose a live match scenario and our AI will generate a live commentary stream for you.
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-4 sm:gap-6 max-w-7xl mx-auto">
        {/* Left Panel - Controls */}
        <div className="bg-gray-800/50 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-700">
          {/* Header with Title and Checkboxes */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2 sm:gap-3">
            <h3 className="text-base sm:text-lg font-semibold text-white">Select Live Match</h3>

            <div className="flex items-center gap-3 sm:gap-4">
              <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isVoiceEnabled}
                    onChange={(e) => setIsVoiceEnabled(e.target.checked)}
                    disabled={isCommentaryFetching}
                    className="w-4 h-4 cursor-pointer accent-emerald-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <span className="text-xs sm:text-sm text-gray-300 group-hover:text-emerald-400 transition-colors whitespace-nowrap">
                  Voice Commentary
                </span>
              </label>

              {/* <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isAutoRefreshEnabled}
                    onChange={(e) => setIsAutoRefreshEnabled(e.target.checked)}
                    className="w-4 h-4 cursor-pointer accent-emerald-500 rounded"
                  />
                </div>
                <span className="text-sm text-gray-300 group-hover:text-emerald-400 transition-colors">
                  🔄 Auto
                </span>
              </label> */}
            </div>
          </div>

          {matchesLoading && (
            <p className="text-gray-400 italic text-sm">Loading matches...</p>
          )}

          {matchesError && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm mb-4">
              <p>⚠️ {matchesError}</p>
            </div>
          )}

          {!matchesLoading && !matchesError && matches && matches.length > 0 && (
            <div className="mb-6">
              <CustomSelect
                value={selectedMatchId || ''}
                onChange={(value) => setSelectedMatchId(value)}
                disabled={isCommentaryFetching}
                options={[
                  { value: '', label: '-- Select a Match --', title: 'Select a match' },
                  // Sort matches: live matches first, then non-live
                  ...matches
                    .sort((a, b) => {
                      // Live matches come first
                      if (a.isLive && !b.isLive) return -1;
                      if (!a.isLive && b.isLive) return 1;
                      return 0;
                    })
                    .map((match) => {
                      const liveIndicator = match.isLive ? '🔴 ' : '';
                      const teams = match.displayName || `${match.team1} vs ${match.team2}`;
                      const status = match.status ? ` - ${match.status}` : '';
                      const series = match.seriesName ? ` (${match.seriesName})` : '';
                      const displayText = `${liveIndicator}${teams}${status}${series}`;

                      return {
                        value: match.id,
                        label: displayText,
                        title: displayText
                      };
                    })
                ]}
                placeholder="-- Select a Match --"
              />
            </div>
          )}

          {!matchesLoading && (!matches || matches.length === 0) && !matchesError && (
            <p className="text-gray-400 text-sm mb-6">
              No live matches available at the moment.
            </p>
          )}

          {/* Commentary Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="relative group">
              <select
                value={commentaryLanguage}
                onChange={(e) => setCommentaryLanguage(e.target.value)}
                disabled={isCommentaryFetching}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 hover:border-emerald-400 transition-all cursor-pointer appearance-none pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Spanish">Spanish</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="relative group">
              <select
                value={commentaryTone}
                onChange={(e) => setCommentaryTone(e.target.value)}
                disabled={isCommentaryFetching}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 hover:border-emerald-400 transition-all cursor-pointer appearance-none pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="Calm">Calm</option>
                <option value="Exciting">Excited</option>
                <option value="Professional">Professional</option>
                <option value="Dramatic">Dramatic</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="relative group">
              <select
                value={commentaryVoice}
                onChange={(e) => setCommentaryVoice(e.target.value)}
                disabled={isCommentaryFetching}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 hover:border-emerald-400 transition-all cursor-pointer appearance-none pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <div className="mb-4 sm:mb-6">
            {!isCommentaryFetching ? (
              <button
                className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm sm:text-base font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleStartCommentary}
                disabled={!selectedMatchId}
              >
                Start Commentary
              </button>
            ) : (
              <button
                className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-red-500 hover:bg-red-600 text-white text-sm sm:text-base font-semibold rounded-lg transition-all"
                onClick={handleStopCommentary}
              >
                Stop Commentary
              </button>
            )}
          </div>

          {/* Voice Test Button (shown when voice is enabled) */}
          {isVoiceEnabled && (
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="text-emerald-400">🔊</span>
                <span>Audio</span>
              </div>
              <button
                className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-500/30 transition-all text-xs font-semibold"
                onClick={() => pollyService.speakCommentary('This is a test of the voice commentary system. Welcome to Googli AI!', commentaryLanguage, commentaryVoice, commentaryTone)}
                title="Test voice output"
              >
                Test Voice
              </button>
            </div>
          )}
        </div>

        {/* Right Panel - Commentary Log */}
        <div className="bg-gray-800/50 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-white">Commentary Log</h3>
            {isCommentaryFetching && matches.find(m => m.id === selectedMatchId)?.isLive && (
              <span className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded-full text-xs font-semibold">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                LIVE
              </span>
            )}
          </div>

          {miniscore && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
              <div className="flex justify-between items-center gap-4 flex-wrap mb-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs uppercase tracking-wide text-gray-400">
                    {primaryInnings?.batteamshortname || matchHeader?.teamdetails?.batteamname || '—'}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-bold text-white">
                      {primaryInnings ? `${primaryInnings.runs || 0}/${primaryInnings.wickets || 0}` : '--/--'}
                    </span>
                    {primaryInnings && (
                      <span className="text-xs text-gray-400">{primaryInnings.overs || 0} ov</span>
                    )}
                  </div>
                </div>
                {statusText && (
                  <div className="bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full font-semibold text-xs text-emerald-400">
                    {statusText}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                {/* Striker */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs">Striker</span>
                  <span className="text-white font-bold">
                    {striker?.name || '—'}
                  </span>
                  {striker && (
                    <span className="text-gray-400 text-xs">
                      {striker.runs || 0}({striker.balls || 0})
                    </span>
                  )}
                </div>

                {/* Non-striker */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs">Non-striker</span>
                  <span className="text-gray-300">
                    {nonStriker?.name || '—'}
                  </span>
                  {nonStriker && (
                    <span className="text-gray-400 text-xs">
                      {nonStriker.runs || 0}({nonStriker.balls || 0})
                    </span>
                  )}
                </div>

                {/* Bowler */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs">Bowler</span>
                  <span className="text-white font-semibold">
                    {bowler?.name || '—'}
                  </span>
                  {bowler && (
                    <span className="text-gray-400 text-xs">
                      {bowler.overs || 0}-{bowler.maidens || 0}-{bowler.runs || 0}-{bowler.wickets || 0}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* {commentaryError && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 mb-4 text-red-400 text-sm">
              <p>⚠️ {commentaryError}</p>
            </div>
          )} */}

          <div className="min-h-[300px] sm:min-h-96 max-h-[400px] sm:max-h-[500px] overflow-y-auto space-y-2 sm:space-y-3">
            {displayEntries.length > 0 ? (
              <>
                {displayEntries.map((entry, index) => {
                  const eventBadge = getEventBadge(entry);
                  const isLiveBall = index === 0;
                  const hasBall = entry.ball && entry.ball > 0;

                  // Format over number
                  const overNumber = entry.over != null ? Number(entry.over) : NaN;
                  const overLabel = Number.isFinite(overNumber) && overNumber > 0 ? overNumber.toFixed(1) : '';

                  // Check if this is an informational entry (no ball number)
                  const isInfoEntry = !hasBall && !overLabel;

                  return (
                    <div
                      key={entry.key || entry.timestamp || index}
                      className={`p-2.5 sm:p-3 rounded-md sm:rounded-lg text-xs sm:text-sm leading-relaxed ${isInfoEntry
                        ? 'bg-gray-800/30 border border-gray-700/50 text-gray-400 italic'
                        : `bg-gray-900 border border-gray-700 text-gray-300 ${isLiveBall ? 'border-emerald-500/50' : ''}`
                        }`}
                    >
                      <div className="flex items-start gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 flex-wrap">
                        {overLabel && (
                          <span className="inline-block bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap">
                            {overLabel}
                          </span>
                        )}
                        {eventBadge && (
                          <span className={`inline-block ${eventBadge.className} text-white px-2 py-0.5 rounded text-xs font-bold`}>
                            {eventBadge.emoji} {eventBadge.label}
                          </span>
                        )}
                        {isLiveBall && !isInfoEntry && (
                          <span className="inline-block bg-red-500/20 border border-red-500/30 text-red-400 px-2 py-0.5 rounded text-xs font-bold animate-pulse">
                            LIVE
                          </span>
                        )}
                      </div>
                      <p>{entry.text}</p>
                    </div>
                  );
                })}

                {/* Load More Button */}
                {displayEntries.length >= 5 && hasMoreBalls && (
                  <div className="pt-4 pb-2">
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoadingMore ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Loading...</span>
                        </>
                      ) : (
                        <>
                          <span>Load More Balls</span>
                          <span className="text-xs opacity-75">↓</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {!hasMoreBalls && displayEntries.length >= 20 && (
                  <div className="pt-4 pb-2 text-center">
                    <p className="text-gray-500 text-sm">No more balls available</p>
                  </div>
                )}
              </>
            ) : isCommentaryFetching ? (
              <div className="text-center py-12">
                <div className="inline-block w-10 h-10 border-4 border-gray-700 border-t-emerald-500 rounded-full animate-spin mb-3"></div>
                <p className="text-gray-400 text-sm">Fetching live commentary...</p>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm mb-2">Select a match and click &quot;Start Commentary&quot;</p>
                <p className="text-xs opacity-75">
                  Commentary will auto-update with each new ball bowled.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
