'use strict';

import { format0d } from '../utils/utils.js'
import { value2color } from '../utils/utils.js'
import { parse } from '../utils/utils.js'
import { Parameters } from '../common/parameters.js'

// ------------------------------ Data class for loadcase validation response ------------------------------

class LoadcaseValidationResponse {
	constructor(url, id, name, msg) {
		this.url = url;
		this.id = id;
		this.name = name;
		this.msg = msg;
		
		console.log(`"this.id" = ${this.id}`);
		console.log(`"this.name" = ${this.name}`);
	}
	
	get isOk() {
		if (this.id != null && this.name != null) {
			return true;
		}
		return false;
	}
	
	get tabURL() {
		return this.url;
	}
	
	get lcId() {
		return this.id;
	}
	
	get lcName() {
		return this.name;
	}
	
	get message() {
		return this.msg;
	}
}

// --------------------------------- Assign actions on button press events ---------------------------------

function setOnClick(tabURL, loadcaseId) {
	let buttonGenerateReport = document.getElementById('button-generate');
	buttonGenerateReport.addEventListener('click', function() {
		onGenerateReportClickAction(tabURL, loadcaseId);
	}, false);

	let buttonBrowseTemplate = document.getElementById('upload-template');
	buttonBrowseTemplate.addEventListener('click', function() {
		onBrowseTemplateClickAction();
	}, false);

	let useSimulationAsTarget = document.getElementById('use-simulation-as-target');
	useSimulationAsTarget.addEventListener('click', function() {
		onUseSimulationKeyResultsAsTargetsClickAction();
	}, false)
}

// ------------------------------ When user click on `Browse template` button ------------------------------

function onBrowseTemplateClickAction() {

	let fileChooser = document.createElement('input');
	fileChooser.type = 'file';
	fileChooser.addEventListener('change', async function() {
		let file = fileChooser.files[0];
		if (!file.type.match('text/html')) {
			alert('Only HTML files supported!');
			return;
		}
		let fileContent = await parse(file);

		chrome.runtime.sendMessage({
			sender: 'popup',
			event: 'template_selected',
			content: fileContent
		});

	})
	fileChooser.click();

}

// --------------------------------- When user click on `Generate` button ----------------------------------

function onGenerateReportClickAction(tabURL, loadcaseId) {
	
	document.getElementById('progress-wrapper').style.visibility = 'visible';

	let loadcaseSimulations = document.getElementsByClassName('loadcase-simulation');
	console.log('Get ' + loadcaseSimulations.length + ' simulations from loadcase');
	
	let checkedSimulations = Array.from(loadcaseSimulations).filter(entry => entry.checked == true);
	console.log(checkedSimulations.length + ' simulations selected');
	let checkedSimulationsIds = Array.from(checkedSimulations, item => item.id);
	
	let reportType = document.getElementsByClassName('report-type');
	console.log('Number of supported report types: ' + reportType.length);
	let isReportTypeSelected = false;
	let selectedReportType = null;
	for (let entry of reportType) {
		console.log('Processing report type ' + entry.value + '...');
		if (entry.checked) {
			isReportTypeSelected = true;
			selectedReportType = entry.value;
			console.log('Selected report type: ' + entry.value);
			break;
		}
	}
	if (!isReportTypeSelected) {
		alert('Select report type!')
		console.error('Select report type first!');
	}

	let useSimulationAsTargetCheckBox = document.getElementById('use-simulation-as-target');
	let useSimulationAsTarget = useSimulationAsTargetCheckBox.checked;
	let dropdownList = document.getElementById('simulation-with-targets');
	let selectedSimulationName = useSimulationAsTarget ? dropdownList.value : null;
	let labels = document.getElementsByClassName('loadcase-simulation-label');
	let filteredLabels = Array.from(labels).filter(entry => entry.innerText == selectedSimulationName);
	let selectedSimulationId = (useSimulationAsTarget && filteredLabels.length == 1) ? filteredLabels[0].htmlFor : null;
	
	chrome.runtime.sendMessage(
		{
			sender: 'popup',
			event: 'report_requested',
			url: tabURL,
			loadcase: loadcaseId,
			simulations: checkedSimulationsIds,
			simulationAsTarget: selectedSimulationId,
			reportType: selectedReportType
		}
	);

}

// ------------------ When user ckick on `Use simulation key results as targets` checkbox ------------------

