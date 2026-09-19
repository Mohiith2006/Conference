// Realistic Seed Data for Conference Management System

export const INITIAL_USERS = [
  {
    uid: "user-organizer-conf",
    name: "Conf",
    email: "conf@gmail.com",
    role: "organizer",
    affiliation: "Conference Organization Committee",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
  },
  {
    uid: "user-organizer-01",
    name: "Prof. Eleanor Vance",
    email: "organizer@confhub.org",
    role: "organizer",
    affiliation: "MIT Department of Computer Science",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
  },
  {
    uid: "user-reviewer-01",
    name: "Dr. Marcus Sterling",
    email: "reviewer@confhub.org",
    role: "reviewer",
    affiliation: "Stanford Artificial Intelligence Laboratory",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
  },
  {
    uid: "user-reviewer-02",
    name: "Dr. Sophia Hartmann",
    email: "reviewer2@confhub.org",
    role: "reviewer",
    affiliation: "ETH Zürich - Distributed Computing Lab",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80"
  },
  {
    uid: "user-author-01",
    name: "Dr. Sarah Chen",
    email: "author@confhub.org",
    role: "author",
    affiliation: "Carnegie Mellon University",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"
  }
];

export const INITIAL_CONFERENCES = [
  {
    id: "conf-gaisc-2026",
    title: "IEEE Global AI & Systems Conference (GAISC 2026)",
    description: "Premier academic forum addressing scalable deep learning architectures, federated edge systems, and safe autonomous cognition.",
    tracks: [
      "AI & Machine Learning",
      "Distributed Systems & Cloud",
      "Cybersecurity & Privacy",
      "Software Engineering",
      "Human-Computer Interaction"
    ],
    submission_deadline: "2027-11-30T23:59:59.000Z",
    review_deadline: "2027-12-15T23:59:59.000Z",
    end_date: "2027-12-28T18:00:00.000Z",
    status: "published",
    organizer_id: "user-organizer-01",
    location: "San Francisco, CA & Hybrid",
    created_at: "2026-08-01T10:00:00.000Z"
  },
  {
    id: "conf-icss-2026",
    title: "International Cyber Security Symposium (ICSS 2026)",
    description: "International flagship venue for cryptanalytic proofs, zero-trust infrastructure, and threat modeling.",
    tracks: [
      "Applied Cryptography",
      "Network Defense",
      "Hardware Security",
      "Post-Quantum Cryptography"
    ],
    submission_deadline: "2027-08-15T23:59:59.000Z",
    review_deadline: "2027-09-01T23:59:59.000Z",
    end_date: "2027-10-10T18:00:00.000Z",
    status: "published",
    organizer_id: "user-organizer-01",
    location: "Berlin, Germany",
    created_at: "2026-07-15T12:00:00.000Z"
  },
  {
    id: "conf-acmfc-2025",
    title: "ACM Future Computing Conference (FC 2025)",
    description: "Annual summit uniting systems architects, quantum researchers, and distributed computing pioneers.",
    tracks: [
      "Quantum Computing",
      "Decentralized Systems",
      "Edge Computing",
      "Green Architecture"
    ],
    // End date is set in the past so Author Portal Screen 5 can demonstrate Certificate Generation & Download!
    submission_deadline: "2027-06-01T23:59:59.000Z",
    review_deadline: "2027-07-01T23:59:59.000Z",
    end_date: "2025-08-15T18:00:00.000Z",
    status: "published",
    organizer_id: "user-organizer-01",
    location: "Zurich, Switzerland",
    created_at: "2025-04-01T08:00:00.000Z"
  },
  {
    id: "conf-draft-01",
    title: "World Distributed Systems Colloquium 2027 (Draft)",
    description: "Internal working draft for the upcoming 2027 colloquium. Only organizers can see this until published.",
    tracks: ["Consensus Protocols", "Byzantine Fault Tolerance", "Serverless"],
    submission_deadline: "2027-02-01T23:59:59.000Z",
    review_deadline: "2027-03-01T23:59:59.000Z",
    end_date: "2027-04-10T18:00:00.000Z",
    status: "draft",
    organizer_id: "user-organizer-01",
    location: "Tokyo, Japan",
    created_at: "2026-09-01T09:00:00.000Z"
  }
];

export const INITIAL_PAPERS = [];

export const INITIAL_REVIEWS = [];

export const INITIAL_DOCUMENTS = [];

