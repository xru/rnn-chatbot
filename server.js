var PythonShell = require('python-shell');
var readline    = require('readline');
var express     = require('express');
var prompt      = require('prompt');
var process     = require('process');
var fs          = require('fs');
var bodyParser  = require('body-parser');

var chatbots = {};

process.chdir("src");
chatbots["statesave"]    = new PythonShell("translate.py", {pythonOptions: ["-u"], args:["--size=1700","--save_states=True","--use_lstm=True","--embedding_dimensions=300","--batch_size=1","--decode_randomness=0.3", "--vocab_size=90000", "--num_layers=2", "--decode=True", '--checkpoint_dir="../checkpoints/1"']});
chatbots["standard"]    = new PythonShell("translate.py", {pythonOptions: ["-u"], args:["--size=1700","--save_states=False","--use_lstm=True","--embedding_dimensions=300","--batch_size=1","--decode_randomness=0.3", "--vocab_size=90000", "--num_layers=2", "--decode=True", '--checkpoint_dir="../checkpoints/2"']});
var app = express();

app.use(bodyParser.urlencoded({extended: false})); 
app.use(bodyParser.json());

// Add headers
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://128.199.46.170:27241');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

var curRes = undefined;
var curBot = undefined;
var manual = false;
app.set("jsonp callback name", "cb");

var time = new Date();

var filepath = '../data/chatlogs/log'+time.getTime()+'.txt';
fs.openSync(filepath, "w");

function writeFile(msg) {
  fs.appendFile(filepath, msg+"\n");
}

app.post("/", function(req, res){
  var message = req.body.msg;
  console.log("client: "+message);
  writeFile("client: "+message);
  curRes = res;
  if(curBot) {
    curBot.send(message);
  } else if(!manual) {
    res.status(200).jsonp({msg: "No chatbot available right now :("})
  }
});

app.listen(3000, function(){
  console.log("it is up, go to localhost:3000");
});

for(var name in chatbots){
  new function(n){
    chatbots[n].on('message', function(message){
      setTimeout(function(){
        if(curRes) {
          returnMessage(message);
        } else {
          console.log("from "+n+": "+message);
        }
      }, 1000);
    });
    chatbots[n].on('error', function(error){
      console.log(error);
    });
  }(name);
}

function returnMessage(message) {
  if(curRes) {
    console.log("server: "+message);
    curRes.status(200).jsonp({msg: message});
    writeFile("server: "+message);
  }
}

prompt.start();
prompt.get('bot', getInput);
function getInput(err, result) {
  if(manual) {
    if(result.bot == "exit") {
      manual = false
    } else if(curRes) {
      console.log("sent message");
      returnMessage(result.bot);
    }
  } else {
    console.log(result.bot + " picked");
    if(chatbots[result.bot]) {
      curBot = chatbots[result.bot];
      writeFile("SWITCHED TO "+result.bot);
    } else if(result.bot == "manual") {
      manual = true;
      curBot = undefined;
      writeFile("SWITCHED TO manual");
    } else if(result.bot == "exit") {
      curBot = undefined;
    }else {
      console.log("no such bot");
    }
  }
  
  prompt.get('bot', getInput);
}