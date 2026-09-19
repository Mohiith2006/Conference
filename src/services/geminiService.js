import { getStoredConferences, getStoredPapers, getStoredReviews, getStoredUsers } from "./firebaseService.js";
import { INITIAL_CONFERENCES } from "../mock/initialData.js";

/**
 * ConfHub General-Purpose AI Assistant Service
 * Dual-Engine Architecture:
 * 1. Live Google Gemini LLM (1.5 Flash / 2.0 Flash) when an API key is provided
 * 2. ConfHub Intelligent Knowledge Engine (Built-in offline/local AI)
 *    Capable of answering general knowledge, science, coding, and general queries,
 *    while retaining deep, exact knowledge of the ConfHub Conference Management System.
 */

// =========================================================================
// API KEY MANAGEMENT
// =========================================================================
export const getGeminiApiKey = () => {
  try {
    const userCustomKey = localStorage.getItem("confhub_gemini_api_key");
    if (userCustomKey && userCustomKey.trim().length > 0) {
      return userCustomKey.trim();
    }
  } catch {}
  return import.meta.env?.VITE_GEMINI_API_KEY || "";
};

export const setGeminiApiKey = (key) => {
  try {
    if (key && key.trim()) {
      localStorage.setItem("confhub_gemini_api_key", key.trim());
    } else {
      localStorage.removeItem("confhub_gemini_api_key");
    }
    return true;
  } catch {
    return false;
  }
};

export const isGeminiConfigured = () => {
  return Boolean(getGeminiApiKey());
};

// =========================================================================
// GENERAL KNOWLEDGE: COUNTRY CAPITALS DICTIONARY
// =========================================================================
export const COUNTRY_CAPITALS = {
  france: { capital: "Paris", info: "Paris is also France's largest city and economic center." },
  germany: { capital: "Berlin", info: "Berlin is known for its history, arts, and vibrant culture." },
  "united kingdom": { capital: "London", info: "London is a global financial and cultural capital situated on the River Thames." },
  uk: { capital: "London", info: "London is a global financial and cultural capital situated on the River Thames." },
  england: { capital: "London", info: "London is located on the River Thames in south-east England." },
  "united states": { capital: "Washington, D.C.", info: "Washington, D.C. is a federal district along the Potomac River." },
  usa: { capital: "Washington, D.C.", info: "Washington, D.C. is a federal district along the Potomac River." },
  us: { capital: "Washington, D.C.", info: "Washington, D.C. is a federal district along the Potomac River." },
  italy: { capital: "Rome", info: "Rome, known as the Eternal City, is home to the Colosseum and Vatican City." },
  spain: { capital: "Madrid", info: "Madrid is the center of Spanish culture, politics, and the royal palace." },
  canada: { capital: "Ottawa", info: "Ottawa is located in Ontario along the border with Quebec." },
  australia: { capital: "Canberra", info: "Canberra is located in the Australian Capital Territory between Sydney and Melbourne." },
  japan: { capital: "Tokyo", info: "Tokyo is the world's most populous metropolitan area and Japan's high-tech center." },
  china: { capital: "Beijing", info: "Beijing is one of the world's oldest cities with a history spanning 3,000 years." },
  india: { capital: "New Delhi", info: "New Delhi serves as the seat of all three branches of the Government of India." },
  russia: { capital: "Moscow", info: "Moscow is the northernmost and coldest megacity in Europe, centered around the Kremlin." },
  brazil: { capital: "Brasília", info: "Brasília is a planned federal capital founded in 1960, famous for Oscar Niemeyer's architecture." },
  mexico: { capital: "Mexico City", info: "Mexico City is built on the ruins of the ancient Aztec capital Tenochtitlan." },
  switzerland: { capital: "Bern", info: "Bern serves as the federal city and de facto capital of Switzerland." },
  netherlands: { capital: "Amsterdam", info: "Amsterdam is the constitutional capital, while the government sits in The Hague." },
  belgium: { capital: "Brussels", info: "Brussels is also the de facto capital of the European Union." },
  sweden: { capital: "Stockholm", info: "Stockholm is built across 14 islands where Lake Mälaren meets the Baltic Sea." },
  norway: { capital: "Oslo", info: "Oslo is known for its maritime heritage, green spaces, and museums." },
  denmark: { capital: "Copenhagen", info: "Copenhagen is famous for its colorful Nyhavn harbor and cycling culture." },
  finland: { capital: "Helsinki", info: "Helsinki is Finland's southern capital on the Gulf of Finland." },
  greece: { capital: "Athens", info: "Athens is the birthplace of democracy and Western philosophy, dominated by the Acropolis." },
  portugal: { capital: "Lisbon", info: "Lisbon is one of Western Europe's oldest cities, famous for its coastal hills." },
  austria: { capital: "Vienna", info: "Vienna is renowned for its imperial palaces, classical music legacy, and coffee houses." },
  poland: { capital: "Warsaw", info: "Warsaw is situated along the Vistula River with a meticulously reconstructed historic Old Town." },
  ireland: { capital: "Dublin", info: "Dublin is situated at the mouth of the River Liffey and renowned for its literary heritage." },
  "south korea": { capital: "Seoul", info: "Seoul is a dynamic metropolis blending high-tech innovation with ancient palaces." },
  korea: { capital: "Seoul", info: "Seoul is the capital of South Korea." },
  egypt: { capital: "Cairo", info: "Cairo is the largest city in the Arab world, set along the banks of the Nile near the Giza Pyramids." },
  "south africa": { capital: "Pretoria (Administrative), Cape Town (Legislative), Bloemfontein (Judicial)", info: "South Africa is unique with three official national capitals." },
  argentina: { capital: "Buenos Aires", info: "Buenos Aires is known as the Paris of South America for its European-style architecture." },
  turkey: { capital: "Ankara", info: "Ankara became the capital of the Turkish Republic in 1923, succeeding Istanbul." },
  "saudi arabia": { capital: "Riyadh", info: "Riyadh is Saudi Arabia's capital and main financial hub on a desert plateau." },
  uae: { capital: "Abu Dhabi", info: "Abu Dhabi is the federal capital and largest of the seven United Arab Emirates." },
  "united arab emirates": { capital: "Abu Dhabi", info: "Abu Dhabi is the federal capital and largest of the seven United Arab Emirates." },
  singapore: { capital: "Singapore", info: "Singapore is a sovereign island city-state and global financial hub." },
  indonesia: { capital: "Jakarta (Nusantara currently developing)", info: "Jakarta is Indonesia's historic capital on the island of Java." },
  thailand: { capital: "Bangkok", info: "Bangkok, known locally as Krung Thep Maha Nakhon, is famous for ornate shrines and street life." },
  malaysia: { capital: "Kuala Lumpur", info: "Kuala Lumpur is Malaysia's capital, known for the landmark Petronas Twin Towers." },
  vietnam: { capital: "Hanoi", info: "Hanoi is renowned for its centuries-old architecture and rich Southeast Asian culture." },
  "new zealand": { capital: "Wellington", info: "Wellington is the world's southernmost national capital." }
};

