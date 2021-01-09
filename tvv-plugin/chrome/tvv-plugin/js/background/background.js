'use strict';

import { ReportBuilder } from '../report/builder.js'
import { TemplateParser } from '../report/parser.js'
import { trimCharacters, uniqueID } from '../utils/utils.js'
import { Parameters, BenchTargetCriteria } from '../common/parameters.js'
import { CurveComparator } from '../utils/math.js'

// --------------------------------------- Loadcase > Target Values ----------------------------------------

class Target {

	// Since CML-Bench v.2020.7
	// criteria:
	// - eq
	// - lt
	// - lte
	// - gt
	// - gte
	// - tolerance
	// - interval

	constructor(valueData, curveData) {
		this.value = null;
		this.curve = null;

		if (valueData != null) {
			this.value = {
				id: valueData.id,
				name: valueData.name,
				criterion: valueData.criterion,
				dimension: valueData.dimension,
				value: valueData.value,
				tolerance: valueData.tolerance,
				left: valueData.left,
				right: valueData.right
			};
		}

		if (curveData != null) {
			this.curve = {
				id: curveData.id,
				name: curveData.name,
				x: curveData.x,
				xLabel: curveData.xLabel,
				y: curveData.y,
				yLabel: curveData.yLabel,
				picture: curveData.picture
			}
		}
		
	}

}

// ----------------------------------- Simulation > Key Results > Curves -----------------------------------

class Curve {

	constructor(data) {
		return (async () => {
			this.parentId = data.parent;
			this.isTarget = data.isTarget;
			this.url = data.url;
			this.id = data.id;
			this.name = data.name;
			let axesData = await this.getAxesData(this.url, this.id);
			this.x = [];
			for (let _x of axesData.x) {
				this.x.push(Number(_x));
			}
			this.xLabel = axesData.xLabel;
			this.y = [];
			for (let _y of axesData.y) {
				this.y.push(Number(_y));
			}
			this.yLabel = axesData.yLabel;
			// create picture with single curve on it
			// create div with unique id at background page
			// only if x and y are of the same lengths
			if (this.x.length != this.y.length) {
				console.error('Unable to create chart from given data');
				// throw new Error('Unable to create chart from given data');
			}
			this.picture = await this.curveAsPicture(this.x, this.y, this.name, this.xLabel, this.yLabel);
			// compare to target
			this.relativeAreaMetric = null;
			this.sumOfSquaresMetric = null;
			this.maxDeviationMetric = null;
			// logging
			console.log(`Curve >> Parent simulation ID: ${this.parentId} | Curve name: ${this.name} | Curve size: ${this.x.length}`);
			return this;
		})();
	}

	compareWithTarget(targetSimulation) {
		let targetCurvesArr = Array.from(targetSimulation.curves);
		let thisTarget = targetCurvesArr.filter(item => item.name == this.name);
		if (thisTarget.length == 1) {
			let comparator = new CurveComparator(this, thisTarget[0]);
			this.relativeAreaMetric = comparator.areaMetric.sampleToTargetAreaRatio * 100;
			this.sumOfSquaresMetric = comparator.sumOfSquaresMetric;
			this.maxDeviationMetric = comparator.maxDeviationMetric;
		}
	}

	async getAxesData(url, id) {
		let tmp = url.split('/');
		tmp[tmp.length - 1] = id
		let mod = tmp.join('/');
		let res = await fetch(mod, {method: 'GET'});
		let cnt = await res.json();
		let data = {
			x: cnt.chart.x,
			y: cnt.chart.y,
			xLabel: cnt.chart.xAxisLabel,
			yLabel: cnt.chart.yAxisLabel
		}
		return data;
	}

