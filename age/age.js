module.exports = function(RED) {
    function age(config) {
        RED.nodes.createNode(this,config);
        var node = this;
		this.age = config.age;
        node.on('input', function(msg) {
			msg.payload = node.age
            node.send({payload: {Age: node.age}});
        });
    }
    RED.nodes.registerType("age",age);
}