// =========================================================================
// GENERAL SCIENCE & COMMON TOPICS
// =========================================================================
export const GENERAL_TOPICS = [
  {
    keywords: ["photosynthesis", "explain photosynthesis", "process of photosynthesis"],
    title: "Photosynthesis Explained",
    content: `### 🌿 Photosynthesis Explained

**Photosynthesis** is the biological process through which green plants, algae, and certain bacteria transform light energy into chemical energy stored in sugar molecules (glucose).

### 🧪 Chemical Equation
$$6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\text{Light Energy} \\xrightarrow{\\text{Chlorophyll}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$

### 🔬 The Two Sequential Stages:
1. **Light-Dependent Reactions** *(occur in thylakoid membranes within chloroplasts)*:
   - Chlorophyll absorbs photons from sunlight.
   - Water ($\\text{H}_2\\text{O}$) is split via photolysis, generating electrons and releasing oxygen ($\\text{O}_2$) as a vital byproduct.
   - Converts light energy into high-energy chemical carriers: **ATP** and **NADPH**.

2. **Light-Independent Reactions (Calvin Cycle)** *(occur in the stroma)*:
   - Uses ATP and NADPH to fix carbon dioxide ($\\text{CO}_2$) from the atmosphere.
   - Synthesizes glucose ($\\text{C}_6\\text{H}_{12}\\text{O}_6$) and carbohydrates to fuel plant metabolism and growth.

**Ecological Importance**: Photosynthesis provides the primary energy source for almost all ecosystems and produces virtually all the breathable oxygen in Earth's atmosphere.`
  },
  {
    keywords: ["speed of light", "what is the speed of light", "how fast is light"],
    title: "The Speed of Light",
    content: `The speed of light in a vacuum is exactly:

$$c = 299,792,458 \\text{ meters per second}$$

• Approximately **300,000 km/s** (or **186,282 miles per second**).
• At this speed, light travels from the Sun to Earth in approximately **8 minutes and 20 seconds**.
• In Einstein's theory of Special Relativity, $c$ is the universal speed limit for all matter and information.`
  },
  {
    keywords: ["gravity", "what is gravity", "explain gravity"],
    title: "Gravity Explained",
    content: `**Gravity** is one of the four fundamental interactions in the universe, pulling masses toward one another.

### 🌌 Classical vs Modern Physics:
• **Newtonian Gravitation**: Isaac Newton described gravity as an attractive force proportional to masses and inversely proportional to the square of the distance:
  $$F = G \\frac{m_1 m_2}{r^2}$$
  *(On Earth, gravitational acceleration is roughly $g \\approx 9.81 \\text{ m/s}^2$)*

• **General Relativity (Einstein)**: Albert Einstein revealed that gravity is not a traditional force, but rather the **curvature of spacetime** created by mass and energy. Objects simply follow straight paths (geodesics) through curved spacetime.`
  },
  {
    keywords: ["dna", "what is dna", "structure of dna"],
    title: "DNA (Deoxyribonucleic Acid)",
    content: `**DNA (Deoxyribonucleic Acid)** is the hereditary molecule carrying the genetic blueprint for the growth, development, functioning, and reproduction of all known living organisms and many viruses.

### 🧬 Key Features:
• **Double Helix**: Discovered by James Watson, Francis Crick, and Rosalind Franklin in 1953.
• **Nucleotide Bases**:
  - **Adenine (A)** pairs with **Thymine (T)**
  - **Cytosine (C)** pairs with **Guanine (G)**
• **Function**: Encodes the instructions for synthesizing proteins through transcription (DNA $\\to$ mRNA) and translation (mRNA $\\to$ protein).`
  },
  {
    keywords: ["theory of relativity", "relativity", "einstein relativity", "e=mc2"],
    title: "Einstein's Theory of Relativity",
    content: `Albert Einstein revolutionized modern physics through two complementary theories of relativity:

1. **Special Relativity (1905)**:
   - The laws of physics are identical in all inertial reference frames.
   - The speed of light in a vacuum is constant for all observers.
   - Introduced mass-energy equivalence: **$E = mc^2$**, proving mass and energy are interchangeable.

2. **General Relativity (1915)**:
   - Massive objects (stars, planets, black holes) warp the fabric of spacetime.
   - Gravity is the manifestation of objects moving along the curves of this warped spacetime.`
  }
];

// =========================================================================
// DYNAMIC GENERAL KNOWLEDGE FETCH (Wikipedia REST API)
// =========================================================================
export const fetchGeneralKnowledge = async (query) => {
  try {
    const clean = query
      .replace(/^(what is|what are|explain|who is|who was|tell me about|what's the|whats the|where is|how does|define)\s+/i, "")
      .replace(/[?!.,;:'"()]/g, "")
      .trim();

    if (!clean || clean.length < 2) return null;

    // 1. Direct page summary lookup
    const directUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(clean)}`;
    const directRes = await fetch(directUrl, { headers: { Accept: "application/json" } });
    if (directRes.ok) {
      const directData = await directRes.json();
      if (directData && directData.type !== "disambiguation" && directData.extract && directData.extract.length > 40) {
        return `### 📖 ${directData.title}\n\n${directData.extract}`;
      }
    }

    // 2. Search lookup if direct title did not match
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(clean)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const topHit = searchData?.query?.search?.[0];
      if (topHit && topHit.title) {
        const pageUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topHit.title)}`;
        const pageRes = await fetch(pageUrl, { headers: { Accept: "application/json" } });
        if (pageRes.ok) {
          const pageData = await pageRes.json();
          if (pageData && pageData.extract && pageData.extract.length > 40) {
            return `### 📖 ${pageData.title}\n\n${pageData.extract}`;
          }
        }
      }
    }
  } catch (err) {
    console.warn("Wikipedia general knowledge fallback note:", err.message);
  }
  return null;
};

