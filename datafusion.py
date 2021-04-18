
from pynodered import node_red, NodeProperty
import numpy as np
import json
from sklearn.preprocessing import OneHotEncoder
from sklearn.preprocessing import LabelEncoder
from sklearn import tree
import os.path
from os import path
import os
import glob

@node_red(category="Data Fusion Nodes", properties=dict(numSources=NodeProperty("Number of data sources", value="2")))

def data_fusion(node, msg):
    if interpreter(msg['payload']) == "datafusion":
        data = dataAccumulator(msg['payload'], node.numSources.value)
        if data != None:
        
            #simple data is concatenated into one vector that includes clinical and relationship data is added to a vector
            simpleData = [];
            relationshipData = [];
            
            for dataset in data:
                if dataset[0][0] == "Relationship":
                        relationshipData = relationshipData + dataset[0][1:]
                else:
                    if isinstance(dataset[0][1][0], dict):
                        keyVal = list(dataset[0][1][0].keys())[0]
                        simpleData = simpleData + [d[keyVal] for d in dataset[0][1]]
                    else:
                        simpleData = simpleData + dataset[0][1:][0]

            #relationship data is separated into an observations vector and a results vector for reference with matrices (relationship data still remains as it was originally however)
            
            observations = [d['observation'] for d in relationshipData]
            orders = [d['result'] for d in relationshipData]
            flatOrders = [item for sublist in orders for item in sublist]
            flatObservations = [item for sublist in observations for item in sublist]
            
            #create two matrices based on the 'relationship data'
            #M1 num rows is num rules and num cols is num observations
            observationMatrix = np.zeros((len(relationshipData), sum( [ len(listElem) for listElem in observations])))
            
            #M2 num rows is num rules and num cols is num orders
            orderMatrix = np.zeros((len(relationshipData), sum( [ len(listElem) for listElem in orders])))
            
            #M1 1's are set by row - if observations in relationshipData[i] are present in simple data, 1's under each observations
            #M2 1's are set by row - if the position of each observation in M1 is 1, orders in relationshipData[i] are set to 1 in the appropriate column
            #Plan is set by M2 (all observations + which rule/row the observation falls under)
            
            planOrders = [];
            currentRule = 0
            
            print(simpleData)
            
            for rule in relationshipData:
                numObservationsPresent = 0

                for observation in rule['observation']:
                    if "or" in observation:
                        foundMatch = 0;
                        partialObservations = observation.split(' or ')
                        for partialObservation in partialObservations:
                            if partialObservation in simpleData:
                                pos = np.where(np.array(flatObservations) == observation)
                                observationMatrix[currentRule,pos[0][0]] = 1
                                foundMatch = 1;
                        numObservationsPresent = numObservationsPresent + foundMatch
                    if observation in simpleData:
                        print(observation + " " + str(currentRule+1))
                        pos = np.where(np.array(flatObservations) == observation)
                        observationMatrix[currentRule,pos[0][0]] = 1
                        numObservationsPresent = numObservationsPresent + 1
                if numObservationsPresent == len(rule['observation']):
                    for order in rule['result']:
                        pos = np.where(np.array(flatOrders) == order)
                        #if the order denotes a negative relationship, remove relationships to that item if it exists
                        if order.startswith('-'):
                            orderMatrix[currentRule, pos[0][0]] = 0
                            orderString = "Do not include " + order[1:] + " (triggered by rule "+ str(currentRule+1) +")"
                            removeString = list(filter(lambda x: order[1:] in x, planOrders))
                            print(orderString)
                            
                            if len(removeString) > 0:
                                print(removeString[0])
                                planOrders.remove(removeString[0])
                                print(planOrders)
                            planOrders = planOrders + [orderString]
                        else:   
                            orderMatrix[currentRule,pos[0][0]] = 1
                            orderString = order + " (triggered by rule "+ str(currentRule+1) +")"
                            planOrders = planOrders + [orderString]
                        
                currentRule = currentRule+1
                

            #M1 and M2 are concatenated as fuseddata, and observations and orders are concatenated into one vector to be returned as "data" for reference with colnames
            fuseddata = np.concatenate((observationMatrix, orderMatrix), axis=1)
            
            
            
            
            data = np.concatenate((flatObservations, flatOrders), axis = 0)
            
            #plan fuseddata and data are all returned
            msg['payload'] = {"FusedData": fuseddata.tolist(), "Data": data.tolist(), "Plan": planOrders}
    

        else:
            msg['payload'] = "none"
    else:
        msg['payload'] = "none"
    
    return msg



@node_red(category="Custom Machine Learning Nodes", properties=dict(pretrained=NodeProperty("Use Pre-trained model", value="no")))
def machine_learning(node, msg):
    dataML = dataAccumulatorML(msg["payload"])
    
    if interpreter(dataML) == "decision":
        if node.pretrained.value == "no":
            simpleData = np.asarray(dataML['Data'])
            onehot_encoded = dataML['FusedData']
            
            label_encoder = LabelEncoder()
            integer_encoded = label_encoder.fit_transform(simpleData)
            
            X, y = onehot_encoded,integer_encoded
            clf = tree.DecisionTreeClassifier()
            clf = clf.fit(X, y)
            
            #get prediction
            
            inputData = dataML['Clinical']
            predictInput = np.zeros_like(onehot_encoded)
            inputIndices = []

            
            for value in inputData:
              index = np.where(simpleData == value)
              predictInput[index[0][0], index[0][0]] = 1
              inputIndices.append(index[0][0])
            
            #remove input from predicted output
            plan = np.unique(clf.predict(predictInput))
            for index in inputIndices:
                plan = np.delete(plan, np.where(plan == index))
            
            #convert input to series of strings
            
            orders = []
            for order in plan:
              orders.append(simpleData[order])
            
            #set predictions to the output
            msg['payload'] = {"Plan": "Order and/or monitor the following: "+','.join(orders)}

    
    return msg
        


