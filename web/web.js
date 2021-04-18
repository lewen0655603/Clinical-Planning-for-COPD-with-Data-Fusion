module.exports = function(RED) {
    function web(config) {
        RED.nodes.createNode(this,config);
        var node = this;
		this.address = config.address
		this.name = config.name
		this.html_tag = config.html_tag
		
        node.on('input', function(msg) {
			var inputNodes = msg.payload
			if(interpreter(inputNodes) == "info")
			{
				
				const axios = require('axios');
				const cheerio = require('cheerio');



				if(node.name == "Symptoms"){
					axios.get(node.address).then((response) => {
					const $ = cheerio.load(response.data)
					const elems = $(node.html_tag)
					const dataElems = [];
					
					elems.each((index, li) => {
					  const title = $(li).text()

					  dataElems.push(title)
					})
					
					msg.payload = {"Data": [node.data_type, dataElems]}
					node.send(msg);
				})
					if (msg.payload.length == 0)
					{
						msg.payload = {"Data": [["Simple"], ["shortness of breath", "wheezing", "chest tightness", "cough", "infection", "lack of energy", "weight loss", "inflammation", "hypoxemia", "anemia", "acidosis", "alkalosis"]]};
						node.send(msg);
					}
					
				}
				else if (node.name == "Lab Tests"){
					axios.get(node.address).then((response) => {
					const $ = cheerio.load(response.data)
					const elems = $(node.html_tag)
					const dataElems = [];
					
					elems.each((index, li) => {
					  const title = $(li).text()

					  dataElems.push(title.replace('.', '').replace('-', ''))
					})
					
					msg.payload = {"Data": ["Simple", dataElems]}
					node.send(msg);
				})
					if(msg.payload.length == 0){
						msg.payload = {"Data": [["Simple"], ["chest xray", "cbc", "abg", "ecg", "ct"]]};
						node.send(msg);
					}	
				}
				else{
					msg.payload = "UH OH"
				}
			}
		});
    }
    RED.nodes.registerType("web",web);
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