	async curveAsPicture(x, y, name, xLabel, yLabel) {
		function buildDataTable() {
			let table = [];
			let header = ['X-Values', name];
			table.push(header);
			for (let i = 0; i < x.length; i++) {
				let row = [x[i], y[i]];
				table.push(row);
			}
			return google.visualization.arrayToDataTable(table);
		}

		async function drawChart() {
			return new Promise(function(resolve) {
				// create container for future chart
				let dummyDiv = document.createElement('div');
				let dummyDivId = `chart-wrapper-${uniqueID()}`;
				dummyDiv.id = dummyDivId;
				document.body.appendChild(dummyDiv);
				// build datatable for the chart
				let data = buildDataTable();
				// define chart options
				let options = {
					title: `${name}`,
					curveType: 'function',
					hAxis: {title: `${xLabel}`},
					vAxis: {title: `${yLabel}`},
					width: 1920,
					height: 1080
				};
				let chart = new google.visualization.LineChart(document.getElementById(dummyDivId));
				google.visualization.events.addListener(chart, 'ready', function () {
					var imgUri = chart.getImageURI();
					resolve(imgUri);
				});
				chart.draw(data, options);
			});
		}
		
		// build chart
		const data = await google.charts.load('current', {'packages':['corechart']});
		const imgUri = await drawChart(data);
		return imgUri;
	}
	
}

// ------------------- Entity containing all curves with same name from each simulation --------------------

class ComparisonCurve {

	constructor(data) {
		return (async () => {
			this.curveName = data.curveName;
			this.singleCurves = data.singleCurves;
			// simulation name: sc.simName
			// curve: sc.crvObj
			this.picture = await this.curvesAsPicture(this.curveName, this.singleCurves);
			return this;
		})();
	}

	async curvesAsPicture(curveName, singleCurves) {
		function buildDataTable() {
			let leftTableColumnsToAdd = [];
			let data = new google.visualization.DataTable();
			data.addColumn({type: 'number'});
			data.addColumn({type: 'number'});
			let j = 1;
			
			for (let sc of singleCurves) {
				// build table for the current curve
				let table = [];
				let header = ['X-Values', sc.crvObj.isTarget ? 'Target' : sc.simName];
				table.push(header);
				for (let i = 0; i < sc.crvObj.x.length; i++) {
					let row = [sc.crvObj.x[i], sc.crvObj.y[i]];
					table.push(row);
				}
				let curveData = google.visualization.arrayToDataTable(table);
				// join current curve data table with already existing one
				data = google.visualization.data.join(data, curveData, 'full', [[0, 0]], leftTableColumnsToAdd, [1]);
				// prepare list of columns for the next iteration
				leftTableColumnsToAdd.push(j);
				j++;
			}

			return data;
		}

		async function drawChart() {
			return new Promise(function(resolve) {
				// create container for future chart
				let dummyDiv = document.createElement('div');
				let dummyDivId = `comparison-chart-wrapper-${uniqueID()}`;
				dummyDiv.id = dummyDivId;
				document.body.appendChild(dummyDiv);
				// build datatable for the chart
				let data = buildDataTable();
				// define chart options
				let options = {
					title: `${curveName}`,
					interpolateNulls: 'true',
					curveType: 'function',
					hAxis: {title: `${singleCurves[0].crvObj.xLabel}`},
					vAxis: {title: `${singleCurves[0].crvObj.yLabel}`},
					width: 1920,
					height: 1080
				};
				let chart = new google.visualization.LineChart(document.getElementById(dummyDivId));
				google.visualization.events.addListener(chart, 'ready', function () {
					var imgUri = chart.getImageURI();
					resolve(imgUri);
				});
				chart.draw(data, options);
			});
		}

		// build chart
		const data = await google.charts.load('current', {'packages':['corechart']});
		const imgUri = await drawChart(data);
		return imgUri;
	}

}

// ----------------------------------- Simulation > Key Results > Values -----------------------------------

class Value {

	constructor(data) {
		this.id = data.id;
		this.name = data.name;
		this.value = data.value;
		this.dimension = data.dimension;
	}

}

// ---------------------------------- Simulation > Key Results > Pictures ----------------------------------

class Picture {

	constructor(data) {
		return (async () => {
			this.parent = data.parent;
			this.url = data.url;
			this.id = data.id;
			this.name = data.name;
			this.preview = data.preview;
			this.content = await this.getPicrute(this.url, this.id);
			// logging
			console.log(`Picture >> Parent simulation ID: ${this.parent} | Picture name: ${this.name} | Content length: ${this.content.length}`);
			return this;
		})();
	}

