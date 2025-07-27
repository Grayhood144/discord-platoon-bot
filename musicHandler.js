const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior
} = require('@discordjs/voice');
const play = require('play-dl');
const ytdl = require('ytdl-core');
const path = require('path');
const SpotifyWebApi = require('spotify-web-api-node');

// Music role ID
const MUSIC_ROLE_ID = '1398878441423634432';

// Function to check if user has music permission
function hasMusicPermission(member) {
  return member.roles.cache.has(MUSIC_ROLE_ID);
}

// Configure FFmpeg path based on platform
if (process.platform === 'win32') {
  // Windows: use local FFmpeg
  const ffmpegPath = path.join(__dirname, 'ffmpeg', 'ffmpeg.exe');
  play.FFmpegPath = ffmpegPath;
} else {
  // Linux: use system FFmpeg
  play.FFmpegPath = '/usr/bin/ffmpeg';
}

// Initialize Spotify API
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET
});

// Refresh Spotify access token periodically
async function refreshSpotifyToken() {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
    // Token expires in 1 hour, refresh after 45 minutes
    setTimeout(refreshSpotifyToken, 45 * 60 * 1000);
  } catch (error) {
    console.error('Error refreshing Spotify token:', error);
    // Try again in 1 minute if failed
    setTimeout(refreshSpotifyToken, 60 * 1000);
  }
}

// Start token refresh cycle
refreshSpotifyToken();

// Function to check if URL is a Spotify link
function isSpotifyUrl(url) {
  return url.includes('open.spotify.com') || url.includes('spotify:');
}

// Function to extract Spotify ID and type from URL
function parseSpotifyUrl(url) {
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

// Function to search YouTube for a song
async function searchYouTube(query) {
  try {
    const results = await play.search(query, { limit: 1 });
    if (results && results.length > 0) {
      return results[0].url;
    }
    throw new Error('No results found');
  } catch (error) {
    console.error('Error searching YouTube:', error);
    throw error;
  }
}

// Function to handle Spotify URLs
async function handleSpotifyUrl(url, message) {
  try {
    const { id, type } = parseSpotifyUrl(url);
    if (!id || !type) throw new Error('Invalid Spotify URL');

    let tracks = [];
    
    switch (type) {
      case 'track':
        const track = await spotifyApi.getTrack(id);
        tracks.push({
          name: track.body.name,
          artists: track.body.artists.map(a => a.name).join(', ')
        });
        break;
        
      case 'playlist':
        const playlist = await spotifyApi.getPlaylist(id);
        tracks = playlist.body.tracks.items.map(item => ({
          name: item.track.name,
          artists: item.track.artists.map(a => a.name).join(', ')
        }));
        break;
        
      case 'album':
        const album = await spotifyApi.getAlbum(id);
        tracks = album.body.tracks.items.map(track => ({
          name: track.name,
          artists: track.artists.map(a => a.name).join(', ')
        }));
        break;
    }

    // Add all tracks to queue
    for (const track of tracks) {
      const query = `${track.name} ${track.artists}`;
      const youtubeUrl = await searchYouTube(query);
      await handlePlay(message, [youtubeUrl], true);
    }

    return tracks.length;
  } catch (error) {
    console.error('Error handling Spotify URL:', error);
    throw error;
  }
}

// Store queues for each server
const queues = new Map();
const players = new Map();
const connections = new Map();

class MusicQueue {
  constructor() {
    this.songs = [];
    this.playing = false;
    this.connection = null;
    this.player = null;
  }
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

async function handlePlay(message, args, isSpotifyTrack = false) {
  // Check for music role permission
  if (!hasMusicPermission(message.member)) {
    return message.channel.send('❌ You need the DJ role to use music commands!');
  }

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) {
    return message.channel.send('❌ You need to be in a voice channel to play music!');
  }

  // Get or create queue for this server
  if (!queues.has(message.guild.id)) {
    queues.set(message.guild.id, new MusicQueue());
  }
  const queue = queues.get(message.guild.id);

  // Get the song URL
  const url = args[0];
  if (!url) {
    return message.channel.send('❌ Please provide a YouTube or Spotify URL!');
  }

  try {
    // Handle Spotify URLs
    if (isSpotifyUrl(url) && !isSpotifyTrack) {
      const trackCount = await handleSpotifyUrl(url, message);
      return message.channel.send(`✅ Added ${trackCount} tracks from Spotify to the queue!`);
    }

    // Handle YouTube URLs
    const videoInfo = await ytdl.getInfo(url);
    const song = {
      title: videoInfo.videoDetails.title,
      url: videoInfo.videoDetails.video_url,
      duration: videoInfo.videoDetails.lengthSeconds,
      requester: message.author.tag
    };

    // Add song to queue
    queue.songs.push(song);
    
    if (!isSpotifyTrack) {
      message.channel.send({
        embeds: [{
          color: 0x1DB954,
          title: '🎵 Added to Queue',
          description: `**${song.title}**\nRequested by: ${song.requester}\nDuration: ${formatDuration(song.duration)}`,
          thumbnail: {
            url: videoInfo.videoDetails.thumbnails[0].url
          }
        }]
      });
    }

    // If not playing, start playing
    if (!queue.playing) {
      queue.playing = true;
      await playSong(message.guild, queue, voiceChannel);
    }
  } catch (error) {
    console.error('Error playing song:', error);
    message.channel.send('❌ Error playing this song. Please try another URL.');
  }
}

async function playSong(guild, queue, voiceChannel) {
  if (queue.songs.length === 0) {
    // No more songs in queue
    queue.playing = false;
    if (connections.has(guild.id)) {
      connections.get(guild.id).destroy();
      connections.delete(guild.id);
    }
    if (players.has(guild.id)) {
      players.delete(guild.id);
    }
    return;
  }

  try {
    // Create connection if not exists
    if (!connections.has(guild.id)) {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
      });
      connections.set(guild.id, connection);

      // Handle disconnection
      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch (error) {
          connection.destroy();
          connections.delete(guild.id);
          queue.playing = false;
          queue.songs = [];
        }
      });
    }

    // Create player if not exists
    if (!players.has(guild.id)) {
      const player = createAudioPlayer();
      players.set(guild.id, player);
      
      // Handle song end
      player.on(AudioPlayerStatus.Idle, () => {
        queue.songs.shift(); // Remove the current song
        playSong(guild, queue, voiceChannel); // Play next song
      });

      // Handle errors
      player.on('error', error => {
        console.error('Error:', error.message);
        queue.songs.shift(); // Skip problematic song
        playSong(guild, queue, voiceChannel); // Try next song
      });

      connections.get(guild.id).subscribe(player);
    }

    // Get the current song and create stream
    const song = queue.songs[0];
    const stream = await play.stream(song.url);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type
    });

    // Play the song and send notification
    players.get(guild.id).play(resource);
    const textChannel = guild.channels.cache.find(channel => 
      channel.type === 0 && channel.permissionsFor(guild.members.me).has('SendMessages')
    );
    
    if (textChannel) {
      textChannel.send({
        embeds: [{
          color: 0x1DB954,
          title: '🎵 Now Playing',
          description: `**${song.title}**\nRequested by: ${song.requester}\nDuration: ${formatDuration(song.duration)}`,
          thumbnail: {
            url: (await ytdl.getInfo(song.url)).videoDetails.thumbnails[0].url
          }
        }]
      });
    }

  } catch (error) {
    console.error('Error in playSong:', error);
    queue.songs.shift(); // Skip problematic song
    playSong(guild, queue, voiceChannel); // Try next song
  }
}

