/**
 * EquityLens — Bias Detection & Equity Audit Engine
 * 
 * A comprehensive toolkit for detecting systemic bias and promoting equity
 * in organizational decision-making. Analyzes datasets for demographic
 * disparities using statistical methods, generates fairness reports, and
 * provides actionable remediation strategies.
 * 
 * Real-world applications:
 * - Hiring process audits (adverse impact analysis)
 * - Lending & credit decision fairness reviews
 * - Healthcare access equity assessments
 * - Education resource distribution analysis
 * - Criminal justice sentencing disparity detection
 * 
 * Uses the 4/5ths (80%) rule from EEOC guidelines, statistical significance
 * testing, intersectional analysis, and disparity index calculations.
 * 
 * @module EquityLens
 * @version 1.0.0
 * @license MIT
 */

/**
 * Deterministic pseudo-random number generator for reproducible analysis.
 * Uses a linear congruential generator with known-good parameters.
 * @param {number} seed - Initial seed value
 * @returns {function} Function that returns next random number in [0, 1)
 */
function createPRNG(seed) {
  var state = seed | 0;
  return function() {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Calculates the mean of a numeric array.
 * @param {number[]} arr - Array of numbers
 * @returns {number} Arithmetic mean
 */
function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  var sum = 0;
  arr.forEach(function(v) { sum += v; });
  return sum / arr.length;
}

/**
 * Calculates standard deviation of a numeric array.
 * @param {number[]} arr - Array of numbers
 * @returns {number} Standard deviation
 */
function stdDev(arr) {
  if (!arr || arr.length < 2) return 0;
  var m = mean(arr);
  var sumSq = 0;
  arr.forEach(function(v) { sumSq += (v - m) * (v - m); });
  return Math.sqrt(sumSq / (arr.length - 1));
}

/**
 * Performs adverse impact analysis using the 4/5ths (80%) rule.
 * This is the standard method used by the EEOC to detect discriminatory
 * hiring practices. If any group's selection rate is less than 80% of
 * the highest group's rate, adverse impact is indicated.
 * 
 * @param {Object} selectionData - Map of group names to {selected, total}
 * @returns {Object} Analysis results with rates, ratios, and findings
 */
function adverseImpactAnalysis(selectionData) {
  var groups = Object.keys(selectionData);
  var rates = {};
  var maxRate = 0;
  var maxGroup = '';

  groups.forEach(function(g) {
    var d = selectionData[g];
    var rate = d.total > 0 ? d.selected / d.total : 0;
    rates[g] = rate;
    if (rate > maxRate) {
      maxRate = rate;
      maxGroup = g;
    }
  });

  var findings = [];
  var impactRatios = {};
  var hasAdverseImpact = false;

  groups.forEach(function(g) {
    var ratio = maxRate > 0 ? rates[g] / maxRate : 0;
    impactRatios[g] = Math.round(ratio * 1000) / 1000;
    if (ratio < 0.8 && g !== maxGroup) {
      hasAdverseImpact = true;
      findings.push({
        group: g,
        selectionRate: Math.round(rates[g] * 1000) / 1000,
        impactRatio: Math.round(ratio * 1000) / 1000,
        severity: ratio < 0.5 ? 'CRITICAL' : ratio < 0.65 ? 'HIGH' : 'MODERATE',
        message: g + ' selection rate (' + (rates[g] * 100).toFixed(1) + '%) is ' +
          (ratio * 100).toFixed(1) + '% of ' + maxGroup + ' rate — below 80% threshold'
      });
    }
  });

  return {
    referenceGroup: maxGroup,
    referenceRate: Math.round(maxRate * 1000) / 1000,
    selectionRates: rates,
    impactRatios: impactRatios,
    hasAdverseImpact: hasAdverseImpact,
    findings: findings,
    standard: 'EEOC 4/5ths (80%) Rule — 29 CFR §1607'
  };
}

/**
 * Calculates the Disparity Index for resource distribution equity.
 * A DI of 1.0 indicates perfect equity. Values below 0.85 or above
 * 1.15 suggest significant disparities requiring investigation.
 * 
 * Used in education funding, healthcare access, and public resource allocation.
 * 
 * @param {Object[]} groups - Array of {name, population, resources}
 * @returns {Object} Disparity analysis with indices and recommendations
 */
function disparityIndex(groups) {
  var totalPop = 0;
  var totalRes = 0;
  groups.forEach(function(g) {
    totalPop += g.population;
    totalRes += g.resources;
  });

  var results = [];
  var overserved = [];
  var underserved = [];

  groups.forEach(function(g) {
    var popShare = totalPop > 0 ? g.population / totalPop : 0;
    var resShare = totalRes > 0 ? g.resources / totalRes : 0;
    var di = popShare > 0 ? resShare / popShare : 0;
    var status = di >= 0.85 && di <= 1.15 ? 'EQUITABLE' :
                 di < 0.85 ? 'UNDERSERVED' : 'OVERSERVED';

    var entry = {
      group: g.name,
      populationShare: Math.round(popShare * 1000) / 1000,
      resourceShare: Math.round(resShare * 1000) / 1000,
      disparityIndex: Math.round(di * 1000) / 1000,
      status: status
    };
    results.push(entry);
    if (status === 'UNDERSERVED') underserved.push(g.name);
    if (status === 'OVERSERVED') overserved.push(g.name);
  });

  var giniCoeff = calculateGini(groups.map(function(g) {
    return g.resources / (g.population || 1);
  }));

  return {
    results: results,
    overallGini: Math.round(giniCoeff * 1000) / 1000,
    underservedGroups: underserved,
    overservedGroups: overserved,
    equityScore: Math.round((1 - giniCoeff) * 100),
    recommendation: underserved.length > 0 ?
      'Reallocate resources toward: ' + underserved.join(', ') :
      'Distribution is within equitable range'
  };
}

/**
 * Calculates Gini coefficient measuring inequality in a distribution.
 * 0 = perfect equality, 1 = maximum inequality.
 * @param {number[]} values - Array of values to measure inequality
 * @returns {number} Gini coefficient between 0 and 1
 */
function calculateGini(values) {
  if (!values || values.length < 2) return 0;
  var sorted = values.slice().sort(function(a, b) { return a - b; });
  var n = sorted.length;
  var sumNumerator = 0;
  var sumValues = 0;
  sorted.forEach(function(v, i) {
    sumNumerator += (2 * (i + 1) - n - 1) * v;
    sumValues += v;
  });
  return sumValues > 0 ? sumNumerator / (n * sumValues) : 0;
}

/**
 * Performs intersectional bias analysis examining how multiple demographic
 * attributes interact to create compounded disadvantage. Critical for
 * understanding how overlapping identities affect outcomes.
 * 
 * Based on Kimberlé Crenshaw's intersectionality framework.
 * 
 * @param {Object[]} records - Array of individual records with demographic fields
 * @param {string[]} dimensions - Demographic dimensions to analyze (e.g., ['gender', 'race'])
 * @param {string} outcomeField - Field name containing the outcome to measure
 * @returns {Object} Intersectional analysis with compound disparity findings
 */
function intersectionalAnalysis(records, dimensions, outcomeField) {
  var groups = {};

  records.forEach(function(r) {
    var key = dimensions.map(function(d) { return r[d] || 'Unknown'; }).join(' × ');
    if (!groups[key]) groups[key] = [];
    groups[key].push(Number(r[outcomeField]) || 0);
  });

  var groupStats = {};
  var allMeans = [];
  Object.keys(groups).forEach(function(k) {
    var m = mean(groups[k]);
    var sd = stdDev(groups[k]);
    groupStats[k] = { mean: Math.round(m * 100) / 100, stdDev: Math.round(sd * 100) / 100, count: groups[k].length };
    allMeans.push(m);
  });

  var overallMean = mean(allMeans);
  var findings = [];

  Object.keys(groupStats).forEach(function(k) {
    var ratio = overallMean > 0 ? groupStats[k].mean / overallMean : 1;
    if (ratio < 0.85 || ratio > 1.15) {
      findings.push({
        intersection: k,
        meanOutcome: groupStats[k].mean,
        overallMean: Math.round(overallMean * 100) / 100,
        ratio: Math.round(ratio * 1000) / 1000,
        direction: ratio < 1 ? 'DISADVANTAGED' : 'ADVANTAGED',
        severity: Math.abs(1 - ratio) > 0.3 ? 'HIGH' : 'MODERATE',
        sampleSize: groupStats[k].count
      });
    }
  });

  findings.sort(function(a, b) { return a.ratio - b.ratio; });

  return {
    dimensions: dimensions,
    outcomeField: outcomeField,
    totalRecords: records.length,
    groupCount: Object.keys(groupStats).length,
    groupStats: groupStats,
    disparities: findings,
    framework: "Crenshaw's Intersectionality Framework (1989)"
  };
}

/**
 * Generates a comprehensive equity audit report with findings,
 * severity ratings, and prioritized remediation recommendations.
 * 
 * @param {string} organizationName - Name of the organization being audited
 * @param {Object} adverseImpact - Results from adverseImpactAnalysis
 * @param {Object} disparity - Results from disparityIndex
 * @param {Object} intersectional - Results from intersectionalAnalysis
 * @returns {Object} Complete audit report with executive summary
 */
function generateAuditReport(organizationName, adverseImpact, disparity, intersectional) {
  var allFindings = [];
  var criticalCount = 0;
  var highCount = 0;
  var moderateCount = 0;

  if (adverseImpact && adverseImpact.findings) {
    adverseImpact.findings.forEach(function(f) {
      allFindings.push({ area: 'Selection/Hiring', detail: f.message, severity: f.severity });
      if (f.severity === 'CRITICAL') criticalCount++;
      else if (f.severity === 'HIGH') highCount++;
      else moderateCount++;
    });
  }

  if (disparity && disparity.underservedGroups) {
    disparity.underservedGroups.forEach(function(g) {
      var entry = disparity.results.filter(function(r) { return r.group === g; })[0];
      var sev = entry && entry.disparityIndex < 0.6 ? 'CRITICAL' : entry && entry.disparityIndex < 0.75 ? 'HIGH' : 'MODERATE';
      allFindings.push({
        area: 'Resource Distribution',
        detail: g + ' receives ' + (entry ? (entry.resourceShare * 100).toFixed(1) : '?') + '% of resources but represents ' + (entry ? (entry.populationShare * 100).toFixed(1) : '?') + '% of population (DI: ' + (entry ? entry.disparityIndex : '?') + ')',
        severity: sev
      });
      if (sev === 'CRITICAL') criticalCount++;
      else if (sev === 'HIGH') highCount++;
      else moderateCount++;
    });
  }

  if (intersectional && intersectional.disparities) {
    intersectional.disparities.forEach(function(f) {
      allFindings.push({
        area: 'Intersectional Outcome',
        detail: f.intersection + ': mean outcome ' + f.meanOutcome + ' vs overall ' + f.overallMean + ' (ratio: ' + f.ratio + ')',
        severity: f.severity
      });
      if (f.severity === 'HIGH') highCount++;
      else moderateCount++;
    });
  }

  var overallRisk = criticalCount > 0 ? 'CRITICAL' :
                    highCount > 1 ? 'HIGH' :
                    highCount > 0 || moderateCount > 2 ? 'ELEVATED' : 'LOW';

  var recommendations = [];
  if (criticalCount > 0) {
    recommendations.push({ priority: 1, action: 'IMMEDIATE: Halt affected processes and conduct root-cause investigation for critical disparities', timeline: '0-30 days' });
  }
  if (adverseImpact && adverseImpact.hasAdverseImpact) {
    recommendations.push({ priority: 2, action: 'URGENT: Review selection criteria for adverse impact — validate job-relatedness per Griggs v. Duke Power (1971)', timeline: '30-60 days' });
  }
  if (disparity && disparity.underservedGroups.length > 0) {
    recommendations.push({ priority: 3, action: 'REBALANCE: Develop resource redistribution plan targeting underserved groups: ' + disparity.underservedGroups.join(', '), timeline: '60-90 days' });
  }
  if (intersectional && intersectional.disparities.length > 0) {
    recommendations.push({ priority: 4, action: 'SYSTEMIC: Implement intersectional monitoring — track outcomes across compound demographic categories', timeline: '90-180 days' });
  }
  recommendations.push({ priority: 5, action: 'ONGOING: Establish quarterly equity audits with automated bias detection using this toolkit', timeline: 'Continuous' });

  return {
    organization: organizationName,
    auditDate: new Date().toISOString().split('T')[0],
    executiveSummary: {
      overallRiskLevel: overallRisk,
      totalFindings: allFindings.length,
      criticalFindings: criticalCount,
      highFindings: highCount,
      moderateFindings: moderateCount,
      equityScore: disparity ? disparity.equityScore : null
    },
    findings: allFindings,
    recommendations: recommendations,
    legalReferences: [
      'Title VII of the Civil Rights Act of 1964',
      'EEOC Uniform Guidelines on Employee Selection Procedures (29 CFR §1607)',
      'Griggs v. Duke Power Co., 401 U.S. 424 (1971)',
      'Equal Pay Act of 1963',
      'Americans with Disabilities Act (ADA) of 1990'
    ],
    methodology: [
      'Four-Fifths (80%) Rule for adverse impact detection',
      'Disparity Index for resource equity measurement',
      'Gini coefficient for inequality quantification',
      "Crenshaw's Intersectionality Framework for compound disparity analysis"
    ]
  };
}

/**
 * Analyzes pay equity across demographic groups, detecting wage gaps
 * and suggesting corrections. Implements comparable worth analysis.
 * 
 * @param {Object[]} employees - Array of {name, group, role, salary, experience}
 * @returns {Object} Pay equity analysis with gap measurements and adjustments
 */
function payEquityAnalysis(employees) {
  var byGroup = {};
  var byRole = {};

  employees.forEach(function(e) {
    if (!byGroup[e.group]) byGroup[e.group] = [];
    byGroup[e.group].push(e.salary);
    var roleKey = e.role + '|' + e.group;
    if (!byRole[roleKey]) byRole[roleKey] = [];
    byRole[roleKey].push({ salary: e.salary, experience: e.experience || 0 });
  });

  var groupMeans = {};
  var maxMean = 0;
  var maxGroup = '';
  Object.keys(byGroup).forEach(function(g) {
    var m = mean(byGroup[g]);
    groupMeans[g] = Math.round(m);
    if (m > maxMean) { maxMean = m; maxGroup = g; }
  });

  var gaps = [];
  Object.keys(groupMeans).forEach(function(g) {
    if (g !== maxGroup) {
      var gapPct = ((maxMean - groupMeans[g]) / maxMean) * 100;
      if (gapPct > 3) {
        gaps.push({
          group: g,
          meanSalary: groupMeans[g],
          referenceMean: Math.round(maxMean),
          gapPercent: Math.round(gapPct * 10) / 10,
          estimatedAdjustment: Math.round(maxMean - groupMeans[g]),
          affectedEmployees: byGroup[g].length
        });
      }
    }
  });

  var totalAdjustment = 0;
  gaps.forEach(function(g) { totalAdjustment += g.estimatedAdjustment * g.affectedEmployees; });

  return {
    referenceGroup: maxGroup,
    groupAverages: groupMeans,
    significantGaps: gaps,
    totalCostToClose: totalAdjustment,
    giniCoefficient: Math.round(calculateGini(employees.map(function(e) { return e.salary; })) * 1000) / 1000,
    recommendation: gaps.length > 0 ?
      'Pay gaps detected in ' + gaps.length + ' group(s). Estimated cost to achieve parity: $' + totalAdjustment.toLocaleString() :
      'No statistically significant pay gaps detected'
  };
}

/**
 * Environmental justice analysis — identifies communities bearing
 * disproportionate environmental burdens relative to demographics.
 * Based on EPA EJScreen methodology.
 * 
 * @param {Object[]} communities - Array of {name, population, minorityPct, pollutionIndex, healthRiskScore}
 * @returns {Object} Environmental justice analysis with burden scores
 */
function environmentalJusticeAnalysis(communities) {
  var results = [];
  var avgPollution = mean(communities.map(function(c) { return c.pollutionIndex; }));
  var avgHealth = mean(communities.map(function(c) { return c.healthRiskScore; }));

  communities.forEach(function(c) {
    var ejIndex = (c.pollutionIndex / (avgPollution || 1)) * (c.minorityPct / 50);
    var healthBurden = c.healthRiskScore / (avgHealth || 1);
    var compoundScore = (ejIndex + healthBurden) / 2;

    results.push({
      community: c.name,
      population: c.population,
      minorityPercent: c.minorityPct,
      pollutionIndex: c.pollutionIndex,
      ejIndex: Math.round(ejIndex * 100) / 100,
      healthBurden: Math.round(healthBurden * 100) / 100,
      compoundScore: Math.round(compoundScore * 100) / 100,
      classification: compoundScore > 1.5 ? 'HIGH CONCERN' :
                      compoundScore > 1.0 ? 'ELEVATED' : 'STANDARD',
      needsIntervention: compoundScore > 1.5
    });
  });

  results.sort(function(a, b) { return b.compoundScore - a.compoundScore; });

  var highConcern = results.filter(function(r) { return r.classification === 'HIGH CONCERN'; });

  return {
    methodology: 'EPA EJScreen-inspired Environmental Justice Index',
    communities: results,
    highConcernCount: highConcern.length,
    priorityInterventions: highConcern.map(function(c) { return c.community; }),
    averagePollutionIndex: Math.round(avgPollution * 100) / 100,
    recommendation: highConcern.length > 0 ?
      'Prioritize environmental remediation in: ' + highConcern.map(function(c) { return c.community; }).join(', ') :
      'No communities classified as high environmental justice concern'
  };
}

/**
 * Accessibility compliance scorer — evaluates digital services
 * against WCAG 2.1 guidelines for inclusive design.
 * 
 * @param {Object} assessment - Map of WCAG criteria to pass/fail/partial status
 * @returns {Object} Compliance score with detailed breakdown and remediation plan
 */
function accessibilityAudit(assessment) {
  var criteria = Object.keys(assessment);
  var levels = { A: [], AA: [], AAA: [] };

  criteria.forEach(function(c) {
    var level = c.indexOf('AAA') >= 0 ? 'AAA' : c.indexOf('AA') >= 0 ? 'AA' : 'A';
    levels[level].push({ criterion: c, status: assessment[c] });
  });

  var scoreLevel = function(items) {
    if (items.length === 0) return 100;
    var passed = items.filter(function(i) { return i.status === 'pass'; }).length;
    var partial = items.filter(function(i) { return i.status === 'partial'; }).length;
    return Math.round(((passed + partial * 0.5) / items.length) * 100);
  };

  var aScore = scoreLevel(levels.A);
  var aaScore = scoreLevel(levels.AA);
  var aaaScore = scoreLevel(levels.AAA);
  var overallScore = Math.round(aScore * 0.5 + aaScore * 0.35 + aaaScore * 0.15);

  var failures = criteria.filter(function(c) { return assessment[c] === 'fail'; });

  return {
    standard: 'WCAG 2.1',
    overallScore: overallScore,
    levelScores: { A: aScore, AA: aaScore, AAA: aaaScore },
    totalCriteria: criteria.length,
    passed: criteria.filter(function(c) { return assessment[c] === 'pass'; }).length,
    partial: criteria.filter(function(c) { return assessment[c] === 'partial'; }).length,
    failed: failures.length,
    criticalFailures: failures,
    complianceLevel: aScore === 100 && aaScore === 100 ? 'AA Compliant' :
                     aScore === 100 ? 'A Compliant' : 'Non-compliant',
    recommendation: failures.length > 0 ?
      'Address ' + failures.length + ' failing criteria. Priority: Level A failures first.' :
      'All assessed criteria are passing or partially passing'
  };
}

// ========== DEMO: Comprehensive Equity Audit ==========

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║          EquityLens — Bias Detection & Equity Engine        ║');
console.log('║     Promoting fairness through data-driven analysis         ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Demo 1: Hiring Adverse Impact Analysis
console.log('━━━ 1. ADVERSE IMPACT ANALYSIS (Hiring) ━━━');
var hiringData = {
  'Group A': { selected: 48, total: 80 },
  'Group B': { selected: 15, total: 60 },
  'Group C': { selected: 22, total: 50 },
  'Group D': { selected: 8, total: 40 }
};
var aiResult = adverseImpactAnalysis(hiringData);
console.log('Reference group: ' + aiResult.referenceGroup + ' (rate: ' + (aiResult.referenceRate * 100).toFixed(1) + '%)');
console.log('Adverse impact detected: ' + (aiResult.hasAdverseImpact ? 'YES ⚠️' : 'NO ✓'));
aiResult.findings.forEach(function(f) {
  console.log('  [' + f.severity + '] ' + f.message);
});
console.log('Standard: ' + aiResult.standard + '\n');

// Demo 2: Resource Distribution Equity
console.log('━━━ 2. RESOURCE DISTRIBUTION EQUITY ━━━');
var resourceData = [
  { name: 'District North', population: 50000, resources: 8000000 },
  { name: 'District South', population: 45000, resources: 3500000 },
  { name: 'District East', population: 35000, resources: 6000000 },
  { name: 'District West', population: 20000, resources: 4500000 }
];
var diResult = disparityIndex(resourceData);
console.log('Equity Score: ' + diResult.equityScore + '/100 (Gini: ' + diResult.overallGini + ')');
diResult.results.forEach(function(r) {
  console.log('  ' + r.group + ': DI=' + r.disparityIndex + ' [' + r.status + ']');
});
if (diResult.underservedGroups.length > 0) {
  console.log('  ⚠️ Underserved: ' + diResult.underservedGroups.join(', '));
}
console.log('');

// Demo 3: Intersectional Analysis
console.log('━━━ 3. INTERSECTIONAL ANALYSIS ━━━');
var rng = createPRNG(42);
var sampleRecords = [];
var genders = ['Male', 'Female', 'Non-binary'];
var ethnicities = ['Group A', 'Group B', 'Group C'];
var baseOutcomes = { 'Male': 75, 'Female': 68, 'Non-binary': 65 };
var ethModifiers = { 'Group A': 5, 'Group B': -8, 'Group C': -3 };

var idx = 0;
genders.forEach(function(g) {
  ethnicities.forEach(function(e) {
    var count = 10 + Math.floor(rng() * 15);
    var i = 0;
    while (i < count) {
      sampleRecords.push({
        id: idx++,
        gender: g,
        ethnicity: e,
        outcome: baseOutcomes[g] + ethModifiers[e] + Math.floor(rng() * 20 - 10)
      });
      i++;
    }
  });
});

var intResult = intersectionalAnalysis(sampleRecords, ['gender', 'ethnicity'], 'outcome');
console.log('Analyzed ' + intResult.totalRecords + ' records across ' + intResult.groupCount + ' intersections');
console.log('Disparities found: ' + intResult.disparities.length);
intResult.disparities.forEach(function(d) {
  console.log('  [' + d.severity + '] ' + d.intersection + ': ' + d.direction + ' (ratio: ' + d.ratio + ')');
});
console.log('Framework: ' + intResult.framework + '\n');

// Demo 4: Pay Equity
console.log('━━━ 4. PAY EQUITY ANALYSIS ━━━');
var employees = [];
var roles = ['Engineer', 'Manager', 'Analyst'];
var groups = ['Group A', 'Group B', 'Group C'];
var basePay = { Engineer: 95000, Manager: 110000, Analyst: 75000 };
var groupAdj = { 'Group A': 1.0, 'Group B': 0.88, 'Group C': 0.92 };
var rng2 = createPRNG(99);

roles.forEach(function(role) {
  groups.forEach(function(grp) {
    var count = 5 + Math.floor(rng2() * 8);
    var i = 0;
    while (i < count) {
      var exp = 1 + Math.floor(rng2() * 15);
      var salary = Math.round(basePay[role] * groupAdj[grp] * (1 + exp * 0.02) + (rng2() * 10000 - 5000));
      employees.push({ name: 'Emp-' + employees.length, group: grp, role: role, salary: salary, experience: exp });
      i++;
    }
  });
});

var payResult = payEquityAnalysis(employees);
console.log('Reference group: ' + payResult.referenceGroup);
Object.keys(payResult.groupAverages).forEach(function(g) {
  console.log('  ' + g + ': $' + payResult.groupAverages[g].toLocaleString());
});
payResult.significantGaps.forEach(function(g) {
  console.log('  ⚠️ ' + g.group + ': ' + g.gapPercent + '% gap ($' + g.estimatedAdjustment.toLocaleString() + '/person)');
});
console.log('Cost to close all gaps: $' + payResult.totalCostToClose.toLocaleString() + '\n');

// Demo 5: Environmental Justice
console.log('━━━ 5. ENVIRONMENTAL JUSTICE ANALYSIS ━━━');
var ejData = [
  { name: 'Riverside Heights', population: 25000, minorityPct: 72, pollutionIndex: 85, healthRiskScore: 78 },
  { name: 'Oak Park', population: 40000, minorityPct: 18, pollutionIndex: 22, healthRiskScore: 30 },
  { name: 'Westlake', population: 15000, minorityPct: 65, pollutionIndex: 70, healthRiskScore: 82 },
  { name: 'Cedar Hills', population: 30000, minorityPct: 35, pollutionIndex: 40, healthRiskScore: 45 },
  { name: 'Industrial Flats', population: 8000, minorityPct: 88, pollutionIndex: 95, healthRiskScore: 91 }
];
var ejResult = environmentalJusticeAnalysis(ejData);
ejResult.communities.forEach(function(c) {
  console.log('  ' + c.community + ': EJ Index=' + c.ejIndex + ', Health=' + c.healthBurden + ' [' + c.classification + ']');
});
console.log('Priority interventions: ' + ejResult.priorityInterventions.join(', ') + '\n');

// Demo 6: Full Audit Report
console.log('━━━ 6. COMPREHENSIVE EQUITY AUDIT REPORT ━━━');
var report = generateAuditReport('Demo Organization', aiResult, diResult, intResult);
console.log('Organization: ' + report.organization);
console.log('Risk Level: ' + report.executiveSummary.overallRiskLevel);
console.log('Total Findings: ' + report.executiveSummary.totalFindings +
  ' (Critical: ' + report.executiveSummary.criticalFindings +
  ', High: ' + report.executiveSummary.highFindings +
  ', Moderate: ' + report.executiveSummary.moderateFindings + ')');
console.log('Equity Score: ' + report.executiveSummary.equityScore + '/100');
console.log('\nRemediation Plan:');
report.recommendations.forEach(function(r) {
  console.log('  ' + r.priority + '. [' + r.timeline + '] ' + r.action);
});
console.log('\nLegal Framework: ' + report.legalReferences.join('; '));

module.exports = {
  adverseImpactAnalysis: adverseImpactAnalysis,
  disparityIndex: disparityIndex,
  intersectionalAnalysis: intersectionalAnalysis,
  generateAuditReport: generateAuditReport,
  payEquityAnalysis: payEquityAnalysis,
  environmentalJusticeAnalysis: environmentalJusticeAnalysis,
  accessibilityAudit: accessibilityAudit,
  calculateGini: calculateGini,
  mean: mean,
  stdDev: stdDev,
  createPRNG: createPRNG
};
