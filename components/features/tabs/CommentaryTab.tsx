'use client';

import { useState, useEffect, useRef } from 'react';
import cricketApi from '@/services/cricketApi';
import pollyService from '@/services/pollyService';

// Backend WebSocket URL
const BACKEND_WS_URL = 'https://z34lswxm-8001.inc1.devtunnels.ms/api/commentary/ws/match/';

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
  const [apiKey, setApiKey] = useState<string>('');
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [showApiModal, setShowApiModal] = useState(false);

  const [commentaryEntries, setCommentaryEntries] = useState<CommentaryEntry[]>([]);
  const [miniscore, setMiniscore] = useState<any>(null);
  const [matchHeader, setMatchHeader] = useState<any>(null);
  const [newEntries, setNewEntries] = useState<CommentaryEntry[]>([]);
  const [updatedEntries, setUpdatedEntries] = useState<CommentaryEntry[]>([]);

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

  useEffect(() => {
    if (apiKey) {
      cricketApi.setApiKey(apiKey);
      loadMatches();
    }
  }, [apiKey]);

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

  const handleSaveApiKey = () => {
    setApiKey(tempApiKey);
    setShowApiModal(false);
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
  const secondaryInnings = inningsScores.filter((inning: any) => inning !== primaryInnings);
  const striker = miniscore?.batsmanstriker;
  const nonStriker = miniscore?.batsmannonstriker;
  const bowler = miniscore?.bowlerstriker;
  const statusText = matchHeader?.status || miniscore?.custstatus || matchHeader?.state || '';
  const lastWicket = miniscore?.lastwkt;

  const updateSummaryParts = [];
  if (newEntries.length) {
    updateSummaryParts.push(`${newEntries.length} new ball${newEntries.length === 1 ? '' : 's'}`);
  }
  if (updatedEntries.length) {
    updateSummaryParts.push(`${updatedEntries.length} updated`);
  }
  const updateSummaryText = updateSummaryParts.join(' • ');

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-12">
        <div className="flex justify-between items-center gap-8 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-500 via-violet-600 to-purple-700 bg-clip-text text-transparent">
              🎙️ Live Ball-by-Ball Commentary
            </h1>
            <p className="text-lg text-gray-400">
              AI-powered cricket commentary with professional insights
            </p>
          </div>
          <button
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white font-semibold rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            onClick={() => setShowApiModal(true)}
          >
            {apiKey ? '🔑 API Key Set' : '🔑 Set API Key'}
          </button>
        </div>
      </div>

      {/* API Key Modal */}
      {showApiModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowApiModal(false)}>
          <div className="bg-gray-900 p-8 rounded-2xl max-w-lg w-full mx-4 shadow-2xl border border-gray-700" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-4">RapidAPI Configuration</h2>
            <p className="text-sm text-amber-400 bg-amber-900/20 border border-amber-600/30 px-3 py-2 rounded-lg mb-6">
              ⚠️ Warning: In production, API keys should be stored server-side. This is for development/demo purposes only.
            </p>
            <input
              type="password"
              placeholder="Enter RapidAPI Key (optional)"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 mb-6"
            />
            <div className="flex gap-4 justify-end">
              <button
                onClick={handleSaveApiKey}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setTempApiKey('');
                  setApiKey('');
                  setShowApiModal(false);
                }}
                className="px-6 py-2 bg-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-600 transition-all"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-8">
        {/* Match Selection Panel */}
        <div className="bg-gray-900 rounded-xl p-6 shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-200 border border-gray-800">
          <h3 className="text-xl font-bold text-white mb-4">⚾ Match Selection</h3>

          {matchesLoading && (
            <p className="text-gray-400 italic">Loading matches...</p>
          )}

          {matchesError && (
            <div className="bg-red-900/20 border-2 border-red-500/50 rounded-lg p-4 text-red-400">
              <p>⚠️ {matchesError}</p>
            </div>
          )}

          {!matchesLoading && !matchesError && matches && matches.length > 0 && (
            <div className="mb-4">
              <label className="block font-semibold text-gray-300 mb-2">Select Match:</label>
              <select
                value={selectedMatchId || ''}
                onChange={(e) => setSelectedMatchId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
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

          {!matchesLoading && (!matches || matches.length === 0) && (
            <p className="text-gray-400">No matches available. Set API key to load matches.</p>
          )}
        </div>

        {/* Commentary Settings Panel */}
        <div className="bg-gray-900 rounded-xl p-6 shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-200 border border-gray-800">
          <h3 className="text-xl font-bold text-white mb-4">⚙️ Commentary Settings</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block font-semibold text-gray-300 mb-2">Language:</label>
              <select
                value={commentaryLanguage}
                onChange={(e) => setCommentaryLanguage(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border-2 border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Tamil">Tamil</option>
                <option value="Telugu">Telugu</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-300 mb-2">Tone:</label>
              <select
                value={commentaryTone}
                onChange={(e) => setCommentaryTone(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border-2 border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="Calm">Calm</option>
                <option value="Exciting">Exciting</option>
                <option value="Professional">Professional</option>
                <option value="Dramatic">Dramatic</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-300 mb-2">Voice:</label>
              <select
                value={commentaryVoice}
                onChange={(e) => setCommentaryVoice(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border-2 border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer text-gray-300 font-semibold">
              <input
                type="checkbox"
                checked={isVoiceEnabled}
                onChange={(e) => setIsVoiceEnabled(e.target.checked)}
                className="w-5 h-5 cursor-pointer"
              />
              🔊 Voice Commentary
            </label>
            {isVoiceEnabled && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-medium w-fit">
                <span className="opacity-90">Audio:</span>
                <span className="font-semibold mr-2">{audioService}</span>
                <button
                  className="px-2 py-1 bg-white/20 border border-white/30 rounded text-xs font-bold hover:bg-white/30 transition-all"
                  onClick={() => pollyService.speakCommentary('This is a test of the voice commentary system. Welcome to CrickTrack AI!', commentaryLanguage, commentaryVoice)}
                  title="Test voice output"
                >
                  🔊 Test
                </button>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer text-gray-300 font-semibold">
              <input
                type="checkbox"
                checked={isAutoRefreshEnabled}
                onChange={(e) => setIsAutoRefreshEnabled(e.target.checked)}
                className="w-5 h-5 cursor-pointer"
              />
              🔄 Auto-Refresh (Live)
            </label>
          </div>

          <div className="flex gap-4">
            {!isCommentaryFetching ? (
              <button
                className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-lg font-semibold rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                onClick={handleStartCommentary}
                disabled={!selectedMatchId}
              >
                ▶️ Start Live Commentary
              </button>
            ) : (
              <button
                className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white text-lg font-semibold rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                onClick={handleStopCommentary}
              >
                ⏹️ Stop Commentary
              </button>
            )}
          </div>
        </div>

        {/* Commentary Display Panel */}
        <div className="bg-gray-900 rounded-xl p-6 shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-200 border border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">📣 Live Commentary</h3>
            {isCommentaryFetching && (
              <span className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full text-sm font-semibold animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                Live • Auto-Updating
              </span>
            )}
          </div>

          {miniscore && (
            <div className="bg-gradient-to-r from-slate-900 to-gray-800 text-gray-100 rounded-xl p-5 mb-4">
              <div className="flex justify-between items-center gap-4 flex-wrap mb-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-sm uppercase tracking-wide opacity-75">
                    {primaryInnings?.batteamshortname || matchHeader?.teamdetails?.batteamname || '—'}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">
                      {primaryInnings ? `${primaryInnings.runs || 0}/${primaryInnings.wickets || 0}` : '--/--'}
                    </span>
                    {primaryInnings && (
                      <span className="text-sm opacity-80">{primaryInnings.overs || 0} ov</span>
                    )}
                  </div>
                </div>
                {statusText && (
                  <div className="bg-white/10 px-4 py-1 rounded-full font-semibold text-sm">
                    {statusText}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                <div className="flex justify-between gap-3 bg-white/5 px-3 py-2 rounded-lg text-sm">
                  <span className="uppercase text-xs tracking-wide opacity-80">Striker</span>
                  <span className="font-semibold">{striker?.name || '—'}</span>
                  <span className="font-medium opacity-90">
                    {striker ? `${striker.runs || 0} (${striker.balls || 0})` : ''}
                  </span>
                </div>
                <div className="flex justify-between gap-3 bg-white/5 px-3 py-2 rounded-lg text-sm">
                  <span className="uppercase text-xs tracking-wide opacity-80">Non-striker</span>
                  <span className="font-semibold">{nonStriker?.name || '—'}</span>
                  <span className="font-medium opacity-90">
                    {nonStriker ? `${nonStriker.runs || 0} (${nonStriker.balls || 0})` : ''}
                  </span>
                </div>
                <div className="flex justify-between gap-3 bg-white/5 px-3 py-2 rounded-lg text-sm">
                  <span className="uppercase text-xs tracking-wide opacity-80">Bowler</span>
                  <span className="font-semibold">{bowler?.name || '—'}</span>
                  <span className="font-medium opacity-90">
                    {bowler ? `${bowler.overs || 0}-${bowler.maidens || 0}-${bowler.runs || 0}-${bowler.wickets || 0}` : ''}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-between items-center text-sm">
                {secondaryInnings[0] && (
                  <span className="font-semibold">
                    {`${secondaryInnings[0].batteamshortname} ${secondaryInnings[0].runs}/${secondaryInnings[0].wickets} (${secondaryInnings[0].overs} ov)`}
                  </span>
                )}
                <div className="flex flex-wrap gap-3 text-sm opacity-90">
                  {miniscore?.crr && <span>CRR {miniscore.crr}</span>}
                  {miniscore?.partnership && <span>P&apos;ship {miniscore.partnership}</span>}
                  {lastWicket && <span className="font-medium">{lastWicket}</span>}
                </div>
              </div>
            </div>
          )}

          {updateSummaryText && (
            <div className="mb-3 px-3 py-2 bg-indigo-900/30 text-indigo-300 rounded-lg font-semibold text-sm">
              {updateSummaryText}
            </div>
          )}

          {commentaryError && (
            <div className="bg-red-900/20 border-2 border-red-500/50 rounded-lg p-4 mb-4 text-red-400">
              <p>⚠️ {commentaryError}</p>
            </div>
          )}

          <div className="min-h-96 max-h-[600px] overflow-y-auto p-4 bg-gray-800/50 rounded-lg">
            {limitedBallEntries.length > 0 ? (
              <div className="flex flex-col gap-4">
                {limitedBallEntries.map((entry, index) => {
                  const overNumber = entry.over != null ? Number(entry.over) : NaN;
                  const overLabel = Number.isFinite(overNumber)
                    ? overNumber.toFixed(1)
                    : entry.ball
                      ? entry.ball.toString()
                      : '';

                  const eventBadge = getEventBadge(entry);
                  const isLiveBall = index === 0;
                  const borderColor = entry.isNew ? 'border-l-emerald-500' : entry.updated ? 'border-l-amber-500' : isLiveBall ? 'border-l-red-500' : 'border-l-transparent';

                  return (
                    <div
                      key={entry.key || entry.timestamp || index}
                      className={`flex gap-4 border-l-4 ${borderColor} pl-2 transition-all duration-300 ${isLiveBall ? 'bg-gradient-to-r from-red-500/5 to-transparent' : entry.updated ? 'bg-gradient-to-r from-amber-500/8 to-transparent' : ''}`}
                    >
                      <div className="flex-shrink-0 flex flex-col gap-1">
                        {overLabel && (
                          <div className="flex flex-col gap-1">
                            <span className="inline-block bg-gradient-to-r from-purple-500 to-violet-600 text-white px-4 py-2 rounded-lg font-semibold text-sm">
                              {overLabel}
                            </span>
                            {isLiveBall && (
                              <span className="inline-block bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-1 rounded text-xs font-bold text-center animate-pulse">
                                🔴 LIVE
                              </span>
                            )}
                            {entry.isNew && (
                              <span className="inline-block bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide text-center">
                                New
                              </span>
                            )}
                            {entry.updated && (
                              <span className="inline-block bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide text-center">
                                Updated
                              </span>
                            )}
                            {eventBadge && (
                              <span className={`inline-block ${eventBadge.className} text-white px-2 py-1 rounded-lg text-xs font-bold text-center shadow-md`}>
                                {eventBadge.emoji} {eventBadge.label}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 bg-gray-900 p-4 rounded-lg shadow-md">
                        <p className="text-gray-200 leading-relaxed">{entry.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : isCommentaryFetching ? (
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 border-4 border-gray-600 border-t-purple-500 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400">Fetching live commentary...</p>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg mb-2">🏏 Click &quot;Start Live Commentary&quot; to view ball-by-ball updates</p>
                <p className="text-sm opacity-75">
                  Commentary will auto-update with each new ball bowled in the match.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
