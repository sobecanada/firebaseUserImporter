// Initialize the default app
var admin = require('firebase-admin');
const { start } = require('repl');
var app = admin.initializeApp({
    credential: admin.credential.cert('/your/firebase-admin-key-file.json')
});

const tenantAuth = admin.auth().tenantManager().authForTenant('your-provider');
var authFrom = admin.auth().tenantManager().authForTenant('your-provider');
var authTo = admin.auth().tenantManager().authForTenant('your-provider2');

// Up to 1000 users can be imported at once.
let userImportRecords = [
    {
      uid: 'some-uid',
      email: 'myemail@my.com',
      // Must be provided in a byte buffer.
      passwordHash: Buffer.from('password', 'base64'),
      // Must be provided in a byte buffer.
      passwordSalt: Buffer.from('salt', 'base64'),
    },
    {
      uid: 'some-uid2',
      email: 'myemail@my.com',
      // Must be provided in a byte buffer.
      passwordHash: Buffer.from('password', 'base64'),
      // Must be provided in a byte buffer.
      passwordSalt: Buffer.from('salt', 'base64'),
    }
    //...
];

var userImportOptions = {
    hash: {
        algorithm: 'SCRYPT',
        // The following parameters can be obtained from the "Users" page in the
        // Cloud Console. The key must be a byte buffer.
        key: Buffer.from('keyxxxxxx', 'base64'),
        saltSeparator: Buffer.from('saltxxxxx', 'base64'),
        rounds: 8,
        memoryCost: 14
    }
};

function importUsers(userImportRecords,userImportOptions) {
    console.log("start");
    tenantAuth.importUsers(userImportRecords,userImportOptions)
    .then((results) => {
        results.errors.forEach(function(indexedError) {
         console.log('Error importing user ' + indexedError.index);
        });
      })
      .catch((error) => {
        console.log('Error importing users:', error);
      });
    console.log("end");
}


function migrateUsers(userImportOptions, nextPageToken) {
    console.log(start)
    var pageToken;
    authFrom.listUsers(1000, nextPageToken)
      .then(function(listUsersResult) {
       var users = [];
       listUsersResult.users.forEach(function(user) {
         var modifiedUser = user.toJSON();
         // Convert to bytes.
         if (user.passwordHash) {
          modifiedUser.passwordHash = Buffer.from(user.passwordHash, 'base64');
          modifiedUser.passwordSalt = Buffer.from(user.passwordSalt, 'base64');
         }
         // Delete tenant ID if available. This will be set automatically.
         delete modifiedUser.tenantId;
         users.push(modifiedUser);
       });
       // Save next page token.
       pageToken = listUsersResult.pageToken;
       // Upload current chunk.
       return authTo.importUsers(users, userImportOptions);
      })
      .then(function(results) {
       results.errors.forEach(function(indexedError) {
          console.log('Error importing user ' + indexedError.index);
        });
        // Continue if there is another page.
        if (pageToken) {
            migrateUsers(userImportOptions, pageToken);
        }
      })
      .catch(function(error) {
        console.log('Error importing users:', error);
      });
      console.log("DONE")
};

// importUsers(userImportRecords,userImportOptions);
migrateUsers(userImportOptions);
