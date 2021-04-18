module.exports = function(RED) {
    function clinical(config) {
        RED.nodes.createNode(this,config);
        var node = this;
		this.clinical_values = config.clinical_values;
        node.on('input', function(msg) {
			var clinicalVals = node.clinical_values.split(",")
            node.send({payload: {Clinical: clinicalVals}});
        });
    }
    RED.nodes.registerType("clinical",clinical);
}
