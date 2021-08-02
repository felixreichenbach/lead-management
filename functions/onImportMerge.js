exports = function (changeEvent) {
    /*
      A Database Trigger will always call a function with a changeEvent.
      Documentation on ChangeEvents: https://docs.mongodb.com/manual/reference/change-events/
  
      Access the _id of the changed document:
      const docId = changeEvent.documentKey._id;
  
      Access the latest version of the changed document
      (with Full Document enabled for Insert, Update, and Replace operations):
      const fullDocument = changeEvent.fullDocument;
  
      const updateDescription = changeEvent.updateDescription;
  
      See which fields were changed (if any):
      if (updateDescription) {
        const updatedFields = updateDescription.updatedFields; // A document containing updated fields
      }
  
      See which fields were removed (if any):
      if (updateDescription) {
        const removedFields = updateDescription.removedFields; // An array of removed fields
      }
  
      Functions run by Triggers are run as System users and have full access to Services, Functions, and MongoDB Data.
  
      Access a mongodb service:
      */
      
    console.log(changeEvent.fullDocument._id);
    const collection = context.services.get("mongodb-atlas").db("contacts").collection("import");
    const pipeline = [
        {
            '$match': { '_id': changeEvent.fullDocument._id }
        },
        {
            '$unwind': {
                'path': '$elements'
            }
        }, {
            '$project': {
                '_id': 0,
                'List': '$metadata.pivot.comlinkedinsalessearchListPivotResponse.name',
                'Account': '$elements.savedAccountResolutionResult.name',
                'FirstName': '$elements.firstName',
                'LastName': '$elements.lastName',
                'Role': {
                    '$arrayElemAt': [
                        '$elements.currentPositions.title', 0
                    ]
                },
                'Notes': {
                    '$cond': [
                        '$elements.mostRecentEntityNote.body.text', '$elements.mostRecentEntityNote.body.text', 'n/a'
                    ]
                },
                'Region': '$elements.geoRegion',
                'Degree': '$elements.degree',
                'InvitationPending': '$elements.pendingInvitation',
                'LinkedIn': {
                    '$concat': [
                        'https://www.linkedin.com/sales/people/', '$elements.entityUrn'
                    ]
                },
                'CRMLink': {
                    '$cond': [
                        '$elements.crmStatus.externalCrmUrl', '$elements.crmStatus.externalCrmUrl', 'n/a'
                    ]
                },
                'Goal': 'n/a',
                'Spoke': 'n/a',
                'ProofPoint': 'n/a',
                'LastUpdateInList': {
                    '$toDate': '$elements.lastUpdatedTimeInListAt'
                },
                'lastImport': '$$NOW',
                'salesNavId': '$elements.entityUrn',
                'userID': 1
            }
        },
        {
            '$merge': {
                'into': 'contacts',
                'on': 'salesNavId',
                'whenMatched': 'merge',
                'whenNotMatched': 'insert'
            }
        }

    ];
    const result = collection.aggregate(pipeline).toArray()
        .then(result => {
            console.log(`Success: ${result}`)
        })
        .catch(err => console.error(`Failed: ${err}`));
    /*
        Note: In Atlas Triggers, the service name is defaulted to the cluster name.
    
        Call other named functions if they are defined in your application:
        const result = context.functions.execute("function_name", arg1, arg2);
    
        Access the default http client and execute a GET request:
        const response = context.http.get({ url: <URL> })
    
        Learn more about http client here: https://docs.mongodb.com/realm/functions/context/#context-http
      */
    console.log("v1.0" + JSON.stringify(result));
};
