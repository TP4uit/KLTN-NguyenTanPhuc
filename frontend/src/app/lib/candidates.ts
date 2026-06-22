export type CandidateMetadata = {
  id: string;
  candidateId: number;
  name: string;
  title: string;
  image: string;
  description: string;
  color: string;
};

export const CANDIDATES: CandidateMetadata[] = [
  {
    id: "c1",
    candidateId: 1,
    name: "Elena Rostova",
    title: "DeFi Strategist",
    image:
      "https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHdvbWFufGVufDF8fHx8MTc3NTkyNTMyOHww&ixlib=rb-4.1.0&q=80&w=1080",
    description:
      "Focusing on protocol sustainability and long-term liquidity incentives for governance token holders.",
    color: "#8b5cf6",
  },
  {
    id: "c2",
    candidateId: 2,
    name: "Marcus Chen",
    title: "Core Developer",
    image:
      "https://images.unsplash.com/photo-1652471943570-f3590a4e52ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMG1hbnxlbnwxfHx8fDE3NzYwNDM2NzR8MA&ixlib=rb-4.1.0&q=80&w=1080",
    description:
      "Advocating for zk-SNARKs integration and gas optimization across all network smart contracts.",
    color: "#10b981",
  },
  {
    id: "c3",
    candidateId: 3,
    name: "David Okafor",
    title: "Community Lead",
    image:
      "https://images.unsplash.com/photo-1560073743-0a45c01b68c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWlsaW5nJTIwcHJvZmVzc2lvbmFsJTIwbWFufGVufDF8fHx8MTc3NjA0MzY3NHww&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Dedicated to expanding educational resources and fostering a more inclusive Web3 ecosystem.",
    color: "#3b82f6",
  },
  {
    id: "c4",
    candidateId: 4,
    name: "Sarah Jenkins",
    title: "Security Researcher",
    image:
      "https://images.unsplash.com/photo-1623594675959-02360202d4d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWlsaW5nJTIwcHJvZmVzc2lvbmFsJTIwd29tYW58ZW58MXx8fHwxNzc2MDQzNjc0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Prioritizing comprehensive audits and implementing proactive threat-monitoring frameworks.",
    color: "#f59e0b",
  },
];
