'use strict'

let fs = require('fs');
let parse = require('csv-parse');
let iconv = require('iconv-lite');

let aErrors = new Array();

//stop-gap solution to handling of invalid characters - now may be unnecessary due to improved file encoding handling
//left for now to help ensure that script can execute without crashing
function removeInvalidChars( inputString, inputSource, loggingString ) {
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
		outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, "");
		aErrors.push( "O: " + loggingString + '\r\n' + "F: " + outputString)
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
let inputFileName = "", outputFileNameTemplate = "", outputPlaceHolder = "~!@!~", errorFileName = "", interimFileName, outputFileName, outputFolderName;

if( process.argv.length < 3 ) {
	console.error( "ERROR: Missing command line arguments.\r\n\r\nUSAGE: \r\n node index.js INPUTFILENAME [MAPPINGFILENAME]\r\n\r\nMAPPINGFILENAME is optional\r\n");
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


if( !fs.existsSync(outputFolderName) ) {
	fs.mkdirSync(outputFolderName);
}

interimFileName = outputFileNameTemplate.replace(outputPlaceHolder, "") + ".interim.csv";
errorFileName = outputFileNameTemplate.replace(outputPlaceHolder, "") + ".error.txt"

//START: Output File
var options = {declaration: {
	encoding: "UTF-8",
	version: "1.0"
}};

const HS_EDULEVEL = "9,10,11,12";

//output helpful messages for files to be used
console.log("Input file identified as: ", inputFileName);
console.log("Output filename template identified as: ", outputFileNameTemplate);

let arraySorter = (e1, e2) => {
	let depth = 0;
	while( (depth < 4) && (e1[depth] == e2[depth]) ) {
		depth++;
	}
	if( e1[depth].toUpperCase() < e2[depth].toUpperCase() ) {
		return -1;
	} else {
		return 1;
	}
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
		let grouping = row[0].substr(0,1);
		let found = false;
		if( isNaN(grouping) ) {
			grouping = row[0].split(":")[0]
		}
		for( let mapping of mapMappings.keys() ) {
			if( grouping.substr(0, mapping.length) == mapping ) {
				grouping = mapMappings.get(mapping);
				found = true;
				break;
			}
		}
		row.unshift(grouping);
	}

	let numRows = data.length;
	if( numRows <= 1 ) return;	//no work to do here

	let header = data[1];
	let depth = header.length;
	if( depth <=1 ) return;	//no work to do here

	let maxDepth = 0, maxDepthIndex = 0, currentDepth = 0;
	const HEADER_ROW = "Hierarchy|EducationLevel|Notation|Description";

	let currentFirstLevel = "", currentSecondLevel = "", currentThirdLevel = "", currentFourthLevel, currentGradeLevel = "", currentNotation = "", placeholderVal, prevPlaceholderVal = "";
	let prevFirstLevel = "", prevSecondLevel = "", prevThirdLevel = "";

	let eduLevel, notation, desc;
	
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

		eduLevel = currentFirstLevel.substr(0,1);
		//placeholderVal = eduLevel;
		if( isNaN(eduLevel) ) {
			eduLevel = HS_EDULEVEL;
		}

		if( !mapOverall.has(placeholderVal) ) {
			mapOverall.set(placeholderVal, new Array());
			mapOverall.get(placeholderVal).push(HEADER_ROW);

			mapOverallExclusions.set(placeholderVal, new Array());
		}

		if( currentFirstLevel != prevFirstLevel ) {
			notation = currentFirstLevel.split(":")[0];
			desc = removeInvalidChars(currentFirstLevel.split(":")[1], 1);

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
			notation = currentSecondLevel.split(":")[0];
			desc = removeInvalidChars(currentSecondLevel.split(":")[1], 2);

			targetMap.get(placeholderVal).push(`\t|${eduLevel}|${notation}|${desc}`);

			prevSecondLevel = currentSecondLevel;
		}

		if( currentThirdLevel != prevThirdLevel ) {
			notation = currentThirdLevel.split(":")[0];
			desc = removeInvalidChars(currentThirdLevel.split(":")[1],3);

			targetMap.get(placeholderVal).push(`\t\t|${eduLevel}|${notation}|${desc}`);

			prevThirdLevel = currentThirdLevel;
		}

		notation = currentFourthLevel.split(":")[0];
		desc = removeInvalidChars(currentFourthLevel.split(":")[1],4);

		if( notation && desc ) {
			targetMap.get(placeholderVal).push(`\t\t|${eduLevel}|${notation}|${desc}`);
		}

	}


	for( let placeholder of mapOverall.keys() ) {
		if( mapOverall.get(placeholder).length > 1 ) {	//a length of 1 would be only the header
			outputFileName = outputFileNameTemplate.replace(outputPlaceHolder, placeholder.replace(/[\\/:*?\"<>|]/g,""));
			fs.writeFileSync(outputFileName, mapOverall.get(placeholder).join("\r\n"), options);
		}
	}

	for( let placeholder of mapOverallExclusions.keys() ) {
		if( mapOverallExclusions.get(placeholder).length > 0 ) {	//there are no header rows in the exclusions array
			outputFileName = outputFileNameTemplate.replace(outputPlaceHolder, `_zz_excluded-${placeholder.replace(/[\\/:*?\"<>|]/g,"")}`);
			fs.writeFileSync(outputFileName, mapOverallExclusions.get(placeholder).join("\r\n"), options);
		}
	}

	var currentDate = new Date();
	if( aErrors.length > 0 ) {
		console.warn("WARNING: Invalid XML characters detected, output results to: " + errorFileName);
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