// =========================================================================
// COMPREHENSIVE ACADEMIC & CS ACRONYM DICTIONARY
// =========================================================================
export const ACADEMIC_ACRONYMS = {
  ML: {
    fullForm: "Machine Learning",
    field: "Artificial Intelligence & Data Science",
    summary:
      "A subfield of Artificial Intelligence focused on building mathematical and computational models that automatically learn patterns from data and improve their performance through experience, without explicit hardcoded programming.",
    paradigms: [
      "Supervised Learning (Classification, Regression)",
      "Unsupervised Learning (Clustering, Dimensionality Reduction)",
      "Reinforcement Learning (Reward-driven agent optimization)"
    ],
    confHubTrack: "AI & Machine Learning (IEEE GAISC 2026)"
  },
  AI: {
    fullForm: "Artificial Intelligence",
    field: "Computer Science & Cognitive Systems",
    summary:
      "The broad discipline of engineering intelligent systems capable of performing tasks that typically require human cognition, including reasoning, pattern recognition, learning, problem solving, and natural language communication.",
    subfields: ["Machine Learning", "Deep Learning", "Natural Language Processing", "Computer Vision", "Robotics"],
    confHubTrack: "AI & Machine Learning (IEEE GAISC 2026)"
  },
  NLP: {
    fullForm: "Natural Language Processing",
    field: "Artificial Intelligence & Computational Linguistics",
    summary:
      "The intersection of computer science, artificial intelligence, and linguistics concerned with enabling computational systems to process, understand, analyze, and generate human natural languages.",
    keyConcepts: ["Tokenization", "Part-of-Speech Tagging", "Named Entity Recognition (NER)", "Transformers", "Sentiment Analysis"],
    confHubTrack: "AI & Machine Learning"
  },
  LLM: {
    fullForm: "Large Language Model",
    field: "Deep Learning & Generative AI",
    summary:
      "Massive neural networks based on transformer architectures (like GPT, Gemini, Claude, LLaMA) trained on hundreds of billions of text tokens to generate coherent natural language, code, and perform complex reasoning tasks.",
    keyConcepts: ["Self-Attention", "Pretraining & Fine-Tuning", "RLHF", "Retrieval-Augmented Generation (RAG)", "Prompt Engineering"],
    confHubTrack: "AI & Machine Learning"
  },
  DL: {
    fullForm: "Deep Learning",
    field: "Artificial Intelligence",
    summary:
      "A subset of machine learning based on multi-layered artificial neural networks (deep neural networks) capable of automatically learning hierarchical feature representations directly from raw data.",
    architectures: ["Convolutional Neural Networks (CNNs)", "Transformers", "Recurrent Neural Networks (RNNs)", "Diffusion Models"]
  },
  RL: {
    fullForm: "Reinforcement Learning",
    field: "Machine Learning & Control Theory",
    summary:
      "An area of machine learning where an autonomous agent learns optimal decision-making strategies by interacting with an environment, receiving reward or penalty feedback to maximize cumulative reward.",
    keyConcepts: ["Markov Decision Processes (MDP)", "Q-Learning", "Policy Gradients", "PPO", "Exploration vs Exploitation"]
  },
  CNN: {
    fullForm: "Convolutional Neural Network",
    field: "Computer Vision & Deep Learning",
    summary:
      "A class of deep neural networks specialized for processing structured grid data, such as images and video, using convolution filters, pooling layers, and spatial feature hierarchies.",
    applications: ["Image Classification", "Object Detection", "Medical Image Segmentation", "Facial Recognition"]
  },
  RNN: {
    fullForm: "Recurrent Neural Network",
    field: "Deep Learning & Sequential Modeling",
    summary:
      "A class of artificial neural networks where connections between nodes form a directed sequence along a temporal graph, allowing dynamic temporal behavior and sequence-to-sequence modeling.",
    variants: ["LSTM (Long Short-Term Memory)", "GRU (Gated Recurrent Unit)"]
  },
  GAN: {
    fullForm: "Generative Adversarial Network",
    field: "Generative Deep Learning",
    summary:
      "A machine learning framework where two neural networks—a Generator and a Discriminator—compete in a minimax game to synthesize hyper-realistic synthetic data distributions."
  },
  CV: {
    fullForm: "Computer Vision (or Curriculum Vitae)",
    field: "Artificial Intelligence / Academic Careers",
    summary:
      "In Computer Science, CV stands for **Computer Vision**—the interdisciplinary field enabling computers to extract high-level understanding and semantic labels from digital images or videos. In academic hiring, CV stands for **Curriculum Vitae** (an academic resume)."
  },
  HCI: {
    fullForm: "Human-Computer Interaction",
    field: "User Interface Design & Cognitive Science",
    summary:
      "The multidisciplinary field researching the design, implementation, and evaluation of interactive computing systems for human use, emphasizing usability, accessibility, and user experience.",
    confHubTrack: "Human-Computer Interaction (IEEE GAISC 2026)"
  },
  IOT: {
    fullForm: "Internet of Things",
    field: "Distributed Systems & Embedded Computing",
    summary:
      "A network of interrelated physical objects, sensors, actuators, and computing devices embedded with software and connectivity to collect, exchange, and act on telemetry data across the internet.",
    confHubTrack: "Distributed Systems & Cloud"
  },
  API: {
    fullForm: "Application Programming Interface",
    field: "Software Engineering",
    summary:
      "A defined set of rules, protocols, and subroutine specifications that enables distinct software applications to communicate and exchange data securely."
  },
  PDF: {
    fullForm: "Portable Document Format",
    field: "Document Publishing",
    summary:
      "An open standard file format (ISO 32000) created by Adobe that captures all the elements of a printed document as an electronic image that users can view, navigate, print, or forward. ConfHub requires manuscripts in standard 2-column PDF format."
  },
  IEEE: {
    fullForm: "Institute of Electrical and Electronics Engineers",
    field: "Academic & Engineering Professional Society",
    summary:
      "The world's largest technical professional organization dedicated to advancing technology for the benefit of humanity. IEEE sponsors leading conferences, publishes prestigious journals (IEEE Xplore), and establishes global engineering standards.",
    relevance: "ConfHub sponsors the IEEE Global AI & Systems Conference (GAISC 2026) and recommends the IEEE two-column paper template."
  },
  ACM: {
    fullForm: "Association for Computing Machinery",
    field: "Computing Society",
    summary:
      "The world's premier educational and scientific computing society, uniting computing educators, researchers, and professionals to inspire dialogue, share resources, and address field challenges (sponsors the Turing Award and ACM Digital Library).",
    relevance: "ConfHub hosts the ACM Future Computing Conference (FC 2025) and supports ACM conference paper formatting."
  },
  GAISC: {
    fullForm: "IEEE Global AI & Systems Conference",
    field: "ConfHub Flagship Conference",
    summary:
      "Premier academic forum hosted on ConfHub addressing scalable deep learning architectures, federated edge systems, and safe autonomous cognition in San Francisco, CA & Hybrid.",
    confHubTrack: "GAISC 2026 (San Francisco, CA & Hybrid)"
  },
  ICSS: {
    fullForm: "International Cyber Security Symposium",
    field: "ConfHub Flagship Conference",
    summary:
      "International flagship venue hosted on ConfHub for cryptanalytic proofs, zero-trust infrastructure, and threat modeling in Berlin, Germany.",
    confHubTrack: "ICSS 2026 (Berlin, Germany)"
  },
  FC: {
    fullForm: "ACM Future Computing Conference",
    field: "ConfHub Flagship Conference",
    summary:
      "Annual summit hosted on ConfHub uniting systems architects, quantum researchers, and distributed computing pioneers in Zurich, Switzerland.",
    confHubTrack: "FC 2025 (Zurich, Switzerland)"
  },
  PQC: {
    fullForm: "Post-Quantum Cryptography",
    field: "Cryptography & Quantum Information",
    summary:
      "Cryptographic algorithms (typically based on lattice, hash, or code-based math) that are secure against attack by both quantum and classical computers.",
    confHubTrack: "Post-Quantum Cryptography (ICSS 2026)"
  },
  BFT: {
    fullForm: "Byzantine Fault Tolerance",
    field: "Distributed Systems & Consensus",
    summary:
      "The dependability property of a distributed computing system that can reach consensus even when certain nodes fail or transmit conflicting/malicious information.",
    confHubTrack: "Consensus Protocols & Distributed Systems"
  },
  POW: {
    fullForm: "Proof of Work",
    field: "Cryptographic Consensus",
    summary: "A consensus algorithm in distributed networks requiring participants to perform computationally intensive calculations to prevent spam and validate blocks."
  },
  POS: {
    fullForm: "Proof of Stake (or Part of Speech in NLP)",
    field: "Blockchain / NLP",
    summary: "In blockchain, Proof of Stake is a consensus mechanism where validators lock cryptocurrency as collateral. In Natural Language Processing, POS refers to Part-of-Speech tagging (noun, verb, adjective)."
  },
  DOI: {
    fullForm: "Digital Object Identifier",
    field: "Scholarly Publishing",
    summary:
      "A persistent unique alphanumeric string assigned by the International DOI Foundation to identify research papers, datasets, and official proceedings permanently on the web."
  },
  ORCID: {
    fullForm: "Open Researcher and Contributor ID",
    field: "Academic Identity",
    summary:
      "A unique 16-digit digital identifier that distinguishes individual researchers and links their publications, grants, and peer reviews transparently across academic databases."
  },
  CFP: {
    fullForm: "Call for Papers",
    field: "Academic Conference Organization",
    summary:
      "An official announcement published by conference organizers inviting researchers and authors to submit original manuscripts to specific tracks before a published deadline."
  },
  CRC: {
    fullForm: "Camera-Ready Copy",
    field: "Academic Publishing",
    summary:
      "The final, publication-ready version of an accepted academic paper incorporating peer-review feedback, author names, and formatting compliance for publication in official proceedings."
  },
  COI: {
    fullForm: "Conflict of Interest",
    field: "Peer Review Ethics",
    summary:
      "A situation where personal, institutional, or financial relationships (e.g., co-authorship, advisor-advisee, same university) could compromise objective peer review evaluation."
  },
  GPU: {
    fullForm: "Graphics Processing Unit",
    field: "Hardware & High Performance Computing",
    summary: "A specialized electronic circuit designed to rapidly manipulate and alter memory to accelerate parallel computations, essential for training modern deep learning models."
  },
  TPU: {
    fullForm: "Tensor Processing Unit",
    field: "AI Accelerators",
    summary: "An AI accelerator application-specific integrated circuit (ASIC) custom-developed by Google specifically for neural network machine learning workloads."
  },
  CPU: {
    fullForm: "Central Processing Unit",
    field: "Computer Architecture",
    summary: "The primary component of a computer that executes software instructions by performing arithmetic, logic, controlling, and input/output operations."
  },
  RAM: {
    fullForm: "Random Access Memory",
    field: "Computer Hardware",
    summary: "A form of volatile computer memory that can be read and changed in any order, typically used to store working data and machine code."
  },
  SSD: {
    fullForm: "Solid State Drive",
    field: "Storage Hardware",
    summary: "A solid-state storage device that uses integrated circuit assemblies to store data persistently, typically using flash memory."
  },
  OS: {
    fullForm: "Operating System",
    field: "Systems Software",
    summary: "System software that manages computer hardware, software resources, and provides common services for computer programs (e.g., Linux, Windows, macOS)."
  },
  DBMS: {
    fullForm: "Database Management System",
    field: "Databases & Information Systems",
    summary: "Software that handles the storage, retrieval, and updating of data in a computer system (e.g., PostgreSQL, MySQL, MongoDB)."
  },
  SQL: {
    fullForm: "Structured Query Language",
    field: "Databases",
    summary: "A domain-specific language used in programming and designed for managing data held in a relational database management system (RDBMS)."
  },
  NOSQL: {
    fullForm: "Not Only SQL",
    field: "Distributed Databases",
    summary: "An approach to database design that can accommodate a wide variety of data models, including key-value, document, columnar, and graph formats."
  },
  HTTP: {
    fullForm: "HyperText Transfer Protocol",
    field: "Computer Networking",
    summary: "An application-layer protocol for transmitting hypermedia documents, such as HTML, foundational to data communication for the World Wide Web."
  },
  HTTPS: {
    fullForm: "HyperText Transfer Protocol Secure",
    field: "Web Security",
    summary: "An extension of the Hypertext Transfer Protocol that uses encryption (TLS/SSL) for secure communication over a computer network."
  },
  HTML: {
    fullForm: "HyperText Markup Language",
    field: "Web Technologies",
    summary: "The standard markup language for creating documents designed to be displayed in a web browser."
  },
  CSS: {
    fullForm: "Cascading Style Sheets",
    field: "Web Technologies",
    summary: "A style sheet language used for describing the presentation of a document written in a markup language such as HTML."
  },
  JS: {
    fullForm: "JavaScript",
    field: "Programming Languages",
    summary: "A lightweight, interpreted, or just-in-time compiled programming language with first-class functions, widely used for client-side web applications."
  },
  JSON: {
    fullForm: "JavaScript Object Notation",
    field: "Data Serialization",
    summary: "An open standard file format and data interchange format that uses human-readable text to store and transmit data objects consisting of attribute-value pairs."
  },
  REST: {
    fullForm: "Representational State Transfer",
    field: "Software Architecture",
    summary: "A software architectural style that defines a set of constraints to be used for creating stateless, cacheable web services (RESTful APIs)."
  },
  SDK: {
    fullForm: "Software Development Kit",
    field: "Software Engineering",
    summary: "A collection of software development tools in one installable package that facilitates the creation of applications for a specific platform or framework."
  },
  IDE: {
    fullForm: "Integrated Development Environment",
    field: "Software Development",
    summary: "A software application that provides comprehensive facilities to computer programmers for software development (e.g., VS Code, IntelliJ, Eclipse)."
  },
  UI: {
    fullForm: "User Interface",
    field: "Design & HCI",
    summary: "The point of human-computer interaction and communication in a device, webpage, or app."
  },
  UX: {
    fullForm: "User Experience",
    field: "Design & HCI",
    summary: "How a user interacts with and experiences a product, system, or service, emphasizing ease of use, accessibility, and satisfaction."
  },
  SAAS: {
    fullForm: "Software as a Service",
    field: "Cloud Computing",
    summary: "A software licensing and delivery model in which software is licensed on a subscription basis and is centrally hosted in the cloud."
  },
  DNS: {
    fullForm: "Domain Name System",
    field: "Computer Networks",
    summary: "The hierarchical and decentralized naming system used to identify computers, services, and resources reachable over the internet."
  },
  IP: {
    fullForm: "Internet Protocol",
    field: "Networking",
    summary: "The principal communications protocol in the Internet protocol suite for relaying datagrams across network boundaries."
  },
  TCP: {
    fullForm: "Transmission Control Protocol",
    field: "Networking",
    summary: "A fundamental communications protocol that provides reliable, ordered, and error-checked delivery of a stream of octets between applications."
  },
  UDP: {
    fullForm: "User Datagram Protocol",
    field: "Networking",
    summary: "A lightweight, connectionless transmission protocol that allows computer applications to send messages (datagrams) without prior handshakes, optimizing for speed."
  },
  SSH: {
    fullForm: "Secure Shell",
    field: "Network Security",
    summary: "A cryptographic network protocol for operating network services securely over an unsecured network, widely used for remote command-line login."
  },
  TLS: {
    fullForm: "Transport Layer Security",
    field: "Cybersecurity",
    summary: "A cryptographic protocol designed to provide communications security over a computer network, superseding SSL."
  },
  RSA: {
    fullForm: "Rivest-Shamir-Adleman",
    field: "Public-Key Cryptography",
    summary: "One of the first public-key cryptosystems widely used for secure data transmission, based on the practical difficulty of the factorization of the product of two large prime numbers."
  },
  AES: {
    fullForm: "Advanced Encryption Standard",
    field: "Symmetric Cryptography",
    summary: "A symmetric block cipher chosen by the U.S. government to protect classified information, implemented in software and hardware worldwide."
  },
  SHA: {
    fullForm: "Secure Hash Algorithm",
    field: "Cryptography",
    summary: "A family of cryptographic hash functions published by the National Institute of Standards and Technology (NIST) (e.g., SHA-256, SHA-3)."
  },
  SVM: {
    fullForm: "Support Vector Machine",
    field: "Machine Learning",
    summary: "Supervised learning models with associated learning algorithms that analyze data for classification and regression analysis by finding maximum-margin separating hyperplanes."
  },
  KNN: {
    fullForm: "K-Nearest Neighbors",
    field: "Machine Learning",
    summary: "A non-parametric, supervised learning algorithm that classifies a data point based on how its neighbors are classified."
  },
  PCA: {
    fullForm: "Principal Component Analysis",
    field: "Unsupervised Machine Learning & Statistics",
    summary: "A popular technique for analyzing large datasets with a high number of dimensions/features per observation, projecting them onto orthogonal principal components."
  },
  SGD: {
    fullForm: "Stochastic Gradient Descent",
    field: "Optimization in Machine Learning",
    summary: "An iterative optimization algorithm that updates parameters using the gradient of the objective function computed on random mini-batches of data."
  },
  BERT: {
    fullForm: "Bidirectional Encoder Representations from Transformers",
    field: "Natural Language Processing",
    summary: "A transformer-based machine learning technique for NLP pre-training developed by Google, processing tokens bidirectionally."
  },
  GPT: {
    fullForm: "Generative Pre-trained Transformer",
    field: "Generative AI & LLMs",
    summary: "Autoregressive neural language models that use deep learning to produce human-like text by predicting the next token in a sequence."
  },
  RAG: {
    fullForm: "Retrieval-Augmented Generation",
    field: "AI & Information Retrieval",
    summary: "An AI framework that enhances LLM responses by retrieving authoritative knowledge from an external database or vector store before generating text."
  },
  RLHF: {
    fullForm: "Reinforcement Learning from Human Feedback",
    field: "AI Alignment",
    summary: "A machine learning technique that uses human preference data to train a reward model, fine-tuning large models to be more helpful and harmless."
  },
  LORA: {
    fullForm: "Low-Rank Adaptation",
    field: "Parameter-Efficient Fine-Tuning",
    summary: "A technique that accelerates the fine-tuning of large models by freezing pre-trained model weights and injecting trainable rank decomposition matrices."
  },
  OCR: {
    fullForm: "Optical Character Recognition",
    field: "Computer Vision",
    summary: "The electronic or mechanical conversion of images of typed, handwritten or printed text into machine-encoded text."
  },
  AGI: {
    fullForm: "Artificial General Intelligence",
    field: "Theoretical AI",
    summary: "A hypothetical software-based system that can understand, learn, and apply knowledge across the full breadth of intellectual disciplines at or above human level."
  },
  ANN: {
    fullForm: "Artificial Neural Network",
    field: "Deep Learning",
    summary: "Computing systems inspired by the biological neural networks that constitute animal brains, consisting of interconnected artificial neurons."
  },
  LSTM: {
    fullForm: "Long Short-Term Memory",
    field: "Deep Learning & Sequential Models",
    summary: "A specialized recurrent neural network (RNN) architecture equipped with forget, input, and output gates designed to overcome the vanishing gradient problem."
  },
  VIT: {
    fullForm: "Vision Transformer",
    field: "Computer Vision",
    summary: "A model that applies transformer self-attention mechanisms directly to sequences of flattened image patches without relying on convolutions."
  },
  ROC: {
    fullForm: "Receiver Operating Characteristic",
    field: "Model Evaluation",
    summary: "A graphical plot that illustrates the diagnostic ability of a binary classifier system as its discrimination threshold is varied (plotting True Positive Rate vs False Positive Rate)."
  },
  AUC: {
    fullForm: "Area Under the Curve",
    field: "Model Evaluation",
    summary: "The two-dimensional area underneath an entire ROC curve, representing degree of separability and classification quality."
  },
  MSE: {
    fullForm: "Mean Squared Error",
    field: "Loss Functions & Statistics",
    summary: "A risk metric or loss function measuring the average of the squares of the errors—that is, the average squared difference between the estimated values and the actual value."
  },
  CUDA: {
    fullForm: "Compute Unified Device Architecture",
    field: "Parallel Computing & Hardware",
    summary: "A parallel computing platform and application programming interface model created by NVIDIA for general purpose computing on GPUs."
  },
  SOTA: {
    fullForm: "State of the Art",
    field: "Research & Benchmarking",
    summary: "The highest level of general development, as of a device, technique, or scientific field achieved at a particular time."
  },
  PR: {
    fullForm: "Precision-Recall (or Pull Request)",
    field: "Evaluation / Version Control",
    summary: "In Machine Learning evaluation, PR stands for **Precision-Recall** (a curve useful for imbalanced datasets). In Git/GitHub, PR stands for **Pull Request**."
  },
  LATEX: {
    fullForm: "Lamport TeX",
    field: "Scientific Typesetting",
    summary:
      "A high-quality typesetting system widely used in mathematics, computer science, and physics for producing scholarly documents and conference manuscripts. ConfHub recommends authoring papers in LaTeX using IEEE/ACM templates."
  },
  BIBTEX: {
    fullForm: "Bibliographic TeX",
    field: "Reference Management",
    summary: "Reference management software used in conjunction with LaTeX to format lists of references according to conference publishing guidelines."
  },
  ARXIV: {
    fullForm: "arXiv (Pronounced 'archive')",
    field: "Preprint Repository",
    summary: "An open-access repository of electronic preprints and postprints in mathematics, computer science, physics, quantitative biology, and electrical engineering."
  }
};

