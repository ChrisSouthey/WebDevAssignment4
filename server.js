//Assignment 1 Stuff
const express = require("express"); 
const app = express(); 
const path = require('path');
const fs = require('fs');
//Assignment #2 stuff
const mongoose = require('mongoose');
const strict = require('assert/strict');
require('dotenv').config();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("Missing Connection Data");
    process.exit(1);
}


// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());


//Connects to MongoDB
async function connectToMongo() {
    try{
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB!!");
    }
    catch (err){
        console.error("Error connecting to MongoDB:", err.message);
        process.exit(1);
}};

//Standard routes
// app.get("/index", (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'index.html'));
//     console.log("Reached Index");
// });

// app.get("/todo", (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'todo.html'));
//     console.log("Reached Todo");
// });

// app.get("/readtodo", (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'readtodo.html'));
//     console.log("Reached Read-Todo");
// });


//API route for data
// app.get("/api/todo", (req, res) => {
//     fs.readFile("todo.json", "utf8", (err, data) => {
//         if (err){
//             res.status(500).send("Error reading data file");
//         };
//         res.json(JSON.parse(data));
//     });
// });


//Mongoose Schema and Model
const todos = new mongoose.Schema({}, { strict: false }); 
const Todos = mongoose.model('todos', todos);

//Routes to stuff

app.get("/api/todo", async (req, res) => {
    const data = await Todos.find();
    res.setHeader("Content-Type", "application/json");
    res.json(data);
});

app.get("/todo", async (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'todo.html'));
});

app.get("/read-todo", async (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'readtodo.html'));
});

app.get("/index", async (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
    res.redirect(301, "/index");
});


//Run Server :D
connectToMongo().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});