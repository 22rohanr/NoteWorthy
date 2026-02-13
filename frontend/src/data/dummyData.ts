import { Fragrance, Review, User, Note, Brand } from '@/types/fragrance';

export const brands: Brand[] = [
  { id: 'b1', name: 'Maison Francis Kurkdjian', country: 'France', foundedYear: 2009 },
  { id: 'b2', name: 'Creed', country: 'France', foundedYear: 1760 },
  { id: 'b3', name: 'Tom Ford', country: 'USA', foundedYear: 2006 },
  { id: 'b4', name: 'Le Labo', country: 'USA', foundedYear: 2006 },
  { id: 'b5', name: 'Byredo', country: 'Sweden', foundedYear: 2006 },
  { id: 'b6', name: 'Parfums de Marly', country: 'France', foundedYear: 2009 },
];

export const notes: Note[] = [
  { id: 'n1', name: 'Bergamot', family: 'Citrus' },
  { id: 'n2', name: 'Oud', family: 'Woody' },
  { id: 'n3', name: 'Rose', family: 'Floral' },
  { id: 'n4', name: 'Vanilla', family: 'Gourmand' },
  { id: 'n5', name: 'Sandalwood', family: 'Woody' },
  { id: 'n6', name: 'Ambroxan', family: 'Woody' },
  { id: 'n7', name: 'Lavender', family: 'Fresh' },
  { id: 'n8', name: 'Iris', family: 'Floral' },
  { id: 'n9', name: 'Musk', family: 'Oriental' },
  { id: 'n10', name: 'Cedar', family: 'Woody' },
  { id: 'n11', name: 'Saffron', family: 'Spicy' },
  { id: 'n12', name: 'Leather', family: 'Oriental' },
  { id: 'n13', name: 'Amber', family: 'Oriental' },
  { id: 'n14', name: 'Jasmine', family: 'Floral' },
  { id: 'n15', name: 'Patchouli', family: 'Woody' },
];

export const fragrances: Fragrance[] = [
  {
    id: 'f1',
    name: 'Baccarat Rouge 540',
    brand: brands[0],
    releaseYear: 2015,
    concentration: 'EDP',
    gender: 'Unisex',
    description: 'A luminous and sophisticated fragrance that blends jasmine with saffron and amberwood. The scent creates a poetic alchemy that is both warm and addictive.',
    perfumer: 'Francis Kurkdjian',
    imageUrl: '',
    notes: {
      top: [notes[10]], // Saffron
      middle: [notes[13], notes[5]], // Jasmine, Ambroxan
      base: [notes[10], notes[3]], // Cedar, Vanilla (using similar)
    },
    ratings: {
      overall: 8.7,
      longevity: 9.2,
      sillage: 8.8,
      value: 6.5,
      reviewCount: 2847,
    },
    price: { amount: 325, currency: 'USD', size: '70ml' },
  },
  {
    id: 'f2',
    name: 'Aventus',
    brand: brands[1],
    releaseYear: 2010,
    concentration: 'EDP',
    gender: 'Masculine',
    description: 'A bold, masculine fragrance celebrating strength, power, and success. Opens with fruity notes of pineapple and apple, evolving into a smoky birch and musk dry down.',
    perfumer: 'Olivier Creed',
    imageUrl: '',
    notes: {
      top: [notes[0]], // Bergamot
      middle: [notes[2], notes[13]], // Rose, Jasmine
      base: [notes[8], notes[14]], // Musk, Patchouli
    },
    ratings: {
      overall: 8.9,
      longevity: 8.5,
      sillage: 8.2,
      value: 5.8,
      reviewCount: 4521,
    },
    price: { amount: 445, currency: 'USD', size: '100ml' },
  },
  {
    id: 'f3',
    name: 'Oud Wood',
    brand: brands[2],
    releaseYear: 2007,
    concentration: 'EDP',
    gender: 'Unisex',
    description: 'Rare oud wood is blended with rosewood, cardamom, and sandalwood for a warm, sophisticated scent that is distinctive yet refined.',
    perfumer: 'Richard Herpin',
    imageUrl: '',
    notes: {
      top: [notes[0]], // Bergamot (as citrus)
      middle: [notes[1], notes[4]], // Oud, Sandalwood
      base: [notes[3], notes[12]], // Vanilla, Amber
    },
    ratings: {
      overall: 8.4,
      longevity: 7.8,
      sillage: 7.2,
      value: 6.0,
      reviewCount: 1923,
    },
    price: { amount: 280, currency: 'USD', size: '50ml' },
  },
  {
    id: 'f4',
    name: 'Santal 33',
    brand: brands[3],
    releaseYear: 2011,
    concentration: 'EDP',
    gender: 'Unisex',
    description: 'An addictive cult classic that evokes the Wild West with Australian sandalwood, papyrus, and cedarwood. Smoky and leathery with a sweet undertone.',
    perfumer: 'Frank Voelkl',
    imageUrl: '',
    notes: {
      top: [notes[0]], // Bergamot
      middle: [notes[4], notes[11]], // Sandalwood, Leather
      base: [notes[9], notes[8]], // Cedar, Musk
    },
    ratings: {
      overall: 8.1,
      longevity: 7.5,
      sillage: 7.0,
      value: 6.8,
      reviewCount: 1456,
    },
    price: { amount: 215, currency: 'USD', size: '50ml' },
  },
  {
    id: 'f5',
    name: 'Gypsy Water',
    brand: brands[4],
    releaseYear: 2008,
    concentration: 'EDP',
    gender: 'Unisex',
    description: 'A romanticized vision of the Romani lifestyle: fresh lemon, juniper berries, and incense evoke nights around a campfire under the stars.',
    perfumer: 'Olivia Giacobetti',
    imageUrl: '',
    notes: {
      top: [notes[0]], // Bergamot (citrus)
      middle: [notes[7], notes[8]], // Iris, Musk
      base: [notes[4], notes[3]], // Sandalwood, Vanilla
    },
    ratings: {
      overall: 8.0,
      longevity: 6.8,
      sillage: 6.5,
      value: 6.2,
      reviewCount: 987,
    },
    price: { amount: 195, currency: 'USD', size: '50ml' },
  },
  {
    id: 'f6',
    name: 'Layton',
    brand: brands[5],
    releaseYear: 2016,
    concentration: 'EDP',
    gender: 'Masculine',
    description: 'A sophisticated and modern fragrance featuring apple, lavender, and vanilla. The perfect balance of fresh and warm notes for the confident gentleman.',
    perfumer: 'Hamid Merati-Kashani',
    imageUrl: '',
    notes: {
      top: [notes[0], notes[6]], // Bergamot, Lavender
      middle: [notes[13], notes[7]], // Jasmine, Iris
      base: [notes[3], notes[4]], // Vanilla, Sandalwood
    },
    ratings: {
      overall: 8.6,
      longevity: 8.8,
      sillage: 8.4,
      value: 7.5,
      reviewCount: 2134,
    },
    price: { amount: 310, currency: 'USD', size: '125ml' },
  },
];

