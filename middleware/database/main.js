var fs = require('fs');
var http = require('http');
var https = require('https');
var privateKey = fs.readFileSync('/etc/letsencrypt/live/5gwebxr.com/privkey.pem', 'utf8');
var certificate = fs.readFileSync('/etc/letsencrypt/live/5gwebxr.com/cert.pem', 'utf8');

var credentials = { key: privateKey, cert: certificate };
const express = require('express');
const bodyParser = require('body-parser');
var cors = require('cors');

var mongodb = require('mongodb');
const { Console } = require('console');
const uri = "mongodb://localhost:27017/";

const client = new mongodb.MongoClient(uri);

function objectify_data(data) {
	//serialize data function
	var returnArray = {};
	for (var i = 0; i < data.length; i++) {
		returnArray[data[i]['name']] = data[i]['value'];
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
		for (var i = 0; i < result_total; i++) {
			curr_user = JSON.parse(JSON.stringify(result[i], null, 4));
			users.push(curr_user);
		}
		return users;
	} finally {
		await client.close();
	}
}

async function marker_retrieve(types_to_retrieve) {
	try {
		await client.connect();
		const database = client.db("5gwebxr");
		const markers_retrieved = database.collection("markers");

		if (types_to_retrieve == "ids") {
			project_string = { _id: 0, marker_value: 1, marker_id: 1 };
		} else if (types_to_retrieve == "all") {
			project_string = {};
		}

		const result = await markers_retrieved
			.find()
			.project(project_string)
			.toArray();
		const result_total = result.length;

		console.log(result);

		var markers = [];
		for (var i = 0; i < result_total; i++) {
			curr_marker = JSON.parse(JSON.stringify(result[i], null, 4));
			markers.push(curr_marker);
		}
		return markers;
	} finally {
		await client.close();
	}
}

async function marker_update(data) {
	try {
		await client.connect();
		const database = client.db("5gwebxr");
		const marker_details = database.collection("markers");

		// create a filter for the marker to update - selecting which by using new marker value
		const filter = { marker_value: data.marker_value };
		const update_document = {
			$set: {
				marker_value: data.new_marker_value,
				marker_title: data.marker_title,
				cards: data.cards
			}
		}

		const result = await marker_details.updateOne(filter, update_document);
		console.log(
			`${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`,
		);
	} finally {
		await client.close();
	}
}

async function marker_insert(marker) {
	try {
		await client.connect();
		const database = client.db("5gwebxr");
		const marker_details = database.collection("markers");

		const result = await marker_details.insertOne(marker);
		console.log(`A marker was inserted with the _id: ${result.insertedId}`);
	} finally {
		await client.close();
	}
}

async function marker_delete(marker) {
	try {
		await client.connect();
		const database = client.db("5gwebxr");
		const marker_details = database.collection("markers");

		const query = { marker_id: marker.marker_id };

		const result = await marker_details.deleteOne(query);
		console.log(`A marker was deleted with the _id: ${result.insertedId}`);
	} finally {
		await client.close();
	}
}

async function recognition_insert(results) {
	try {
		await client.connect();
		const database = client.db("5gwebxr");
		const result_details = database.collection("recognitions");

		const result = await result_details.insertOne(results);
		console.log(`A recognition result was inserted with the _id: ${result.insertedId}`);
	} finally {
		await client.close();
	}
}

async function recongition_retrieve(client_id) {
	try {
		await client.connect();
		const database = client.db("5gwebxr");
		const result_details = database.collection("recognitions");

		if (types_to_retrieve == "ids") {
			project_string = {_id: 0, client: 1, timestamp: 1, results: 1};
		} else if (types_to_retrieve == "all") {
			project_string = {};
		}

		const result = await result_details
			.find({client: client_id})
			.project(project_string)
			.toArray();
		const result_total = result.length;

		console.log(result);

		var markers = [];
		for (var i = 0; i < result_total; i++) {
			curr_marker = JSON.parse(JSON.stringify(result[i], null, 4));
			markers.push(curr_marker);
		}
		return markers;
	} finally {
		await client.close();
	}
}

const app = express();
app.use(cors({ origin: '*' }));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Users 
app.post('/user_create', (req, res) => {
	// console.log('Got body:', req.body);
	console.log("Received user data to insert into database")
	user_insert(req.body);
	res.sendStatus(200);
});

app.get('/user_list', (req, res) => {
	let user_lists = user_retrieve();

	user_lists.then(function (result) {
		// res.sendStatus(200);
		res.send(result);
		console.log("Sent user list to requesting client")
	})
});

// Markers
app.get('/marker_ids', (req, res) => {
	let marker_lists = marker_retrieve("ids");
	marker_lists.then(function (result) {
		res.status(200)
		res.send(result);
		console.log("Sent marker IDs to client");
	})
});

app.get('/markers', (req, res) => {
	let marker_lists = marker_retrieve("all");
	marker_lists.then(function (result) {
		res.status(200)
		res.send(result);
		console.log("Sent markers to client");
	})
});

app.post('/marker_update', express.json(), (req, res) => {
	marker_update(req.body);
	console.log("Updating marker details");
	res.sendStatus(200);
});

app.post('/marker_insert', express.json(), (req, res) => {
	marker_insert(req.body);
	console.log("Inserting new marker");
	res.sendStatus(200);
});

app.post('/marker_delete', express.json(), (req, res) => {
	marker_delete(req.body)
	console.log("Deleting marker");
	res.sendStatus(200);
});

// Recognition results
app.post('/recognition', express.json(), (req, res) => {
	recognition_insert(req.body);
	console.log("Storing recongition results");
	res.sendStatus(200);
});

app.get('/recognition/:clientId', (req, res) => {
	var data = {
		"client": req.params.clientId
	};
	console.log(data);
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
