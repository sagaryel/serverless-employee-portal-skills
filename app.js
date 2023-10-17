// This program is for getting the employee details based http GET method.
const {
    GetItemCommand, // Retrieve data fron dynamoDb table
    DynamoDBClient, // Dynamodb instance
    ScanCommand, //Scan the table
} = require('@aws-sdk/client-dynamodb'); //aws-sdk is used to build rest APIs,

//client-dynamodb library used to communicate with the
//Create new instance of DynamoDBClient to db, will use this constant across the program
const db = new DynamoDBClient();
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb'); // Retrieve and save data

//This function will get employee details based on empId 
//Create function as async with event as argument
module.exports.getEmployeeSkill = async (event) => {
    //Initialize status code 200 OK 
    const response = { statusCode: 200 };
    console.log('event data in request - ', event, event.resource, event.path, event.headers.Accept, event.httpMethod, event.body)
    const resource = event.resource; 
    const method = event.httpMethod;
    switch (resource + " " + method) {
        case '/employee/skill/{empId} GET':
            const empId = event.pathParameters.empId;
            //Try block code - this block evaluates the employee retrieve function based on empId,
            // If true it gives employee details or it catches server response error and displayes at console
            try {
                // Define tablename and employeeId key with its value
                const params = {
                    TableName: process.env.DYNAMODB_TABLE_NAME,
                    Key: marshall({ empId: empId }),
                    ProjectionExpression: " skilName, yearsOfKnowledge, skillLevel, certified, isActive, createdDateTime, updatedDateTime",
                };
                //Await response from db when sent GetItemCommand 
                //With params as argument containing tablename and key
                const { Item } = await db.send(new GetItemCommand(params));
                if (Item) {  //If item is present then send details
                    response.body = JSON.stringify({
                        message: `Successfully retrieved employee skills of empId : ${empId}.`,
                        data: unmarshall(Item)
                    });
                } else if (Item === undefined) { //If Item is not found then send 404 error
                    response.statusCode = 404;
                    response.body = JSON.stringify({
                        message: `Employee skills not found for empId : ${empId}.`
                    });
                }
                else {
                    response.statusCode = 500;
                    throw new Error(`Unexpected error occurred while fetching skills of empId : ${empId}.`);
                }
            } // Catch block to handle any errors
            catch (e) {
                console.error(e);
                response.body = JSON.stringify({
                    statusCode: response.statusCode,
                    message: `Failed to get employee skill with empId : ${empId}.`,
                    errorMsg: e.message,
                    errorStack: e.stack,
                });
            }
            break;

        case '/employees/skill GET':
            try {
                const input = {
                    TableName: process.env.DYNAMODB_TABLE_NAME,
                    ProjectionExpression: "empId, skilName, yearsOfKnowledge, skillLevel, certified, isActive, createdDateTime, updatedDateTime",
                    FilterExpression: "softDelete = :softDeleteCondition",        // Add a FilterExpression if you want to filter the results
                       ExpressionAttributeValues: {
                           ":softDeleteCondition": false
                       }
                };
                //Await response from db when sent scan command with tablename
                const { Items } = await db.send(new ScanCommand(input));
                console.log(JSON.stringify(Items));
                if (!Items || Items.length === 0) { // If employees are not present
                    response.statusCode = 404; // Setting the status code to 404
                    response.body = JSON.stringify({
                        message: "Employees skills are not found.",
                    });
                } else {
                    // Generate response message and data
                    response.body = JSON.stringify({
                        message: "Successfully retrieved all employees skills.",
                        data: Items?.map((item) => unmarshall(item)),
                    });
                }
            }
            // Catch block to handle any server response errors
            catch (e) {
                console.error(e);
                response.body = JSON.stringify({
                    message: "Failed to retrieve all employees skills.",
                    errorMsg: e.message,
                    errorStack: e.stack,
                });
            }
            break;

        default:
            response.statusCode = 404;
            response.body = JSON.stringify({
                message: `URL not found -  ${event.resource}`,
            })
    };
    //Return response with statusCode and data.
    return response;
}