'use strict';

var fs = require('fs');
var d3 = require('./d3.js');
var moment = require('moment');
var path = require('path');

var getDataForCurrency = function(r, currency) {
  return r.exchangeRate.filter(function(e) { 
    return e.currency === currency})[0].saleRateNB;
}

var formatDate = d3.timeParse("%d.%m.%Y");
var CURRENCIES = ['AUD','CAD','JPY', 'CHF', 'RUB', 'GBP', 'USD',  'EUR'];
var TODAY = moment();
var YEAR_AGO = moment().subtract(1, 'year');
var DATA_DIR = path.resolve(__dirname, 'zip') + '/';

var lastYear = JSON.parse(fs.readFileSync(DATA_DIR + YEAR_AGO.format('YYYY') + '.json'));
var currYear = JSON.parse(fs.readFileSync(DATA_DIR + TODAY.format('YYYY') + '.json'));

var skip = false;
var raw = lastYear.concat(currYear)
  .filter(function(v) {
  if (skip === false && v.date === YEAR_AGO.format('DD.MM.YYYY')) {
    skip = true;
  }
  return skip;
});



var data = raw
.filter(function(r) { return !!r.exchangeRate.length })
.map(function(r) {
  var out = [];

  CURRENCIES.map(function(cur) {
    var val = cur === 'RUB' || cur == 'JPY'
      ?  getDataForCurrency(r, cur) * 10 : getDataForCurrency(r, cur);

   if (val === 0 || val === null) {
    return;
   }
    out.push(
      {
        date : formatDate(r.date),
        name : cur,
        val  : val
      }
    );
  });

  return out;
}).reduce(function(a,b) { return a.concat(b)}, []);


var D3Node = require('d3-node');
const styles = '.axis path,.axis line {fill: none;stroke: #000;shape-rendering: crispEdges;}.area {fill: lightsteelblue;}.line {fill: none;stroke: steelblue;stroke-width: 1.5px;} .dot {fill: white;stroke: steelblue;stroke-width: 1.5px;}';
const markup = '<div id="container"><h2>Line Chart (missing data)</h2><div id="chart"></div></div>';
var options = {selector:'#chart', svgStyles:styles, container:markup, d3Module:d3};
var d3n = new D3Node(options);

var svg = d3n.createSVG();

svg
  .attr('height', 500)
  .attr('width', 790);

var margin = {top: 20, right: 0, bottom: 50, left: 30},
    width = svg.attr("width") - margin.left - margin.right,
    height = svg.attr("height") - margin.top - margin.bottom;


// Set the ranges
var x = d3.scaleTime().range([0, width]),
    y = d3.scaleLinear().range([height, 0]);

// Define the axes
var xAxis = d3.axisBottom().scale(x).ticks(10);
var yAxis = d3.axisLeft().scale(y).ticks(20);


var color = d3.scaleOrdinal(d3.schemeCategory10);

// Define the line
var dataLine = d3.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.val); });

// Scale the range of the data
x.domain(d3.extent(data, function(d) { return d.date; }));
y.domain([0, d3.max(data, function(d) { return d.val; })]);


// Nest the entries by symbol
var dataNest = d3.nest()
    .key(function(d) {return d.name;})
    .entries(data);


// Loop through each symbol / key
dataNest.forEach(function(d, i) {
  svg.append("path")
    .attr('transform', 'translate(30, '+ margin.top +')')
    .attr("class", "line")
    .style("stroke", function() {
                return d.color = color(d.key); })
    .attr("d", dataLine(d.values)); 

  // Add the Legend
  svg.append("text")                                    // *******
      .attr("x", width - margin.left - i * 38) // spacing // ****
      .attr("y", height + margin.top + margin.bottom)         // *******
      .attr("class", "legend")    // style the legend   // *******
      .style("fill", function() { // dynamic colours    // *******
          return d.color = color(d.key); })             // *******
      .text(d.key);

});

// Add the X Axis
svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(30," +  (height + margin.top) + ")")
    .call(xAxis);

// Add the Y Axis
svg.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(30,"+margin.top+")")
    .call(yAxis);


svg.append('text')
  .attr('x', margin.left)
  .attr('y', height + margin.top + margin.bottom)
  .attr('class', 'legend')
  .style('fill', '#444')
  .text(YEAR_AGO.format('DD-MM-YYYY') + ' : ' + TODAY.format('DD-MM-YYYY'));

fs.writeFileSync(DATA_DIR + 'last_year.svg', d3n.svgString());
