'use strict'

let fs = require('fs');
let parse = require('csv-parse');
let iconv = require('iconv-lite');

let aErrors = new Array();
let aWarnings = new Array();

//stop-gap solution to handling of invalid characters - now may be unnecessary due to improved file encoding handling
//left for now to help ensure that script can execute without crashing
function removeInvalidChars( inputString, inputSource, loggingString, notation ) {
	let outputString = inputString;
	if( !loggingString ) {
			loggingString = inputString;
	}

	if( outputString ) {
		/*
			special case character removal - do not log as error
			\uFEFF = no-width, non-breaking space
		*/
		outputString = outputString.replace(/[\uFEFF]/g,"");
	}

	if( !(new RegExp(/^((\u0009|\u000A|\u000D|[\u0020-\uD7FF])|([\uD800-\uDBFF][\uDC00-\uDFFF]))*$/).test(outputString)) ) {
		// handle résumé
		outputString = outputString.replace(/r[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]sum[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, "résumé");

		// handle canapé
		outputString = outputString.replace(/canap[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, "canapé");

		// handle sauté
		outputString = outputString.replace(/saut[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, "sauté");

		// handle protégé
		outputString = outputString.replace(/prot[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]g[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, "protégé");

		// handle consommé
		outputString = outputString.replace(/consomm[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, "consommé");

		// handle Carême
		outputString = outputString.replace(/Car[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]me/g, "Carême");

		// handle décolleté
		outputString = outputString.replace(/d[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]collet[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, "décolleté");

		// handle double quoted word with missing trailing double quote
		outputString = outputString.replace(/\"([a-zA-z]+)[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, `"$1"`);

		// student organization� can
		outputString = outputString.replace(/student organization[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF] can/g, 'student organization can');

		// related student organizations�
		outputString = outputString.replace(/related student organizations[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, 'related student organizations - ');

		// handle "5 chords"
		outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]5 chords[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, '"5 chords"');

		// handle "s' "
		outputString = outputString.replace(/s[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF] /g, "s' ");

		// handle mâché
		outputString = outputString.replace(/m[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]ch[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, "mâché");

		// handle trailing bad character
		outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]$/g, "");

		// handle "riffs"
		outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]riffs[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, '"riffs"');

		// handle "advance fee"
		outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]advance fee[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, '"advance fee"');

		// handle "unbanked"
		outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]unbanked[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, '"unbanked"');

		// handle "gap year"
		outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]gap year[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, '"gap year"');

		// handle the�Career
		outputString = outputString.replace(/the[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]Career/g, "the Career");

		// handle Technical�Student
		outputString = outputString.replace(/Technical[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]Student/g, "Technical Student");

		// NFPA�
		outputString = outputString.replace(/NFPA[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, "NFPA®");

		// need�for
		outputString = outputString.replace(/need[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]for/g, "need for");

		// sections�of
		outputString = outputString.replace(/sections[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]of/g, "sections of");

		// "graphs"�and
		// outputString = outputString.replace(/"graphs"[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]and/g, '"graphs" and');

		// �know
		outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]know/g, "'know");

		// organization�
		outputString = outputString.replace(/organization[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, "organization - ");

		// �Tis
		outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]Tis/g, "'Tis");

		// how�geological
		outputString = outputString.replace(/how[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]geological/g, "how geological");

		// surface�at
		outputString = outputString.replace(/surface[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]at/g, "surface at");

		// �oral, written, and non- verbal�
		outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]oral, written, and non- verbal[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, " (oral, written, and non- verbal) ");

		// utilize�
		outputString = outputString.replace(/utilize[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, "utilize");

		// system�
		outputString = outputString.replace(/system[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, "system");

		// Br�nsted
		outputString = outputString.replace(/Br[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]nsted/g, "Brønsted");

		// model�the
		outputString = outputString.replace(/model[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]the/g, "model the");

		// p�tissier
		outputString = outputString.replace(/p[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]tissier/g, "pâtissier");

		// demonstrate�strategies
		outputString = outputString.replace(/demonstrate[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]strategies/g, "demonstrate strategies");

		// viewpoints�person
		outputString = outputString.replace(/viewpoints[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]person/g, "viewpoints - person");

		// patterns,�with
		outputString = outputString.replace(/patterns,[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]with/g, "patterns, with");

		// execute�a
		outputString = outputString.replace(/execute[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]a/g, "execute a");

		// �wheel rotations�
		outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]wheel rotations[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, ' "wheel rotations" ');

		// $ and �
		outputString = outputString.replace(/\$ and [^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, '$ and ¢');

		// � [0-9b]
		outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF] ([0-9b]+)/g, '/ $1');

		// degrees
		outputString = outputString.replace(/(30|45|60)[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, '$1 degrees');

		// n�2
		outputString = outputString.replace(/n[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]\+1/g, 'n^2+1');

		// �-V
		outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]-([IV]+)/g, '1/2-$1');

		// � through V
		outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF] through V+/g, '1/2 through V');

		// �a (mod m)�
		outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]a \(mod m\)[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, '"a (mod m)"');

		// handle 's
		outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]s /g, "'s ");

		// handle remainder
		outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, " ");
		outputString = outputString.replaceAll('  ', ' ');

		aWarnings.push("N:" + notation + "\r\nO: " + loggingString + '\r\n' + "F: " + outputString)
	}

	if( !(new RegExp(/^((\u0009|\u000A|\u000D|[\u0020-\uD7FF])|([\uD800-\uDBFF][\uDC00-\uDFFF]))*$/).test(outputString)) ) {
		//outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, "");
		aErrors.push("N:" + notation + "\r\nO: " + loggingString + '\r\n' + "F: " + outputString)
	}
	if( outputString ) {
		outputString = outputString.trim();
	}
	return outputString;
}

