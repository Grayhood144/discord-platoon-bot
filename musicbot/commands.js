const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState
} = require('@discordjs/voice');
const play = require('play-dl');
const ytdl = require('ytdl-core');

// Store queues for each server
const queues = new Map();

// Store audio players for each server
const players = new Map();

// Store voice connections for each server
const connections = new Map();

class MusicQueue {
  constructor() {
    this.songs = [];
    this.playing = false;
    this.connection = null;
    this.player = null;
  }
}

async function handlePlay(message, args) {
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
    return message.channel.send('❌ Please provide a YouTube URL!');
  }

  try {
    // Validate and get video info
    const videoInfo = await ytdl.getInfo(url);
    const song = {
      title: videoInfo.videoDetails.title,
      url: videoInfo.videoDetails.video_url,
      duration: videoInfo.videoDetails.lengthSeconds,
      requester: message.author.tag
    };

    // Add song to queue
    queue.songs.push(song);
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

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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