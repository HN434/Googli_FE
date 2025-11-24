'use client';

import { useState, useEffect, useRef } from 'react';
import cricketApi from '@/services/cricketApi';
import pollyService from '@/services/pollyService';

// Backend WebSocket URL from environment variable
const BACKEND_WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL || 'https://z34lswxm-8001.inc1.devtunnels.ms/api/commentary/ws/match/';

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
}

export default function CommentaryTab() {
  // State management
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  const [commentaryEntries, setCommentaryEntries] = useState<CommentaryEntry[]>([]);
  const [miniscore, setMiniscore] = useState<any>(null);
  const [matchHeader, setMatchHeader] = useState<any>(null);
  const [newEntries, setNewEntries] = useState<CommentaryEntry[]>([]);

  const [isCommentaryFetching, setIsCommentaryFetching] = useState(false);
  const [commentaryError, setCommentaryError] = useState<string | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  const [commentaryLanguage, setCommentaryLanguage] = useState('English');
  const [commentaryTone, setCommentaryTone] = useState('Exciting');
  const [commentaryVoice, setCommentaryVoice] = useState('Male');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [audioService, setAudioService] = useState('Browser Speech Synthesis');

  // WebSocket Reference
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setAudioService(pollyService.getAudioServiceName());
  }, [isVoiceEnabled]);

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

    try {
      const ws = new WebSocket(`${BACKEND_WS_URL}${matchId}`);
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
            }));

            if (incomingEntries.length > 0) {
              setNewEntries(incomingEntries);
              setCommentaryEntries(prev => {
                // Prepend new entries and keep unique by key
                const combined = [...incomingEntries, ...prev];
                const unique = Array.from(new Map(combined.map(item => [item.key, item])).values());
                // Sort by timestamp descending (newest first)
                return unique.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
              });

              // Voice Commentary
              if (isVoiceEnabled) {
                incomingEntries.forEach((entry) => {
                  pollyService.speakCommentary(entry.text, commentaryLanguage, commentaryVoice);
                });
              }
            }

            // Update Match Status / Miniscore
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

  const ballEntries = commentaryEntries.filter(entry => {
    if (entry.ball && entry.ball > 0) return true;
    const overNumber = Number(entry.over);
    return Number.isFinite(overNumber) && overNumber > 0;
  });

  const limitedBallEntries = ballEntries.slice(0, 20);

  const inningsScores = miniscore?.inningsscores?.inningsscore || [];
  const primaryInnings = inningsScores.find((inning: any) => inning.inningsid === miniscore?.inningsid) || inningsScores[0];
  const striker = miniscore?.batsmanstriker;
  const nonStriker = miniscore?.batsmannonstriker;
  const bowler = miniscore?.bowlerstriker;
  const statusText = matchHeader?.status || miniscore?.custstatus || matchHeader?.state || '';

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-emerald-400">
          Live Ball-by-Ball Commentary
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Choose a live match scenario and our AI will generate a live commentary stream for you.
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {/* Left Panel - Controls */}
        <div className="bg-[#1a2942] rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Select Live Match</h3>

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
              <select
                value={selectedMatchId || ''}
                onChange={(e) => setSelectedMatchId(e.target.value)}
                className="w-full px-4 py-3 bg-[#0f1f3a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="">-- Select a Match --</option>
                {matches.map((match) => {
                  const liveIndicator = match.isLive ? '🔴 ' : '';
                  const teams = match.displayName || `${match.team1} vs ${match.team2}`;
                  const status = match.status ? ` - ${match.status}` : '';
                  const series = match.seriesName ? ` (${match.seriesName})` : '';
                  const displayText = `${liveIndicator}${teams}${status}${series}`;

                  return (
                    <option key={match.id} value={match.id}>
                      {displayText}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {!matchesLoading && (!matches || matches.length === 0) && !matchesError && (
            <p className="text-gray-400 text-sm mb-6">
              No live matches available at the moment.
            </p>
          )}

          {/* Commentary Settings */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div>
              <select
                value={commentaryLanguage}
                onChange={(e) => setCommentaryLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-[#0f1f3a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Tamil">Tamil</option>
                <option value="Telugu">Telugu</option>
              </select>
            </div>

            <div>
              <select
                value={commentaryTone}
                onChange={(e) => setCommentaryTone(e.target.value)}
                className="w-full px-3 py-2 bg-[#0f1f3a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="Calm">Calm</option>
                <option value="Exciting">Excited</option>
                <option value="Professional">Professional</option>
                <option value="Dramatic">Dramatic</option>
              </select>
            </div>

            <div>
              <select
                value={commentaryVoice}
                onChange={(e) => setCommentaryVoice(e.target.value)}
                className="w-full px-3 py-2 bg-[#0f1f3a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          {/* Start Button */}
          <div className="mb-6">
            {!isCommentaryFetching ? (
              <button
                className="w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleStartCommentary}
                disabled={!selectedMatchId}
              >
                Start Commentary
              </button>
            ) : (
              <button
                className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all"
                onClick={handleStopCommentary}
              >
                Stop Commentary
              </button>
            )}
          </div>

          {/* Additional Options */}
          <div className="space-y-3 text-sm">
            <label className="flex items-center gap-2 cursor-pointer text-gray-300">
              <input
                type="checkbox"
                checked={isVoiceEnabled}
                onChange={(e) => setIsVoiceEnabled(e.target.checked)}
                className="w-4 h-4 cursor-pointer accent-emerald-500"
              />
              Voice Commentary
            </label>
            {isVoiceEnabled && (
              <div className="ml-6 flex items-center gap-2 text-xs text-gray-400">
                <span>Audio: {audioService}</span>
                <button
                  className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded text-emerald-400 hover:bg-emerald-500/30 transition-all"
                  onClick={() => pollyService.speakCommentary('This is a test of the voice commentary system. Welcome to Googli AI!', commentaryLanguage, commentaryVoice)}
                  title="Test voice output"
                >
                  Test
                </button>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer text-gray-300">
              <input
                type="checkbox"
                checked={isAutoRefreshEnabled}
                onChange={(e) => setIsAutoRefreshEnabled(e.target.checked)}
                className="w-4 h-4 cursor-pointer accent-emerald-500"
              />
              Auto-Refresh (Live)
            </label>
          </div>
        </div>

        {/* Right Panel - Commentary Log */}
        <div className="bg-[#1a2942] rounded-xl p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Commentary Log</h3>
            {isCommentaryFetching && (
              <span className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded-full text-xs font-semibold">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                LIVE
              </span>
            )}
          </div>

          {miniscore && (
            <div className="bg-[#0f1f3a] border border-gray-700 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center gap-4 flex-wrap mb-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs uppercase tracking-wide text-gray-400">
                    {primaryInnings?.batteamshortname || matchHeader?.teamdetails?.batteamname || '—'}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">
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

              <div className="flex flex-wrap items-center gap-4 text-sm">
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

          {commentaryError && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 mb-4 text-red-400 text-sm">
              <p>⚠️ {commentaryError}</p>
            </div>
          )}

          <div className="min-h-96 max-h-[500px] overflow-y-auto space-y-3">
            {limitedBallEntries.length > 0 ? (
              limitedBallEntries.map((entry, index) => {
                const eventBadge = getEventBadge(entry);
                const isLiveBall = index === 0;
                
                // Format over number
                const overNumber = entry.over != null ? Number(entry.over) : NaN;
                const overLabel = Number.isFinite(overNumber) ? overNumber.toFixed(1) : '';

                return (
                  <div
                    key={entry.key || entry.timestamp || index}
                    className={`p-3 bg-[#0f1f3a] border border-gray-700 rounded-lg text-sm text-gray-300 leading-relaxed ${isLiveBall ? 'border-emerald-500/50' : ''}`}
                  >
                    <div className="flex items-start gap-2 mb-2">
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
                      {isLiveBall && (
                        <span className="inline-block bg-red-500/20 border border-red-500/30 text-red-400 px-2 py-0.5 rounded text-xs font-bold animate-pulse">
                          LIVE
                        </span>
                      )}
                    </div>
                    <p>{entry.text}</p>
                  </div>
                );
              })
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
