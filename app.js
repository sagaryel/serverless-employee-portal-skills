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
                    ProjectionExpression: "empId, skilName, yearsOfKnowledge, skillLevel, certified, isActive, createdDateTime, updatedDateTime, softDelete",
                    FilterExpression: "softDelete = :softDeleteCondition AND isActive = :isActiveCondition",
                    ExpressionAttributeValues: {
                        ":softDeleteCondition": { BOOL: false },
                        ":isActiveCondition": { BOOL: true },            // Assuming "softDelete" is a Boolean attribute
                    },
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
        case '/employees/skill DELETE':
            // try block will examine employeeId in DB and if found it will delete otherwise it will throw error
            try {
                const { empID } = event.pathParameters;
                // Create an empty DynamoDB List attribute after delete perform
                const emptyList = { L: [] };
                // created const params and refered in program to proccess employeeId update
                const params = {
                    // Table name
                    TableName: process.env.DYNAMODB_TABLE_NAME,
                    Key: marshall({ empID }),
                    UpdateExpression: 'SET skillInfoDetails = :emptyList',
                    ExpressionAttributeValues: {
                        ':emptyList': emptyList, //
                    },
                };
                // Use the update method with UpdateExpression to set skillInfoDetails to an empty list
                const updateResult = await client.send(new UpdateItemCommand(params));
                // convert raw data response from server to JSON string format
                response.body = JSON.stringify({
                    message: `Successfully deleted empID Skill Details`,
                    updateResult,
                });
            } catch (e) {
                console.error(e);
                response.statusCode = 500;
                // convert raw data response from server to JSON string format
                response.body = JSON.stringify({
                    message: `Failed to delete empID Skill Details`,
                    errorMsg: e.message,
                    errorStack: e.stack,
                });

            }
            break;
        case '/employees/skill/softdelete DELETE':
            const date = new Date().toISOString();
            const response = { statusCode: 200 };
            try {
                const { empID } = event.pathParameters;
                // writing params
                const params = {
                    // table name
                    TableName: process.env.DYNAMODB_TABLE_NAME,
                    // passing marshalled employeeId value
                    Key: marshall({ empID }),
                    // update expression for isActive property which present in skillInfoDetails
                    UpdateExpression:
                        'SET skillInfoDetails[0].isActive = :isActive, skillInfoDetails[0].UpdatedDateTime = :UpdatedDateTime',
                    ExpressionAttributeValues: {
                        // Set to true to update "isActive" to true
                        ':isActive': { BOOL: true },
                        ':UpdatedDateTime': { S: date },
                    },
                };
                // sending params to dynamoDb
                const updateResult = await client.send(new UpdateItemCommand(params));
                // response body values
                response.body = JSON.stringify({
                    message: `Successfully soft deleted empID Skill Details`,
                    updateResult,
                });
            } catch (e) {
                // error handling block for 500 error satus
                console.error(e);
                response.statusCode = 500;
                response.body = JSON.stringify({
                    message: `Failed to soft delete empID Skill Details`,
                    errorMsg: e.message,
                    errorStack: e.stack,
                });
            }
        case `/employee/create/skills`:
            try {
                // Parse the JSON body from the event
                const body = JSON.parse(event.body);
                const skillDetails = body.skillDetails;
                //Check for required fields in the body
                const requiredSkillDetails = [
                    'SkillID',
                    'YearsOfKnowledge',
                    'SkillLevel',
                    'Certified',
                ];
                //Iterate skill Details to check mandatory fields
                for (const field of requiredSkillDetails) {
                    if (!body.skillDetails[field]) {
                        response.statusCode = 400;
                        throw new Error(`${field} is a mandatory field!`);
                    }
                }
                //empId should be given mandatory
                if (!body.empId) {
                    response.statusCode = 400;
                    throw new Error('empId is a mandatory field!');
                }
                // Validate YearsOfKnowledge as a positive integer
                const yearsOfKnowledge = parseInt(skillDetails.YearsOfKnowledge);
                if (isNaN(yearsOfKnowledge) || yearsOfKnowledge <= 0) {
                    response.statusCode = 400;
                    response.body = JSON.stringify({ message: 'YearsOfKnowledge must be a positive integer' });
                    return response;
                }
                // Validate SkillLevel (add more validation as needed)
                const validSkillLevels = ['Beginner', 'Intermediate', 'Expert'];
                if (!validSkillLevels.includes(skillDetails.SkillLevel)) {
                    response.statusCode = 400;
                    response.body = JSON.stringify({ message: 'SkillLevel is invalid' });
                    return response;
                }
                skillDetails.CreatedDateTime = new Date().toISOString();
                skillDetails.UpdatedDateTime = new Date().toISOString();
                skillDetails.IsActive = true;
                // Define parameters for inserting an item into DynamoDB
                const params = {
                    TableName: process.env.DYNAMODB_TABLE_NAME,
                    //add the below line in params to validate post method to restrict duplicate posts
                    //ConditionExpression: "attribute_not_exists(empId)",
                    Item: marshall({
                        empId: body.empId,
                        skillDetails: {
                            SkillID: skillDetails.SkillID,
                            YearsOfKnowledge: skillDetails.YearsOfKnowledge,
                            SkillLevel: skillDetails.SkillLevel,
                            Certified: skillDetails.Certified,
                            IsActive: skillDetails.IsActive,
                            CreatedDateTime: skillDetails.CreatedDateTime,
                            UpdatedDateTime: skillDetails.UpdatedDateTime,
                        },
                    }),
                };
                // Insert the item into DynamoDB
                await client.send(new PutItemCommand(params));
                response.body = JSON.stringify({
                    message: 'Successfully created skillDetails!',
                });
            } catch (e) {
                // To through the exception if anything failing while creating skillDetails
                console.error(e);
                console.error(e);
                response.body = JSON.stringify({
                    message: 'Failed to created skillDetails.',
                    errorMsg: e.message,
                    errorStack: e.stack,
                });
            }
            break;
        // Function to update an employee
        case `/employee/update/skills/{empId}`:
            try {
                const body = JSON.parse(event.body);
                const empId = event.pathParameters ? event.pathParameters.empId : null;
                if (!empId) {
                    throw new Error('empId not present');
                }
                // Check if the empId exists in the database
                const getItemParams = {
                    TableName: process.env.DYNAMODB_TABLE_NAME,
                    Key: marshall({ empId }),
                };
                const { Item } = await client.send(new GetItemCommand(getItemParams));
                if (!Item) {
                    response.statusCode = 404; // Employee Id not found
                    response.body = JSON.stringify({
                        message: `Employee with empId ${empId} not found`,
                    });
                    return response;
                }
                const objKeys = Object.keys(body);
                const params = {
                    TableName: process.env.DYNAMODB_TABLE_NAME,
                    Key: marshall({ empId }),
                    UpdateExpression: `SET ${objKeys
                        .map((_, index) => `#key${index} = :value${index}`)
                        .join(', ')}`,
                    ExpressionAttributeNames: objKeys.reduce(
                        (acc, key, index) => ({
                            ...acc,
                            [`#key${index}`]: key,
                        }),
                        {}
                    ),
                    ExpressionAttributeValues: marshall(
                        objKeys.reduce(
                            (acc, key, index) => ({
                                ...acc,
                                [`:value${index}`]: body[key],
                            }),
                            {}
                        )
                    ),
                };
                const updateResult = await client.send(new UpdateItemCommand(params));
                response.body = JSON.stringify({
                    message: 'Successfully updated employee skills.',
                    updateResult,
                });
            } catch (e) {
                console.error(e);
                response.statusCode = 400;
                response.body = JSON.stringify({
                    message: 'Failed to update employee skills.',
                    errorMsg: e.message,
                    errorStack: e.stack,
                });
            }
            break;
        case `/employee/skills/get/{empId}/{skillId}`:
            try {
                const params = {
                    TableName: process.env.DYNAMODB_TABLE_NAME, // Getting table name from the servetless.yml and setting to the TableName
                    Key: marshall({ empId: event.pathParameters.empId }), // Convert a JavaScript object into a DynamoDB record.
                };
                //await response from db when sent getItem command with params
                //containing tablename, key and only display empId and bank details
                const { Item } = await client.send(new GetItemCommand(params)); //An asynchronous call to DynamoDB to retrieve an item
                console.log({ Item });
                if (!Item) {
                    // If there is no employee bank details found
                    response.statusCode = 404; // Setting the status code to 404
                    response.body = JSON.stringify({
                        message: 'Employee skill details not found.',
                    }); // Setting error message
                } else {
                    // If employee bank details found in the dynamoDB set to data
                    response.body = JSON.stringify({
                        message: 'Successfully retrieved Employee skill details.',
                        data: unmarshall(Item), // A DynamoDB record into a JavaScript object and setting to the data
                    });
                }
            } catch (e) {
                // If any errors will occurred
                console.error(e);
                response.body = JSON.stringify({
                    statusCode: e.statusCode, // Set server side status code
                    message: 'Failed to retrieved employee skill details.',
                    errorMsg: e.message, // Set error message
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