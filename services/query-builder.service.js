'use strict';

/**
 * Shared MongoDB query builder — used by both campaigns and segments.
 */

// Whitelist of fields users are allowed to filter on
const ALLOWED_FIELDS = new Set(['name', 'email', 'totalSpend', 'visits', 'lastActivity', 'phone']);

// Whitelist of operators
const ALLOWED_OPERATORS = new Set(['>', '<', '>=', '<=', '=', '!=', 'contains']);

const OPERATOR_MAP = {
    '>':        '$gt',
    '<':        '$lt',
    '>=':       '$gte',
    '<=':       '$lte',
    '=':        '$eq',
    '!=':       '$ne',
    'contains': '$regex',
};

// Escape special regex characters to prevent ReDoS
function escapeRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildConditionQuery({ field, operator, value }) {
    // Reject unknown fields and operators before touching MongoDB
    if (!ALLOWED_FIELDS.has(field)) return {};
    if (!ALLOWED_OPERATORS.has(operator)) return {};

    const mongoOperator = OPERATOR_MAP[operator];

    if (operator === 'contains') {
        return { [field]: { [mongoOperator]: escapeRegex(value), $options: 'i' } };
    }

    // Coerce to the correct type
    const numericFields = new Set(['totalSpend', 'visits']);
    const coercedValue = numericFields.has(field) ? Number(value) : value;

    // Reject NaN for numeric fields
    if (numericFields.has(field) && isNaN(coercedValue)) return {};

    return { [field]: { [mongoOperator]: coercedValue } };
}

/**
 * Recursively build a MongoDB query from a rule group.
 * Supports nested groups: { condition, conditions: [...] }
 */
function buildQueryFromRules(rules) {
    if (!rules || typeof rules !== 'object') return {};
    const { conditions, condition } = rules;
    if (!Array.isArray(conditions) || conditions.length === 0) return {};

    // Guard against deeply nested or excessively large rule sets
    if (conditions.length > 20) return {};

    const mongoConditions = conditions
        .map(rule => rule.conditions ? buildQueryFromRules(rule) : buildConditionQuery(rule))
        .filter(q => Object.keys(q).length > 0);

    if (mongoConditions.length === 0) return {};

    return condition === 'OR'
        ? { $or: mongoConditions }
        : { $and: mongoConditions };
}

/**
 * Build a $nor query from an exclusion rule list.
 */
function buildExclusionQuery(exclusions) {
    if (!Array.isArray(exclusions) || exclusions.length === 0) return null;
    const clauses = exclusions
        .map(buildConditionQuery)
        .filter(q => Object.keys(q).length > 0);
    return clauses.length > 0 ? { $nor: clauses } : null;
}

/**
 * Combine include + exclusion queries into one MongoDB filter.
 */
function buildFinalQuery(rules, exclusions) {
    const includeQuery = buildQueryFromRules(rules);
    const excludeQuery = buildExclusionQuery(exclusions);

    if (!excludeQuery) return includeQuery;

    const parts = [];
    if (Object.keys(includeQuery).length) parts.push(includeQuery);
    parts.push(excludeQuery);

    return parts.length === 1 ? parts[0] : { $and: parts };
}

module.exports = { buildQueryFromRules, buildExclusionQuery, buildFinalQuery };
