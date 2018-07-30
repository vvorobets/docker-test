// server issues
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

// global variables
const TRIGGER_CALL = "@bot";
const ADVICE_CALL = '? #@)₴?$0';

const ADVICES = [
	"Loving someone \'in spite of\' is stronger than loving someone \'because\'.",
	"Drink more water.",
	"Buy a plunger before you need a plunger.",
	"Don\'t make decisions when you\'re mad and don\'t make promises when you\'re happy.",
	"Just because something still hurts doesn\'t mean you\'re not moving forward. Pain is a natural part of the process.",
	"If you can do something in less than 5 minutes, do it now.",
	"Always strive to stand and sit with good posture.",
	"Hug and kiss the people you love often.",
	"You won't remember, just write it down.",
	"Spend more time preparing for your marriage than your wedding. One of those lasts a lifetime."
];

const QUOTES = [
	"\"If two wrongs don\`t make a right, try three.\" - Laurence Johnston Peter",
	"\"Freedom is the sure possession of those alone who have the courage to defend it.\" - Pericles",
	"\"There are two kinds of fools: those who suspect nothing, and those who suspect everything.\" - Charles Josef de Ligne",
	"\"Show me another pleasure like dinner which comes every day and lasts an hour. \" - Charles Maurice de Talleyrand",
	"\"Cut out all these exclamation points. An exclamation point is like laughing at your own joke.\" - Francis Scott-Fitzgerald",
	"\"Too much sensibility creates unhappiness and too much insensibility creates crime.\" - Charles Maurice de Talleyrand",
	"\"Life decreases in direct proportion to the force of desire.\" - Honore de Balzac",
	"\"Life isn`t hard to manage when you`ve nothing to lose.\" - Ernest Hemingway",
	"\"You are responsible, forever, for what you have tamed. You are responsible for your rose.\" - Antoine de Saint-Exupery",
	"\"In art as in love, instinct is enough.\" - Anatole France"
];

let messages = [];
let userNotes = [];

// Functions definitions

function handleUserMessage(str) {
	if(str.indexOf(ADVICE_CALL) >= 0) {
		return getRandomItem(ADVICES);
	} else if(str.indexOf('show quote') >= 0 || str.indexOf('Show quote') >= 0) {
		return getRandomItem(QUOTES);
	} else if((str.indexOf('convert') >= 0 || str.indexOf('Convert') >= 0)) {
		return handleMoneyExchange(str);
	} else if(str.indexOf('weather') >= 0 || str.indexOf('weather') >= 0) {
		return handleWeather(str);
	} else if(str.indexOf('Show note list') >= 0 || str.indexOf('show note list') >= 0) {
		return showNoteList(userNotes);
	} else if(str.indexOf('Save note') >= 0 || str.indexOf('save note') >= 0) {
		return saveNote(userNotes, str);
	} else if(str.indexOf('Show note') >= 0 || str.indexOf('show note') >= 0) {
		return showNote(userNotes, str);
	} else if(str.indexOf('Delete note') >= 0 || str.indexOf('delete note') >= 0) {
		return deleteNote(userNotes, str);
	} else return "Boto doesn\'t understand...";
}

// functions definitions for routed calls

function handleWeather(str) {
	// parsing
	let arr = str.split(' ');
	let date = arr[arr.indexOf('weather') + 1];
	// handles complex date
	if(date === 'on') {
		date += " " + arr[arr.indexOf('weather') + 2];
	}
	// in case location has complex name
	let location = arr.slice(arr.indexOf('in') + 1);
	location = location.join(' ').replace('?', '');
	// checking format
	if(!date || !location) {
		return "Error. Usage: What the weather _day_ in _city_?";
	}
	return `The weather is moderate in ${location} ${date}, temperature 15 C`;
};

function handleMoneyExchange(str) {
	// parsing
	let arr = str.split(' ');
	const askedCurrency = arr[arr.length - 1];
	const bidCurrency = arr[arr.length - 3];
	const amountOfBidCurrency = Number.parseInt(arr[arr.length - 4]);
	// checking format
	if(!askedCurrency || !bidCurrency || !amountOfBidCurrency) {
		return "Error. Usage: Convert _amount_ _currency_ to _currency_";
	}
	// checking currencies supported
	if((bidCurrency.indexOf('dollar') < 0 && bidCurrency.indexOf('euro') < 0 && bidCurrency.indexOf('hryvnia') < 0) ||
	(askedCurrency.indexOf('dollar') < 0 && askedCurrency.indexOf('euro') < 0 && askedCurrency.indexOf('hryvnia') < 0)){
		return "Unsupported currency.";
	}
	// not actual coefficient. Probably a dictionary for exchange rate would be a good idea too
	let amountOfAskedCurrency = amountOfBidCurrency * 0.9;
	return `${amountOfBidCurrency} ${bidCurrency} = ${amountOfAskedCurrency} ${askedCurrency}s`;
};

function saveNote(notes, str) {
	// parsing
	let arr = str.split(' ');
	const titleStartsAt = arr.indexOf('title:')  + 1;
	const bodyStartsAt = arr.indexOf('body:') + 1;
	let title = arr.slice(titleStartsAt, bodyStartsAt -1);
	title = title.join(' ');
	let body = arr.slice(bodyStartsAt);
	body = body.join(' ');
	// checking format
	if(!titleStartsAt || !bodyStartsAt || (bodyStartsAt - titleStartsAt) < 2 || !title || !body) {
		return "Error. Usage: Save note title: _title_, body: _body_";
	}
	addNotesDatabase(notes, {'title': title, 'body': body});
	return `Saved! Title: ${title}, body: ${body}`;
};

// pure function: just represent current notes database
function showNoteList(notes) {
	if(notes.length === 0) return "You don\'t have notes yet..."
	let result = '';
	notes.map((note)=>{
		result += `Title: ${note.title} Body: ${note.body}\n`;
	});
	return result;
};

// pure function: represent searched notes
function showNote(notes, str) {
	// in case few notes shares same title
	let result = '';
	// parsing
	let arr = str.split('note ');
	let title = arr[1];
	// checking format
	if(!title) {
		return "Usage: Show note _title_";
	}
	notes.map(note=>{
		if(title===note.title) {
			result += `Title: ${note.title} Body: ${note.body}\n`
		};
	});
	if(!result) {
		return "Matching notes not found.";
	}
	return result;
};

function deleteNote(notes, str) {
	// parsing
	let arr = str.split('note ');
	let titleOfDeleted = arr[1];
	
	// checking format
	if(!titleOfDeleted) {
		return "Usage: Delete note _title_";
	}

	let before = notes.length;
	notes = deleteByTitle(notes, titleOfDeleted)
	let after = notes.length;
	if(before === after) {
		return "Matching notes not found.";
	}
	return `Deleted ${before - after} of notes with title \"${titleOfDeleted}\".`;
};

// random generator, takes array and returns random item
function getRandomItem(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
};

// methods to work with userNotes database
function addNotesDatabase(notes, newNote) {
	notes.push(newNote);
};

function deleteByTitle(notes, itemTitle) {
	return notes = notes.filter(item=>{
		return item.title!==itemTitle;
	})
};

// dispatching web transports events
io.on('connection', function(socket) {
	socket.on('chat message', function(msg) {
		messages.push(msg);
		if(messages.length > 100) {
			messages.shift();
		};
		if(msg.text.indexOf(TRIGGER_CALL) >= 0) {
			const answer = {
				text: '',
				time: new Date().toUTCString(),
				author: "Boto"
			};
			answer.text = handleUserMessage(msg.text);
			messages.push(answer);
		}
		io.emit('chat message', messages);
	});
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});