//pull input and output filenames from the command line - expected format is
//USAGE:
//		node index.js INPUTFILENAME [MAPPINGFILENAME]
//
//output file will default to the input file name with a .xml file extension added to it
let inputFileName = "", outputFileNameTemplate = "", outputPlaceHolder = "~!@!~", errorFileName = "", warningFileName = "", interimFileName, outputFileName, outputFolderName;

if( process.argv.length < 3 ) {
	console.error( "ERROR: Missing command line arguments.\r\n\r\nUSAGE: \r\n node index-asn.js INPUTFILENAME [MAPPINGFILENAME] [OUPUTEXCLUSIONS]\r\n\r\nMAPPINGFILENAME is optional\r\nOUTPUTEXCLUSIONS is optional (0 {default} = do not output exlusions, 1 = output exlusions to file)");
	return;
}

inputFileName = process.argv[2];
outputFolderName = inputFileName + "-output";
outputFileNameTemplate = outputFolderName + "/" + outputPlaceHolder + ".txt";

let mappingsFile = "", mapMappings = new Map(), mapExclusions = new Map();
if( process.argv.length >= 4 ) {
	mappingsFile = process.argv[3];

	let objMappings = JSON.parse( fs.readFileSync(mappingsFile) );
	for( let mapping of objMappings ) {
		for( let prefix of mapping.prefixes ) {
			mapMappings.set(prefix, mapping.group);
		}
		for( let exclusion of mapping.exclusions ) {
			mapExclusions.set(exclusion, mapping.group);
		}
	}
}

let outputExclusions = false;
if( process.argv.length >= 5 ) {
	if( parseInt(process.argv[4]) == 1 ) {
		outputExclusions = true;
	}
}


if( !fs.existsSync(outputFolderName) ) {
	fs.mkdirSync(outputFolderName);
}

interimFileName = outputFileNameTemplate.replace(outputPlaceHolder, "") + ".interim.csv";
errorFileName = outputFileNameTemplate.replace(outputPlaceHolder, "").replace('.txt', '') + "__error.txt"
warningFileName = outputFileNameTemplate.replace(outputPlaceHolder, "").replace('.txt', '') + "__warning.txt"

//START: Output File
var options = {declaration: {
	encoding: "UTF-8",
	version: "1.0"
}};

const HEADER_ROW = "Hierarchy|EducationLevel|Notation|Description";

const EDULEVEL_ELEM = "K,1,2,3,4,5";
const EDULEVEL_MS = "6,7,8";
const EDULEVEL_HS = "9,10,11,12";

//output helpful messages for files to be used
console.log("Input file identified as: ", inputFileName);
console.log("Output filename template identified as: ", outputFileNameTemplate);

