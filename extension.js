
const vscode = require('vscode');

const start_char = ["(", "{", "[", "<"];
const end_char = [")", "}", "]", ">"];

function findBrackets(doc, line, char) {
    var content = doc.lineAt(line);
    var matches = (content.text).split(char).reduce(function (acc, p) {
        var len = p.length + 1;
        if (acc.length > 0) {
            len += acc[acc.length - 1];
        }
		console.log(matches);
        acc.push(len);
        return acc;
    }, []);
    matches.pop();
    return matches;
}

function findNext(doc, line, char, start_index, nest_char, nested) {
    if (start_index === void 0) { 
		start_index = 0;
	}
    if (nest_char === void 0) { 
		nest_char = undefined; 
	}
    if (nested === void 0) { 
		nested = 0; 
	}
    if (line === doc.lineCount) {
        return undefined;
    };
    var occurances = findBrackets(doc, line, char).filter(function (n) { return n >= start_index; });
    var nests = nest_char ? findBrackets(doc, line, nest_char).filter(function (n) { return n >= start_index; }) : [];
    var occurance_index = 0;
    var nests_index = 0;
    while ((occurance_index < occurances.length || nests_index < nests.length) && nested >= 0) {
        if (occurances[occurance_index] < nests[nests_index] || !nests[nests_index]) {
            if (nested === 0) {
                return new vscode.Position(line, occurances[occurance_index]);
            }
            nested--;
            occurance_index++;
        }
        else if (nests[nests_index] < occurances[occurance_index] || !occurances[occurance_index]) {
            nested++;
            nests_index++;
        }
    }
    return findNext(doc, ++line, char, 0, nest_char, nested);
}

function findPrevious(doc, line, char, start_index, nest_char, nested) {
    if (nest_char === void 0) { 
		nest_char = undefined; 
	}
    if (nested === void 0) { 
		nested = 0; 
	}
    if (line === -1) {
        return undefined;
    }
    ;
    if (start_index === undefined) {
        start_index = doc.lineAt(line).text.length;
    }
    var occurances = findBrackets(doc, line, char).filter(function (n) { return n <= start_index; });
    var nests = nest_char ? findBrackets(doc, line, nest_char).filter(function (n) { return n <= start_index; }) : [];
    var occurance_index = occurances.length - 1;
    var nests_index = nests.length - 1;
    while ((occurance_index > -1 || nests_index > -1) && nested >= 0) {
        if (occurances[occurance_index] > nests[nests_index] || !nests[nests_index]) {
            if (nested === 0) {
                return new vscode.Position(line, occurances[occurance_index]);
            }
            nested--;
            occurance_index--;
        }
        else if (nests[nests_index] > occurances[occurance_index] || !occurances[occurance_index]) {
            nested++;
            nests_index--;
        }
    }
    return findPrevious(doc, --line, char, undefined, nest_char, nested);
}

function matchingSelect(_a) {
    var start_char = _a.start_char, end_char = _a.end_char, _b = _a.outer, outer = _b === void 0 ? false : _b;
    var editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    };
    var doc = editor.document;
    var sel = editor.selections;
    var success = false;
    var start_offset = outer ? start_char.length : 0;
    var end_offset = outer ? end_char.length : 0;
    editor.selections = sel.map(function (s) {
        var _a = s.active, line = _a.line, character = _a.character;
        var starts = findBrackets(doc, line, start_char);
        var ends = findBrackets(doc, line, end_char);
        var start = starts.find(function (a) { return a > character; });
        var end = ends.find(function (a) { return a > character; });
        var start_index = starts.indexOf(start);
        var end_index = ends.indexOf(end);
        var start_pos = findPrevious(doc, line, start_char, character, end_char) || new vscode.Position(line, starts[start_index]);
        if (!start_pos) {
            return s;
        };
        var end_pos = findNext(doc, start_pos.line, end_char, start_pos.character + 1, start_char);
        if (start_pos && end_pos) {
            success = true;
            if (!outer && start_pos.isEqual(s.anchor) && new vscode.Position(end_pos.line, end_pos.character - 1).isEqual(s.end)) {
                start_offset = start_char.length;
                end_offset = end_char.length;
            }
            start_pos = new vscode.Position(start_pos.line, start_pos.character - start_offset);
            end_pos = new vscode.Position(end_pos.line, end_pos.character - 1 + end_offset);
            return new vscode.Selection(start_pos, end_pos);
        }
        return s;
    });
    if (success && start_char === "<") {
        vscode.commands.executeCommand("editor.action.addSelectionToNextFindMatch");
    }
}


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	var i = undefined;
	context.subscriptions.push(vscode.commands.registerCommand('vs-paranthesis-highlighter.HighlightParenthesis', matchingSelect.bind(i, { start_char: "(", end_char: ")" })));
	context.subscriptions.push(vscode.commands.registerCommand('vs-paranthesis-highlighter.HighlightSquareBrackets', matchingSelect.bind(i, { start_char: "[", end_char: "]" })));
	context.subscriptions.push(vscode.commands.registerCommand('vs-paranthesis-highlighter.HighlightCurlyBrackets', matchingSelect.bind(i, { start_char: "{", end_char: "}" })));
	context.subscriptions.push(vscode.commands.registerCommand('vs-paranthesis-highlighter.HighlightAngleBrackets', matchingSelect.bind(i, { start_char: "<", end_char: ">" })));
}


function deactivate() {}

module.exports = {
	activate,
	deactivate
}
