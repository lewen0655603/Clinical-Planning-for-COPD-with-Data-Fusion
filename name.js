module.exports = function(RED) {
    function name(config) {
        RED.nodes.createNode(this,config);
        var node = this;
		this.patient_name = config.patient_name;
        node.on('input', function(msg) {
			msg.payload = node.patient_name
            node.send({payload:{Name: node.patient_name}});
        });
    }
    RED.nodes.registerType("name",name);
}