// arXiv category code → human-readable label.
// Source: https://arxiv.org/category_taxonomy

export const CATEGORY_LABELS: Record<string, string> = {
  // CS
  'cs.AI': 'Artificial Intelligence',
  'cs.AR': 'Hardware Architecture',
  'cs.CC': 'Computational Complexity',
  'cs.CE': 'Computational Engineering',
  'cs.CG': 'Computational Geometry',
  'cs.CL': 'Computation and Language',
  'cs.CR': 'Cryptography and Security',
  'cs.CV': 'Computer Vision',
  'cs.CY': 'Computers and Society',
  'cs.DB': 'Databases',
  'cs.DC': 'Distributed Computing',
  'cs.DL': 'Digital Libraries',
  'cs.DM': 'Discrete Mathematics',
  'cs.DS': 'Data Structures and Algorithms',
  'cs.ET': 'Emerging Technologies',
  'cs.FL': 'Formal Languages',
  'cs.GR': 'Graphics',
  'cs.GT': 'Game Theory',
  'cs.HC': 'Human-Computer Interaction',
  'cs.IR': 'Information Retrieval',
  'cs.IT': 'Information Theory',
  'cs.LG': 'Machine Learning',
  'cs.LO': 'Logic in Computer Science',
  'cs.MA': 'Multiagent Systems',
  'cs.MM': 'Multimedia',
  'cs.MS': 'Mathematical Software',
  'cs.NA': 'Numerical Analysis',
  'cs.NE': 'Neural and Evolutionary Computing',
  'cs.NI': 'Networking',
  'cs.OS': 'Operating Systems',
  'cs.PF': 'Performance',
  'cs.PL': 'Programming Languages',
  'cs.RO': 'Robotics',
  'cs.SC': 'Symbolic Computation',
  'cs.SD': 'Sound',
  'cs.SE': 'Software Engineering',
  'cs.SI': 'Social and Information Networks',
  'cs.SY': 'Systems and Control',

  // EESS
  'eess.AS': 'Audio and Speech Processing',
  'eess.IV': 'Image and Video Processing',
  'eess.SP': 'Signal Processing',
  'eess.SY': 'Systems and Control',

  // Stats
  'stat.ML': 'Statistics: Machine Learning',
  'stat.AP': 'Statistics: Applications',
  'stat.ME': 'Statistics: Methodology',
  'stat.TH': 'Statistics: Theory',

  // Quant Finance
  'q-fin.CP': 'Computational Finance',
  'q-fin.PM': 'Portfolio Management',
  'q-fin.PR': 'Pricing of Securities',
  'q-fin.RM': 'Risk Management',
  'q-fin.ST': 'Statistical Finance',
  'q-fin.TR': 'Trading and Market Microstructure',
  'q-fin.MF': 'Mathematical Finance',
  'q-fin.GN': 'General Finance',
  'q-fin.EC': 'Economics',

  // Econ
  'econ.EM': 'Econometrics',
  'econ.TH': 'Theoretical Economics',
  'econ.GN': 'General Economics',

  // Physics (most common)
  'physics.optics': 'Optics',
  'physics.app-ph': 'Applied Physics',
  'physics.comp-ph': 'Computational Physics',
  'physics.soc-ph': 'Physics and Society',
  'physics.med-ph': 'Medical Physics',

  // Quant Bio
  'q-bio.QM': 'Quantitative Methods',
  'q-bio.NC': 'Neurons and Cognition',
  'q-bio.BM': 'Biomolecules',
  'q-bio.GN': 'Genomics',

  // Other heavy hitters
  'quant-ph': 'Quantum Physics',
  'gr-qc': 'General Relativity and Quantum Cosmology',
  'hep-th': 'High Energy Physics — Theory',
  'cond-mat.mes-hall': 'Mesoscale and Nanoscale Physics',
  'cond-mat.mtrl-sci': 'Materials Science',
};

export function labelFor(code: string): string {
  return CATEGORY_LABELS[code] || code;
}

export function labelWithCode(code: string): string {
  const label = CATEGORY_LABELS[code];
  return label ? `${label} (${code})` : code;
}
