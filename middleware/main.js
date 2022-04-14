var fs = require('fs');
var http = require('http');
var https = require('https');
var privateKey  = fs.readFileSync('../server/key.pem', 'utf8');
var certificate = fs.readFileSync('../server/cert.pem', 'utf8');

var credentials = {key: privateKey, cert: certificate};
const express = require('express');
const bodyParser = require('body-parser');
var cors = require('cors');

var mongodb = require('mongodb');
const uri = "mongodb://localhost:27017/";

const client = new mongodb.MongoClient(uri);

function objectify_form(formArray) {
    //serialize data function
    var returnArray = {};
    for (var i = 0; i < formArray.length; i++){
        returnArray[formArray[i]['name']] = formArray[i]['value'];
    }
    return returnArray;
}

async function user_insert(user) {
    try {
      await client.connect();
      const database = client.db("5gwebxr");
      const user_details = database.collection("users");

      const user_json = objectify_form(user);

      const user_doc = {
        first_name: user_json["fname"],
        surname: user_json["lname"],
        id: Math.random().toString(36).slice(2),
      }
      const result = await user_details.insertOne(user_doc);
      console.log(`A document was inserted with the _id: ${result.insertedId}`);
    } finally {
      await client.close();
    }
}

function iterateFunc(doc) {
    console.log(JSON.stringify(doc, null, 4));
 }
 
 function errorFunc(error) {
    console.log(error);
 }

async function user_retrieve() {
    try {
        await client.connect();
        const database = client.db("5gwebxr");
        const user_details = database.collection("users");
    
        const result = await user_details.find().toArray();
        const result_total = result.length;
        
        var users = [];
        for (var i=0; i<result_total; i++) {
            curr_user = JSON.parse(JSON.stringify(result[i], null, 4));
            users.push(curr_user);
        }
        return users; 
      } finally {
        await client.close();
      }
}

const app = express();
app.use(cors({origin: '*'}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/user_create', (req, res) => {
    // console.log('Got body:', req.body);
    console.log("Received user data to insert into database")
    user_insert(req.body);
    res.sendStatus(200);
});

app.get('/user_list', (req, res) => {
    let user_lists = user_retrieve();

    user_lists.then(function(result) {
        // res.sendStatus(200);
        res.send(result);
        console.log("Sent user list to requesting client")
     })
});

var httpsServer = https.createServer(credentials, app);

httpsServer.listen(8444, () => console.log(`Started server at http://localhost:8444`));


// import mongoose from 'mongoose';
// const { Schema } = mongoose;

// const user_schema = new Schema({
//     first_name: String,
//     last_name: String,
//     user_id: String
// });