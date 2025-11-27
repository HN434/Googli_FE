/**
 * Cricket API Service
 * Provides live match data and ball-by-ball commentary
 * Using Cricbuzz RapidAPI
 */

const RAPIDAPI_HOST = 'http://localhost:8000/api/';
const CACHE_DURATION = 10000; // 10 seconds cache for live data
const COMMENTARY_WINDOW_SIZE = 20;
const COMMENTARY_UPDATE_WINDOW = 3;

interface Match {
    id: string;
    matchId: string;
    team1: string;
    team2: string;
    displayName: string;
    seriesName: string;
    matchFormat: string;
    status: string;
    state: string;
    isLive: boolean;
    venue: string;
    startDate?: string;
}

interface CommentaryEntry {
    key: string;
    text: string;
    originalText: string;
    over?: number;
    ball?: number;
    timestamp: number;
    event?: string;
    runs: number;
    wicket: boolean;
    ballIndex: number;
    isNew: boolean;
    updated: boolean;
    raw: any;
}

interface CommentaryState {
    entries: CommentaryEntry[];
    entryMap: Map<string, CommentaryEntry>;
    lastMiniscore: any;
}

interface CommentaryResponse {
    commentary: CommentaryEntry[];
    miniscore: any;
    miniscoreChanged: boolean;
    newEntries: CommentaryEntry[];
    updatedEntries: CommentaryEntry[];
    matchHeader?: any;
    liveBallIndex?: number;
}

class CricketApiService {
    private apiKey: string | null = null;
    private cache: Map<string, { data: any; timestamp: number }> = new Map();
    private pollingInterval: NodeJS.Timeout | null = null;
    private scorecardCache: Map<string, any> = new Map();
    private commentaryState: Map<string, CommentaryState> = new Map();

    setApiKey(key: string) {
        this.apiKey = key;
    }

    clearCache() {
        this.cache.clear();
    }

    getCacheKey(endpoint: string, params: Record<string, any> = {}): string {
        return `${endpoint}-${JSON.stringify(params)}`;
    }

