/**
 * The PB Archiver
 */

'use strict';

const moment = require('moment'),
  path = require('path'),
  fs  = require('fs'),
  request = require('sync-request');

const API_URI="https://api.privatbank.ua/p24api/exchange_rates?json&date=";
const OUT_DIR=path.resolve(__dirname, "zip");
const FORMAT = 'DD.MM.YYYY';
const CURRENT_YEAR = moment().format('YYYY-01-01');
const TODAY = moment(moment().format('YYYY-MM-DD'));
const START_DATE = moment("2011-01-01");

let currentDate = moment(START_DATE);
let fds = {};

if (!fs.existsSync(OUT_DIR)) {
  throw new Error("No output folder found");
}

if (!fs.existsSync(path.resolve(OUT_DIR, 'dump'))) {
  fs.mkdirSync(path.resolve(OUT_DIR, 'dump'));
}

const createFD = function(name) {
  let filename = path.resolve(OUT_DIR, name + '.json');

  fds[name] = fs.createWriteStream(filename);
}

while(!currentDate.isSame(CURRENT_YEAR, 'year')) {
  let filename = path.resolve(OUT_DIR, currentDate.format('YYYY') + '.json');
  if (!fs.existsSync(filename)) {
    createFD(currentDate.format('YYYY'));
  }
  currentDate = currentDate.add(1, 'year');
}

createFD(moment(CURRENT_YEAR).format('YYYY'));


const fetchRemote = function (date) {
  try {
    let res = request('GET', API_URI + date);
    return res.getBody('utf8');
  } catch(e) {
    console.log(e.body.toString());
    process.exit(1);
  }
}

const fetchData = function(currentDate) {
  const date = currentDate.format(FORMAT);
  const FILENAME = path.resolve(OUT_DIR, 'dump/' + date + '.json');

  if (fs.existsSync(FILENAME)) {
    return fs.readFileSync(FILENAME);
  }

  let data = JSON.parse(fetchRemote(date));

  if (data.hasOwnProperty('date')) {
    const out = JSON.stringify(data);

    /**
     *  Do not cachee last year leaks
     */
    if (data.exchangeRate.length < 1 && currentDate.isSame(TODAY, 'year')) {
      console.log('Empty data for ' + date);
    } else {
      console.log('Caching ' + date);
      fs.writeFileSync(path.resolve(OUT_DIR, 'dump/' + date + '.json'), out);
    }

    return out;
  }

  return false;
}

currentDate = moment(START_DATE);
let lastYear = null;
Object.keys(fds).forEach(k => fds[k].write('['));

while(!currentDate.isSame(TODAY)) {
  let year = currentDate.format('YYYY');

  if (fds.hasOwnProperty(year)) {
    let data = fetchData(currentDate);

    if (data === false) {
      console.log('No data available for ' + currentDate.format(FORMAT));
    } else {

      if (lastYear !== year) {
        lastYear = year;
      } else {
        fds[year].write(',\n');
      }

      fds[year].write(data);
    }
  }
  currentDate = currentDate.add(1, 'day');
}

Object.keys(fds).forEach(k => { fds[k].write(']'); fds[k].end(); });