	async blobToBase64(blob) {
		let reader = new FileReader();
		reader.readAsDataURL(blob); 
		return new Promise(resolve => {
			reader.onloadend = () => {
				resolve(reader.result);
			};
		});
	}

	async getPicrute(url, id) {
		let tmp = url.split('/');
		tmp[tmp.length - 1] = id
		let mod = tmp.join('/');
		let res = await fetch(mod, {method: 'GET'});
		let blb = await res.blob();
		let str = await this.blobToBase64(blb);
		return str;
	}

}

// ------------------------------------------ Simulation > Tasks -------------------------------------------

class Task {

	constructor(url, id) {
		return (async () => {
			const requestURL = url.protocol + '//' + url.host + '/rest/task/' + id;
			console.log('Trying to fetch Task: ' + requestURL);
			let taskResponse = await fetch(requestURL, {method: 'GET'});
			if (taskResponse.status == 200) {
				let taskPayload = await taskResponse.json();
				this.id = taskPayload.id;
				this.memory = taskPayload.memory;
				this.cores = taskPayload.numOfCores;
				this.status = taskPayload.status;
				return this;
			}
			return null;
		})();
	}

}

// -------------------------------------- CML-Bench Simulation Object --------------------------------------

class Simulation {
	
	constructor(url, id, isTarget, progress) {
		return (async () => {
			const requestURL = url.protocol + '//' + url.host + '/rest/simulation/' + id;
			console.log('Trying to fetch Simulation: ' + requestURL);
			let simulationResponse = await fetch(requestURL, {method: 'GET'});
			progress.current = progress.start;
			if (simulationResponse.status == 200) {
				this.isTarget = isTarget;

				let simulationPayload = await simulationResponse.json();

				progress.step = progress.delta * 0.04
				sendProgressValue(progress.current + progress.step);
				progress.current += progress.step;

				this.id = simulationPayload.id;
				this.name = simulationPayload.name;

				progress.step = progress.delta * 0.12;
				let simulationTasksIds = await this.getSimulationTasksIds(url, this.id, progress);
				
				let n1 = simulationTasksIds.length;
				this.tasks = [];
				for (let item of simulationTasksIds) {
					let t = await new Task(url, item);
					this.tasks.push(t);

					sendProgressValue(progress.current + progress.step / n1);
					progress.current += progress.step / n1;
				}
				
				let simulationValuesData = await this.getSimulationValuesData(url, this.id, progress);

				let n2 = simulationValuesData.length;
				this.values = [];
				for (let item of simulationValuesData) {
					let v = new Value(item);
					this.values.push(v);

					sendProgressValue(progress.current + progress.step / n2);
					progress.current += progress.step / n2;
				}

				let simulationPicturesData = await this.getSimulationPicturesData(url, this.id, progress);

				let n3 = simulationPicturesData.length;
				this.pictures = [];
				for (let item of simulationPicturesData) {
					let p = await new Picture(item);
					this.pictures.push(p);

					sendProgressValue(progress.current + progress.step / n3);
					progress.current += progress.step / n3;
				}

				let simulationCurvesData = await this.getSimulationCurvesData(url, this.id, progress);

				let n4 = simulationCurvesData.length;
				this.curves = [];
				for (let item of simulationCurvesData) {
					let c = await new Curve(item);
					this.curves.push(c);

					sendProgressValue(progress.current + progress.step / n4);
					progress.current += progress.step / n4;
				}
				
				return this;
			}
			sendProgressValue(p.end);
			return null;
		})();
	}

