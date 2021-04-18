module.exports = function(RED) {
    function alert(config) {
        RED.nodes.createNode(this,config);
        var node = this;
		this.message = config.message;
		this.range_start = config.range_start;
		this.range_end = config.range_end;
		
		
        node.on('input', function(msg) {
			var data = msg.payload
			var isPlan = false;
			
			//if result of previous output is incomplete or invalid
			if(data == "none"){
				
			}
			else{
				//message is a data source
				if(msg.payload.Data != "undefined"){
					if (msg.payload.hasOwnProperty('Plan')){
						data = msg.payload.Plan.join(', ')
						isPlan = true;
					}
					else{
						data = msg.payload.Data[1][0]
					}
				}

				//message is to come from input
				if(node.message == ""){
					if(Object.keys(data) == "undefined" || isPlan == true)
						node.warn(data)
					else{
						for(i = 0; i <  Object.keys(data).length; i++){
							node.warn(data[Object.keys(data)[i]])
						}
					}

				}
				//generic alert
				else if(node.range_start == ""){
					node.warn(node.message)
				}
				//treat it as a bloodpressure
				else if(data.includes("/")){
					var bp = data.split("/")
					var systolic = bp[0]
					var diastolic = bp[1]

					var start = node.range_start.split("/")
					var end = node.range_end.split("/")
					//only starting value, no upper ceiling
					if(node.range_end == "" && systolic > start[0] && diastolic > start[1]){
						//msg.payload = {Data: ["Simple", [node.name]]}
						//msg.topic = node.message
						node.send({payload: {Data: ["Simple", [node.name]]}})
						node.warn(node.message)
					}
					else if ((systolic > start[0] && diastolic > start[1]) && (systolic < end[0] && diastolic < end[1])){
						//msg.payload = {Data: ["Simple", [node.name]]}
						//msg.topic = node.message
						node.send({payload: {Data: ["Simple", [node.name]]}})
						node.warn(node.message)
					}
					else {
						
					}
				}
				else {
					var value = parseInt(data)
					var start = parseInt(node.range_start)
					var end = parseInt(node.range_end)
					
					//only a starting value, no upper ceiling
					if (node.range_end == "" && value > start) {
						//msg.payload = {Data: ["Simple", [node.name]]}
						//msg.topic = node.message
						node.send({payload: {Data: ["Simple", [node.name]]}})
						node.warn(node.message)
					}
					//both ranges are defined and accounted for
					else if(value > start && value < end)
					{
						//msg.payload = {Data: ["Simple", [node.name]]}
						//msg.topic = node.message
						node.send({payload: {Data: ["Simple", [node.name]]}})
						node.warn(node.message)
					}
					else{
						
					}
				}
			}
        });
    }
    RED.nodes.registerType("alert",alert);
}