function onUseSimulationKeyResultsAsTargetsClickAction() {

	let dropdown = document.getElementById('simulation-with-targets');
	let checkbox = document.getElementById('use-simulation-as-target');
	dropdown.disabled = !checkbox.checked;

}

// ----------------- Main function of popup.js script | Behaviour based on caller tab URL ------------------

async function buildPopupDependentOnCurrentHostName() {
    var p = new Promise(function(resolve, reject) {
        chrome.tabs.query(
            {
                active: true,
                currentWindow: true
            }, 
            function(tabs) {
                let callerTabUrl = new URL(tabs[0].url);
                resolve(callerTabUrl);
            }
        );
    });
    
    const currentTabUrl = await p;
    	
    await validateUrl(currentTabUrl);
}

// -------------------------------------------- Check given URL --------------------------------------------

async function validateUrl(currentTabUrl) {
    const patternHostName =/(192\.168\.125\.100|192\.168\.129\.100|cml-bench)/ugm;
    const isHostValid = patternHostName.test(currentTabUrl.hostname);
    console.log(`validateUrl:: Current Host Name: ${currentTabUrl.hostname}`);
    console.log(`validateUrl:: Match: ${isHostValid}`);
    
    if (isHostValid) {
		const loadcaseValidation = await validateLoadcase(currentTabUrl);
		if (loadcaseValidation.isOk) {
			await buildSuccessPopup(loadcaseValidation.tabURL, loadcaseValidation.lcId, loadcaseValidation.lcName);
		} else {
			buildErrorPopup(loadcaseValidation.message);
		}
	} else {
		buildErrorPopup('Wrong Host Name');
	}
}

// ------------------------------- Try to find valid loadcase from given URL -------------------------------s

async function validateLoadcase(currentTabUrl) {
	const currentHash = currentTabUrl.hash;
	console.log(`validateLoadcase:: Current Hash: ${currentHash}`);
	const patternLoadcase = /^#.+\/loadcase\/(?<lcid>\d+)\/.*$/ugm;
	const isLoadcaseFound = patternLoadcase.test(currentHash);
	
	if (isLoadcaseFound) {
		console.log(`validateLoadcase:: Loadcase detected`);
		patternLoadcase.lastIndex = 0; // Reset RegExp
		const match = patternLoadcase.exec(currentHash);
		console.log(`validateLoadcase:: Loadcase ID: ${match.groups.lcid}`);
		// Send request to check existence of loadcase with such id
		const url = currentTabUrl.protocol + '//' + currentTabUrl.host + '/rest/loadcase/' + match.groups.lcid;
		let response = await fetch(url, {method: 'GET'});
		if (response.status == 200) {
			let payload = await response.json();
			let id = payload.id;
			let name = payload.name;
			if (id == match.groups.lcid) {
				return new LoadcaseValidationResponse(currentTabUrl, id, name, 'Success');
			} else {
				return new LoadcaseValidationResponse(null, null, null, 'Unbelievable situation: server returns ID, that differs from the present in URL');
			}
		} else {
			return new LoadcaseValidationResponse(null, null, null, 'Error occurred during connection to server');
		}
	} else {
		console.error(`validateLoadcase:: Can not detect loadcase`);
		return new LoadcaseValidationResponse(null, null, null, 'Cannot parse loadcase from the URL');
	}		
}

// ------------------------------------------- Build error page --------------------------------------------

function buildErrorPopup(message) {
    let d = document.getElementById('popup-background');
	d.innerHTML = 
`
<div id="error-message-wrapper" class="error-message-wrapper">
	<div id="error-message-title" class="title">
		Error occurred:
	</div>
	<div id="error-message-content" class="content">
		<p id="message-text">
			${message}
		</p>
	</div>
</div>
`;
}

// ------------------------------------------ Build success page -------------------------------------------

