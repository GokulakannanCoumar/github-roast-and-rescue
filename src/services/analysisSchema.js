// src/services/analysisSchema.js - Shared contract for Gemini output and server-side validation

const ANALYSIS_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    archetype: { type: 'string' },
    grade: { type: 'string', enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'] },
    recruiterScore: { type: 'number', minimum: 1, maximum: 10 },
    oneLiner: { type: 'string' },
    roast: {
      type: 'object',
      properties: {
        repoSins: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 },
        commitConfessions: { type: 'string' },
        profileIllusions: { type: 'string' }
      },
      required: ['repoSins', 'commitConfessions', 'profileIllusions']
    },
    recruiterRealityCheck: {
      type: 'object',
      properties: {
        thirtySecondScan: { type: 'string' },
        verdict: { type: 'string' },
        redFlags: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 5 },
        greenFlags: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 }
      },
      required: ['thirtySecondScan', 'verdict', 'redFlags', 'greenFlags']
    },
    rescue: {
      type: 'object',
      properties: {
        pinRepos: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
        archiveRepos: { type: 'array', items: { type: 'string' }, maxItems: 5 },
        upgradePlan: {
          type: 'object',
          properties: {
            targetRepo: { type: 'string' },
            rationale: { type: 'string' },
            actionSteps: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 4 }
          },
          required: ['targetRepo', 'rationale', 'actionSteps']
        },
        optimizedBio: { type: 'string' },
        readmeTemplate: { type: 'string' }
      },
      required: ['pinRepos', 'archiveRepos', 'upgradePlan', 'optimizedBio', 'readmeTemplate']
    }
  },
  required: [
    'archetype',
    'grade',
    'recruiterScore',
    'oneLiner',
    'roast',
    'recruiterRealityCheck',
    'rescue'
  ]
};

function validateAnalysis(analysis, profileData = null) {
  const errors = [];

  if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) {
    return { valid: false, errors: ['analysis must be an object'] };
  }

  const requiredStrings = [
    'archetype',
    'grade',
    'oneLiner',
    'roast.commitConfessions',
    'roast.profileIllusions',
    'recruiterRealityCheck.thirtySecondScan',
    'recruiterRealityCheck.verdict',
    'rescue.upgradePlan.targetRepo',
    'rescue.upgradePlan.rationale',
    'rescue.optimizedBio',
    'rescue.readmeTemplate'
  ];

  for (const path of requiredStrings) {
    const value = path.split('.').reduce((current, key) => current?.[key], analysis);
    if (typeof value !== 'string' || !value.trim()) {
      errors.push(path + ' must be a non-empty string');
    }
  }

  if (!Array.isArray(analysis.roast?.repoSins) || analysis.roast.repoSins.length < 2) {
    errors.push('roast.repoSins must contain at least 2 observations');
  }

  if (!Number.isFinite(analysis.recruiterScore) || analysis.recruiterScore < 1 || analysis.recruiterScore > 10) {
    errors.push('recruiterScore must be a number between 1 and 10');
  }

  if (!Array.isArray(analysis.recruiterRealityCheck?.redFlags) || analysis.recruiterRealityCheck.redFlags.length < 2) {
    errors.push('recruiterRealityCheck.redFlags must contain at least 2 items');
  }

  if (!Array.isArray(analysis.recruiterRealityCheck?.greenFlags) || analysis.recruiterRealityCheck.greenFlags.length < 1) {
    errors.push('recruiterRealityCheck.greenFlags must contain at least 1 item');
  }

  if (!Array.isArray(analysis.rescue?.pinRepos) || analysis.rescue.pinRepos.length < 1 || analysis.rescue.pinRepos.length > 3) {
    errors.push('rescue.pinRepos must contain 1 to 3 items');
  }

  if (!Array.isArray(analysis.rescue?.archiveRepos) || analysis.rescue.archiveRepos.length > 5) {
    errors.push('rescue.archiveRepos must contain at most 5 items');
  }

  if (!Array.isArray(analysis.rescue?.upgradePlan?.actionSteps) || analysis.rescue.upgradePlan.actionSteps.length < 3) {
    errors.push('rescue.upgradePlan.actionSteps must contain at least 3 items');
  }

  if (profileData?.repos && Array.isArray(profileData.repos)) {
    const knownRepos = new Set(profileData.repos.map(repo => repo.name).filter(Boolean));

    for (const repo of [...(analysis.rescue.pinRepos || []), ...(analysis.rescue.archiveRepos || [])]) {
      if (!knownRepos.has(repo)) errors.push('rescue references unknown repository: ' + repo);
    }

    const targetRepo = analysis.rescue?.upgradePlan?.targetRepo;
    if (targetRepo && !knownRepos.has(targetRepo)) {
      errors.push('rescue upgradePlan.targetRepo must reference a supplied repository');
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  ANALYSIS_RESPONSE_SCHEMA,
  validateAnalysis
};
