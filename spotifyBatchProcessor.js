// spotifyBatchProcessor.js - Batch processing for Spotify playlist imports
const SpotifyWebApi = require('spotify-web-api-node');
const play = require('play-dl');
const config = require('./config');
const errorHandler = require('./errorHandler');

class SpotifyBatchProcessor {
    constructor() {
        this.spotifyApi = new SpotifyWebApi({
            clientId: config.api.spotify.clientId,
            clientSecret: config.api.spotify.clientSecret
        });
        this.batchSize = 20; // Process 20 tracks at a time
        this.retryAttempts = 3;
        this.retryDelay = 5000; // 5 seconds
        this.setupTokenRefresh();
    }

    setupTokenRefresh() {
        // Initial token refresh
        this.refreshToken();

        // Set up periodic token refresh
        setInterval(() => {
            this.refreshToken();
        }, config.api.spotify.refreshInterval);
    }

    async refreshToken() {
        try {
            const data = await this.spotifyApi.clientCredentialsGrant();
            this.spotifyApi.setAccessToken(data.body['access_token']);
            console.log('Spotify token refreshed successfully');
        } catch (error) {
            await errorHandler.handleError(error, {
                errorContext: 'Spotify token refresh'
            });
        }
    }

    async processPlaylist(playlistUrl, options = {}) {
        try {
            const { id } = this.parseSpotifyUrl(playlistUrl);
            if (!id) throw new Error('Invalid Spotify playlist URL');

            // Fetch playlist details
            const playlist = await this.spotifyApi.getPlaylist(id);
            const tracks = playlist.body.tracks.items;

            // Process tracks in batches
            const batches = this.createBatches(tracks, this.batchSize);
            const results = [];

            for (const batch of batches) {
                const batchResults = await this.processBatch(batch, options);
                results.push(...batchResults);

                // Optional progress callback
                if (options.onProgress) {
                    options.onProgress({
                        total: tracks.length,
                        processed: results.length,
                        successful: results.filter(r => r.success).length,
                        failed: results.filter(r => !r.success).length
                    });
                }
            }

            return {
                playlistName: playlist.body.name,
                totalTracks: tracks.length,
                processedTracks: results
            };
        } catch (error) {
            await errorHandler.handleError(error, {
                playlistUrl,
                errorContext: 'Spotify playlist processing'
            });
            throw error;
        }
    }

    async processAlbum(albumUrl, options = {}) {
        try {
            const { id } = this.parseSpotifyUrl(albumUrl);
            if (!id) throw new Error('Invalid Spotify album URL');

            // Fetch album details
            const album = await this.spotifyApi.getAlbum(id);
            const tracks = album.body.tracks.items;

            // Process tracks in batches
            const batches = this.createBatches(tracks, this.batchSize);
            const results = [];

            for (const batch of batches) {
                const batchResults = await this.processBatch(batch, options);
                results.push(...batchResults);

                // Optional progress callback
                if (options.onProgress) {
                    options.onProgress({
                        total: tracks.length,
                        processed: results.length,
                        successful: results.filter(r => r.success).length,
                        failed: results.filter(r => !r.success).length
                    });
                }
            }

            return {
                albumName: album.body.name,
                totalTracks: tracks.length,
                processedTracks: results
            };
        } catch (error) {
            await errorHandler.handleError(error, {
                albumUrl,
                errorContext: 'Spotify album processing'
            });
            throw error;
        }
    }

    async processBatch(tracks, options = {}) {
        const results = await Promise.allSettled(
            tracks.map(track => this.processTrack(track, options))
        );

        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return {
                    track: tracks[index],
                    ...result.value,
                    success: true
                };
            } else {
                return {
                    track: tracks[index],
                    error: result.reason,
                    success: false
                };
            }
        });
    }

    async processTrack(track, options = {}) {
        const trackInfo = track.track || track; // Handle both playlist and album track formats
        const query = `${trackInfo.name} ${trackInfo.artists.map(a => a.name).join(' ')}`;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const youtubeResult = await this.searchYouTube(query, options);
                return {
                    spotifyTrack: {
                        name: trackInfo.name,
                        artists: trackInfo.artists.map(a => a.name).join(', '),
                        duration: Math.floor(trackInfo.duration_ms / 1000)
                    },
                    youtube: youtubeResult
                };
            } catch (error) {
                if (attempt === this.retryAttempts) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }
    }

    async searchYouTube(query, options = {}) {
        try {
            const results = await play.search(query, {
                limit: 1,
                source: { youtube: "video" }
            });

            if (results && results.length > 0) {
                const result = results[0];
                return {
                    title: result.title,
                    url: result.url,
                    duration: result.durationInSec,
                    thumbnail: result.thumbnails[0].url
                };
            }
            throw new Error('No YouTube results found');
        } catch (error) {
            await errorHandler.handleError(error, {
                query,
                errorContext: 'YouTube search'
            });
            throw error;
        }
    }

    parseSpotifyUrl(url) {
        let id, type;
        
        if (url.includes('track')) {
            type = 'track';
            id = url.split('track/')[1]?.split('?')[0];
        } else if (url.includes('playlist')) {
            type = 'playlist';
            id = url.split('playlist/')[1]?.split('?')[0];
        } else if (url.includes('album')) {
            type = 'album';
            id = url.split('album/')[1]?.split('?')[0];
        }
        
        return { id, type };
    }

    createBatches(items, size) {
        const batches = [];
        for (let i = 0; i < items.length; i += size) {
            batches.push(items.slice(i, i + size));
        }
        return batches;
    }

    // Utility method to validate Spotify URL
    isValidSpotifyUrl(url) {
        const { id, type } = this.parseSpotifyUrl(url);
        return id && type;
    }

    // Get processing status
    getStatus() {
        return {
            tokenStatus: !!this.spotifyApi.getAccessToken(),
            batchSize: this.batchSize,
            retryAttempts: this.retryAttempts,
            retryDelay: this.retryDelay
        };
    }
}

module.exports = new SpotifyBatchProcessor();