// =========================================================================
// ACADEMIC CONCEPTS & DEFINITIONS
// =========================================================================
export const ACADEMIC_CONCEPTS = [
  {
    keywords: ["machine learning", "what is ml", "explain ml", "meaning of ml"],
    title: "Machine Learning (ML)",
    content: `**Machine Learning (ML)** is a subfield of Artificial Intelligence where computer systems learn from data to recognize patterns, make predictions, and adapt without explicit hardcoded rules.

### 🔍 Core Learning Paradigms:
1. **Supervised Learning**:
   - The model trains on input-output pairs labeled by humans.
   - *Examples*: Predicting house prices (Regression), classifying spam emails (Classification).
2. **Unsupervised Learning**:
   - The algorithm discovers inherent patterns or groupings in unlabeled datasets.
   - *Examples*: Customer segmentation (K-Means Clustering), feature reduction (PCA).
3. **Reinforcement Learning (RL)**:
   - An agent learns through trial-and-error rewards and penalties within an environment.
   - *Examples*: Game playing (AlphaGo), autonomous vehicle trajectory control.

💡 *In ConfHub, you can submit original ML research to the **AI & Machine Learning** track in the **IEEE Global AI & Systems Conference (GAISC 2026)**.*`
  },
  {
    keywords: ["artificial intelligence", "what is ai", "explain ai", "meaning of ai"],
    title: "Artificial Intelligence (AI)",
    content: `**Artificial Intelligence (AI)** is the broad discipline of creating computational systems that exhibit capabilities traditionally associated with human intelligence, such as perception, reasoning, language understanding, and problem-solving.

### 🏛 The AI Hierarchy:
• **Artificial Intelligence (AI)**: The overarching umbrella.
• **Machine Learning (ML)**: Statistical learning methods that improve with data.
• **Deep Learning (DL)**: Deep neural networks (multi-layered) powering modern vision, speech, and language breakthroughs.
• **Generative AI & LLMs**: Models (like Gemini, GPT) capable of synthesizing novel text, code, images, and protein sequences.

💡 *ConfHub sponsors leading AI forums including **IEEE GAISC 2026** (San Francisco).*`
  },
  {
    keywords: ["deep learning", "what is dl", "explain dl", "neural network", "neural networks"],
    title: "Deep Learning & Neural Networks",
    content: `**Deep Learning (DL)** is a subset of machine learning inspired by biological brain architectures. It uses multi-layered **Artificial Neural Networks** to automatically extract hierarchical representations directly from raw data (pixels, audio waveforms, text tokens).

### 🧬 Prominent Neural Architectures:
• **CNNs (Convolutional Neural Networks)**: Specialized for spatial hierarchies in images and videos.
• **Transformers**: Self-attention models powering state-of-the-art LLMs and multimodal systems.
• **RNNs & LSTMs**: Sequential networks for time-series and sequential data.
• **Diffusion Models**: Generative frameworks for synthetic image and audio generation.`
  },
  {
    keywords: ["difference between ai and ml", "ai vs ml", "compare ai and ml"],
    title: "Difference Between AI and ML",
    content: `### ⚖️ AI vs Machine Learning (ML)

| Dimension | Artificial Intelligence (AI) | Machine Learning (ML) |
| :--- | :--- | :--- |
| **Scope** | Broad concept of machines simulating human intellect. | Specific subset of AI focused on learning from data. |
| **Goal** | Simulate cognitive tasks and achieve intelligent action. | Optimize a mathematical model using training data. |
| **Methods** | Includes symbolic logic, expert systems, search, and ML. | Uses statistical algorithms (e.g., Regression, SVMs, Neural Nets). |
| **Analogy** | AI is the destination (intelligent behavior). | ML is the vehicle (learning from experience). |

*All Machine Learning is AI, but not all AI is Machine Learning (e.g., symbolic rule-based systems are AI without ML).*`
  },
  {
    keywords: ["supervised vs unsupervised", "supervised learning vs unsupervised learning"],
    title: "Supervised vs Unsupervised Learning",
    content: `### ⚖️ Supervised vs Unsupervised Learning

• **Supervised Learning**:
  - **Data**: Labeled (each input $X$ has a corresponding ground-truth label $Y$).
  - **Task**: Learn a mapping function $f(X) \\to Y$.
  - **Types**: Classification (discrete classes) and Regression (continuous values).
  - **Examples**: Sentiment classification, medical diagnosis, stock price prediction.

• **Unsupervised Learning**:
  - **Data**: Unlabeled (only feature inputs $X$ are provided).
  - **Task**: Discover latent structure, clusters, or probability distributions.
  - **Types**: Clustering (K-Means, DBSCAN), Dimensionality Reduction (PCA, t-SNE), Association Rules.
  - **Examples**: Customer segmentation, anomaly detection, genomic clustering.`
  },
  {
    keywords: ["natural language processing", "what is nlp", "explain nlp"],
    title: "Natural Language Processing (NLP)",
    content: `**Natural Language Processing (NLP)** combines computer science, AI, and linguistics to empower machines to interpret, generate, and manipulate human language.

### 📚 Core Tasks in NLP:
• **Text Classification**: Topic categorization, spam detection, sentiment analysis.
• **Sequence Labeling**: Named Entity Recognition (NER), Part-of-Speech (POS) tagging.
• **Information Extraction**: Relation extraction, summarization, QA systems.
• **Modern Paradigm**: Large Language Models (LLMs) with Transformer attention mechanisms.`
  },
  {
    keywords: ["h-index", "what is h-index", "h index"],
    title: "The h-index in Academic Research",
    content: `The **h-index** is an author-level metric that measures both the productivity and citation impact of a researcher's publications.

### 📐 How it is Calculated:
A scientist has index $h$ if $h$ of their $N_p$ papers have at least $h$ citations each, and the remaining papers have $\\le h$ citations.
- *Example*: If a researcher has published 10 papers with citation counts: [45, 30, 22, 15, 8, 5, 2, 1, 0, 0], their h-index is **5** (because 5 papers have $\\ge 5$ citations, but not 6 papers with $\\ge 6$).`
  },
  {
    keywords: ["peer review", "what is peer review", "peer review process", "how does the review process work", "how does review work"],
    title: "The Academic Peer-Review Process",
    content: `**Peer Review** is the scientific quality control process where domain experts evaluate a manuscript for novelty, methodological correctness, reproducibility, and significance before publication.

### 🛡️ How the Review Process Works in ConfHub:
1. **Double-Blind Evaluation**:
   Reviewers evaluate submissions without knowing the authors' names or affiliations, and authors receive anonymized feedback. This eliminates prestige and institutional bias.
2. **4-Dimension Standardized Rubric**:
   Reviewers score submissions from 1 to 5 across:
   • **Novelty & Originality (1-5)**: Uniqueness of concepts and advancement of state-of-the-art.
   • **Methodological Rigor (1-5)**: Soundness of proofs, experimental design, and reproducibility.
   • **Technical Quality (1-5)**: Implementation correctness and validation against baselines.
   • **Relevance & Impact (1-5)**: Alignment with conference tracks and community impact.
3. **Decisions & Feedback**:
   Reviewers provide an overall recommendation (*Strong Accept, Accept, Weak Accept, Borderline, Weak Reject, Strong Reject*), constructive feedback for authors, and confidential remarks to the Program Chair.
4. **Author Notifications**:
   Decisions are released in **Tab 2 (My Submissions)**. Accepted authors proceed to **Tab 3** for camera-ready submission and registration.`
  },
  {
    keywords: ["how to publish", "publish a paper", "how to write a research paper"],
    title: "How to Publish a Research Paper",
    content: `### 🎓 Scholarly Publishing Step-by-Step Guide

1. **Identify the Contribution**: Clarify your primary research question and validate that your findings are novel and statistically sound.
2. **Select the Right Conference**: Look for established conferences matching your track (e.g., IEEE GAISC 2026, ICSS 2026).
3. **Format According to Guidelines**: Use standard IEEE/ACM 2-column format (max 10 pages) and ensure double-blind anonymization.
4. **Submit Before the Deadline**: Upload your PDF in **Tab 1 (Submit Paper)** on ConfHub.
5. **Address Peer Review**: Receive double-blind reviewer scores (Novelty, Rigor, Quality, Relevance) and Program Committee decisions.
6. **Camera-Ready & Registration**: Upload the final unblinded PDF and complete registration in **Tab 3** to finalize presentation!`
  }
];

