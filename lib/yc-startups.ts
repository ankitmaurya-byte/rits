export interface YCStartup {
  id: string;
  name: string;
  batch: string;
  industry: string;
  description: string;
  founders: string[];
  website: string;
}

export const mockYCStartups: YCStartup[] = [
  {
    id: "s1",
    name: "Airbnb",
    batch: "W09",
    industry: "Travel",
    description: "An online marketplace for short-term homestays and experiences. It revolutionized the hospitality industry by allowing people to rent out their homes.",
    founders: ["Brian Chesky", "Joe Gebbia", "Nathan Blecharczyk"],
    website: "https://airbnb.com",
  },
  {
    id: "s2",
    name: "Stripe",
    batch: "S10",
    industry: "Fintech",
    description: "Financial infrastructure platform for the internet. Millions of companies of all sizes use Stripe's software and APIs to accept payments, send payouts, and manage their businesses online.",
    founders: ["Patrick Collison", "John Collison"],
    website: "https://stripe.com",
  },
  {
    id: "s3",
    name: "Dropbox",
    batch: "S07",
    industry: "Cloud Storage",
    description: "A file hosting service that offers cloud storage, file synchronization, personal cloud, and client software. One of the earliest pioneers of consumer cloud storage.",
    founders: ["Drew Houston", "Arash Ferdowsi"],
    website: "https://dropbox.com",
  },
  {
    id: "s4",
    name: "Coinbase",
    batch: "S12",
    industry: "Crypto",
    description: "A secure online platform for buying, selling, transferring, and storing cryptocurrency. The easiest place to buy and sell cryptocurrency.",
    founders: ["Brian Armstrong", "Fred Ehrsam"],
    website: "https://coinbase.com",
  },
  {
    id: "s5",
    name: "Reddit",
    batch: "S05",
    industry: "Social",
    description: "A social news aggregation, web content rating, and discussion website. Known as the 'front page of the internet'.",
    founders: ["Steve Huffman", "Alexis Ohanian", "Aaron Swartz"],
    website: "https://reddit.com",
  },
  {
    id: "s6",
    name: "Brex",
    batch: "W17",
    industry: "Fintech",
    description: "Provides corporate credit cards and cash management accounts for technology companies. Reimaged financial services for growing businesses.",
    founders: ["Henrique Dubugras", "Pedro Franceschi"],
    website: "https://brex.com",
  },
  {
    id: "s7",
    name: "Deel",
    batch: "W19",
    industry: "HR & Payroll",
    description: "A global payroll and compliance platform for distributed teams. Allows companies to hire anyone, anywhere in a compliant manner.",
    founders: ["Alex Bouaziz", "Shuo Wang"],
    website: "https://deel.com",
  },
  {
    id: "s8",
    name: "Gusto",
    batch: "W12",
    industry: "HR & Payroll",
    description: "Provides a cloud-based payroll, benefits, and human resource management software for businesses in the United States.",
    founders: ["Josh Reeves", "Tomer London", "Edward Kim"],
    website: "https://gusto.com",
  }
];
