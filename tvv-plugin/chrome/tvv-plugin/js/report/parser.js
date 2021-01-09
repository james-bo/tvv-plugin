'use strict';

import { ReportType } from './rt.js'
import { Placeholders } from '../utils/placeholders.js'
import { BenchTargetCriteria } from '../common/parameters.js'
import { trimCharacters } from '../utils/utils.js'

export class TemplateParser {

    constructor(reportType, reportTemplate, loadcase) {
        this.reportType = reportType;
        this.reportTemplate = reportTemplate;
        this.simulations = loadcase.simulations;
        this.targets = loadcase.targets;
        this.comparisonCurves = loadcase.comparisonCurves;
        this.allPlaceholders = this.#buildValidPlaceholders();
    }

    parse() {
        // copy all text to new variable; then this new varialble will be modified
        let finalReport = this.reportTemplate;
        const pattern = /(?<all>\{\{(?<content>.*)\}\})/ugm;
        let match;
        while ((match = pattern.exec(this.reportTemplate)) !== null)  {
            let tmp = finalReport.replace(match.groups.all, this.allPlaceholders[match.groups.content]);
            finalReport = tmp;
        }
        return finalReport;
    }

    #buildValidPlaceholders() {
        let result = {}

        if (this.reportType == ReportType.SINGLE_SOLVER) {

            // Build placeholders for targets
            for (let t of this.targets) {

                if (t.value != null) {

                    switch (t.value.criterion) {
                        case BenchTargetCriteria.EQ:
                            result[`${Placeholders.TARGET}:${Placeholders.VALUE}:${t.value.name}`] = `= ${t.value.value} ${t.value.dimension}`;
                            break;
                        case BenchTargetCriteria.LT:
                            result[`${Placeholders.TARGET}:${Placeholders.VALUE}:${t.value.name}`] = `< ${t.value.value} ${t.value.dimension}`;
                            break;
                        case BenchTargetCriteria.LE:
                            result[`${Placeholders.TARGET}:${Placeholders.VALUE}:${t.value.name}`] = `≤ ${t.value.value} ${t.value.dimension}`;
                            break;
                        case BenchTargetCriteria.GT:
                            result[`${Placeholders.TARGET}:${Placeholders.VALUE}:${t.value.name}`] = `> ${t.value.value} ${t.value.dimension}`;
                            break;
                        case BenchTargetCriteria.GE:
                            result[`${Placeholders.TARGET}:${Placeholders.VALUE}:${t.value.name}`] = `≥ ${t.value.value} ${t.value.dimension}`;
                            break;
                        case BenchTargetCriteria.TOL:
                            result[`${Placeholders.TARGET}:${Placeholders.VALUE}:${t.value.name}`] = `${t.value.value} ± ${t.value.tolerance} ${t.value.dimension}`;
                            break;
                        case BenchTargetCriteria.INT:
                            result[`${Placeholders.TARGET}:${Placeholders.VALUE}:${t.value.name}`] = `[${t.value.left}; ${t.value.right}] ${t.value.dimension}`;
                            break;
                        default:
                            break;
                    }

                }
                
                if (t.curve != null) {

                    result[`${Placeholders.TARGET}:${Placeholders.CURVE}:${t.curve.name}`] = `<img alt="${t.curve.name}" src="${t.curve.picture}" width="50%">`;

                }

            }

            for (let s of this.simulations) {

                // Build placeholders for simulation values
                for (let v of s.values) {
                    result[`${s.name}:${Placeholders.VALUE}:${v.name}`] = `${v.value} ${v.dimension}`;
                }

                // Build placeholders for simulation pictures
                for (let p of s.pictures) {
                    result[`${s.name}:${Placeholders.PICTURE}:${p.name}`] = `<img alt="${p.name}" src="${p.content}" width="50%">`;
                }

                // Build placeholders for simulation curves
                // Note that CML-Bench stores curve names with additional double quotes
                for (let c of s.curves) {
                    result[`${s.name}:${Placeholders.CURVE}:${trimCharacters(c.name, '"')}`] = `<img alt="${c.name}" src="${c.picture}" width="50%">`;
                    result[`${s.name}:${Placeholders.CURVE}:${trimCharacters(c.name, '"')}:${Placeholders.COMPARE_TO_TARGET}:${Placeholders.SQUARED_AREA}`] = `${c.relativeAreaMetric}`;
                    result[`${s.name}:${Placeholders.CURVE}:${trimCharacters(c.name, '"')}:${Placeholders.COMPARE_TO_TARGET}:${Placeholders.SUM_OF_SQUARES}`] = `${c.sumOfSquaresMetric}`;
                    result[`${s.name}:${Placeholders.CURVE}:${trimCharacters(c.name, '"')}:${Placeholders.COMPARE_TO_TARGET}:${Placeholders.MAX_DEVIATION}`] = `${c.maxDeviationMetric}`;
                }
                
                // Build placeholders for the latest simulation task data
                let t = s.tasks[0];
                if (t !== undefined) {
                    result[`${s.name}:${Placeholders.CORES}`] = `${t.cores}`;
                    result[`${s.name}:${Placeholders.MEMORY}`] = `${t.memory} MB`;
                    result[`${s.name}:${Placeholders.STATUS}`] = `${t.status}`;
                }
                
            }

            // Build placeholders for comparison curves
            // Note that CML-Bench stores curve names with additional double quotes
            for (let cc of this.comparisonCurves) {
                result[`${Placeholders.COMPARISON_CURVES}:${trimCharacters(cc.curveName, '"')}`] = `<img alt="${cc.curveName}" src="${cc.picture}" width="50%">`;
            }

        }

        return result;
    }

}