async function buildSuccessPopup(tabURL, loadcaseId, loadcaseName) {
	let result = await buildSimulationList(tabURL, loadcaseId);
	let simListHTML = result.SimulationCheckboxes;
	let dropdownHTML = result.DropdownContent;
	let d = document.getElementById('popup-background');
	d.innerHTML = 
`
<div id="loadcase-wrapper" class="loadcase-wrapper">
	<div id="loadcase-title" class="title">
		Found loadcase:
	</div>
	<div id="loadcase-info" class="content">
		id = ${loadcaseId}
		<br>
		name = ${loadcaseName}
	</div>
</div>
<div id="report-wrapper" class="report-wrapper">
	<div id="report-title" class="title">
		Report type:
	</div>
	<div id="report-types" class="content">
		<div id="report-types-splitter" class="content-columns">
			<div id="report-types-select" class="inner-content">
				<input type="radio" id="report-type-1" name="report-type" value="single-solver" class="report-type">
				<label for="report-type-1">Single solver</label><br>
				<input type="radio" id="report-type-2" name="report-type" value="benchmark" class="report-type">
				<label for="report-type-2">Benchmark</label><br>
			</div>
			<div id="report-types-upload" class="inner-content">
				<button id="upload-template" class="upload-template">
					Browse template
				</button>
			</div>
		</div>
	</div>
</div>
<div id="simulations-wrapper" class="simulations-wrapper">
	<div class="main-simulation-wrapper">
		<div id="simulations-title" class="title">
			List of simulations:
			<div id="simulations-description" class="description">
				Key results from selected<br>
				simulations will be used<br>
				to generate the report
			</div>
		</div>
		<div id="simulations-content" class="content">
			<div id="simulations-list" class="simulations-list">
				${simListHTML}
			</div>
		</div>
	</div>
	<div class="hr-simulation-wrapper">
		<hr>
	</div>
	<div class="additional-simulation-wrapper">
		<div class="simulation-options">
			<input type="checkbox" id="use-simulation-as-target" name="simulation-as-target" class="simulation-as-target">
			<label id="simulation-as-target-label" for="simulation-as-target">Use simulation key results as targets</label>
		</div>
		<div class="simulation-options-content">
			<select id="simulation-with-targets" name="simulation-with-targets" class="simulation-with-targets">
				${dropdownHTML}
			</select>
		</div>
	</div>
</div>
<div id="controls-wrapper" class="controls-wrapper">
	<div id="button-wrapper" class="button-wrapper">
		<button id="button-generate" class="button-generate"> 
			Generate
		</button>
	</div>

	<div id="progress-wrapper" class="progress-wrapper">
		<div id="progress-bar" class="progress-bar">
			<progress max="100" value="0"></progress>
		</div>
		<div id="progress-value" class="progress-value">
			<label id="total-progress">0%</label>
		</div>
	</div>
</div>
`;

	let useSimulationAsTarget = document.getElementById('use-simulation-as-target');
	useSimulationAsTarget.checked = false;

	let simulationsDropdownList = document.getElementById('simulation-with-targets');
	simulationsDropdownList.disabled = true;

	setOnClick(tabURL, loadcaseId);
}

// --------------------- Part of success page: list of simulations of current loadcase ---------------------

async function buildSimulationList(tabURL, loadcaseId) {
	const url = tabURL.protocol + '//' + tabURL.host + '/rest/loadcase/' + loadcaseId + '/simulation/list';
	let response = await fetch(url, {
		method: 'POST',
		headers: {
			'Accept': 'application/json, text/javascript, */*',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			filters: {},
			sort: [],
			pageable: {
				size: Parameters.MAX_SIMULATIONS_PER_LOADCASE,
				page: 1
			}
		})
	});
	
	let checkboxes = '';
	let dropdown = '';
	
	if (response.status == 200) {
		let payload = await response.json();
		let content = payload.content;
		
		checkboxes += 
`
<div id="sumulations-list-wrapper" class="simulations-list-wrapper">
`;

		let n = 1;
		
		for (let item of content) {
			let itemRepr = 
`
<div id="simulation-${format0d(n)}-wrapper" class="simulation-checkbox">
	<input type="checkbox" id="${item.id}" name="simulation-${format0d(n)}" class="loadcase-simulation">
	<label id="label-${item.id}" class="loadcase-simulation-label" for="${item.id}">${item.name}</label>
</div>
`;

			checkboxes += itemRepr;

			dropdown += 
`
<option value="${item.name}">${item.name}</option>
`;
		}
		checkboxes += 
`
</div>
`;
	}
	
	let result = {
		SimulationCheckboxes: checkboxes,
		DropdownContent: dropdown
	}
	return result;
}

// ---------------------------------------- Setup message listener -----------------------------------------

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {

	if (message.sender == 'background' && message.event == 'progress-changed') {
		let progressValue = message.progress;

		document.querySelector('progress').value = progressValue;
		let progressLabel = document.getElementById('total-progress');
		progressLabel.innerHTML = `${Number(progressValue).toFixed(2)}%`;
		progressLabel.style.color = `#${value2color(Number(progressValue).toFixed(5))}`;
	}

});

// -------------------------------------- popup.js script entry point --------------------------------------

buildPopupDependentOnCurrentHostName();
