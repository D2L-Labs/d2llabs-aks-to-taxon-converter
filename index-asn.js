'use strict'

var fs = require('fs');
var parse = require('csv-parse');
var iconv = require('iconv-lite');

var aErrors = new Array();

//stop-gap solution to handling of invalid characters - now may be unnecessary due to improved file encoding handling
//left for now to help ensure that script can execute without crashing
function removeInvalidChars( inputString, inputSource, loggingString ) {
	var outputString = inputString;
	if( !loggingString ) {
			loggingString = inputString;
	}

	if( !(new RegExp(/^((\u0009|\u000A|\u000D|[\u0020-\uD7FF])|([\uD800-\uDBFF][\uDC00-\uDFFF]))*$/).test(outputString)) ) {
		outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, "");
		aErrors.push( inputSource + ":" + loggingString + '\r\n' + "Fix:" + outputString)
	}
	if( outputString ) {
		outputString = outputString.trim();
	}
	return outputString;
}

var arrRows = new Array(); //an array to contain the top level items as returned by the processLearningItem function

//pull input and output filenames from the command line - expected format is
//USAGE:
//		node index.js INPUTFILENAME [OUTPUTFILENAME]
//
//output file will default to the input file name with a .xml file extension added to it
var inputFileName = "", outputFileNameTemplate = "", outputPlaceHolder = "~!@!~", errorFileName = "", interimFileName, outputFileName, outputFolderName;

if( process.argv.length < 3 ) {
	console.error( "ERROR: Missing command line arguments.\r\n\r\nUSAGE: \r\n node index.js INPUTFILENAME [OUTPUTOLDERNAME]\r\n\r\OUTPUTOLDERNAME is optional, if ommitted the utility will use INPUTFILENAME and append a .xml extension\r\n");
	return;
}

inputFileName = process.argv[2];
outputFolderName = inputFileName + "-output";
outputFileNameTemplate = outputFolderName + "/" + outputPlaceHolder + ".txt";

let mappingsFile = "", mapMappings = new Map();
if( process.argv.length >= 4 ) {
	mappingsFile = process.argv[3];

	let objMappings = JSON.parse( fs.readFileSync(mappingsFile) );
	for( let mapping of objMappings ) {
		for( let prefix of mapping.prefixes ) {
			mapMappings.set(prefix, mapping.group);
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

//parse the input CSV file
//NOTE: File is expected to have a header row that should be ignored
var parser = parse( {delimiter: ','}, (err, data) => {

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

	var numRows = data.length;
	if( numRows <= 1 ) return;	//no work to do here

	var header = data[1];
	var depth = header.length;
	if( depth <=1 ) return;	//no work to do here

	var maxDepth = 0, maxDepthIndex = 0, currentDepth = 0;
	const HEADER_ROW = "Hierarchy|EducationLevel|Notation|Description";
	//arrRows.push(HEADER_ROW);
//4GM: General Music - 4,4GM.A: Skills and Techniques/Performance ,"4GM.A.1: sing, alone and with others, a varied repertoire of music",4GM.A.1.a: sing melodies expressively using appropriate head voice (accompanied and unaccompanied) demonstrating awareness of the tonal center
	//Hierarchy|EducationLevel|Notation|Description
	//|4||General Music
	//\t|4|4GM.A|Skills and Techniques/Performance
	//\t\t|4|4GM.A.1|sing, alone and with others, a varied repertoire of music
	//\t\t|4|4GM.A.1.a|sing melodies expressively using appropriate head voice (accompanied and unaccompanied) demonstrating awareness of the tonal center
	var currentFirstLevel = "", currentSecondLevel = "", currentThirdLevel = "", currentFourthLevel, currentGradeLevel = "", currentNotation = "", placeholderVal, prevPlaceholderVal = "";
	var prevFirstLevel = "", prevSecondLevel = "", prevThirdLevel = "";

	var eduLevel, notation, desc;
	
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

		// if( placeholderVal != prevPlaceholderVal  ) {
		// 	if( prevPlaceholderVal != "" ) {
		// 		outputFileName = outputFileNameTemplate.replace(outputPlaceHolder, prevPlaceholderVal.replace(/[\\/:*?\"<>|]/g,""));
		// 		fs.writeFileSync(outputFileName, arrRows.join("\r\n"), options);

		// 		arrRows = [];
		// 		arrRows.push(HEADER_ROW);	
		// 	}

		// 	prevPlaceholderVal = placeholderVal;
		// }
		if( !mapOverall.has(placeholderVal) ) {
			mapOverall.set(placeholderVal, new Array());
			mapOverall.get(placeholderVal).push(HEADER_ROW);
		}
		if( currentFirstLevel != prevFirstLevel ) {
			notation = currentFirstLevel.split(":")[0];
			desc = removeInvalidChars(currentFirstLevel.split(":")[1], 1);

			mapOverall.get(placeholderVal).push(`|${eduLevel}|${notation}|${desc}`);

			prevFirstLevel = currentFirstLevel;
		}

		if( currentSecondLevel != prevSecondLevel ) {
			notation = currentSecondLevel.split(":")[0];
			desc = removeInvalidChars(currentSecondLevel.split(":")[1], 2);

			mapOverall.get(placeholderVal).push(`\t|${eduLevel}|${notation}|${desc}`);

			prevSecondLevel = currentSecondLevel;
		}

		if( currentThirdLevel != prevThirdLevel ) {
			notation = currentThirdLevel.split(":")[0];
			desc = removeInvalidChars(currentThirdLevel.split(":")[1],3);

			mapOverall.get(placeholderVal).push(`\t\t|${eduLevel}|${notation}|${desc}`);

			prevThirdLevel = currentThirdLevel;
		}

		notation = currentFourthLevel.split(":")[0];
		desc = removeInvalidChars(currentFourthLevel.split(":")[1],4);

		if( notation && desc ) {
			mapOverall.get(placeholderVal).push(`\t\t|${eduLevel}|${notation}|${desc}`);
		}

	}

	// if( currentFirstLevel != "" ) {
	// 	outputFileName = outputFileNameTemplate.replace(outputPlaceHolder, placeholderVal.replace(/[\\/:*?\"<>|]/g,""));
	// 	fs.writeFileSync(outputFileName, arrRows.join("\r\n"), options);

	// 	arrRows = [];
	// }

	for( let placeholder of mapOverall.keys() ) {
		outputFileName = outputFileNameTemplate.replace(outputPlaceHolder, placeholder.replace(/[\\/:*?\"<>|]/g,""));
		fs.writeFileSync(outputFileName, mapOverall.get(placeholder).join("\r\n"), options);
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

//ensuring that the file encoding is one that will not cause issues
// iconv.skipDecodeWarning = true;
// var inputFileContents = fs.readFileSync(inputFileName, {encoding: "binary"});
// var outputFileContents = iconv.decode(inputFileContents, "win1251");
// fs.writeFileSync(interimFileName, outputFileContents);
// fs.createReadStream( interimFileName ).pipe( parser );

fs.createReadStream(inputFileName).pipe( parser );

//provide message to user to let them know it is still running
console.log("Processing...");

