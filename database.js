module.exports = function(RED) {
    function database(config) {
        RED.nodes.createNode(this,config);
        var node = this;
		this.host = config.host;
		this.user = config.user;
		this.port = config.port;
		this.password = config.password;
		this.database = config.database;
		this.query = config.query;
		
        node.on('input', function(msg) {
			var mysql = require("mysql");
			
			
			if(interpreter(msg.payload) == "info")
			{
				var clinicalData = msg.payload.Clinical
				
				var con = mysql.createConnection({
					host: node.host,
					user: node.user,
					port: node.port,
					password: node.password,
					database: node.database
					});

				con.connect(function(err) {
					if(err) throw err;
					con.query(node.query, function (err, result) {
						if (err) node.send({payload: "Error with query"});
						var data = ["Simple"];
						data.push(result)
						node.send({payload: {Data: data, Clinical: clinicalData}});
					});
				});
			}
		});
    }
    RED.nodes.registerType("database",database);
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