let arraySorter = (a, b) => {
	const [, aGrade, aNotation] = a.split('|');
	const [, bGrade, bNotation] = b.split('|');

	const arrA = aNotation.split('.');
	const arrB = bNotation.split('.');

	// console.log(arrA, arrB);
	let depth = 0;
	while( arrA[depth] === arrB[depth] ) {
		if ((depth >= arrA.length) && (depth >= arrB.length)) {
			return 0;
		}
		depth += 1;
	}
	
	const compareA = (depth < arrA.length) ? arrA[depth] : '';
	const numA = Number.parseInt(compareA, 10);
	const firstA = compareA.slice(0,1);

	const compareB = (depth < arrB.length) ? arrB[depth] : '';
	const numB = Number.parseInt(compareB, 10)
	const firstB = compareB.slice(0,1);
	
	let biggerThanA = false;
	if (aGrade !== bGrade) {
		if (aGrade === 'K') {
			biggerThanA = true;
		} else if (bGrade === 'K') {
			biggerThanA = false;
		} else if (aGrade.startsWith('K')) {
			biggerThanA = true;
		} else if (bGrade.startsWith('K')) {
			biggerThanA = false;
		} else {
			biggerThanA = (bGrade > aGrade);
		}
	} else if (Number.isNaN(numA) || Number.isNaN(numB)) {
		biggerThanA = (compareA.toUpperCase() < compareB.toUpperCase());
	} else {
		biggerThanA = (numA < numB);
	}

	// console.log(`${aNotation}\t${bNotation}\t${biggerThanA}`);
	
	if (biggerThanA) {
		return -1;
	}

	return 1;
}

let mapOverall = new Map();
let mapOverallExclusions = new Map();
let targetMap;

