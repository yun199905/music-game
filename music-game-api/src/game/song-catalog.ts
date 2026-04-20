export type SeedSong = {
  title: string;
  artist: string;
  language: 'zh-TW' | 'zh-CN' | 'en';
  aliases?: string[];
};

export const seedSongs: SeedSong[] = [
  {
    title: '小幸運',
    artist: '田馥甄',
    language: 'zh-TW',
    aliases: ['我的少女時代 小幸運'],
  },
  {
    title: '想見你想見你想見你',
    artist: '八三夭',
    language: 'zh-TW',
    aliases: ['想見你'],
  },
  {
    title: '告白氣球',
    artist: '周杰倫',
    language: 'zh-TW',
  },
  {
    title: '刻在我心底的名字',
    artist: '盧廣仲',
    language: 'zh-TW',
    aliases: ['刻在我心底的名字電影版'],
  },
  {
    title: '修煉愛情',
    artist: '林俊傑',
    language: 'zh-TW',
  },
  {
    title: '如果可以',
    artist: '韋禮安',
    language: 'zh-TW',
  },
  {
    title: '怎麼了',
    artist: '周興哲',
    language: 'zh-TW',
  },
  {
    title: '光年之外',
    artist: '鄧紫棋',
    language: 'zh-TW',
  },
];
