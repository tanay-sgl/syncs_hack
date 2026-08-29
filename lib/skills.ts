const SKILL_CLUSTERS: string[][] = [
  ["react", "vue", "angular", "svelte", "frontend", "next.js", "nuxt"],
  ["node", "express", "fastify", "backend", "server-side", "nest.js"],
  ["python", "django", "flask", "fastapi"],
  ["machine learning", "ml", "deep learning", "ai", "data science", "pytorch", "tensorflow"],
  ["typescript", "javascript", "js", "ts"],
  ["java", "kotlin", "spring", "spring boot"],
  ["go", "golang"],
  ["rust"],
  ["ruby", "rails", "ruby on rails"],
  ["sql", "postgres", "postgresql", "mysql", "database", "mongodb", "redis"],
  ["aws", "gcp", "azure", "cloud", "infrastructure"],
  ["docker", "kubernetes", "k8s", "devops", "ci/cd"],
  ["ios", "swift", "swiftui", "mobile", "android", "react native", "flutter"],
  ["design", "ui", "ux", "ui/ux", "figma", "css", "tailwind"],
  ["full-stack", "fullstack", "full stack"],
  ["data engineering", "etl", "spark", "airflow", "data pipeline"],
  ["security", "cybersecurity", "infosec", "pentesting"],
  ["blockchain", "web3", "solidity", "smart contracts"],
];

export function skillSimilarity(a: string, b: string): number {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();

  if (la === lb) return 1.0;
  if (la.includes(lb) || lb.includes(la)) return 0.85;

  for (const cluster of SKILL_CLUSTERS) {
    const normCluster = cluster.map((s) => s.toLowerCase());
    const aIdx = normCluster.indexOf(la);
    const bIdx = normCluster.indexOf(lb);
    if (aIdx !== -1 && bIdx !== -1) {
      return 0.7;
    }
  }

  return 0;
}

export function bestSkillMatch(
  userSkills: string[],
  targetSkill: string
): { skill: string; similarity: number } {
  let best = { skill: "", similarity: 0 };
  for (const us of userSkills) {
    const sim = skillSimilarity(us, targetSkill);
    if (sim > best.similarity) {
      best = { skill: us, similarity: sim };
    }
  }
  return best;
}