export const reviews: Review[] = [
  {
    id: 'r1',
    fragranceId: 'f1',
    userId: 'u1',
    userName: 'ScentConnoisseur',
    rating: { overall: 9, longevity: 10, sillage: 9, value: 7 },
    content: 'This is truly a masterpiece. The saffron opening immediately captures attention, and the dry down is simply divine. Compliments guaranteed.',
    wearContext: { sprays: 4, weather: 'Cool/Fall', occasion: 'Evening Out' },
    impressions: {
      opening: 'Bright saffron with a subtle sweetness',
      midDrydown: 'Creamy jasmine blends with amberwood',
      dryDown: 'Warm, addictive amber that lasts for days',
    },
    upvotes: 234,
    createdAt: '2024-01-15',
  },
  {
    id: 'r2',
    fragranceId: 'f1',
    userId: 'u2',
    userName: 'FragranceExplorer',
    rating: { overall: 8, longevity: 9, sillage: 8, value: 5 },
    content: 'Beautiful scent but the price is steep. Still, the performance and uniqueness justify the splurge for special occasions.',
    upvotes: 156,
    createdAt: '2024-02-20',
  },
  {
    id: 'r3',
    fragranceId: 'f2',
    userId: 'u3',
    userName: 'OudLover',
    rating: { overall: 9, longevity: 8, sillage: 8, value: 6 },
    content: 'The king of fragrances. Batch variations exist but every version I\'ve tried has been phenomenal. A true signature scent.',
    wearContext: { sprays: 3, weather: 'Any', occasion: 'Office/Daily' },
    upvotes: 445,
    createdAt: '2024-01-08',
  },
  {
    id: 'r4',
    fragranceId: 'f3',
    userId: 'u4',
    userName: 'WoodyNotes',
    rating: { overall: 8, longevity: 7, sillage: 7, value: 6 },
    content: 'Elegant and refined oud that doesn\'t overpower. Perfect for someone new to oud fragrances.',
    upvotes: 89,
    createdAt: '2024-03-01',
  },
];

export const currentUser: User = {
  id: 'u1',
  username: 'ScentConnoisseur',
  email: 'scent@example.com',
  preferences: {
    likedNotes: ['Oud', 'Sandalwood', 'Vanilla', 'Amber'],
    avoidedNotes: ['Patchouli'],
    preferredConcentrations: ['EDP', 'Parfum'],
  },
  collection: {
    owned: ['f1', 'f3'],
    sampled: ['f2', 'f4', 'f5'],
    wishlist: ['f6'],
  },
  createdAt: '2023-06-15',
};

export const noteFamilies = ['Citrus', 'Floral', 'Woody', 'Oriental', 'Fresh', 'Gourmand', 'Spicy'] as const;
export const concentrations = ['EDP', 'EDT', 'Parfum', 'EDC', 'Cologne'] as const;
export const genders = ['Unisex', 'Masculine', 'Feminine'] as const;
