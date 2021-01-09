'use strict';

import { ReportType } from './rt.js'

// ---------------------- Build default report, if user did not provide any templates ----------------------

export class ReportBuilder {

    constructor(reportType, loadcase) {
        this.reportType = reportType;
        this.simulations = loadcase.simulations;
        this.targets = loadcase.targets;
    }

    build() {
        if (this.reportType == ReportType.SINGLE_SOLVER) {
            return this.#buildSingleSolverReport();
        } 
        
        if (this.reportType == ReportType.BENCHMARK) {
            return this.#buildBenchmarkReport();
        }

        return '';
    }

    #buildSingleSolverReport() {
        let content = 
`
<!DOCTYPE html>
<html>
    <head>
        <style>
            body {
                background: #dedede;
            }
            h1 {
                text-align: center;
                font-family: Helvetica, sans-serif;
                font-size: 24px;
                color: #fe6420;
            }
            table, td, th {
                text-align: center;
                border: solid 1px #696969;
            }
            table {
                width: 100%;
                border-collapse: collapse;
            }
            th {
                background: #ababab;
            }
        </style>
        <title>
            Single solver cumulative report
        </title>
    </head>
    <body>
        <h1>
            Single solver report
        </h1>
        <table>
`
+ this.#buildSingleSolverTableHeader() + this.#buildSingleSolverTableContent() +
`
        </table>
    </body>
</html>
`;
        return content;
    }

    #buildSingleSolverTableHeader() {
        let header = 
`
            <tr>
                <th rowspan="2" width="10%">
                    Simulation ID
                </th>
                <th rowspan="2" width="40%">
                    Simulation name
                </th>
                <th colspan="2" width="20%">
                    Last task info
                </th>
                <th colspan="3" width="30%">
                    Key results
                </th>
            </tr>
            <tr>
                <th width="10%">
                    Cores
                </th>
                <th width="10%">
                    Memory
                </th>
                <th width="10%">
                    Name
                </th>
                <th width="10%">
                    Value
                </th>
                <th width="10%">
                    Dimension
                </th>
            </tr>
`;
        return header;
    }

    #buildSingleSolverTableContent() {
        let content = ``;
        for (let s of this.simulations) {
            let sId = s.id;
            let sName = s.name;
            let cores = s.tasks[0].cores;
            let memory = s.tasks[0].memory;
            let nVals = s.values.length;
            let nPics = s.pictures.length;
            content +=
`
            <tr>
                <td rowspan="${nVals + nPics}">
                    ${sId}
                </td>
                <td rowspan="${nVals + nPics}">
                    ${sName}
                </td>
                <td rowspan="${nVals + nPics}">
                    ${cores}
                </td>
                <td rowspan="${nVals + nPics}">
                    ${memory} MB
                </td>
                <td>${s.values[0].name}</td>
                <td>${s.values[0].value}</td>
                <td>${s.values[0].dimension}</td>
            </tr>
`;
            for (let i = 1; i < nVals; i++) {
                content += 
`
            <tr>
                <td>${s.values[i].name}</td>
                <td>${s.values[i].value}</td>
                <td>${s.values[i].dimension}</td>
            </tr>
`;
            }
            for (let i = 0; i < nPics; i++) {
                // <td colspan="2"><img alt="${s.pictures[i].name}" src="data:image/jpeg;base64,${s.pictures[i].content}"></td>
                content +=
`
            <tr>
                <td>${s.pictures[i].name}</td>
                <td colspan="2"><img alt="${s.pictures[i].name}" src="${s.pictures[i].content}" width="20%"></td>
            </tr>
`;
            }
            
        }
        return content;
    }

    // ------------------------------------------------------------------------------------------------

    #buildBenchmarkReport() {
        return "Benchmark report stub";
    }

}
