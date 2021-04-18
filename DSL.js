module.exports = function(RED) {
    function DSL(config) {
        RED.nodes.createNode(this,config);
        var node = this;
		this.rules = config.rules
		
        node.on('input', function(msg) {
			msg.payload = parseDSL(node.rules);
			node.send(msg)
		});
    }
    RED.nodes.registerType("DSL",DSL);
}

function parseDSL(input){
	var rules = input.split('\n');
	
	var observations = [[]];
	var results = [[]];
	
	var jsonRules = {
		"Data":["Relationship"]
		}
	
	for(var i = 0;i < rules.length;i++){
		//for each rule get the observations (text between brackets)
		//start of observations is "(", end of observations is "):"
		var observationList = rules[i].substring(
		rules[i].lastIndexOf("(") + 1, 
		rules[i].lastIndexOf(")")
		).split(", ");
		//get result(s) which is all text after ":" as an itemized list
		var resultList = (rules[i].split(':')[1]).split(", ");
		//this is pushed into jsonRules: 
		jsonRules.Data.push({"observation": observationList, "result": resultList})
	}
	
	return jsonRules
}

var keywords = ["Age", "Name", "Clinical", "Database", "Cloud", "Web", "Data", "FusedData", "Plan"]

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

function hasData(node){
    return node.values.length > 0
}

function activateNodesAndFlows(nodes){
    //clinician input
	var nodeTypes = nodes.map(node => node.type)
  if(nodeTypes.length == 1 && nodeTypes[0] == "Clinical")
  {
    return("info")
  }
  //data source not via clinician input
  else if(!nodeTypes.includes("Clinical") && (nodeTypes.includes("Database") || nodeTypes.includes("Cloud") || nodeTypes.includes("Web")))
  {
    return("decision")
  }
  //data source
  else if(nodeTypes.length == 1 && nodeTypes[0] == ["Data"])
  {
     return("datafusion")
  }
  //fused data source
  else if(nodeTypes.length == 3 && (nodeTypes[0] == "Clinical" && nodeTypes[1] == "Data" && nodeTypes[2] == "FusedData")){
     return("decision")
  }
  //all flows are reset because a final plan is produced
  else if(nodeTypes.length == 1 && nodeTypes[0] == ["Plan"]) 
  {
	return("none")
  }
  else
	  return("none")
}
	
	function interpreter(input) {
		var ast = parser(input);
		validAst = ast.filter(hasData);
		return activateNodesAndFlows(validAst);
	}
