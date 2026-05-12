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
    "id": "s1",
    "name": "Airbnb",
    "batch": "W09",
    "industry": "Travel",
    "description": "An online marketplace for short-term homestays.",
    "founders": [
      "Brian Chesky",
      "Joe Gebbia"
    ],
    "website": "https://airbnb.com"
  },
  {
    "id": "s2",
    "name": "Stripe",
    "batch": "S10",
    "industry": "Fintech",
    "description": "Financial infrastructure platform for the internet.",
    "founders": [
      "Patrick Collison",
      "John Collison"
    ],
    "website": "https://stripe.com"
  },
  {
    "id": "s3",
    "name": "Dropbox",
    "batch": "S07",
    "industry": "Cloud Storage",
    "description": "A file hosting service.",
    "founders": [
      "Drew Houston"
    ],
    "website": "https://dropbox.com"
  },
  {
    "id": "s4",
    "name": "Coinbase",
    "batch": "S12",
    "industry": "Crypto",
    "description": "A secure online platform for buying and selling cryptocurrency.",
    "founders": [
      "Brian Armstrong"
    ],
    "website": "https://coinbase.com"
  },
  {
    "id": "s5",
    "name": "Reddit",
    "batch": "S05",
    "industry": "Social",
    "description": "A social news aggregation website.",
    "founders": [
      "Steve Huffman",
      "Alexis Ohanian"
    ],
    "website": "https://reddit.com"
  },
  {
    "id": "s6",
    "name": "Brex",
    "batch": "W17",
    "industry": "Fintech",
    "description": "Corporate credit cards for tech companies.",
    "founders": [
      "Henrique Dubugras"
    ],
    "website": "https://brex.com"
  },
  {
    "id": "s7",
    "name": "Deel",
    "batch": "W19",
    "industry": "HR & Payroll",
    "description": "A global payroll and compliance platform.",
    "founders": [
      "Alex Bouaziz"
    ],
    "website": "https://deel.com"
  },
  {
    "id": "s8",
    "name": "Gusto",
    "batch": "W12",
    "industry": "HR & Payroll",
    "description": "Cloud-based payroll and HR management.",
    "founders": [
      "Josh Reeves"
    ],
    "website": "https://gusto.com"
  },
  {
    "id": "s9",
    "name": "Scale AI",
    "batch": "S16",
    "industry": "AI",
    "description": "Data platform for AI.",
    "founders": [
      "Alexandr Wang"
    ],
    "website": "https://scale ai.com"
  },
  {
    "id": "s10",
    "name": "DoorDash",
    "batch": "S13",
    "industry": "Delivery",
    "description": "Food delivery service.",
    "founders": [
      "Tony Xu"
    ],
    "website": "https://doordash.com"
  },
  {
    "id": "s11",
    "name": "Instacart",
    "batch": "S12",
    "industry": "Delivery",
    "description": "Grocery delivery service.",
    "founders": [
      "Apoorva Mehta"
    ],
    "website": "https://instacart.com"
  },
  {
    "id": "s12",
    "name": "Twitch",
    "batch": "W07",
    "industry": "Media",
    "description": "Live streaming platform.",
    "founders": [
      "Justin Kan",
      "Emmett Shear"
    ],
    "website": "https://twitch.com"
  },
  {
    "id": "s13",
    "name": "Ginkgo Bioworks",
    "batch": "S14",
    "industry": "Biotech",
    "description": "Organism design company.",
    "founders": [
      "Jason Kelly"
    ],
    "website": "https://ginkgo bioworks.com"
  },
  {
    "id": "s14",
    "name": "Rippling",
    "batch": "W17",
    "industry": "HR & Payroll",
    "description": "Workforce management platform.",
    "founders": [
      "Parker Conrad"
    ],
    "website": "https://rippling.com"
  },
  {
    "id": "s15",
    "name": "Faire",
    "batch": "W17",
    "industry": "E-commerce",
    "description": "Wholesale marketplace.",
    "founders": [
      "Max Rhodes"
    ],
    "website": "https://faire.com"
  },
  {
    "id": "s16",
    "name": "OpenSea",
    "batch": "W18",
    "industry": "Crypto",
    "description": "NFT marketplace.",
    "founders": [
      "Devin Finzer"
    ],
    "website": "https://opensea.com"
  },
  {
    "id": "s17",
    "name": "Plaid",
    "batch": "S13",
    "industry": "Fintech",
    "description": "Financial data network.",
    "founders": [
      "Zach Perret"
    ],
    "website": "https://plaid.com"
  },
  {
    "id": "s18",
    "name": "Flexport",
    "batch": "W14",
    "industry": "Logistics",
    "description": "Digital freight forwarder.",
    "founders": [
      "Ryan Petersen"
    ],
    "website": "https://flexport.com"
  },
  {
    "id": "s19",
    "name": "Amplitude",
    "batch": "W12",
    "industry": "Analytics",
    "description": "Product analytics platform.",
    "founders": [
      "Spenser Skates"
    ],
    "website": "https://amplitude.com"
  },
  {
    "id": "s20",
    "name": "Segment",
    "batch": "S11",
    "industry": "Analytics",
    "description": "Customer data platform.",
    "founders": [
      "Peter Reinhardt"
    ],
    "website": "https://segment.com"
  },
  {
    "id": "s21",
    "name": "Nexus Health",
    "batch": "W17",
    "industry": "Media",
    "description": "A revolutionary new platform for the AI sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 20A",
      "Founder 20B"
    ],
    "website": "https://nexus health.com"
  },
  {
    "id": "s22",
    "name": "Lumina Space",
    "batch": "W17",
    "industry": "Logistics",
    "description": "A revolutionary new platform for the Travel sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 21A",
      "Founder 21B"
    ],
    "website": "https://lumina space.com"
  },
  {
    "id": "s23",
    "name": "Nexus Labs",
    "batch": "S06",
    "industry": "Biotech",
    "description": "A revolutionary new platform for the Logistics sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 22A",
      "Founder 22B"
    ],
    "website": "https://nexus labs.com"
  },
  {
    "id": "s24",
    "name": "Apex Cloud",
    "batch": "W21",
    "industry": "Logistics",
    "description": "A revolutionary new platform for the Analytics sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 23A",
      "Founder 23B"
    ],
    "website": "https://apex cloud.com"
  },
  {
    "id": "s25",
    "name": "Nexus Pay",
    "batch": "W17",
    "industry": "Logistics",
    "description": "A revolutionary new platform for the SaaS sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 24A",
      "Founder 24B"
    ],
    "website": "https://nexus pay.com"
  },
  {
    "id": "s26",
    "name": "Zenith AI",
    "batch": "S16",
    "industry": "E-commerce",
    "description": "A revolutionary new platform for the Travel sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 25A",
      "Founder 25B"
    ],
    "website": "https://zenith ai.com"
  },
  {
    "id": "s27",
    "name": "Acme AI",
    "batch": "W07",
    "industry": "Travel",
    "description": "A revolutionary new platform for the HR & Payroll sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 26A",
      "Founder 26B"
    ],
    "website": "https://acme ai.com"
  },
  {
    "id": "s28",
    "name": "Quantum Cloud",
    "batch": "S10",
    "industry": "Biotech",
    "description": "A revolutionary new platform for the E-commerce sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 27A",
      "Founder 27B"
    ],
    "website": "https://quantum cloud.com"
  },
  {
    "id": "s29",
    "name": "Lumina Labs",
    "batch": "S20",
    "industry": "E-commerce",
    "description": "A revolutionary new platform for the Analytics sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 28A",
      "Founder 28B"
    ],
    "website": "https://lumina labs.com"
  },
  {
    "id": "s30",
    "name": "Quantum Network",
    "batch": "S18",
    "industry": "Travel",
    "description": "A revolutionary new platform for the Healthcare sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 29A",
      "Founder 29B"
    ],
    "website": "https://quantum network.com"
  },
  {
    "id": "s31",
    "name": "Vanguard Space",
    "batch": "W13",
    "industry": "Travel",
    "description": "A revolutionary new platform for the Media sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 30A",
      "Founder 30B"
    ],
    "website": "https://vanguard space.com"
  },
  {
    "id": "s32",
    "name": "Acme Data",
    "batch": "S06",
    "industry": "Analytics",
    "description": "A revolutionary new platform for the HR & Payroll sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 31A",
      "Founder 31B"
    ],
    "website": "https://acme data.com"
  },
  {
    "id": "s33",
    "name": "Nexus Cloud",
    "batch": "S08",
    "industry": "AI",
    "description": "A revolutionary new platform for the Biotech sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 32A",
      "Founder 32B"
    ],
    "website": "https://nexus cloud.com"
  },
  {
    "id": "s34",
    "name": "Lumina Tech",
    "batch": "S08",
    "industry": "Travel",
    "description": "A revolutionary new platform for the E-commerce sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 33A",
      "Founder 33B"
    ],
    "website": "https://lumina tech.com"
  },
  {
    "id": "s35",
    "name": "Vertex Systems",
    "batch": "S06",
    "industry": "SaaS",
    "description": "A revolutionary new platform for the HR & Payroll sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 34A",
      "Founder 34B"
    ],
    "website": "https://vertex systems.com"
  },
  {
    "id": "s36",
    "name": "Zenith Labs",
    "batch": "S24",
    "industry": "Travel",
    "description": "A revolutionary new platform for the Biotech sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 35A",
      "Founder 35B"
    ],
    "website": "https://zenith labs.com"
  },
  {
    "id": "s37",
    "name": "Nova Health",
    "batch": "W13",
    "industry": "HR & Payroll",
    "description": "A revolutionary new platform for the HR & Payroll sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 36A",
      "Founder 36B"
    ],
    "website": "https://nova health.com"
  },
  {
    "id": "s38",
    "name": "Nova Space",
    "batch": "S16",
    "industry": "HR & Payroll",
    "description": "A revolutionary new platform for the Media sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 37A",
      "Founder 37B"
    ],
    "website": "https://nova space.com"
  },
  {
    "id": "s39",
    "name": "Acme Space",
    "batch": "S10",
    "industry": "Logistics",
    "description": "A revolutionary new platform for the Biotech sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 38A",
      "Founder 38B"
    ],
    "website": "https://acme space.com"
  },
  {
    "id": "s40",
    "name": "Acme Cloud",
    "batch": "W23",
    "industry": "Travel",
    "description": "A revolutionary new platform for the HR & Payroll sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 39A",
      "Founder 39B"
    ],
    "website": "https://acme cloud.com"
  },
  {
    "id": "s41",
    "name": "Zenith Pay",
    "batch": "S10",
    "industry": "Healthcare",
    "description": "A revolutionary new platform for the Crypto sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 40A",
      "Founder 40B"
    ],
    "website": "https://zenith pay.com"
  },
  {
    "id": "s42",
    "name": "Zenith Labs",
    "batch": "S12",
    "industry": "AI",
    "description": "A revolutionary new platform for the E-commerce sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 41A",
      "Founder 41B"
    ],
    "website": "https://zenith labs.com"
  },
  {
    "id": "s43",
    "name": "Quantum Pay",
    "batch": "S12",
    "industry": "Fintech",
    "description": "A revolutionary new platform for the AI sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 42A",
      "Founder 42B"
    ],
    "website": "https://quantum pay.com"
  },
  {
    "id": "s44",
    "name": "Aura Data",
    "batch": "S20",
    "industry": "Logistics",
    "description": "A revolutionary new platform for the Travel sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 43A",
      "Founder 43B"
    ],
    "website": "https://aura data.com"
  },
  {
    "id": "s45",
    "name": "Quantum AI",
    "batch": "W07",
    "industry": "AI",
    "description": "A revolutionary new platform for the SaaS sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 44A",
      "Founder 44B"
    ],
    "website": "https://quantum ai.com"
  },
  {
    "id": "s46",
    "name": "Lumina Data",
    "batch": "S10",
    "industry": "Analytics",
    "description": "A revolutionary new platform for the AI sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 45A",
      "Founder 45B"
    ],
    "website": "https://lumina data.com"
  },
  {
    "id": "s47",
    "name": "Nexus Health",
    "batch": "W09",
    "industry": "Crypto",
    "description": "A revolutionary new platform for the Fintech sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 46A",
      "Founder 46B"
    ],
    "website": "https://nexus health.com"
  },
  {
    "id": "s48",
    "name": "Vanguard Tech",
    "batch": "S18",
    "industry": "Biotech",
    "description": "A revolutionary new platform for the HR & Payroll sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 47A",
      "Founder 47B"
    ],
    "website": "https://vanguard tech.com"
  },
  {
    "id": "s49",
    "name": "Aura AI",
    "batch": "W23",
    "industry": "Healthcare",
    "description": "A revolutionary new platform for the Fintech sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 48A",
      "Founder 48B"
    ],
    "website": "https://aura ai.com"
  },
  {
    "id": "s50",
    "name": "Vanguard Cloud",
    "batch": "S22",
    "industry": "Media",
    "description": "A revolutionary new platform for the E-commerce sector, leveraging cutting-edge technology.",
    "founders": [
      "Founder 49A",
      "Founder 49B"
    ],
    "website": "https://vanguard cloud.com"
  }
];
