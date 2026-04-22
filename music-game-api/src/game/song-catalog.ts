export type SeedSong = {
  title: string;
  artist: string;
  language: 'zh-TW' | 'zh-CN' | 'en';
  aliases?: string[];
  fallbackLyrics?: string;
};

export const seedSongs: SeedSong[] = [
  {
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    language: 'en',
    fallbackLyrics: `
The room wakes up as the speakers cut through.
Everybody leans in when Shape of You comes into view.
One more guess can flip the scoreboard too.
Shape of You keeps the whole round moving through.
    `.trim(),
  },
  {
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    language: 'en',
    fallbackLyrics: `
Neon colors flash before the next clue lands.
Blinding Lights turns the countdown bright across the stands.
Someone shouts a guess before the chorus bites.
Blinding Lights keeps the pressure high tonight.
    `.trim(),
  },
  {
    title: 'Levitating',
    artist: 'Dua Lipa',
    language: 'en',
    fallbackLyrics: `
The beat kicks in and everyone starts celebrating.
Hands go up the second Levitating starts vibrating.
One right answer sends the leaderboard rotating.
Levitating keeps the party elevating.
    `.trim(),
  },
  {
    title: 'Uptown Funk',
    artist: 'Mark Ronson ft. Bruno Mars',
    language: 'en',
    fallbackLyrics: `
The crowd steps forward when the horns all jump.
Uptown Funk turns a quiet lobby into something pumped.
One fast answer can change the final chunk.
Uptown Funk keeps the whole room jumping.
    `.trim(),
  },
  {
    title: 'Shake It Off',
    artist: 'Taylor Swift',
    language: 'en',
    fallbackLyrics: `
Missed guesses fade while the next clue lifts off.
Shake It Off tells the room to laugh the pressure off.
The timer drops and nobody can drift off.
Shake It Off keeps the momentum switched on.
    `.trim(),
  },
  {
    title: 'Rolling in the Deep',
    artist: 'Adele',
    language: 'en',
    fallbackLyrics: `
The next reveal arrives with heavy heat.
Rolling in the Deep gives every guess a stronger beat.
Someone almost solves it from the back row seat.
Rolling in the Deep keeps the challenge sweet.
    `.trim(),
  },
  {
    title: 'Happy',
    artist: 'Pharrell Williams',
    language: 'en',
    fallbackLyrics: `
The room claps back as soon as drums go snappy.
Happy makes the slowest player move a little faster happily.
One clean guess could swing the score exactly.
Happy keeps the whole game bright and catchy.
    `.trim(),
  },
  {
    title: 'Firework',
    artist: 'Katy Perry',
    language: 'en',
    fallbackLyrics: `
The chorus rises like sparks above the floor.
Firework makes the room want one big answer more.
The countdown glows and every player starts to roar.
Firework leaves the whole match wanting more.
    `.trim(),
  },
];

export function getSeedSongFallbackLyrics(
  artist: string,
  title: string,
): string | null {
  const match = findSeedSong(artist, title);
  return match?.fallbackLyrics ?? null;
}

export function findSeedSong(artist: string, title: string): SeedSong | null {
  return (
    seedSongs.find((song) => song.artist === artist && song.title === title) ??
    null
  );
}
