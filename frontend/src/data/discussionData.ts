export interface Discussion {
  id: string;
  title: string;
  author: string;
  authorAvatar?: string;
  timestamp: string;
  commentCount: number;
  category: 'Recommendation' | 'Comparison' | 'General' | 'News';
  preview: string;
}

export const discussions: Discussion[] = [
  {
    id: 'd1',
    title: 'Looking for a summer wedding scent — help!',
    author: 'ScentConnoisseur',
    timestamp: '2024-03-10T14:30:00',
    commentCount: 24,
    category: 'Recommendation',
    preview: 'I have an outdoor wedding in July and need something elegant but not overpowering in the heat. Budget around $200.',
  },
  {
    id: 'd2',
    title: 'Baccarat Rouge 540 vs Cloud — are they really similar?',
    author: 'FragranceExplorer',
    timestamp: '2024-03-09T09:15:00',
    commentCount: 47,
    category: 'Comparison',
    preview: 'I keep hearing that Ariana Grande Cloud is a dupe for BR540. Has anyone worn both extensively? How do they compare in longevity?',
  },
  {
    id: 'd3',
    title: 'Best office-safe fragrances under $100?',
    author: 'OudLover',
    timestamp: '2024-03-08T16:45:00',
    commentCount: 31,
    category: 'Recommendation',
    preview: 'Need something professional that won\'t bother coworkers but still gets compliments. Prefer woody or fresh scents.',
  },
  {
    id: 'd4',
    title: 'Why does Aventus smell different every batch?',
    author: 'WoodyNotes',
    timestamp: '2024-03-07T11:20:00',
    commentCount: 56,
    category: 'General',
    preview: 'Just got a new bottle and it smells noticeably different from my 2019 batch. Is Creed actually changing the formula or is it natural variation?',
  },
  {
    id: 'd5',
    title: 'Niche houses doing interesting things in 2024',
    author: 'ScentConnoisseur',
    timestamp: '2024-03-06T08:00:00',
    commentCount: 19,
    category: 'News',
    preview: 'Let\'s talk about new releases that are actually pushing boundaries. I\'ll start — Xerjoff\'s latest collection is surprisingly accessible.',
  },
  {
    id: 'd6',
    title: 'Fragrance X reminds me of Fragrance Y — share yours',
    author: 'FragranceExplorer',
    timestamp: '2024-03-05T20:10:00',
    commentCount: 72,
    category: 'Comparison',
    preview: 'I\'ll go first: Santal 33 has a very similar vibe to REPLICA Jazz Club in the dry down. What are your unexpected scent twins?',
  },
];
