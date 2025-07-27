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
      return {
        url: results[0].url,
        title: results[0].title,
        duration: results[0].durationInSec,
        thumbnail: results[0].thumbnails[0].url
      };
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
    let addedTracks = 0;
    for (const track of tracks) {
      try {
        const query = `${track.name} ${track.artists}`;
        console.log('Searching YouTube for:', query);
        const youtubeResult = await searchYouTube(query);
        
        if (youtubeResult) {
          const song = {
            title: youtubeResult.title,
            url: youtubeResult.url,
            duration: youtubeResult.duration,
            requester: message.author.tag,
            thumbnail: youtubeResult.thumbnail
          };

          // Get or create queue
          if (!queues.has(message.guild.id)) {
            queues.set(message.guild.id, new MusicQueue());
          }
          const queue = queues.get(message.guild.id);

          // Add song to queue
          queue.songs.push(song);
          addedTracks++;

          // If not playing, start playing
          if (!queue.playing) {
            queue.playing = true;
            await playSong(message.guild, queue, message.member.voice.channel);
          }

          // Send status message for first song only
          if (addedTracks === 1) {
            message.channel.send({
              embeds: [{
                color: 0x1DB954,
                title: '🎵 Now Playing from Spotify',
                description: `**${song.title}**\nRequested by: ${song.requester}\nDuration: ${formatDuration(song.duration)}`,
                thumbnail: {
                  url: song.thumbnail
                }
              }]
            });
          }
        }
      } catch (error) {
        console.error('Error processing track:', error);
        continue;
      }
    }

    return addedTracks;
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
  try {
    // Check for music role permission
    if (!hasMusicPermission(message.member)) {
      return message.channel.send('❌ You need the DJ role to use music commands!');
    }

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.channel.send('❌ You need to be in a voice channel to play music!');
    }

    // Check bot permissions
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
      return message.channel.send('❌ I need permissions to join and speak in your voice channel!');
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

    // Send initial status message
    const statusMsg = await message.channel.send('🎵 Processing your request...');

    try {
      // Handle Spotify URLs
      if (isSpotifyUrl(url) && !isSpotifyTrack) {
        const trackCount = await handleSpotifyUrl(url, message);
        await statusMsg.edit(`✅ Added ${trackCount} tracks from Spotify to the queue!`);
        return;
      }

      // Handle YouTube URLs
      let videoInfo;
      try {
        // Validate URL type
        const urlType = await play.validate(url);
        if (urlType === 'yt_video') {
          videoInfo = await play.video_info(url);
        } else {
          // Try to search for the term on YouTube
          const searchResults = await play.search(url, { limit: 1 });
          if (searchResults && searchResults.length > 0) {
            videoInfo = await play.video_info(searchResults[0].url);
          } else {
            throw new Error('No results found');
          }
        }
      } catch (error) {
        console.error('Error getting video info:', error);
        await statusMsg.edit('❌ Could not find video. Please try another URL or search term.');
        return;
      }

      const song = {
        title: videoInfo.video_details.title,
        url: videoInfo.video_details.url,
        duration: videoInfo.video_details.durationInSec,
        requester: message.author.tag,
        thumbnail: videoInfo.video_details.thumbnails[0].url
      };

      // Add song to queue
      queue.songs.push(song);
      
      const queueEmbed = {
        color: 0x1DB954,
        title: queue.playing ? '🎵 Added to Queue' : '🎵 Now Playing',
        description: `**${song.title}**\nRequested by: ${song.requester}\nDuration: ${formatDuration(song.duration)}`,
        thumbnail: {
          url: song.thumbnail
        }
      };

      // If not playing, start playing
      if (!queue.playing) {
        queue.playing = true;
        try {
          await statusMsg.edit({ content: '', embeds: [queueEmbed] });
          await playSong(message.guild, queue, voiceChannel);
        } catch (error) {
          console.error('Error starting playback:', error);
          await statusMsg.edit('❌ Error joining voice channel. Please check my permissions!');
          queue.playing = false;
          queue.songs = [];
        }
      } else {
        await statusMsg.edit({ content: '', embeds: [queueEmbed] });
      }
    } catch (error) {
      console.error('Error in handlePlay:', error);
      await statusMsg.edit('❌ Error playing this song. Please try another URL.');
    }
  } catch (error) {
    console.error('Critical error in handlePlay:', error);
    message.channel.send('❌ An unexpected error occurred. Please try again.');
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
    // Send queue empty message
    const textChannel = guild.channels.cache.find(channel => 
      channel.type === 0 && channel.permissionsFor(guild.members.me).has('SendMessages')
    );
    if (textChannel) {
      textChannel.send('📭 Queue is empty! Leaving voice channel.');
    }
    return;
  }

  try {
    // Create connection if not exists
    if (!connections.has(guild.id)) {
      console.log('Attempting to join voice channel...');
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false
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
          console.error('Connection lost, cleaning up:', error);
          connection.destroy();
          connections.delete(guild.id);
          queue.playing = false;
          queue.songs = [];
          const textChannel = guild.channels.cache.find(channel => 
            channel.type === 0 && channel.permissionsFor(guild.members.me).has('SendMessages')
          );
          if (textChannel) {
            textChannel.send('❌ Lost connection to voice channel. Please try again.');
          }
        }
      });

      // Log connection status changes
      connection.on('stateChange', (oldState, newState) => {
        console.log(`Voice connection state change: ${oldState.status} -> ${newState.status}`);
      });
    }

    // Create player if not exists
    if (!players.has(guild.id)) {
      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play
        }
      });
      players.set(guild.id, player);
      
      // Handle song end
      player.on(AudioPlayerStatus.Idle, () => {
        console.log('Player became idle, playing next song');
        queue.songs.shift(); // Remove the current song
        playSong(guild, queue, voiceChannel); // Play next song
      });

      // Handle errors
      player.on('error', error => {
        console.error('Player error:', error.message);
        const textChannel = guild.channels.cache.find(channel => 
          channel.type === 0 && channel.permissionsFor(guild.members.me).has('SendMessages')
        );
        if (textChannel) {
          textChannel.send('❌ Error playing song, skipping to next song...');
        }
        queue.songs.shift(); // Skip problematic song
        playSong(guild, queue, voiceChannel); // Try next song
      });

      connections.get(guild.id).subscribe(player);
    }

    // Get the current song and create stream
    const song = queue.songs[0];
    console.log('Creating stream for:', song.title);
    
    try {
      // Get stream using play-dl
      const stream = await play.stream(song.url);
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true
      });
      resource.volume.setVolume(1);

      // Play the song
      const player = players.get(guild.id);
      player.play(resource);
      console.log('Started playing:', song.title);

      // Send now playing message
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
              url: song.thumbnail
            }
          }]
        });
      }
    } catch (error) {
      console.error('Error creating stream:', error);
      const textChannel = guild.channels.cache.find(channel => 
        channel.type === 0 && channel.permissionsFor(guild.members.me).has('SendMessages')
      );
      if (textChannel) {
        textChannel.send('❌ Error playing song, skipping...');
      }
      queue.songs.shift(); // Skip problematic song
      playSong(guild, queue, voiceChannel); // Try next song
    }
  } catch (error) {
    console.error('Error in playSong:', error);
    const textChannel = guild.channels.cache.find(channel => 
      channel.type === 0 && channel.permissionsFor(guild.members.me).has('SendMessages')
    );
    if (textChannel) {
      textChannel.send('❌ An error occurred while playing music. Please try again.');
    }
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