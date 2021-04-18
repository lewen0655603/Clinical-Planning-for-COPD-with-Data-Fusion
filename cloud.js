module.exports = function(RED) {
    function cloud(config) {
        RED.nodes.createNode(this,config);
        var node = this;
		this.access_key = config.access_key
		this.secret_access_key = config.secret_access_key
		this.bucket_name = config.bucket_name
		this.region = config.region
		this.item_name = config.item_name
		
        node.on('input', function(msg) {
			var AWS = require("aws-sdk");
			
			AWS.config.update({region: node.region});
			AWS.config.credentials = { "accessKeyId": node.access_key, "secretAccessKey": node.secret_access_key, "region": node.region }
			
			// Create S3 service object
			var s3 = new AWS.S3({apiVersion: '2006-03-01'});
			var bucketParams = {
			  Bucket : node.bucket_name, Key: node.item_name
			};

			// Call S3 to list the buckets

			s3.getObject(bucketParams, function(err, data) {
				if (err) {
					msg.payload = "ERROR!"
					node.send(msg)
				} else {
					msg.payload = data
					node.send(msg)
				}
			});

		});
    }
    RED.nodes.registerType("cloud",cloud);
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

