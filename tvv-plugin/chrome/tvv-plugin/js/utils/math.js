'use strict';

/**
 * Class CurveComparator can be used to compare two Curve objects
 * Each Curve must have "x" and "y" arrays
 * If curves are not the same length, curves will be compared at their common abscissa interval
 */
export class CurveComparator {

    constructor (sampleCurve, targetCurve) {
        this.sampleCurve = sampleCurve;
        this.targetCurve = targetCurve;
        let interp = this.#transformToCommonAbscissa();
        this.areaMetric = this.compareByAreaMetric(interp.newX, interp.newSampleY, interp.newTargetY);
        this.sumOfSquaresMetric = this.compareBySumOfSquaresMetric(interp.newX, interp.newSampleY, interp.newTargetY);
        this.maxDeviationMetric = this.compareByMaximumDeviationMetric(interp.newX, interp.newSampleY, interp.newTargetY);
    }

    /**
     * Function finds common abscissa values of two curves
     * Creates modified curves with common abscissa domain
     * Assuming that each curve x-arrays are sorted in ascending order
     */
    #transformToCommonAbscissa() {
        const sampleCurveLength = this.sampleCurve.x.length;
        const targetCurveLength = this.targetCurve.x.length;
        let commonXmin = Math.max(this.sampleCurve.x[0], this.targetCurve.x[0]);
        let commonXmax = Math.min(this.sampleCurve.x[sampleCurveLength - 1], this.targetCurve.x[targetCurveLength - 1]);
        // create new abscissa array over common domain
        const commonNewLength = Math.max(sampleCurveLength, targetCurveLength) * 2;
        let step = (commonXmax - commonXmin)/(commonNewLength - 1);
        let commonAbscissa = linspace(commonXmin, commonXmax, step);
        // interpolate ordinate values to new abscissa
        let interpolatedsampleOrdinate = evaluateLinear(commonAbscissa, this.sampleCurve.x, this.sampleCurve.y);
        let interpolatedTargetOrdinate = evaluateLinear(commonAbscissa, this.targetCurve.x, this.targetCurve.y);
        return {
            newX: commonAbscissa,
            newSampleY: interpolatedsampleOrdinate,
            newTargetY: interpolatedTargetOrdinate
        }
    }

    compareByAreaMetric(commonX, sampleY, targetY) {
        let sampleAreaMetric = 0;
        for (let i = 1; i < commonX.length; i++) {
            sampleAreaMetric += Math.pow((commonX[i] - commonX[i - 1]) * (sampleY[i] + sampleY[i - 1]) * 0.5, 2);
        }

        let targetAreaMetric = 0;
        for (let i = 1; i < commonX.length; i++) {
            targetAreaMetric += Math.pow((commonX[i] - commonX[i - 1]) * (targetY[i] + targetY[i - 1]) * 0.5, 2);
        }

        return {
            sampleAreaMetric: sampleAreaMetric,
            targetAreaMetric: targetAreaMetric,
            sampleToTargetAreaRatio: (sampleAreaMetric - targetAreaMetric) / targetAreaMetric
        };
    }

    compareBySumOfSquaresMetric(commonX, sampleY, targetY) {
        let sumOfSquaresMetric = 0;
        for (let i = 0; i < commonX.length; i++) {
            let delta = sampleY[i] - targetY[i];
            sumOfSquaresMetric += Math.pow(delta, 2);
        }
        return sumOfSquaresMetric;
    }

    compareByMaximumDeviationMetric(commonX, sampleY, targetY) {
        let maxDeviationMetric = 0;
        for (let i = 0; i < commonX.length; i++) {
            let delta = Math.abs(sampleY[i] - targetY[i]);
            if (delta > maxDeviationMetric) {
                maxDeviationMetric = delta;
            }
        }
        return maxDeviationMetric;
    }

} 

/**
 * Function returns array with linearly spaced numbers from a to b
 * @param {Number} a start number
 * @param {Number} b stop number
 * @param {Number} n step
 */
function linspace(a, b, n) {
    let arr = [];
    let current = a;
    while (current <= b) {
        arr.push(current);
        current += n;
    }
    return arr;
}

/**
 * Makes argument to be an array if it's not
 * https://github.com/BorisChumichev/everpolate
 * @param {*} input 
 * @returns {Array}
 */
function makeItArrayIfItsNot(input) {
    return Object.prototype.toString.call( input ) !== '[object Array]'
        ? [input]
        : input
}

/**
 * Utilizes bisection method to search an interval to which
 * point belongs to, then returns an index of left or right
 * border of the interval
 * https://github.com/BorisChumichev/everpolate
 * @param {Number} point 
 * @param {Array} intervals 
 * @param {Boolean} useRightBorder 
 * @returns {Number}
 */
function findIntervalBorderIndex(point, intervals, useRightBorder) {
    //If point is beyond given intervals
    if (point < intervals[0])
        return 0
    if (point > intervals[intervals.length - 1])
        return intervals.length - 1
    //If point is inside interval
    //Start searching on a full range of intervals
    var indexOfNumberToCompare 
        , leftBorderIndex = 0
        , rightBorderIndex = intervals.length - 1
    //Reduce searching range till it find an interval point belongs to using binary search
    while (rightBorderIndex - leftBorderIndex !== 1) {
        indexOfNumberToCompare = leftBorderIndex + Math.floor((rightBorderIndex - leftBorderIndex)/2)
        point >= intervals[indexOfNumberToCompare]
            ? leftBorderIndex = indexOfNumberToCompare
            : rightBorderIndex = indexOfNumberToCompare
    }
    return useRightBorder ? rightBorderIndex : leftBorderIndex
}

/**
 * Evaluates y-value at given x point for line that passes
 * through the points (x0,y0) and (y1,y1)
 * @param {Number} x 
 * @param {Number} x0 
 * @param {Number} y0 
 * @param {Number} x1 
 * @param {Number} y1 
 * @returns {Number}
 */
function linearInterpolation (x, x0, y0, x1, y1) {
    var a = (y1 - y0) / (x1 - x0)
    var b = -a * x0 + y0
    return a * x + b
}

/**
 * Evaluates interpolating line/lines at the set of numbers
 * or at a single number for the function y=f(x)
 * https://github.com/BorisChumichev/everpolate
 *
 * @param {Number|Array} pointsToEvaluate     number or set of numbers
 *                                            for which polynomial is calculated
 * @param {Array} functionValuesX             set of distinct x values
 * @param {Array} functionValuesY             set of distinct y=f(x) values
 * @returns {Array}
 */

function evaluateLinear (pointsToEvaluate, functionValuesX, functionValuesY) {
    var results = []
    pointsToEvaluate = makeItArrayIfItsNot(pointsToEvaluate)
    pointsToEvaluate.forEach(function (point) {
        var index = findIntervalBorderIndex(point, functionValuesX)
        if (index == functionValuesX.length - 1)
            index--
        results.push(linearInterpolation(point, functionValuesX[index], functionValuesY[index]
            , functionValuesX[index + 1], functionValuesY[index + 1]))
    })
    return results
  }