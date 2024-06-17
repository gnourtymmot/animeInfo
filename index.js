import { Client, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';
import moment from 'moment-timezone';
import keepAlive from './server.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const mySecret = process.env['TOKEN']

// Event: when the bot is ready and connected
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Command: fetch anime details from Anilist
client.on('messageCreate', async message => {
  if (message.content.startsWith('$anime')) {
    const args = message.content.split(' ').slice(1);
    const search = args.join(' ');

    if (!search) {
      return message.channel.send('Please provide the name of an anime.');
    }

    const query = `
      query ($search: String) {
        Media(search: $search, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          description
          coverImage {
            large
          }
          episodes
          nextAiringEpisode {
            airingAt
            episode
          }
        }
      }
    `;

    const variables = { search };

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ query, variables })
      });

      const data = await response.json();
      const anime = data.data.Media;

      if (anime) {
        const animeDetails = `
          **Title**: ${anime.title.romaji} (${anime.title.english})\n**Description**: ${anime.description.replace(/<\/?[^>]+(>|$)/g, "")}\n**Cover Image**: ${anime.coverImage.large}
        `;

        message.channel.send(animeDetails);

        if (anime.nextAiringEpisode) {
          const airingTimeUnix = anime.nextAiringEpisode.airingAt;
          const airingTime = moment.unix(airingTimeUnix).tz('America/Chicago').format('dddd, MMMM Do [at] h:mm A');
          const currentTime = moment().tz('America/Chicago');
          const duration = moment.duration(moment.unix(airingTimeUnix).diff(currentTime));
          const days = Math.floor(duration.asDays());
          const hours = duration.hours();

          const airingDetails = `
            **Next Episode**: Episode ${anime.nextAiringEpisode.episode} of ${anime.episodes}\n**Airing On**: ${airingTime} CDT\n**Time Until Airing**: ${days} days and ${hours} hours
          `;

          message.channel.send(airingDetails);
        } else {
          message.channel.send('No upcoming episodes found.');
        }
      } else {
        message.channel.send('Anime not found.');
      }
    } catch (error) {
      console.error(error);
      message.channel.send('An error occurred while fetching anime details.');
    }
  }
});

// Keep server running
keepAlive()

// Log in to Discord with your bot's token
client.login(mySecret)