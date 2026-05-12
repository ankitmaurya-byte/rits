const fs = require('fs');

const baseStartups = [
  { name: "Airbnb", batch: "W09", industry: "Travel", founders: ["Brian Chesky", "Joe Gebbia"], desc: "An online marketplace for short-term homestays." },
  { name: "Stripe", batch: "S10", industry: "Fintech", founders: ["Patrick Collison", "John Collison"], desc: "Financial infrastructure platform for the internet." },
  { name: "Dropbox", batch: "S07", industry: "Cloud Storage", founders: ["Drew Houston"], desc: "A file hosting service." },
  { name: "Coinbase", batch: "S12", industry: "Crypto", founders: ["Brian Armstrong"], desc: "A secure online platform for buying and selling cryptocurrency." },
  { name: "Reddit", batch: "S05", industry: "Social", founders: ["Steve Huffman", "Alexis Ohanian"], desc: "A social news aggregation website." },
  { name: "Brex", batch: "W17", industry: "Fintech", founders: ["Henrique Dubugras"], desc: "Corporate credit cards for tech companies." },
  { name: "Deel", batch: "W19", industry: "HR & Payroll", founders: ["Alex Bouaziz"], desc: "A global payroll and compliance platform." },
  { name: "Gusto", batch: "W12", industry: "HR & Payroll", founders: ["Josh Reeves"], desc: "Cloud-based payroll and HR management." },
  { name: "Scale AI", batch: "S16", industry: "AI", founders: ["Alexandr Wang"], desc: "Data platform for AI." },
  { name: "DoorDash", batch: "S13", industry: "Delivery", founders: ["Tony Xu"], desc: "Food delivery service." },
  { name: "Instacart", batch: "S12", industry: "Delivery", founders: ["Apoorva Mehta"], desc: "Grocery delivery service." },
  { name: "Twitch", batch: "W07", industry: "Media", founders: ["Justin Kan", "Emmett Shear"], desc: "Live streaming platform." },
  { name: "Ginkgo Bioworks", batch: "S14", industry: "Biotech", founders: ["Jason Kelly"], desc: "Organism design company." },
  { name: "Rippling", batch: "W17", industry: "HR & Payroll", founders: ["Parker Conrad"], desc: "Workforce management platform." },
  { name: "Faire", batch: "W17", industry: "E-commerce", founders: ["Max Rhodes"], desc: "Wholesale marketplace." },
  { name: "OpenSea", batch: "W18", industry: "Crypto", founders: ["Devin Finzer"], desc: "NFT marketplace." },
  { name: "Plaid", batch: "S13", industry: "Fintech", founders: ["Zach Perret"], desc: "Financial data network." },
  { name: "Flexport", batch: "W14", industry: "Logistics", founders: ["Ryan Petersen"], desc: "Digital freight forwarder." },
  { name: "Amplitude", batch: "W12", industry: "Analytics", founders: ["Spenser Skates"], desc: "Product analytics platform." },
  { name: "Segment", batch: "S11", industry: "Analytics", founders: ["Peter Reinhardt"], desc: "Customer data platform." }
];

const industries = ["Fintech", "AI", "SaaS", "Crypto", "Healthcare", "E-commerce", "Travel", "HR & Payroll", "Logistics", "Media", "Analytics", "Biotech"];
const batches = ["W05", "S06", "W07", "S08", "W09", "S10", "W11", "S12", "W13", "S14", "W15", "S16", "W17", "S18", "W19", "S20", "W21", "S22", "W23", "S24"];
const prefixes = ["Acme", "Nova", "Lumina", "Vertex", "Quantum", "Aura", "Nexus", "Zenith", "Apex", "Vanguard"];
const suffixes = ["AI", "Tech", "Labs", "Systems", "Network", "Data", "Health", "Cloud", "Pay", "Space"];

function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const startups = [];
// Add the 20 real ones first
for (let i = 0; i < baseStartups.length; i++) {
  const s = baseStartups[i];
  startups.push({
    id: `s${i+1}`,
    name: s.name,
    batch: s.batch,
    industry: s.industry,
    description: s.desc,
    founders: s.founders,
    website: `https://${s.name.toLowerCase().replace(/\\s/g, '')}.com`
  });
}

// Generate 30 fake ones
for (let i = 20; i < 50; i++) {
  const name = `${randomChoice(prefixes)} ${randomChoice(suffixes)}`;
  startups.push({
    id: `s${i+1}`,
    name,
    batch: randomChoice(batches),
    industry: randomChoice(industries),
    description: `A revolutionary new platform for the ${randomChoice(industries)} sector, leveraging cutting-edge technology.`,
    founders: [`Founder ${i}A`, `Founder ${i}B`],
    website: `https://${name.toLowerCase().replace(/\\s/g, '')}.com`
  });
}

const content = `export interface YCStartup {
  id: string;
  name: string;
  batch: string;
  industry: string;
  description: string;
  founders: string[];
  website: string;
}

export const mockYCStartups: YCStartup[] = ${JSON.stringify(startups, null, 2)};
`;

fs.writeFileSync('lib/yc-startups.ts', content);
console.log('Successfully generated 50 mock startups!');