// =========================================================================
// REAL-TIME CONTEXT GATHERER
// =========================================================================
export const getPlatformContext = (currentUser = null, userProfile = null) => {
  try {
    let confs = getStoredConferences();
    if (!confs || !confs.length) confs = INITIAL_CONFERENCES;
    const publishedConfs = confs.filter((c) => c.status === "published");

    const allPapers = getStoredPapers();
    const allReviews = getStoredReviews();

    let userPapers = [];
    if (currentUser?.uid) {
      const uid = currentUser.uid;
      const email = userProfile?.email || currentUser.email || "";
      userPapers = allPapers.filter(
        (p) =>
          p.author_id === uid ||
          (email && p.author_email && p.author_email.toLowerCase() === email.toLowerCase())
      );
    }

    return {
      currentUser: currentUser
        ? {
            uid: currentUser.uid,
            name: userProfile?.name || currentUser.displayName || "Academic Author",
            email: userProfile?.email || currentUser.email || "",
            role: userProfile?.role || "author"
          }
        : null,
      publishedConferences: publishedConfs.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        tracks: c.tracks,
        location: c.location,
        submission_deadline: c.submission_deadline,
        review_deadline: c.review_deadline,
        end_date: c.end_date
      })),
      userPapers: userPapers.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        version: p.version || 1,
        conference_id: p.conference_id,
        track: p.track,
        camera_ready_url: p.camera_ready_url || null,
        registration_completed: Boolean(p.registration_completed),
        schedule: p.schedule || null
      })),
      totalPlatformPapers: allPapers.length,
      totalPlatformReviews: allReviews.length
    };
  } catch (err) {
    console.warn("Context gathering error:", err);
    return {
      publishedConferences: INITIAL_CONFERENCES.filter((c) => c.status === "published"),
      userPapers: []
    };
  }
};

