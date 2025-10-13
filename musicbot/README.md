# Dr. Sauce Music Bot

A music bot extension for Dr. Sauce Discord Bot that allows playing music in voice channels.

## Features

- Play music from YouTube URLs
- Queue system for multiple songs
- Skip current song
- View current queue with song information
- Automatic disconnection when queue is empty
- Beautiful embeds for song information

## Commands

- `$play <url>` - Play a song from YouTube (must be in a voice channel)
- `$skip` - Skip the current song
- `$queue` - Show the current music queue
- `$help` - Show available commands

## Setup

1. Install dependencies:
```bash
cd musicbot
npm install
```

2. Create a `.env` file in the musicbot directory with your Discord bot token:
```
DISCORD_TOKEN=your_token_here
```

3. Start the bot:
```bash
npm start
```

## Requirements

- Node.js 16.9.0 or higher
- Discord.js v14
- A Discord bot token
- FFmpeg installed on your system

## Usage

1. Join a voice channel
2. Use `$play <YouTube URL>` to play a song
3. The bot will join your channel and start playing
4. Use `$queue` to see what's playing and what's coming up
5. Use `$skip` to skip the current song

## Notes

- The bot will automatically leave the voice channel when the queue is empty
- You must be in a voice channel to use music commands
- Only YouTube URLs are supported at the moment 