keywords = ["Age", "Name", "Clinical", "Database", "Cloud", "Web", "Data", "FusedData", "Plan"]

def parser(input):

  clinicalNodes = {"type": "Clinical", "values": list()}
  ageNodes = {"type": "Age", "values": list()}
  nameNodes = {"type": "Name", "values": list()}
  databaseNodes = {"type": "Database", "values": list()}
  cloudNodes = {"type": "Cloud", "values": list()}
  webNodes = {"type": "Web", "values": list()}
  dataNodes = {"type": "Data", "values": list()}
  fusedDataNodes = {"type": "FusedData", "values": list()}
  planNodes = {"type": "Plan", "values": list()}
  nodes = [clinicalNodes, ageNodes, nameNodes, databaseNodes, cloudNodes, webNodes, dataNodes, fusedDataNodes, planNodes]

  tokens = lexer(input)
  
  for token in tokens:
    match(token, nodes)
    
  return nodes


def lexer (input):
    tokens = []
    for key in list(input.keys()):
        addToken(tokens, key, input[key])

	
    return tokens


def addToken(tokens, token, value):
    if type(value) == str:
        tokens.append({"Keyword": token, "Value":"\""+value+"\""})
    else:
        tokens.append({"Keyword": token, "Value": value})




def match(token, nodes):
  if token["Keyword"] in keywords:
    pushNode(token, nodes)

def keywordMatch(node, token):
    if node["type"] == token["Keyword"]:
        return True
    else:
        return False

def pushNode(token, nodes):
  nodeType = [node for node in nodes if node["type"] == token["Keyword"]]
  nodeType[0]["values"] += [token["Value"]]


def hasData(node):
    return len(node["values"]) > 0

def getType(node):
    return node["type"]

def activateNodesAndFlows(nodes):
  nodeTypes = list(map(getType, nodes))
  
  if len(nodeTypes) == 1 and nodeTypes[0] == "Clinical":
    return("info")
    
  elif (not "Clinical" in nodeTypes and ("Database" in nodeTypes or "Cloud" in nodeTypes or "Web" in nodeTypes)):
    return("decision")

  elif len(nodeTypes) == 2 and nodeTypes[1] == "Data"  and nodeTypes[0] == "Clinical" or len(nodeTypes) == 1 and nodeTypes[0] == "Data":
    return("datafusion")

  elif(len(nodeTypes) == 3 and (nodeTypes[0] == "Clinical" and nodeTypes[1] == "Data" and nodeTypes[2] == "FusedData")):
    return("decision")

  elif len(nodeTypes) == 1 and nodeTypes[0] == "Plan":
    return("none")
  
  else:
    return("none")

	
def interpreter(input):
	ast = parser(input)
	validAst = filter(hasData, ast)
	return activateNodesAndFlows(validAst)

def dataAccumulatorML(inputNodeML):
    dataML = {'Clinical':[], 'Data': [], 'FusedData': []}
    for key in list(inputNodeML.keys()):
        dataML[key] = inputNodeML[key]  

    if path.exists("tempML.txt"):
        with open('tempML.txt') as json_file:
            tempData = json.load(json_file)
            
        for key in list(tempData.keys()):
            if len(tempData[key]) != 0:
                dataML[key] = tempData[key]

        if len(dataML['Clinical']) != 0 and len(dataML['Data']) != 0 and len(dataML['FusedData']) != 0:
            os.remove("tempML.txt")
            return dataML
        else:
            with open('tempML.txt', 'w') as outfile:
                json.dump(dataML, outfile)
    else:
        with open('tempML.txt', 'w') as outfile:
            json.dump(dataML, outfile)
        return None
        

def dataAccumulator(inputNode, numSources):
    if path.exists("temp.json"):
        # get data and store into variable
        #with open('temp.txt') as json_file:
            #data = json.load(json_file)
        #store msg payload into variable
        data = {'Data':[], 'Clinical':[]}
        data['Data'].append(inputNode['Data'])
        
        if "Clinical" in inputNode.keys():
            data['Clinical'].append(inputNode['Clinical'])
        
        if not len(glob.glob('./*.json')) == int(numSources):
            print(len(glob.glob('./*.json')))
            with open('temp'+str(len(glob.glob('./*.json')))+'.json', 'w') as outfile:
                json.dump(data, outfile)
            return None
        
        else:
            accumData = {'Data': []}
            for tempFile in range(len(glob.glob('./*.json'))):
                if(tempFile == 0):
                    with open("temp.json", "r") as infile:
                        data = json.loads(infile.read())
                    accumData['Data'].append(data['Data'])
                    if(data['Clinical'] != []):
                        accumData['Data'].append(["Simple", data['Clinical'][0]])
                    os.remove("temp.json")
                else:
                    with open('temp'+str(tempFile)+'.json', "r") as infile:
                        data = json.loads(infile.read())
                    accumData['Data'].append(data['Data'])
                    if data['Clinical'] != [] and ['Simple', data['Clinical'][0]] not in accumData['Data']:
                        accumData['Data'].append([['Simple', data['Clinical'][0]]])
                    os.remove("temp"+str(tempFile)+".json")
            return accumData['Data']
            
            #os.remove("temp.txt")
            #data['Data'].append(['Simple', data['Clinical'][0]])
            #return data['Data']
        #write to file

    else:
        data = {'Data':[], 'Clinical':[]}
        
        data['Data'].append(inputNode['Data'])
        if "Clinical" in inputNode.keys():
            data['Clinical'].append(inputNode['Clinical'])
            
        with open('temp.json', 'w') as outfile:
            json.dump(data, outfile)
        return None