//parse the input CSV file
//NOTE: File is expected to have a header row that should be ignored
let parser = parse( {delimiter: ','}, (err, data) => {

	if( err ) {
		console.error(err);
	}

	data.shift(); //skip over the header row in the file

	let newdata = new Array();

	//add grouping to the first column of every row
	for( let row of data ) {
		let grouping = row[0].split(":")[0];
		let found = false;

		let maxMappingLength = 0;
		for( let mapping of mapMappings.keys() ) {
			if ((grouping.substr(0, mapping.length) == mapping) && (mapping.length > maxMappingLength)) {
				grouping = mapMappings.get(mapping);
				maxMappingLength = mapping.length;
				found = true;
				// break;
			}
		}

		row.unshift(grouping);
	}

	// fs.writeFileSync('./temp.txt', data.map((e) => e.join(',')).join('\n'));

	let numRows = data.length;
	if( numRows <= 1 ) return;	//no work to do here

	let header = data[1];
	let depth = header.length;
	if( depth <=1 ) return;	//no work to do here

	let maxDepth = 0, maxDepthIndex = 0, currentDepth = 0;

	let currentFirstLevel = "", currentSecondLevel = "", currentThirdLevel = "", currentFourthLevel, currentGradeLevel = "", currentNotation = "", placeholderVal, prevPlaceholderVal = "";
	let prevFirstLevel = "", prevSecondLevel = "", prevThirdLevel = "";

	let eduLevel, notation, desc;
	
	const mML = {};

	//go through each row in the array of items
	for( var i = 0; i < numRows; i++ ) {
		currentDepth = data[i].length-1;
		if( currentDepth < 2) {
			continue;	//an empty row or a row with no sub-items
		}

		placeholderVal = data[i][0];
		currentFirstLevel = data[i][1];
		currentSecondLevel = data[i][2];
		currentThirdLevel = data[i][3];
		currentFourthLevel = data[i][4];

		eduLevel = currentFirstLevel.substring(0,1);
		const mlPrefix = currentFirstLevel.split(':')[0];

		//placeholderVal = eduLevel;
		if (currentFirstLevel.startsWith('ML')) {
			if (mlPrefix.endsWith('6-8') || mlPrefix.endsWith('678')) {
				eduLevel = EDULEVEL_MS;
			} else if (mlPrefix.slice(-3) === 'MS7'|| mlPrefix.slice(-3) === 'MS8') {
				eduLevel = mlPrefix.slice(-1);
			} else {
				eduLevel = EDULEVEL_HS;
			}
		} else if (currentFirstLevel.startsWith('ESBC')) {
			eduLevel = EDULEVEL_ELEM;
		} else if (isNaN(eduLevel) && (eduLevel !== 'K')) {
			eduLevel = EDULEVEL_HS;
		}

		if (mlPrefix.startsWith('ML')) {
			mML[mlPrefix] = eduLevel;
		}
	
		if( !mapOverall.has(placeholderVal) ) {
			mapOverall.set(placeholderVal, new Array());
			//mapOverall.get(placeholderVal).push(HEADER_ROW);

			mapOverallExclusions.set(placeholderVal, new Array());
		}

		const getNotationAndDesc = (levelString, levelNum) => {
			const arrLevel = levelString.split(':');
			const notation = arrLevel[0];
			let baseDesc;
			if (arrLevel.length > 2) {
				baseDesc = arrLevel.slice(1).join(':');
			} else {
				baseDesc = arrLevel[1];
			}
			const desc = removeInvalidChars(baseDesc, levelNum, null, notation);
			return { notation, desc };
		};

		if( currentFirstLevel != prevFirstLevel ) {
			({ notation, desc } = getNotationAndDesc(currentFirstLevel, 1));

			targetMap = mapOverall;
			for( let exclusion of mapExclusions.keys() ) {
				if( currentFirstLevel.substr(0, exclusion.length) == exclusion ) {
					targetMap = mapOverallExclusions;
					break;
				}
			}

			targetMap.get(placeholderVal).push(`|${eduLevel}|${notation}|${desc}`);

			prevFirstLevel = currentFirstLevel;
		}

		if( currentSecondLevel != prevSecondLevel ) {
			({ notation, desc } = getNotationAndDesc(currentSecondLevel, 2));

			targetMap.get(placeholderVal).push(`\t|${eduLevel}|${notation}|${desc}`);

			prevSecondLevel = currentSecondLevel;
		}

		if( currentThirdLevel != prevThirdLevel ) {
			({ notation, desc } = getNotationAndDesc(currentThirdLevel, 3));

			targetMap.get(placeholderVal).push(`\t\t|${eduLevel}|${notation}|${desc}`);

			prevThirdLevel = currentThirdLevel;
		}

		({ notation, desc } = getNotationAndDesc(currentFourthLevel, 4));

		if( notation && desc ) {
			targetMap.get(placeholderVal).push(`\t\t|${eduLevel}|${notation}|${desc}`);
		}
	}

	for (const [key, val] of Object.entries(mML)) {
		console.log(`${key}\t${val}`);
	}

	for( let placeholder of mapOverall.keys() ) {
		if( mapOverall.get(placeholder).length > 1 ) {	//a length of 1 would be only the header
			outputFileName = outputFileNameTemplate.replace(outputPlaceHolder, placeholder.replace(/[\\/:*?\"<>|]/g,""));
			fs.writeFileSync(outputFileName, [HEADER_ROW].concat(mapOverall.get(placeholder).sort(arraySorter)).join("\r\n"), options);
			console.log(`FINISHED - ${outputFileName}`)
		}
	}

	console.log('FINISHED - writing ASN files');

	if( outputExclusions ) {
		for( let placeholder of mapOverallExclusions.keys() ) {
			if( mapOverallExclusions.get(placeholder).length > 0 ) {	//there are no header rows in the exclusions array
				outputFileName = outputFileNameTemplate.replace(outputPlaceHolder, `_zz_excluded-${placeholder.replace(/[\\/:*?\"<>|]/g,"")}`);
				fs.writeFileSync(outputFileName, mapOverallExclusions.get(placeholder).join("\r\n"), options);
			}
		}

		console.log('FINISHED - writing EXCLUSION files');
	}

	var currentDate = new Date();
	if( aWarnings.length > 0 ) {
		console.warn("WARNING: Invalid characters detected and hopefully fixed, output results to: " + errorFileName);
		fs.writeFileSync( warningFileName, "### " + currentDate + ": " + aWarnings.length + " warnings\r\n\r\n" + aWarnings.join("\r\n\r\n") );
	}

	if( aErrors.length > 0 ) {
		console.warn("WARNING: Invalid characters detected, output results to: " + errorFileName);
		fs.writeFileSync( errorFileName, "### " + currentDate + ": " + aErrors.length + " errors\r\n\r\n" + aErrors.join("\r\n\r\n") );
	} else {
		if( fs.existsSync(errorFileName) ) {
			fs.writeFileSync( errorFileName, "### " + currentDate + ": 0 errors")
		}
	}
});


fs.createReadStream(inputFileName).pipe( parser );

//provide message to user to let them know it is still running
console.log("Processing...");

