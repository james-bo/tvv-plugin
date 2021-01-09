'use strict';

export const Parameters = Object.freeze(
    {
        MAX_TARGETS_PER_LOADCASE: 250,
        MAX_SIMULATIONS_PER_LOADCASE: 250,
        MAX_TASKS_PER_SIMULATION: 10,
        MAX_VALUES_PER_SIMULATION: 250,
        MAX_PICTURES_PER_SIMULATION: 100,
        MAX_CURVES_PER_SIMULATION: 100,
        DEFAULT: 100
    }
);

export const BenchTargetCriteria = Object.freeze(
    {
        EQ: 'eq',
        LT: 'lt',
        LE: 'lte',
        GT: 'gt',
        GE: 'gte',
        TOL: 'tolerance',
        INT: 'interval'
    }
);