	async getSimulationTasksIds(url, sId, p) {
		const requestURL = url.protocol + '//' + url.host + '/rest/simulation/' + sId + '/task/list';
		let tasksIds = [];
		let tasksResponse = await fetch(requestURL, {
			method: 'POST',
			headers: {
				'Accept': 'application/json, text/javascript, */*',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				filters: {},
				sort: [],
				pageable: {
					size: Parameters.MAX_TASKS_PER_SIMULATION,
					page: 1
				}
			})
		});
		if (tasksResponse.status == 200) {
			let tasksPayload = await tasksResponse.json();
			let content = tasksPayload.content;
			let n = content.length;
			for (let item of content) {
				tasksIds.push(item.id);
				sendProgressValue(p.current + p.step / n);
				p.current += p.step / n;
			}
		} else {
			sendProgressValue(p.current + p.step);
			p.current += p.step;
		}
		return tasksIds;
	}

	async getSimulationValuesData(url, sId, p) {
		const requestURL = url.protocol + '//' + url.host + '/rest/simulation/' + sId + '/keyResult/list';
		let valuesData = [];
		let valuesResponse = await this.getSimulationKeyResultsOfType(requestURL, 'value');
		if (valuesResponse.status == 200) {
			let valuesPayload = await valuesResponse.json();
			let content = valuesPayload.content;
			console.log('Getting simulation values...');
			let n = content.length;
			for (let item of content) {
				let vId = item.id;
				let vName = item.name;
				let vDim = null;
				let vVal = null;
				let vRepr = item.overview.content;
				
				const detailsURL = url.protocol + '//' + url.host + '/rest/simulation/' + sId + '/keyResult/' + vId;
				let detailsResponse = await fetch(detailsURL, {method: 'GET'});
				if (detailsResponse.status == 200) {
					let detailsPayload = await detailsResponse.json();
					vVal = detailsPayload[vName];
					vDim = this.removePrefix(String(vRepr), String(vVal));
				}

				let itemData = {
					id: vId,
					name: vName,
					dimension: vDim,
					value: vVal
				};
				valuesData.push(itemData);

				sendProgressValue(p.current + p.step / n);
				p.current += p.step / n;
			}
		} else {
			sendProgressValue(p.current + p.step);
			p.current += p.step;
		}
		console.log('Collect ' + valuesData.length + ' values');
		return valuesData;
	}

	async getSimulationPicturesData(url, sId, p) {
		const requestURL = url.protocol + '//' + url.host + '/rest/simulation/' + sId + '/keyResult/list';
		let picturesData = [];
		let picturesResponse = await this.getSimulationKeyResultsOfType(requestURL, 'picture');
		if (picturesResponse.status == 200) {
			let picturesPayload = await picturesResponse.json();
			let content = picturesPayload.content;
			let n = content.length;
			console.log('Getting simulation pictures...');
			for (let item of content) {
				let pId = item.id;
				let pName = item.name;
				let pContent = item.overview.content;

				let itemData = {
					parent: sId,
					url: requestURL,
					id: pId,
					name: pName,
					preview: pContent
				}

				picturesData.push(itemData);

				sendProgressValue(p.current + p.step / n);
				p.current += p.step / n;
			}
		} else {
			sendProgressValue(p.current + p.step);
			p.current += p.step;
		}
		console.log('Collect ' + picturesData.length + ' pictures');
		return picturesData;
	}

	async getSimulationCurvesData(url, sId, p) {
		const requestURL = url.protocol + '//' + url.host + '/rest/simulation/' + sId + '/keyResult/list';
		let curvesData = [];
		let curvesResponse = await this.getSimulationKeyResultsOfType(requestURL, 'curve');
		if (curvesResponse.status == 200) {
			let curvesPayload = await curvesResponse.json();
			let content = curvesPayload.content;
			let n = content.length;
			console.log('Getting simulation curves...');
			for (let item of content) {
				let cId = item.id;
				let cName = item.name;

				let itemData = {
					parent: sId,
					isTarget: this.isTarget,
					url: requestURL,
					id: cId,
					name: cName
				}

				curvesData.push(itemData);

				sendProgressValue(p.current + p.step / n);
				p.current += p.step / n;
			}
		} else {
			sendProgressValue(p.current + p.step);
			p.current += p.step;
		}
		console.log('Collect ' + curvesData.length + ' curves');
		return curvesData;
	}

	async getSimulationKeyResultsOfType(url, resultType) {
		let response = await fetch(url, {
			method: 'POST',
			headers: {
				'Accept': 'application/json, text/javascript, */*',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				filters: {
					list: [
						{
							name: 'type',
							value: resultType
						}
					]
				},
				sort: [],
				pageable: {
					size: resultType == 'value' ? Parameters.MAX_VALUES_PER_SIMULATION : (resultType == 'picture' ? Parameters.MAX_PICTURES_PER_SIMULATION : (resultType == 'curve' ? Parameters.MAX_CURVES_PER_SIMULATION : Parameters.DEFAULT)),
					page: 1
				}
			})
		});
		return response;
	}

	removePrefix(str, prefix) {
		if (str.startsWith(prefix)) {
			return str.slice(prefix.length);
		}
		return str;
	}

}