async function handleSkip(message) {
  // Check for music role permission
  if (!hasMusicPermission(message.member)) {
    return message.channel.send('❌ You need the DJ role to use music commands!');
  }

  if (!message.member.voice.channel) {
    return message.channel.send('❌ You need to be in a voice channel to skip music!');
  }

  const queue = queues.get(message.guild.id);
  if (!queue || queue.songs.length === 0) {
    return message.channel.send('❌ There are no songs in the queue!');
  }

  const player = players.get(message.guild.id);
  if (player) {
    player.stop(); // This will trigger the 'idle' event and play next song
    message.channel.send('⏭️ Skipped current song!');
  }
}

async function handleQueue(message) {
  // Check for music role permission
  if (!hasMusicPermission(message.member)) {
    return message.channel.send('❌ You need the DJ role to use music commands!');
  }

  const queue = queues.get(message.guild.id);
  if (!queue || queue.songs.length === 0) {
    return message.channel.send('❌ The queue is empty!');
  }

  const currentSong = queue.songs[0];
  const upcomingSongs = queue.songs.slice(1);

  const embed = {
    color: 0x1DB954,
    title: '🎵 Music Queue',
    fields: [
      {
        name: '🎧 Now Playing',
        value: `**${currentSong.title}**\nRequested by: ${currentSong.requester}\nDuration: ${formatDuration(currentSong.duration)}`
      }
    ]
  };

  if (upcomingSongs.length > 0) {
    embed.fields.push({
      name: '📜 Up Next',
      value: upcomingSongs
        .map((song, index) => `${index + 1}. **${song.title}** (${formatDuration(song.duration)})`)
        .join('\n')
    });
  }

  message.channel.send({ embeds: [embed] });
}

module.exports = {
  handlePlay,
  handleSkip,
  handleQueue
}; 