    getCachedData(cacheKey: string): any | null {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.data;
        }
        return null;
    }

    setCacheData(cacheKey: string, data: any) {
        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });
    }

    async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
        if (!this.apiKey) {
            throw new Error('API key not configured');
        }

        const url = new URL(`${RAPIDAPI_HOST}${endpoint}`);
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': this.apiKey,
                'X-RapidAPI-Host': RAPIDAPI_HOST
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Fetch live and recent matches
     */
    async fetchLiveMatches(): Promise<Match[]> {
        const cacheKey = this.getCacheKey('/matches/v1/live');
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const data = await this.makeRequest('live-matches');
            const matches: Match[] = [];

            if (data.typeMatches) {
                data.typeMatches.forEach((typeMatch: any) => {
                    if (typeMatch.seriesMatches) {
                        typeMatch.seriesMatches.forEach((seriesMatch: any) => {
                            if (seriesMatch.seriesAdWrapper) {
                                const seriesName = seriesMatch.seriesAdWrapper.seriesName || '';

                                if (seriesMatch.seriesAdWrapper.matches) {
                                    seriesMatch.seriesAdWrapper.matches.forEach((matchInfo: any) => {
                                        if (matchInfo.matchInfo) {
                                            const info = matchInfo.matchInfo;
                                            matches.push({
                                                id: info.matchId,
                                                matchId: info.matchId,
                                                team1: info.team1?.teamName || 'Team 1',
                                                team2: info.team2?.teamName || 'Team 2',
                                                displayName: `${info.team1?.teamName || 'Team 1'} vs ${info.team2?.teamName || 'Team 2'}`,
                                                seriesName: seriesName,
                                                matchFormat: info.matchFormat || 'Unknown',
                                                status: info.status || 'Unknown',
                                                state: info.state || 'Unknown',
                                                isLive: info.state === 'In Progress' || info.state === 'Live',
                                                venue: info.venueInfo?.ground || 'Unknown',
                                                startDate: info.startDate
                                            });
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            }

            this.setCacheData(cacheKey, matches);
            return matches;
        } catch (error: any) {
            console.error('Error fetching live matches:', error);
            throw new Error(`Failed to fetch matches: ${error.message}`);
        }
    }

    /**
     * Fetch match details including scores
     */
    async fetchMatchDetails(matchId: string): Promise<any> {
        if (!matchId) {
            throw new Error('Match ID is required');
        }

        const cacheKey = this.getCacheKey(`/mcenter/v1/${matchId}`, {});
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const data = await this.makeRequest(`/mcenter/v1/${matchId}`, {});
            this.setCacheData(cacheKey, data);
            return data;
        } catch (error: any) {
            console.error('Error fetching match details:', error);
            throw new Error(`Failed to fetch match details: ${error.message}`);
        }
    }

    /**
     * Fetch live ball-by-ball commentary
     */
    async fetchLiveCommentary(matchId: string, skipCache = false): Promise<CommentaryResponse> {
        if (!matchId) {
            throw new Error('Match ID is required');
        }

        const cacheKey = this.getCacheKey(`/mcenter/v1/${matchId}/comm`, {});

        if (!skipCache) {
            const cached = this.getCachedData(cacheKey);
            if (cached) {
                console.log('[CricketAPI] Returning cached commentary');
                return cached;
            }
        } else {
            console.log('[CricketAPI] Skipping cache, fetching fresh data');
        }

        try {
            const data = await this.makeRequest(`/mcenter/v1/${matchId}/comm`, {});
            const processed = this.processCommentaryResponse(matchId, data);

            const result: CommentaryResponse = {
                ...processed,
                matchHeader: data.matchheaders,
                liveBallIndex: 0
            };

            this.setCacheData(cacheKey, result);
            return result;
        } catch (error: any) {
            console.error('Error fetching commentary:', error);
            throw new Error(`Failed to fetch commentary: ${error.message}`);
        }
    }

    /**
     * Fetch previous commentary balls for pagination
     * @param matchId - The match ID
     * @param inningsId - The innings ID
     * @param timestamp - The timestamp of the last ball (to fetch balls before this)
     */
    async fetchPreviousCommentary(matchId: string, inningsId: number, timestamp: number): Promise<CommentaryEntry[]> {
        if (!matchId) {
            throw new Error('Match ID is required');
        }

        try {
            const data = await this.makeRequest(`commentary/matches/${matchId}/comm-previous`, {
                iid: inningsId,
                tms: timestamp
            });

            // Map the response to CommentaryEntry format matching WebSocket structure
            const entries: CommentaryEntry[] = (data.lines || []).map((line: any, index: number) => ({
                key: line.id,
                text: line.text,
                originalText: line.text,
                over: line.over_number,
                ball: line.ball_number,
                event: line.event_type,
                runs: line.runs || 0,
                wicket: line.event_type === 'wicket' || (line.wickets && line.wickets > 0),
                isNew: false,
                updated: false,
                timestamp: new Date(line.timestamp).getTime(),
                ballIndex: index,
                raw: line,
                inningsId: line.metadata?.raw_data?.inningsid || line.metadata?.inningsid,
            }));

            return entries;
        } catch (error: any) {
            console.error('Error fetching previous commentary:', error);
            throw new Error(`Failed to fetch previous commentary: ${error.message}`);
        }
    }

    /**
     * Clean commentary text - remove all placeholder patterns
     */
    cleanCommentaryText(text: string, eventType?: string): string {
        if (!text) return '';

        text = text.replace(/B\d+\$/g, '');
        text = text.replace(/\$B\d*/g, '');
        text = text.replace(/[$€£¥₹]/g, '');
        text = text.replace(/[#@%^&*_+=[\]{}|\\<>~`]/g, ' ');
        text = text.replace(/\s+/g, ' ').trim();
        text = text.replace(/^[.,;:!?\s]+/g, '');

        return text;
    }

    /**
     * Extract runs from commentary text
     */
    extractRuns(text: string, eventType?: string): number {
        if (!text) return 0;

        if (/\bFOUR\b/i.test(text) || /\b4\s*runs?\b/i.test(text)) {
            return 4;
        }
        if (/\bSIX\b/i.test(text) || /\b6\s*runs?\b/i.test(text)) {
            return 6;
        }

        const runsMatch = text.match(/\b([1-3])\s*runs?\b/i);
        if (runsMatch) {
            return parseInt(runsMatch[1]);
        }

        return 0;
    }

    /**
     * Start polling for live commentary updates
     */
    startLiveCommentaryPolling(matchId: string, callback: (result: CommentaryResponse) => void, interval = 10000) {
        this.stopLiveCommentaryPolling();

        let pollCount = 0;

        const poll = async () => {
            try {
                const skipCache = pollCount % 3 === 0;
                const result = await this.fetchLiveCommentary(matchId, skipCache);
                pollCount += 1;

                if (
                    result.newEntries.length > 0 ||
                    result.updatedEntries.length > 0 ||
                    result.miniscoreChanged
                ) {
                    callback(result);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        };

        poll();
        this.pollingInterval = setInterval(poll, interval);
    }

    /**
     * Stop polling for commentary
     */
    stopLiveCommentaryPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * Commentary state helpers
     */
    getCommentaryState(matchId: string): CommentaryState {
        if (!this.commentaryState.has(matchId)) {
            this.commentaryState.set(matchId, {
                entries: [],
                entryMap: new Map(),
                lastMiniscore: null
            });
        }
        return this.commentaryState.get(matchId)!;
    }

    buildBallKey(comm: any): string {
        const innings = comm.inningsid ?? 0;
        const over = comm.overnum ?? 0;
        const ball = comm.ballnbr ?? 0;
        return `${innings}-${over}-${ball}`;
    }

    cleanFormattedText(comm: any): string {
        let text = comm.commtxt || '';
        if (comm.commentaryformats && Array.isArray(comm.commentaryformats)) {
            comm.commentaryformats.forEach((formatBlock: any) => {
                if (formatBlock?.value && Array.isArray(formatBlock.value)) {
                    formatBlock.value.forEach((valueEntry: any) => {
                        if (valueEntry?.id && valueEntry?.value) {
                            const regex = new RegExp(valueEntry.id, 'g');
                            text = text.replace(regex, valueEntry.value);
                        }
                    });
                }
            });
        }
        return this.cleanCommentaryText(text, comm.eventtype);
    }

    normalizeCommentaryEntry(comm: any, index: number): CommentaryEntry | null {
        if (!comm) return null;
        const text = this.cleanFormattedText(comm);
        if (!text) return null;

        const key = this.buildBallKey(comm);
        return {
            key,
            text,
            originalText: comm.commtxt || '',
            over: comm.overnum,
            ball: comm.ballnbr,
            timestamp: comm.timestamp || Date.now(),
            event: comm.eventtype,
            runs: this.extractRuns(comm.commtxt, comm.eventtype),
            wicket: comm.eventtype === 'WICKET',
            ballIndex: index,
            isNew: false,
            updated: false,
            raw: comm
        };
    }

    hasMiniscoreChanged(previous: any, next: any): boolean {
        if (!next) return false;
        if (!previous) return true;
        return previous.responselastupdated !== next.responselastupdated;
    }

    processCommentaryResponse(matchId: string, data: any): Omit<CommentaryResponse, 'matchHeader' | 'liveBallIndex'> {
        const state = this.getCommentaryState(matchId);
        const previousMiniscore = state.lastMiniscore;
        const miniscore = data.miniscore || null;

        const normalized: CommentaryEntry[] = [];
        if (Array.isArray(data.comwrapper)) {
            data.comwrapper.forEach((item: any, index: number) => {
                const entry = this.normalizeCommentaryEntry(item.commentary, index);
                if (entry) {
                    normalized.push(entry);
                }
            });
        }

        const seenKeys = new Set<string>();
        const newEntries: CommentaryEntry[] = [];
        const updatedEntries: CommentaryEntry[] = [];

        normalized.forEach((entry, index) => {
            seenKeys.add(entry.key);
            const existing = state.entryMap.get(entry.key);

            if (existing) {
                const canFlagUpdate = index < COMMENTARY_UPDATE_WINDOW;
                if (canFlagUpdate && existing.originalText !== entry.originalText) {
                    entry.updated = true;
                    updatedEntries.push(entry);
                } else {
                    entry.updated = false;
                }
            } else {
                entry.isNew = true;
                newEntries.push(entry);
            }
        });

        const mergedEntries = [
            ...normalized,
            ...state.entries.filter(entry => !seenKeys.has(entry.key))
        ].slice(0, COMMENTARY_WINDOW_SIZE);

        state.entries = mergedEntries;
        state.entryMap = new Map(mergedEntries.map(entry => [entry.key, entry]));
        state.lastMiniscore = miniscore || state.lastMiniscore;

        const miniscoreChanged = this.hasMiniscoreChanged(previousMiniscore, miniscore);

        return {
            commentary: mergedEntries,
            miniscore: state.lastMiniscore,
            miniscoreChanged,
            newEntries,
            updatedEntries
        };
    }
}

// Create singleton instance
const cricketApi = new CricketApiService();

export default cricketApi;