// ----------------------------------------------- Loadcase ------------------------------------------------
// --------------------- Contains list of target values and list of simulation objects ---------------------

class Loadcase {

	constructor(id, url, simulationIds, simulationAsTarget) {
		return (async () => {
			this.id = id;
			this.url = url;
			this.simulations = [];
			this.targets = [];
			this.comparisonCurves = [];

			let progress = {
				start: null,
				end: null,
				delta: null,
				step: null,
				current: null
			}

			progress.start = 0;
			progress.end = 2;
			progress.delta = 2;
			progress.step = 2;
			progress.current = 0;

			// collect all loadcase target values

			let targetsData = await this.getLoadcaseTargetsData(progress);
			let nT = targetsData.length;

			for (let item of targetsData) {
				let t = new Target(item, null);
				this.targets.push(t);

				sendProgressValue(progress.current + progress.step / nT);
				progress.current += progress.step / nT;
			}

			// collect all selected simulations

			let nSims = simulationIds.length;

			for (let i = 0; i < nSims; i++) {

				progress.start = progress.current + (90 - progress.current) / nSims * i;
				progress.end = progress.current + (90 - progress.current) / nSims * (i + 1);
				progress.delta = progress.end - progress.start;
	
				let s = await new Simulation(new URL(this.url), simulationIds[i], simulationIds[i] == simulationAsTarget, progress);
				if (s != null) {
					this.simulations.push(s);
					
					// append curves from selected simulation as target curves
					if (simulationAsTarget != null && s.id == simulationAsTarget) {
						for (let c of s.curves) {
							let t = new Target(null, c);
							this.targets.push(t);
						}
					}
				}
	
			}

			// compare curves with same names from different simulations

			progress.start = progress.end;
			progress.current = progress.start;
			progress.end = 95;
			progress.step = 5;
			progress.delta = progress.end - progress.start;
			
			let allCurveNames = this.getAllCurvesNames(this.simulations, progress);

			progress.start = progress.end;
			progress.current = progress.start;
			progress.end = 100;
			progress.step = 5;
			progress.delta = progress.end - progress.start;
			
			let curveNames = Object.keys(allCurveNames);
			let nCurveNames = curveNames.length;

			for (let cn of curveNames) {
				let data = {
					curveName: cn,
					singleCurves: allCurveNames[cn]
				}

				let cc = await new ComparisonCurve(data);
				if (cc != null) {
					this.comparisonCurves.push(cc);
				}

				sendProgressValue(progress.current + progress.step / nCurveNames);
				progress.current += progress.step / nCurveNames;
			}

			// compare curves with targets

			let simulationsArray = Array.from(this.simulations);
			let targetSimulation = simulationsArray.filter(s => s.isTarget == true);
			if (targetSimulation.length == 1) {
				for (let s of this.simulations) {
					for (let c of s.curves) {
						c.compareWithTarget(targetSimulation[0]);
					}
				}
			}

			return this;
		})();

	}

	getAllCurvesNames(simulations, p) {

		let allCurveNames = {}
		let ns = simulations.length;
		for (let s of simulations) {
			let nc = s.curves.length;
			for (let c of s.curves) {
				let key = c.name;
				if (!(key in allCurveNames)) {
					allCurveNames[key] = [];
				}
				let item = {
					simName: s.name,
					crvObj: c
				};
				allCurveNames[key].push(item);

				sendProgressValue(p.current + p.step / ns / nc);
				p.current += p.step / ns / nc;
			}
		}
		return allCurveNames;

	}

