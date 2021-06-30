require('dotenv').config()

exports.getClient = () => {
  const MongoClient = require('mongodb').MongoClient;
  const uri = process.env.DB_HOST;
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  return client
}