// =========================================================================
// REMOTE GEMINI LLM CALLER
// =========================================================================
export const fetchGeminiResponse = async (userMessage, contextData = {}, chatHistory = []) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }

  const stringifiedContext =
    typeof contextData === "string" ? contextData : JSON.stringify(contextData, null, 2);

  const systemInstruction = `You are ConfHub's AI assistant. You can help with anything the user asks—general knowledge, science, coding, mathematics, history, creative tasks, and conversation—and you have specific knowledge about this Conference Management System (ConfHub) to answer questions about it accurately.

ConfHub Platform Context & System Details:
- Portals:
  • Author Portal: Tab 1 (Submit Paper), Tab 2 (My Submissions), Tab 3 (Registration & Camera-Ready), Tab 4 (My Schedule), Tab 5 (Certificates & Documents).
  • Reviewer Portal: Assigned Manuscripts, Review History (double-blind 4-dimension scoring rubric: Novelty 1-5, Rigor 1-5, Quality 1-5, Relevance 1-5).
  • Organizer Portal: Conference Management, Decision Dashboard (Best Paper awards), Program Scheduling (with automated room & speaker conflict detection), User Management.
- Paper Requirements: IEEE or ACM 2-column PDF format, max 10 pages, double-blind anonymization for review.
- Registration Tiers: Student ($150), Academic ($300), Industry ($500). Status becomes "Finalized" when both camera-ready PDF and registration payment are completed.
- Certificates: Unlocked strictly after conference end_date has elapsed (Tab 5).
- Live Platform Database Records:
${stringifiedContext}

Instructions:
1. Answer ANY question the user asks helpfully, directly, and comprehensively (general knowledge, facts, science, coding, creative writing, history, etc.). Never refuse or redirect general questions back to conference topics.
2. When asked about ConfHub, active conferences, deadlines, paper statuses, review rubrics, registration, or timetables, use the real platform context data above to answer with complete accuracy.
3. Use clean markdown formatting (bold text, bullet points, numbered lists, code blocks).`;

  const candidateModels = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-flash-lite-latest"];

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const recentHistory = (chatHistory || [])
        .slice(-4)
        .filter((m) => m && m.text && m.sender)
        .map((m) => ({
          role: m.sender === "user" ? "user" : "model",
          parts: [{ text: m.text }]
        }));

      const contents = [
        ...recentHistory,
        {
          role: "user",
          parts: [
            {
              text: `${systemInstruction}\n\nCurrent User Question: ${userMessage}`
            }
          ]
        }
      ];

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 600
          }
        })
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText && replyText.trim().length > 0) {
          return replyText.trim();
        }
      }
    } catch (err) {
      console.warn(`Gemini API call to ${model} failed or timed out:`, err.message);
    }
  }

  return null;
};

