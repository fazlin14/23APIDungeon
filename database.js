const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://ds_dev:ds_devgroupb@clusterds.imsywsc.mongodb.net/?retryWrites=true&w=majority&appName=ClusterDS";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

module.exports = client