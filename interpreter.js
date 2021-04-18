

module.exports = {
	
	require('./parser');

function hasData(node){
    return node.values.length > 0
}

function activateNodesAndFlows(nodes){
    //clinician input
	nodeTypes = nodes.map(node => node.type)
  if(nodeTypes == ["Clinical"])
  {
      return("info")
  }
  //data source not via clinician input
  if(!nodeTypes.includes("Clinical") && (nodeTypes.includes("Database") || nodeTypes.includes("Cloud") || nodeTypes.includes("Web")))
  {
    return("decision")
  }
  //data source
  if(nodeTypes == ["Data"])
  {
     return("datafusion")
  }
  //fused data source
  if(nodeTypes = ["Clinical", "Data", "FusedData"]){
     return("decision")
  }
  //all flows are reset because a final plan is produced
  if(nodeTypes = ["Plan"]) 
  {
	return("none")
  }
  
}
	
	function interpreter(input) {
		var ast = parser.parser(input);
		validAst = ast.filter(hasData);
		return activateNodesAndFlows(validAst);
	}
	
	RED.nodes.registerType("interpreter",interpreter);
}