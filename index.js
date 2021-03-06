'use strict'

var js2xml = require('js2xmlparser');
var fs = require('fs');
var parse = require('csv-parse');
var iconv = require('iconv-lite');

var aXmlErrors = new Array();

//stop-gap solution to handling of invalid characters - now may be unnecessary due to improved file encoding handling
//left for now to help ensure that script can execute without crashing
function removeInvalidXmlChars( inputString, inputSource, loggingString ) {
	var outputString = inputString;
	if( !loggingString ) {
			loggingString = inputString;
	}

	if( !(new RegExp(/^((\u0009|\u000A|\u000D|[\u0020-\uD7FF])|([\uD800-\uDBFF][\uDC00-\uDFFF]))*$/).test(outputString)) ) {
		outputString = outputString.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uD800-\uDBFF\uDC00-\uDFFF]/g, "");
		aXmlErrors.push( inputSource + ":" + loggingString + '\r\n' + "Fix:" + outputString)
	}
	return outputString;
}
//extract the human-relevant portion of the outer LearningStandardItem - expected format is {Code}: {Human-Relevant Portion}
//where {Code} is a 3+ letter code, and {Human-Relevant Portion} is a string of undetermined length
function beautifyMain( main ) {
	var fixMain = main.slice( main.indexOf(":") + 1 ).trim();
	fixMain = removeInvalidXmlChars( fixMain, "TOP", main );
	
	return fixMain;
}

//check for invalid XML characters and remove them from the text of the lowest level LearningStandardItem entries
//invalid XML check is now likely unnecessary due to change in input file encoding handling
function beautifySub( sub ) {
	var fixSub = sub;
	fixSub = removeInvalidXmlChars( fixSub, "SUB", sub );

	return fixSub;
}

//combine the top level LearningStandardItem with its children for adding into the array of top level items
function processLearningItem( mainItem, children ) {
	var jsonMain = {
							"itemDescription": {"itemText": beautifyMain( mainItem ) },
							"LearningStandardItem": []
						};

	children.forEach( (item, index) => {
		jsonMain.LearningStandardItem.push(
			{"itemDescription": {"itemText": beautifySub( item )}}
		);
	});

	return jsonMain;
}

var arrMains = new Array(); //an array to contain the top level items as returned by the processLearningItem function

//pull input and output filenames from the command line - expected format is
//USAGE:
//		node index.js INPUTFILENAME [OUTPUTFILENAME]
//
//output file will default to the input file name with a .xml file extension added to it
var inputFileName = "", outputFileName = "", errorFileName = "", interimFileName;
switch ( process.argv.length ) {
	case 3: //input file specified, but not output file
		inputFileName = process.argv[2];
		outputFileName = inputFileName + ".xml";
		break;
	case 4:
		inputFileName = process.argv[2];
		outputFileName = process.argv[3];
		break;
	default:
		console.error( "ERROR: Missing command line arguments.\r\n\r\nUSAGE: \r\n node index.js INPUTFILENAME [OUTPUTFILENAME]\r\n\r\nOUTPUTFILENAME is optional, if ommitted the utility will use INPUTFILENAME and append a .xml extension\r\n");
		return;
}

interimFileName = inputFileName + ".interim.csv";
errorFileName = outputFileName + ".error.txt"

//output helpful messages for files to be used
console.log("Input file identified as: ", inputFileName);
console.log("Output file identified as: ", outputFileName);

//parse the input CSV file
//NOTE: File is expected to have a header row that should be ignored
var parser = parse( {delimiter: ','}, (err, data) => {

	if( err ) {
		console.error(err);
	}

	var numRows = data.length;
	if( numRows <= 1 ) return;	//no work to do here

	var header = data[1];
	var depth = header.length;
	if( depth <=1 ) return;	//no work to do here

	var maxDepth = 0, maxDepthIndex = 0, currentDepth = 0;
	var mainLearningItem = "", prevMainLearningItem = data[1][0];
	var subLearningItem = "", arrSubLearningItems = new Array();

	//go through each row in the array of items
	for( var i = 1; i < numRows; i++ ) {
		currentDepth = data[i].length-1;
		if( currentDepth < 2) {
			continue;	//an empty row or a row with no sub-items
		}

		mainLearningItem = data[i][0];
		subLearningItem = data[i][currentDepth];
		//use the deepest item available - start at the last position and work backwards until one is identified
		while( subLearningItem.length === 0 ) {
			currentDepth--;
			subLearningItem = data[i][currentDepth];
		}

		if( mainLearningItem == prevMainLearningItem ) {
			//add sub item to array
			arrSubLearningItems.push( subLearningItem );
		}
		else {
			//add completed object to array of main items
			var objArrMains = processLearningItem( prevMainLearningItem, arrSubLearningItems );
			arrMains.push( objArrMains );
			
			arrSubLearningItems = arrSubLearningItems.slice(0,0);	//empty the array of sub items

			//get thigns ready for the next main item
			prevMainLearningItem = mainLearningItem;
			arrSubLearningItems.push( subLearningItem );
		}
	}
	//add last main item to array of main items
	arrMains.push( processLearningItem( mainLearningItem, arrSubLearningItems ) );
	arrSubLearningItems = arrSubLearningItems.slice(0,0);
	
	//START: Output XML File
	var options = {declaration: {
		encoding: "UTF-8",
		version: "1.0"
	}};

	var objMains = {"LearningStandardItem": arrMains};
	try {
		fs.writeFile(outputFileName, js2xml.parse("LearningStandardDocument", objMains, options), (err) => { if(err) { console.error("Error writing output file: ", err) } console.log("Output operation complete to file: ", outputFileName); } );
	} catch(e) {
		console.error("Try/Catch error with output to file:", e);
	}
	//END: Output XML File

	var currentDate = new Date();
	if( aXmlErrors.length > 0 ) {
		console.warn("WARNING: Invalid XML characters detected, output results to: " + errorFileName);
		fs.writeFileSync( errorFileName, "### " + currentDate + ": " + aXmlErrors.length + " errors\r\n\r\n" + aXmlErrors.join("\r\n\r\n") );
	} else {
		if( fs.existsSync(errorFileName) ) {
			fs.writeFileSync( errorFileName, "### " + currentDate + ": 0 errors")
		}
	}
});

//ensuring that the file encoding is one that will not cause issues
iconv.skipDecodeWarning = true;
var inputFileContents = fs.readFileSync(inputFileName, {encoding: "binary"});
var outputFileContents = iconv.decode(inputFileContents, "win1251");
fs.writeFileSync(interimFileName, outputFileContents);
fs.createReadStream( interimFileName ).pipe( parser );


//provide message to user to let them know it is still running
console.log("Processing...");