	async getLoadcaseTargetsData(p) {

		const requestURL = this.url.protocol + '//' + this.url.host + '/rest/loadcase/' + this.id + '/dependentTarget/list';
		let targetsResponse = await fetch(requestURL, {
			method: 'POST',
			headers: {
				'Accept': 'application/json, text/javascript, */*',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				filters: {},
				sort: [],
				pageable: {
					size: Parameters.MAX_TARGETS_PER_LOADCASE,
					page: 1
				}
			})
		});

		let targetsData = [];

		if (targetsResponse.status == 200) {
			let payload = await targetsResponse.json();
			let content = payload.content;
			let n = content.length;

			for (let item of content) {
				let tId = item.id;
				let tName = item.name;
				let tCrit = item.value.criterion;
				let tUnit = item.value.unit;

				let itemData = {
					id: tId,
					name: tName,
					criterion: tCrit,
					dimension: tUnit,
					value: tCrit == BenchTargetCriteria.INT ? null : item.value.valueData.value,
					tolerance: tCrit == BenchTargetCriteria.TOL ? item.value.valueData.tolerance : null,
					left: tCrit == BenchTargetCriteria.INT ? item.value.valueData.left : null,
					right: tCrit == BenchTargetCriteria.INT ? item.value.valueData.right : null
				}

				targetsData.push(itemData);
				sendProgressValue(p.current + p.step / n);
				p.current += p.step / n;
			}
		} else {
			sendProgressValue(p.current + p.step);
			p.current += p.step;
		}
		console.log('Collect ' + targetsData.length + ' target values');
		return targetsData;

	}

}

// -------------------------------------------- For progress bar -------------------------------------------

function sendProgressValue(value) {
	chrome.runtime.sendMessage({
		sender: 'background',
		event: 'progress-changed',
		progress: value
	});
}

// ----------------------- Save selected HTML data as local file with selected name ------------------------

function save(data, file) {
	let dummyElement = document.createElement('a');
	dummyElement.setAttribute('href', 'data: text/plain; charset=utf-8,' + encodeURIComponent(data));
	dummyElement.setAttribute('download', file);
	dummyElement.click();
}

// ---------------------------------------------------------------------------------------------------------
// ------------------------------------ background.js script entry point -----------------------------------
// ---------------------------------------------------------------------------------------------------------

// ----------------------------- Container for data collected from popup form ------------------------------

var FORM_DATA = {
	reportType: null,
	reportTemplate: null,
	loadcase: null,
	simulations: null,
	targets: null,
	simulationAsTarget: null
}

// ------------------------------------- Handle messages from popup.js -------------------------------------

chrome.runtime.onMessage.addListener(async function(message, sender, sendResponse){

	if (message.sender == 'popup' && message.event == 'template_selected') {
		alert('Template accepted');
		FORM_DATA.reportTemplate = message.content.join('\n');
	}

	if (message.sender == 'popup' && message.event == 'report_requested') {

		let loadcase = await new Loadcase(message.loadcase, new URL(message.url), message.simulations, message.simulationAsTarget);
		
		FORM_DATA.reportType = message.reportType;
		FORM_DATA.loadcase = loadcase;
		FORM_DATA.simulationAsTarget = message.simulationAsTarget;

		let content = '';

		if (FORM_DATA.reportTemplate == null) {
			alert('No report template selected! Default will be used');
			let reportBuilder = new ReportBuilder(FORM_DATA.reportType, FORM_DATA.loadcase);
			content = reportBuilder.build();
		} else {
			let templateParser = new TemplateParser(FORM_DATA.reportType, FORM_DATA.reportTemplate, FORM_DATA.loadcase);
			content = templateParser.parse();
		}

		let fileName = 'Report_' + uniqueID() + '.html';
		save(content, fileName);
		
	}

});

// TODO: recognize loadcase while on simulation page
// TODO: get solver name (for benchmark report type)
// TODO: change comparison curve header while simulation contains targets (curve -> parent [simulation] -> isTarget)