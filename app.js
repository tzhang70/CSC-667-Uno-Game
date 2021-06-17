var express = require('express');
var app = express();
var http = require('http').Server(app);
var mongoose = require("mongoose");
var bodyParser = require('body-parser');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var crypto = require("crypto");

var User = require("./models/user");


function generateSessionId(id)
{
    //Generate session key from the record id provided
    if(id !== null && id !== "")
    {
        return crypto.createHash("md5").update(id.toString()).digest("hex");
    }
}

//DB Connection
let dbURI = "mongodb://localhost:27017/?readPreference=primary&appname=MongoDB%20Compass&ssl=false";
mongoose.connect(dbURI,{useNewUrlParser:true,useUnifiedTopology:true}).then((result)=>{
    console.log("Connected to DB...");
    //Start the HTTP Server
    http.listen(process.env.PORT || 3000, '0.0.0.0',()=>{
        console.log("Server started!");
    });
}).catch((err)=>{
    console.log(err);
});

//Setup Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/login",(req,resp)=>{
    //Get Params
    let username = req.query.username;
    let password = req.query.password;

    if(!username || !password)
    {
        resp.status(400).send("Invalid Details!");
    }
    else
    {
        //Check Login
        User.find({username:username,password:password},(err,res)=>{
            if(!err)
            {
                if(res === null || res.length === 0)
                {
                    resp.redirect("/client/login.html");
                }
                else if(res.length > 0)
                {
                    //Record Found , Generate SESSION Key
                    console.log("user found");
                    let sessionId = generateSessionId(res[0]._id);
                    User.findOneAndUpdate({username:username,password:password},{session:sessionId}).
                    then((val)=>{
                        console.log("Session ID Generated");
                        //Send Cookie
                        resp.cookie("_id",res[0]._id,{path:"/"}).redirect("/client/index.html");
                    }).catch((err)=>{
                        console.log("Error Updating the Session ID")
                        resp.status(500).send();
                    });
                }
            }
            else
            {
                //Throw Error 500
                resp.status(500).send();
            }
        });
    }
});

app.get("/logout",(req,resp)=>{

    resp.clearCookie("_id");
    resp.redirect("/client/login.html");

});

app.get("/register",(req,resp)=>{
    //Get params
    let username = req.query.username;
    let email = req.query.email;
    let password = req.query.password;

    if(!username || !email || !password)
    {
        resp.status(400).send("Invalid Details!");
    }
    else
    {
        let user = new User({username:username,email:email,password:password}).save().
        then((val)=>{
            
            //Generate SessionID
            let sessionId = generateSessionId(val._id);

            //Set Cookie
            resp.cookie("_id",sessionId,{path:"/"}).redirect("/client/index.html");

        }).catch((err)=>{
            resp.status(500).send();
        });

    }
});

// app.get('/', function(req, res) {
//     res.sendFile(__dirname + '/client/login.html');
// });

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));
const Lobby = require('./client/lobby.js')


var io = require('socket.io')(http,{});

var lobby = new Lobby(io);
io.on('connection', function(socket) {
    lobby.newSocket(socket);
    console.log("Hello " + socket.playerID);

    socket.on('startRound', function() {
        if(lobby.host == socket) lobby.newRound();
    })

    socket.on('sendCard', function(data) {
        lobby.sendCard(socket, data);
    })

    socket.on('takeCard', function() {
        lobby.takeCard(socket);
    })

    socket.on('selectColor', function(data) {
        lobby.selectColor(socket, data);
    })

    socket.on('pass', function() {
        if(lobby.currentMove == socket.seat && !socket.canPick && lobby.running && !lobby.waitForColor) lobby.nextPlayer();
    })

    socket.on('uno', function() {
        lobby.uno(socket);
    })

    socket.on('chatSend', function(data) {
        if(data.text.length <= 1) return;
        data.text = data.text.replace('<', '&lt;');
        data.text = data.text.replace('>', '&gt;');
        data.text = data.text.replace('/', '&sol;');
        data.text = '[' + socket.playerID + '] ' + data.text;
        lobby.chatHistory.push(data.text);
        while(lobby.chatHistory.length > 30) {lobby.chatHistory.shift();}
        socket.broadcast.emit('chatReceive', data);
    })

    socket.on('disconnect', function() {
        lobby.onPlayerDisconnect(socket);
    })
});
// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});
  
  // error handler
app.use(function(err, req, res, next) {
// set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});
  
module.exports = app;