// =========================================================================
// BUILT-IN INTELLIGENT KNOWLEDGE & REASONING ENGINE
// =========================================================================
export const generateAcademicEngineResponse = async (userMessage, currentUser, userProfile) => {
  const trimmed = userMessage ? userMessage.trim() : "";
  const q = trimmed.toLowerCase();
  const cleanQ = q.replace(/[?!.,;:'"()]/g, "").trim();

  const platformContext = getPlatformContext(currentUser, userProfile);
  const { publishedConferences, userPapers } = platformContext;

  const formatDate = (dateStr) => {
    if (!dateStr) return "TBD";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  // -------------------------------------------------------------------------
  // 1. COUNTRY CAPITALS RESOLVER (e.g. "what's the capital of France")
  // -------------------------------------------------------------------------
  const capitalMatch = cleanQ.match(/(?:capital of|what is the capital of|whats the capital of|what's the capital of)\s+([a-z\s]+)/i);
  if (capitalMatch && capitalMatch[1]) {
    const country = capitalMatch[1].trim().toLowerCase();
    if (COUNTRY_CAPITALS[country]) {
      const c = COUNTRY_CAPITALS[country];
      const countryTitle = country.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      return `The capital of **${countryTitle}** is **${c.capital}**.\n\n${c.info}`;
    }
  }

  // Also check if user just asks "capital of X" where country is a key
  for (const [countryKey, val] of Object.entries(COUNTRY_CAPITALS)) {
    if (cleanQ.includes(`capital of ${countryKey}`) || cleanQ === `${countryKey} capital`) {
      const countryTitle = countryKey.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      return `The capital of **${countryTitle}** is **${val.capital}**.\n\n${val.info}`;
    }
  }

  // -------------------------------------------------------------------------
  // 2. GENERAL SCIENCE & KNOWLEDGE TOPICS (e.g. "explain photosynthesis")
  // -------------------------------------------------------------------------
  for (const topic of GENERAL_TOPICS) {
    if (topic.keywords.some((kw) => cleanQ.includes(kw))) {
      return topic.content;
    }
  }

  // -------------------------------------------------------------------------
  // 3. FULL FORM & ACRONYM RESOLVER (e.g., "what is the full form of ml")
  // -------------------------------------------------------------------------
  const fullFormMatch = cleanQ.match(
    /(?:what is the full form of|what is full form of|full form of|what does|what do|stand for|stands for|abbreviation of|meaning of)\s+([a-z0-9\-\s]+)/i
  );

  let targetAcronym = null;
  if (fullFormMatch && fullFormMatch[1]) {
    targetAcronym = fullFormMatch[1]
      .replace(/\b(stand for|stands for|mean|means|in computer science|in ai|in ml)\b/gi, "")
      .trim()
      .toUpperCase();
  } else {
    const words = cleanQ.split(/\s+/);
    if (words.length <= 4) {
      for (const w of words) {
        const candidate = w.toUpperCase();
        if (ACADEMIC_ACRONYMS[candidate]) {
          targetAcronym = candidate;
          break;
        }
      }
    }
  }

  if (targetAcronym && ACADEMIC_ACRONYMS[targetAcronym]) {
    const info = ACADEMIC_ACRONYMS[targetAcronym];
    let extraSection = "";

    if (info.paradigms) {
      extraSection += `\n\n**Core Paradigms:**\n${info.paradigms.map((p) => `• ${p}`).join("\n")}`;
    }
    if (info.subfields) {
      extraSection += `\n\n**Key Subfields:**\n${info.subfields.map((s) => `• ${s}`).join("\n")}`;
    }
    if (info.keyConcepts) {
      extraSection += `\n\n**Key Concepts:**\n${info.keyConcepts.map((k) => `• ${k}`).join("\n")}`;
    }
    if (info.architectures) {
      extraSection += `\n\n**Prominent Architectures:**\n${info.architectures.map((a) => `• ${a}`).join("\n")}`;
    }
    if (info.applications) {
      extraSection += `\n\n**Practical Applications:**\n${info.applications.map((app) => `• ${app}`).join("\n")}`;
    }

    let trackNote = "";
    if (info.confHubTrack) {
      trackNote = `\n\n💡 *In ConfHub, you can submit original research on this topic under the **${info.confHubTrack}**.*`;
    }

    return `The full form of **${targetAcronym}** is **${info.fullForm}**.

### 🧠 Overview & Scope
• **Field**: ${info.field}
• **Definition**: ${info.summary}${extraSection}${trackNote}`;
  }

  // -------------------------------------------------------------------------
  // 4. ACADEMIC & CS CONCEPT MATCHER
  // -------------------------------------------------------------------------
  for (const concept of ACADEMIC_CONCEPTS) {
    if (concept.keywords.some((kw) => cleanQ.includes(kw))) {
      return concept.content;
    }
  }

  // -------------------------------------------------------------------------
  // 5. GREETINGS & CASUAL CONVERSATION (Open Tone)
  // -------------------------------------------------------------------------
  if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|yo)\b/i.test(trimmed)) {
    const userName = userProfile?.name || (currentUser ? "Scholar" : "");
    const greeting = userName ? `Hello ${userName}!` : "Hello!";
    return `${greeting} I am your **ConfHub AI Assistant**.

I can help with anything you'd like to ask—general knowledge, science, coding, and academic concepts—as well as guide you through ConfHub's conferences, submissions, reviews, and presentation schedules.

How can I help you today?`;
  }

  if (q.includes("thank") || q.includes("thanks") || q === "ok" || q === "cool" || q === "great") {
    return `You're very welcome! If you have any other questions—whether general knowledge, science, coding, or conference-related—feel free to ask anytime.`;
  }

  if (q.includes("joke") || q.includes("funny")) {
    return `Here is a fun one for you:

*Why do programmers prefer dark mode?*
**Because light attracts bugs!** 🐛😄

Feel free to ask me anything else!`;
  }

  if (
    q.includes("who are you") ||
    q.includes("what are you") ||
    q.includes("what can you do") ||
    q.includes("help me") ||
    q === "help"
  ) {
    return `I am **ConfHub's AI Assistant**.

You can ask me anything:
• **General Knowledge**: Science, geography, world facts, history, math, or coding.
• **Academic Concepts**: AI, Machine Learning, Deep Learning, NLP, statistics, and research writing.
• **ConfHub Conference Operations**:
  - Active conferences, tracks, and submission deadlines.
  - Manuscript formatting guidelines (IEEE/ACM 10-page 2-column PDF).
  - Checking personal paper statuses and double-blind peer review scores.
  - Review rubric details (1–5 scale across Novelty, Rigor, Quality, Relevance).
  - Registration fee tiers ($150 Student, $300 Academic, $500 Industry) and camera-ready finalizing.
  - Presentation schedules and automated conflict detection.
  - Verified PDF presentation certificate downloads.

What's on your mind?`;
  }

  if (
    q.includes("what is confhub") ||
    q.includes("about confhub") ||
    q.includes("what is this platform") ||
    q.includes("what is this website")
  ) {
    return `**ConfHub** is an academic conference management and peer-review platform.

It streamlines the complete lifecycle of scholarly gatherings:
• **Authors**: Submit research papers, track double-blind reviews, upload camera-ready manuscripts, and access presentation timetables.
• **Reviewers**: Evaluate assigned submissions across a structured 4-dimension rubric with confidential feedback.
• **Organizers**: Create and publish conferences, assign reviewers, make final acceptance decisions, and build conflict-free program schedules.`;
  }

  // -------------------------------------------------------------------------
  // 6. SPECIFIC CONFERENCE INQUIRIES
  // -------------------------------------------------------------------------
  const matchedConf = publishedConferences.find((c) => {
    const titleLower = c.title.toLowerCase();
    const idLower = c.id.toLowerCase();
    if (q.includes("gaisc") && (titleLower.includes("gaisc") || idLower.includes("gaisc"))) return true;
    if (q.includes("icss") && (titleLower.includes("icss") || idLower.includes("icss"))) return true;
    if ((q.includes("future computing") || q.includes("acm fc") || q.includes("acmfc")) && (titleLower.includes("future computing") || titleLower.includes("fc"))) return true;
    if (q.includes("ai") && q.includes("systems") && titleLower.includes("ai")) return true;
    if (q.includes("cyber security") && titleLower.includes("cyber")) return true;
    return false;
  });

  if (matchedConf) {
    const isPast = new Date(matchedConf.end_date) < new Date();
    return `### 🏛 ${matchedConf.title}

• **Description**: ${matchedConf.description}
• **Location**: ${matchedConf.location || "Hybrid / Virtual"}
• **Submission Deadline**: **${formatDate(matchedConf.submission_deadline)}**
• **Review Notification**: ${formatDate(matchedConf.review_deadline)}
• **Conference Dates**: Concludes ${formatDate(matchedConf.end_date)} ${isPast ? "*(Concluded)*" : "*(Upcoming)*"}
• **Available Tracks**:
${matchedConf.tracks.map((t) => `  - ${t}`).join("\n")}

**Actionable Next Step**: To submit a manuscript to this conference, navigate to **Tab 1 (Submit Paper)** in the Author Portal.`;
  }

  // -------------------------------------------------------------------------
  // 7. ACTIVE CONFERENCES CATALOG
  // -------------------------------------------------------------------------
  if (
    q.includes("active conference") ||
    q.includes("active conferences") ||
    q.includes("list conference") ||
    q.includes("list conferences") ||
    q.includes("available conference") ||
    q.includes("available conferences") ||
    q.includes("what conferences") ||
    q.includes("show conferences") ||
    q.includes("all conferences") ||
    q.includes("upcoming conference") ||
    q.includes("upcoming conferences") ||
    q === "conferences" ||
    q.includes("open conferences") ||
    q.includes("conference list")
  ) {
    if (!publishedConferences || publishedConferences.length === 0) {
      return "There are currently no active published conferences in the system. Organizers can create and publish new events via the Organizer Portal.";
    }

    const confList = publishedConferences
      .map((c, idx) => {
        const isPast = new Date(c.end_date) < new Date();
        const deadline = formatDate(c.submission_deadline);
        const location = c.location ? ` | 📍 ${c.location}` : "";
        const tracks = c.tracks?.length ? `\n   *Tracks: ${c.tracks.slice(0, 3).join(", ")}${c.tracks.length > 3 ? "..." : ""}*` : "";
        return `**${idx + 1}. ${c.title}**${location}
   • Submission Deadline: **${deadline}**
   • Conference Dates: Ends ${formatDate(c.end_date)} ${isPast ? "*(Concluded)*" : "*(Open)*"}${tracks}`;
      })
      .join("\n\n");

    return `Here are the currently published active conferences on ConfHub:\n\n${confList}\n\n💡 *Tip: To submit a paper to any of these conferences, navigate to **Tab 1 (Submit Paper)**.*`;
  }

  // -------------------------------------------------------------------------
  // 8. DEADLINES & IMPORTANT DATES
  // -------------------------------------------------------------------------
  if (
    q.includes("deadline") ||
    q.includes("due date") ||
    q.includes("cutoff") ||
    q.includes("when to submit") ||
    q.includes("is there an extension") ||
    q.includes("important dates") ||
    q.includes("when is the deadline")
  ) {
    if (!publishedConferences.length) {
      return "No conference deadlines are currently scheduled.";
    }

    const deadlineList = publishedConferences
      .map((c) => {
        const subDate = new Date(c.submission_deadline);
        const isOpen = subDate > new Date();
        const statusStr = isOpen ? "🟢 **Open for Submissions**" : "🔴 **Submissions Closed**";
        return `• **${c.title}**
  - Submission Cutoff: **${formatDate(c.submission_deadline)}** (${statusStr})
  - Review Results: **${formatDate(c.review_deadline)}**
  - Event Conclusion: **${formatDate(c.end_date)}**`;
      })
      .join("\n\n");

    return `### 📅 Conference Deadlines & Key Milestones\n\n${deadlineList}\n\n*Note: ConfHub automatically validates submission deadlines. Submissions received before the cutoff are routed directly to double-blind peer review.*`;
  }

  // -------------------------------------------------------------------------
  // 9. USER'S PAPER STATUSES & SUBMISSIONS
  // -------------------------------------------------------------------------
  if (
    q.includes("my paper status") ||
    q.includes("my paper") ||
    q.includes("my papers") ||
    q.includes("my submission") ||
    q.includes("my submissions") ||
    q.includes("check my paper") ||
    q.includes("did i submit") ||
    q.includes("submission status") ||
    q.includes("status of my paper") ||
    q === "submissions"
  ) {
    if (!currentUser?.uid) {
      return `Please **sign in** to your account to view your personal paper submissions.

Once signed in, you can monitor your manuscript's real-time review progress in **Tab 2 (My Submissions)**.`;
    }

    if (!userPapers || userPapers.length === 0) {
      return `You currently have **0 active submissions** under account **${userProfile?.email || currentUser.email || "current user"}**.

To submit your first manuscript:
1. Go to **Tab 1 (Submit Paper)**
2. Choose your target conference and track
3. Upload your IEEE/ACM formatted PDF manuscript (up to 10 pages)
4. Click **Submit Manuscript**`;
    }

    const papersSummary = userPapers
      .map((p, idx) => {
        const statusLabel = (p.status || "submitted").toUpperCase().replace(/_/g, " ");
        let statusBadge = `🏷 **Status**: \`${statusLabel}\``;
        if (p.status === "accepted") statusBadge += " 🎉 *(Accepted! Proceed to Tab 3 for Camera-Ready & Registration)*";
        if (p.status === "finalized") statusBadge += " ✅ *(Finalized - Ready for Presentation)*";
        if (p.status === "under_review") statusBadge += " ⏳ *(Under Double-Blind Peer Review)*";

        const versionStr = `v${p.version || 1}`;
        const cameraStr = p.camera_ready_url ? "✅ Uploaded" : "⏳ Pending";
        const regStr = p.registration_completed ? "✅ Paid" : "⏳ Pending";

        let scheduleInfo = "";
        if (p.schedule) {
          scheduleInfo = `\n   • 📅 **Schedule**: Room ${p.schedule.room} | ${p.schedule.time} (${p.schedule.date})`;
        }

        return `**${idx + 1}. ${p.title}** (${versionStr})
   • ${statusBadge}
   • Track: ${p.track || "General"}
   • Camera-Ready: ${cameraStr} | Registration: ${regStr}${scheduleInfo}`;
      })
      .join("\n\n");

    return `### 📄 Your Paper Submissions (${userPapers.length})\n\n${papersSummary}\n\n💡 *Manage your revisions or view detailed reviewer feedback in **Tab 2 (My Submissions)**.*`;
  }

  // -------------------------------------------------------------------------
  // 10. SUBMISSION GUIDELINES & FORMATTING RULES
  // -------------------------------------------------------------------------
  if (
    q.includes("how to submit") ||
    q.includes("submission guideline") ||
    q.includes("submission guidelines") ||
    q.includes("submission process") ||
    q.includes("how do i submit") ||
    q.includes("steps to submit")
  ) {
    return `### 📝 How to Submit a Paper on ConfHub

Follow these 4 simple steps:
1. **Navigate to Tab 1 (Submit Paper)** in your Author Portal.
2. **Select Target Conference & Track**: Choose the relevant event and topic.
3. **Enter Paper Details**:
   - Manuscript Title
   - Structured Abstract (150–250 words)
   - Author & Co-Author affiliations
4. **Upload PDF**: Standard 2-column format (IEEE/ACM, max 10 pages). Double-blind anonymization is required for initial submission.
5. **Submit**: Click **Submit Manuscript**. You will receive an instant confirmation and version tag (v1).`;
  }

  if (
    q.includes("format") ||
    q.includes("template") ||
    q.includes("page limit") ||
    q.includes("pages") ||
    q.includes("latex") ||
    q.includes("ieee") ||
    q.includes("acm") ||
    q.includes("font") ||
    q.includes("word limit") ||
    q.includes("pdf")
  ) {
    return `### 📐 Manuscript Formatting & Style Requirements

• **Format**: Standard IEEE or ACM two-column conference format.
• **Page Limit**: Maximum **10 pages** (including all figures, tables, proofs, and references).
• **File Type**: Strictly **PDF** format (embedded fonts required).
• **Double-Blind Anonymization**:
  - Initial review manuscripts must **NOT** contain author names, affiliations, email addresses, or acknowledgments.
  - Refer to your prior work in the third person (e.g. *"Smith et al. previously demonstrated..."* rather than *"In our prior work..."*).
• **Camera-Ready Exceptions**: Only upon final acceptance (Tab 3) should author names and affiliations be restored.`;
  }

  // -------------------------------------------------------------------------
  // 11. REGISTRATION FEES & FINALIZING
  // -------------------------------------------------------------------------
  if (
    q.includes("fee") ||
    q.includes("fees") ||
    q.includes("registration cost") ||
    q.includes("how much is registration") ||
    q.includes("pricing") ||
    q.includes("student discount") ||
    q.includes("registration tier") ||
    q.includes("cost")
  ) {
    return `### 💳 ConfHub Conference Registration Tiers

Conference registration covers full session access, proceedings publication, and presentation certificates:

• **Student Registration**: **$150**
  *(Requires valid university student enrollment verification)*
• **Academic / Author Registration**: **$300**
  *(For university faculty, postdocs, and institutional researchers)*
• **Industry / Professional Registration**: **$500**
  *(For corporate practitioners, industrial labs, and commercial delegates)*

Registration payments are processed directly in **Tab 3 (Registration & Camera-Ready)**.`;
  }

  // -------------------------------------------------------------------------
  // 12. PROGRAM SCHEDULING & CONFLICT DETECTION
  // -------------------------------------------------------------------------
  if (
    q.includes("my schedule") ||
    q.includes("presentation time") ||
    q.includes("when do i present") ||
    q.includes("presentation slot") ||
    q.includes("assigned room") ||
    q.includes("timetable")
  ) {
    if (!currentUser?.uid) {
      return "Please sign in to check your presentation schedule.";
    }

    const scheduled = userPapers.filter((p) => p.schedule);

    if (scheduled.length > 0) {
      const scheduleLines = scheduled
        .map(
          (p, idx) =>
            `**${idx + 1}. ${p.title}**
   • 🏛 **Room**: ${p.schedule.room}
   • ⏰ **Time**: ${p.schedule.time}
   • 📅 **Date**: ${p.schedule.date}
   • 🏷 **Track**: ${p.schedule.track || p.track || "General Track"}`
        )
        .join("\n\n");

      return `### 📅 Your Confirmed Presentation Timetable\n\n${scheduleLines}\n\n💡 *View full session details and presentation slides in **Tab 4 (My Schedule)**.*`;
    }

    return `You do not have any scheduled presentation slots yet.

**How to get scheduled:**
1. Your paper must be **Accepted** by reviewers.
2. Complete both **Camera-Ready PDF upload** and **Registration payment** in Tab 3 (status becomes **Finalized**).
3. The conference organizer will then assign your paper to a room and time slot via the Program Scheduling dashboard.`;
  }

  if (
    q.includes("conflict detection") ||
    q.includes("conflict") ||
    q.includes("double booking") ||
    q.includes("speaker conflict") ||
    q.includes("room conflict") ||
    q.includes("scheduling logic") ||
    q.includes("program scheduling") ||
    q.includes("how does scheduling work")
  ) {
    return `### 🛡️ Program Scheduling & Conflict Detection

ConfHub includes an intelligent **Program Scheduling** engine in the Organizer Portal with real-time automated conflict validation:

• **Session Time Slots**:
  - Morning Keynote (09:00 – 10:30)
  - Technical Session A (11:00 – 12:30)
  - Afternoon Session (14:00 – 15:30)
  - Late Technical Session (16:00 – 17:30)

• **Conflict Detection Rules**:
  1. **Room Concurrency Validation**: Prevents any room from being double-booked by two sessions or papers at the same date and time slot.
  2. **Speaker Concurrency Validation**: Prevents any author or speaker from being scheduled to present in two separate rooms simultaneously.

When an Organizer saves a session, ConfHub validates the timetable against all existing bookings to prevent overlaps.`;
  }

  // -------------------------------------------------------------------------
  // 13. CERTIFICATES
  // -------------------------------------------------------------------------
  if (
    q.includes("certificate") ||
    q.includes("cert") ||
    q.includes("download cert") ||
    q.includes("when can i download") ||
    q.includes("attendance certificate") ||
    q.includes("presentation certificate")
  ) {
    return `### 📜 Presentation & Attendance Certificates (Tab 5)

• **Unlock Condition**: Official certificates unlock **strictly after the conference end date has passed**.
• **Verification**: Generated PDF certificates feature the official conference seal, paper title, author name, track, and date.
• **How to Download**:
  1. Navigate to **Tab 5 (Certificates & Documents)**.
  2. If the conference has ended and your paper was accepted/presented, click **Generate & Download PDF Certificate**.
  3. The PDF downloads directly to your device.

*(Example: For ACM Future Computing Conference FC 2025 whose end date has elapsed, certificate generation is immediately unlocked in Tab 5!)*`;
  }

  // -------------------------------------------------------------------------
  // 14. DYNAMIC GENERAL KNOWLEDGE LOOKUP (WIKIPEDIA API FALLBACK)
  // For open questions like "what is gravity", "who wrote Hamlet", "distance to moon", etc.
  // -------------------------------------------------------------------------
  const generalWikiResult = await fetchGeneralKnowledge(trimmed);
  if (generalWikiResult) {
    return generalWikiResult;
  }

  // -------------------------------------------------------------------------
  // 15. OPEN GENERAL-PURPOSE FALLBACK (NO REFUSAL / NO CONFERENCE REDIRECT)
  // -------------------------------------------------------------------------
  return `I understand you are asking about **"${trimmed}"**.

While I don't have an immediate summary for that specific query in my local cache, I am your general-purpose AI assistant! You can ask me any question—whether it's about science, geography, coding, mathematics, or academic topics.

If you have a question about this Conference Management System (such as active conferences, paper submissions, review rubrics, registration, or scheduling), I can also answer that with complete platform detail.

How would you like to proceed?`;
};

/**
 * Main conversational dispatcher
 * No keyword filtering or classifier blocks general questions before the API call.
 */
export const askGeminiAssistant = async (
  userMessage,
  currentUser = null,
  userProfile = null,
  chatHistory = []
) => {
  if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
    return "Please enter a valid question or inquiry.";
  }

  const trimmed = userMessage.trim();

  // Try Remote Gemini LLM first if configured (passes ANY question directly without restriction)
  if (isGeminiConfigured()) {
    try {
      const platformContext = getPlatformContext(currentUser, userProfile);
      const llmReply = await fetchGeminiResponse(trimmed, platformContext, chatHistory);
      if (llmReply && llmReply.length > 5) {
        return llmReply;
      }
    } catch (err) {
      console.warn("Gemini remote call fell back to local engine:", err);
    }
  }

  // Built-in ConfHub Knowledge & Reasoning Engine
  return await generateAcademicEngineResponse(trimmed, currentUser, userProfile);
};
