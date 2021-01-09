# TVV Plugin

Google Chrome plugin for CML TVV Project

## Version

1.9.1

## Description

1. Purpose

    1.1. This plugin is made for building comparative reports on the calculations performed in CML-Bench system

    1.2. All reports are based on the templates, prepared by user

    1.3. This plugin should be used in conjunction with CML-Bench system

2. Requirements

    2.1. Last stable version of Google Chrome browser (current is 87)

    2.2. Access to the CML-Bench system

3. Installation

    3.1. Click on *"Customize and control Google Chrome"* button and go to *"More tools &#8594; Extensions"*\
         (Alternatively you can type `chrome://extensions/` in the address bar)

    3.2. Turn on *"Developer mode"*

    3.3. Click on *"Load unpacked"* button

    3.4. Select the extension directory (which must contain manifest.json file)

4. Usage

    4.1. In CML-Bench system go to the page of Loadcase entity for which the report should be created.\
         It's URL must contain word `loadcase`

    4.2. Click on the icon of TVV Plugin at the browser extension panel

    4.3. With the plugin user interface:

    * Select report type

    * Select report template (*"Browse template"* button)

    * Select Simulation entities for obtaining results for the report

    * Click on the *"Generate"* button

    * When report building is finished, select path to save generated report file

5. Report template

    5.1. A file with `*.html` extension can be used as a report template

    5.2. A report file should contain placeholders for the data to be obtained from the CML-Bench system

    5.3. Next placeholders are supported:

    |Placeholder|Description|
    |---|---|
    |`{{<simulation_name>:val:<value_name>}}`|Value of key result with name `value_name` of simulation with name `simulation_name`|
    |`{{<simulation_name>:pic:<picture_name>}}`|Picture with name `picture_name` of simulation with name `simulation_name`|
    |`{{<simulation_name>:crv:<curve_name>}}`|Curve with name `curve_name` of simulation with name `simulation_name` as a picture|
    |`{{<simulation_name>:crv:<curve_name>:cmp:asq}}`|Value of the relative difference between the squares of areas under the curve with name `curve_name` and the target curve with same name, if Simulation with target curves was selected by user|
    |`{{<simulation_name>:crv:<curve_name>:cmp:ssq}}`|Sum of the squared differences of values of curve with name `curve_name` and the target curve with same name, if Simulation with target curves was selected by user|
    |`{{<simulation_name>:crv:<curve_name>:cmp:dev}}`|Absolute value of maximum difference between values of curve with name `curve_name` and the target curve with same name, if Simulation with target curves was selected by user|
    |`{{<simulation_name>:status}}`|Status of the latest Task entity of simulation with name `simulation_name`|
    |`{{<simulation_name>:cores}}`|Number of cores used in the latest Task entity of simulation with name `simulation_name`|
    |`{{<simulation_name>:memory}}`|Amount of memory used in the latest Task entity of simulation with name `simulation_name`|
    |`{{target:val:<target_name>}}`|Value of the Loadcase target with name `target_name`|
    |`{{target:crv:<target_name>}}`|Curve with name `target_name` as picture taken from the Simulation selected by user as target (There is no Loadcase target curves in current version of the CML-Bench system)|
    |`{{curves:<curve_name>}}`|All curves with name `curve_name` from selected simulations as a single picture (for comparison reasons)|

## Content

`./tvv-plugin/chrome/tvv-plugin/` - main plugin directory\
`./tvv-plugin/report-templates-expamples/` - several `html` files as a report template examples\
`./tvv-plugin/test-loadcase-data/` - data for creating test loadcase in the CML-Bench system

## Author

Dmitriy Zhuravlyov

zhuravlev@compmechlab.ru
