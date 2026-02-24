export type DiscussionCategory = 'Recommendation' | 'Comparison' | 'General' | 'News';

export interface Discussion {
  id: string;
  title: string;
  body: string;
  category: DiscussionCategory;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  commentCount: number;
  createdAt: string;
}

export interface Reply {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
}
