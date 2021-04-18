


module.exports = {
	function parser(input) {
  //tree definitions
  var clinicalNodes = {type: "Clinical", values: [], action: "generateKeywords" };
  var ageNodes = {type: "Age", values: [], action: "populateAge" };
  var nameNodes = {type: "Name", values: [], action: "populateName" };
  var databaseNodes = {type: "Database", values: [], action: "findDatabase" };
  var cloudNodes = {type: "Cloud", values: [], action: "findCloud" };
  var webNodes = {type: "Web", values: [], action: "findWeb" };
  var dataNodes = {type: "Data", values: [], action: "dataFusion" };
  var fusedDataNodes = {type: "FusedData", values: [], action: "model" };
  var planNodes = {type: "Plan", values: [], action: "populatePlan" };
  var nodes = [clinicalNodes, ageNodes, nameNodes, databaseNodes, cloudNodes, webNodes, dataNodes, fusedDataNodes, planNodes]

	var tokens = lexer(input);
  tokens.forEach(t => match(t, nodes))
  return nodes;
}

//lexer functions
function lexer (input) {
	var tokens = [];

	var key = Object.keys(input)[0]
	addToken(tokens, key, input[key])

	
	return tokens;
}

function addToken(tokens, token, value) {
    if(typeof value == "string")
	    tokens.push({"Keyword": token, "Value":"\""+value+"\""});
	else
	    tokens.push({"Keyword": token, "Value": value})
}

//parser functions


function match(token, nodes){
  if(keywords.includes(token.Keyword))
    pushNode(token, nodes)
}

function pushNode(token, nodes){
  var nodeType = nodes.find(node => node.type == token.Keyword);
  nodeType.values.push(token.Value)
}

RED.nodes.registerType("parser",parser);

}




