const http = require('http');
const mongoose = require('mongoose');
const express = require('express');
const app = express();
const hostname = '127.0.0.1';
const port = 3000;
const server = http.createServer(app);

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

//mongodb for filling in data — replaces false with path
const mong = false;

//OpenAI API key:
const key = '';

const Country = require('./models/countries.js');
const City = require('./models/citiess.js');
const City2 = require('./models/citiess.js');

if (mong) {
const connect_db = async () => {
	try {
		await mongoose.connect(mong, {
			useUnifiedTopology: true,
			useNewUrlParser: true
		})
	} catch (e){
		console.log(e);
	}
}

connect_db();

mongoose.connection.once('open', () => {
	console.log('connected to mongo');
});

}

const citarr = require('./allcities2.json');
let cat_pre = "Whenever you write a description, write it as if people were cats. Instead of saying 'person', say 'cat', instead of 'legs' say 'paws', ... things like that, get creative! ";
let cat_pre_mild = "Whenever you write a description, try writing it as if people were cats. Instead of saying 'person', say 'cat', instead of 'legs' say 'paws'. Don't overdo it, though! Even one tiny pun for the description is enough. No pun at all is also fine, don't force it!";

let main_city_object = {};
let processed_count = 0;

function batch_cities(c, from = 0, to = 1){
	let batches = {};
	let i = 0;
	let j = 0;
	batches['b0'] = [];
	for (let city of c){
		if (city.population < 100000) continue;
		if (city.country == 'China' && city.population < 2000000) continue;
		i++;
		if (i >= 20){
			i = 0;
			j++;
			batches['b' + j] = [];
		}

		batches['b' + j].push([city.city_ascii, city.country, "c" + city.id]);

	}
	let final_array = [];
	for (let b in batches){
		let b_num = b.substring(1);
		if (Number(b_num) >= Number(from) && Number(b_num) <= Number(to)){
			final_array.push(batches[b]);	
		} 
	}
	return final_array;
}

function process_prompt(str, content_type = '', city = '', city_id = ''){
	console.log('PROCESS PROMPT:')
	console.log(str);
	console.log(content_type);
	console.log(city);
	console.log(city_id);
	fetch('https://api.openai.com/v1/chat/completions', {
		method: "POST",
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + key,
		},
		body: JSON.stringify(
			{
			  "model": "gpt-3.5-turbo",
			  "messages": [{"role": "user", "content": str}]
			}
		)
	}).then(response => {
		return response.json();
	}).then(data => {
		let rec = data.choices[0].message.content;
		let result = "{ data: 'nada'}";
		let tried_again = 0;
		let failed = 0;
		try {
			if (content_type == 'summary2'){
				result = rec;
			} else {
				result = JSON.parse(rec);	
			}
		} catch(e) {
			console.log('!!!!!!!!!!!!!!!!! not valid JSON? !!!!!!!!!!!!!!!!! Trying again!');
			console.log(rec);
			failed = 1;
			let new_string = str + "\n Fill in the JSON file, don't do anything else! Even if you want to clarify something or whatever, it's very important that you ONLY fill in the JSON file. Make sure the JSON is valid with no mistake like e.g. trailing comma after the last value."
			process_prompt(new_string, content_type, city, city_id);
		}
		if (failed){
			console.log('NADNADNANDANDNADNNADA');
		} else {
			store_city_data(result, content_type, city, city_id);
		}
	})
}

function populate_database(){
	console.log('collected: ' + collected_country_answers.length + '/' + num_of_prompts);
	if ((collected_country_answers.length - 1) == num_of_prompts){
		console.log('populating db!!!!!!!!!!!!');
		//console.log(collected_country_answers);
		for (let batch of collected_country_answers){
			let parsed = JSON.parse(batch)
			console.log('parsed:');
			console.log(parsed);
			for (let item in parsed){
				new_country(item, parsed[item][0], parsed[item][1], temp_countries[item]['cities'])
			}
		}
	}
}

function prestore_city(city_name, city_name_ascii, city_id, population){
	const city_item = new City2({
		name: city_name,
		name_ascii: city_name_ascii,
		id: city_id,
		population: population
	})

	city_item.save()
		.then((result)=>{
			console.log(city_name + ' saved');
		})
		.catch((error) => {
			console.log(error);
		})
}

function convert_range(value, r1, r2) { 
    return (value - r1[0]) * (r2[1] - r2[0]) / (r1[1] - r1[0]) + r2[0];
}

function calculate_meowscore(data){
	let weights = {
		'cats-in-city': 3,
		'sunny-days': 7,
		'traffic': 8,
		'noisiness': 6,
		'sightseeing-and-views': 8,
		'parks-and-greenery': 8,
		'safety': 9
	}

	let score = 0;

	for (let key in data){
		score += data[key][0] * weights[key];
	}

	score = Math.round(convert_range(score, [120, 400], [0, 100]));
	return score;
}

async function store_city_data(store_this, content_type, city, city_id){

	const filter = { id: city_id };
	let update = {};

	if (store_this['data'] != undefined && store_this['data'] == 'nada') return;

	switch (content_type) {
		case 'ttd':
			console.log('ttd');
			update['ttd_names'] = [];
			update['ttd_descriptions'] = [];
			update['ttd_emojis'] = [];
			for (let key in store_this){
				if (store_this[key] == 'nada') continue;
				update['ttd_names'].unshift(store_this[key][0]);
				update['ttd_descriptions'].unshift(store_this[key][1]);
				update['ttd_emojis'].unshift(store_this[key][2]);
			}
			break;
		case 'gem':
			console.log('storing gem');
			update['gems_names'] = [];
			update['gems_descriptions'] = [];
			update['gems_emojis'] = [];
			for (let key in store_this){
				if (store_this[key] == 'nada') continue;
				update['gems_names'].unshift(store_this[key][0]);
				update['gems_descriptions'].unshift(store_this[key][1]);
				update['gems_emojis'].unshift(store_this[key][2]);
			}
			break;
		case 'duration':
			update['visit_duration'] = store_this['visit-duration'];
			update['duration_reason_short'] = store_this['brief-reason-why'];
			update['duration_reason_long'] = store_this['more-info'];
			break;
		case 'tagline':
			//TODO: remove punctuation
			update['tagline'] = store_this['tagline'];
			break;
		case 'summary':
			update['summary_p1'] = store_this['para1'];
			update['summary_p2'] = store_this['para2'];
			break;
		case 'month':
			update['months'] = store_this;
			break;
		case 'tipping':
			update['tipping_range'] = store_this['usual-tipping-range'];
			update['tipping_comment'] = store_this['description'];
			break;
		case 'internet':
			update['net_speed'] = store_this['speed'];
			update['net_availability'] = store_this['availability'];
			update['net_coverage'] = store_this['cellular-coverage'];
			break;
		case 'bike':
			update['bike_rating'] = [store_this['bike-friendliness-rating'], store_this['reason']];
			break;
		case 'walk':
			update['walk_rating'] = [store_this['walk-friendliness-rating'], store_this['reason']];
			break;
		case 'lgbtq':
			update['lgbtq_rating'] = [store_this['lgbtq-friendliness-rating'], store_this['reason']];
			break;
		case 'mindful':
			update['mindful_meoweler'] = store_this;
			break;
		case 'songs':
			update['songs'] = store_this;
			break;
		case 'websites':
			update['websites'] = store_this;
			break;
		case 'meowscore':
			update['meowscore_object'] = store_this;
			update['meowscore'] = calculate_meowscore(store_this);
			break;
		default:
			console.log('storing unknown');
	}

	console.log(update);
	if (mong) {
		const doc = await City.findOneAndUpdate(filter, update, {
		 new: true,
		 upsert: false
		});
		console.log('db updated');
	}

}

function example_json(obj, fills = '', first = ''){
	let helper = {}
	for (let i = 0; i < obj.length; i++){
		helper[obj[i]] = fills;
	}
	helper[obj[0]] = first;

	return JSON.stringify(helper);
}


function gen_batch_tagline(cities){
	let prompt = "Please fill in the following JSON with some positive short and unique tagline about each city. Get creative and try to make them at least a little bit humorous! Don't use any markdown and, this is very important, no punctuation at the end of the tagline! \n\n" + example_json(cities);
	// process_prompt(prompt);
	console.log(prompt);
}

function gen_batch_summary(cities){
	let prompt = "Fill in the following JSON with brief, but humorous description of the cities. Max. 2 paragraphs and each para with max. 25 words. Write the descriptions as if people were cats. Instead of saying 'person', say 'cat', instead of 'legs' say 'paws', ... things like that, get creative! Don't mention the name of the city again, just get on with the content right away. \n \n" + example_json(cities);
	// process_prompt(prompt);
	console.log(prompt);
}

function gen_batch_visit_duration(cities){
	let example_first = ["visit duration", "brief reason (at least 6 words, max. 12 words) why this specific visit duration makes sense. (e.g. 'Usually enough to explore the city's highlights', or 'Weekend getaway destination from...', ... but obviously not exactly these phrases, just in the same reasoning spirit)"];
	let prompt = "For how long do people usually visit the following cities for? Write it in the JSON format below. Just fill in the JSON please, don't write any other text. Don't mix units in the duration and keep it extremely concise - e.g. '1-3 days' or '~1 week' or '5-10 days' and so on. \n\n If you know the city but it's either too small or you don't have the right data, just make a good guess (very important!). \n\n" + example_json(cities, ['...'], example_first);
	console.log(prompt);
	// process_prompt(prompt);
}

function gen_batch_sockets(cities){
	let prompt = "What's the socket type used in the following cities? Just fill in the JSON with a single character for each city (the socket type), don't write anything else! \n\n" + example_json(cities);
	console.log(prompt);
	// process_prompt(prompt);
}

function gen_currency(country){
	let prompt = "What's the currency code (e.g. 'USD', 'CHF', ...) type used in the following countries? Just fill in the JSON with a single character for each city (the socket type), don't write anything else! \n\n" + example_json(country);
	console.log(prompt);
	// process_prompt(prompt);
}

function gen_tagline(city, content_type = '', country = '', city_id = ''){
	let tag_obj = {
		tagline: ""
	}
	let prompt = "Write a short (3 to 10 words), positive and unique tagline for " + city + " in " + country + " that doesn't include the name of the city. Get creative and try to make it at least a little bit humorous.\n\n Please refreain from using any punctuation, such as periods or exclamation marks, at the end of the tagline.\n\n Put it into the JSON format below: \n\n " + JSON.stringify(tag_obj);
	console.log(prompt);
	process_prompt(prompt, content_type, city, city_id);
}

function gen_summary(city, content_type = '', country = '', city_id = ''){
	let summary_obj = {
		para1: "",
		para2: ""
	}
	let prompt = "Write 2 somewhat humorous short paragraphs (max. 25 words per para) describing " + city + " - " + country + " (for a travel website). Write the description as if people were cats. Instead of saying 'person', say 'cat', instead of 'legs', say 'paws', ... things like that - get creative! \n \n Don't mention the name of the city again, just get on with the content. Write it in the JSON format below — don't say anything else. Only fill in the JSON!\n\n" + JSON.stringify(summary_obj);
	console.log(prompt);
	process_prompt(prompt, content_type, city, city_id);
}

function gen_month_feel(city, content_type = '', country = '', city_id = ''){
	let month_object = {};
	month_object['january'] = ['describe why people visit this city in this particular month (max. 20 words)', 'hex code of a color that you associate with this month in this city. Avoid pure white (#ffffff) and generally prefer darker shades (or colors with high contrast with white)'];
	month_object['february'] = '...';
	month_object['march'] = '...';
	month_object['april'] = '...';

	let prompt = cat_pre + "Why should tourists visit " + city + " - " + country + " in specific months? Write it in this format: \n \n" + JSON.stringify(month_object) + "\n...\n\n at the end of the json, write 'recommended-month:' ['your recommendation for visit. Just the month name, nothing else. One month only', 'brief reason why (max. 10 words)']. \n\n Don't add anything else, just fill in the json, please";
	console.log(prompt);
	process_prompt(prompt, content_type, city, city_id);
}


function gen_visit_duration(city, content_type = '', country = '', city_id = ''){
	let visit_obj = {
		'visit-duration': "duration in one unit (e.g. 1-3 days, 3-5 days, ~1 week, etc...)",
		'brief-reason-why': "brief explanation for why this duration is popular/common (max. 10 words)",
		'more-info': "Mention whatever else is relevant about for how long people generally visit this city. Keep it below 30 words."
	}
	let prompt = "For how long do people generally visit " + city + " - " + country + "? Write it in the JSON format below. If the city is too small or you don't have the data, just make a guess based on the country itself. Don't say anything else, only fill in the JSON! \n\n" + JSON.stringify(visit_obj);
	console.log(prompt)
	process_prompt(prompt, content_type, city, city_id);
}

function gen_tipping(city, content_type = '', country = '', city_id = ''){
	let tipping_obj = {
		'usual-tipping-range': "range (e.g. '0-5%', '5-10%', etc.)",
		'description': 'brief info about tipping culture in this city (max. 12 words)'
	}
	let prompt = "What are the tipping customs in " + city + " - " + country + "? Write it in the JSON format below. 0% is also valid answer (only if you are confident that that's the case!). If the city is too small or you don't have the data, just make a guess based on the country itself. Don't say anything else, only fill in the JSON. \n\n" + JSON.stringify(tipping_obj);
	console.log(prompt)
	process_prompt(prompt, content_type, city, city_id);
}

function gen_internet(city, content_type = '', country = '', city_id = ''){
	let internet_obj = {
		"speed": ['rating', 'brief reason (max. 10 words)'],
		"availability": ['...', '...'],
		"cellular-coverage": ['rating', 'reason (just coverage, do not comment on speed']
	}
	let prompt = "How would you rate the internet situation in " + city + " - " + country + "? Rate it on the scale from 1–10 (only integers) on the following parameters in the JSON file. Just fill the JSON, don't write anything else. If the city is too small or you don't have the data, make a guess based on the country itself. \n\n" + JSON.stringify(internet_obj);
	console.log(prompt);
	process_prompt(prompt, content_type, city, city_id);
}

function gen_bike(city, content_type = '', country = '', city_id = ''){
	let biking_obj = {
		"bike-friendliness-rating": "",
		"reason": "Short reason why (max. 20 characters)"
	}
	let prompt = "How would you rate biking-friendliness of " + city + " in " + country + "? Rate it on the scale from 1 to 10 (only integers). If the city is too small or you don't have the data or whatever, just make something up considering what you generally know about the country or the region. The only thing you need to do is to fill the JSON below. Don't write anything else! \n\n" + JSON.stringify(biking_obj);
	console.log(prompt);
	process_prompt(prompt, content_type, city, city_id);
}

function gen_walk(city, content_type = '', country = '', city_id = ''){
	let walking_obj = {
		"walk-friendliness-rating": "",
		"reason": "Short reason why (max. 20 characters)"
	}
	let prompt = "How would you rate walking-friendliness of " + city + " in " + country + "? Rate it on the scale from 1 to 10 (only integers). Consider things like the amount of traffic, modernity of infrastructure, greenery and parks, etc. If the city is too small and you don't have the data or whatever, just make something up considering what you generally know about the country or the region. The only thing you need to do is to fill the JSON below. Don't write anything else! \n\n" + JSON.stringify(walking_obj);
	console.log(prompt);
	process_prompt(prompt, content_type, city, city_id);
}

function gen_lgbtq(city, content_type = '', country = '', city_id = ''){
	let lgbtq_obj = {
		"lgbtq-friendliness-rating": "",
		"reason": "Short reason why (max. 15 characters)"
	}
	let prompt = "How would you rate LGBTQ-friendliness of " + city + " in " + country + "? Rate it on the scale from 1 to 10 (only integers). If the city is too small and you don't have the data or whatever, just make something up considering what you generally know about the country or the region. The only thing you need to do is to fill the JSON below. Don't write anything else! \n\n" + JSON.stringify(lgbtq_obj);
	console.log(prompt);
	process_prompt(prompt, content_type, city, city_id);
}

function ttd_mainstream(city, content_type = '', country = '', city_id = ''){
	let ttd_mainstream_obj = {
		"t1": ["name (no cat puns here!)", "short description (max. 36 words)", "one (and only one!) emoji that fits the place best"],
		"t2": ['...'],
		"t3": ['...'],
		"t4": ['...'],
		"t5": ['...']
	}

	let prompt = "Give me 5 places to visit in " + city + " - " + country + ". The favorite/known spots." + cat_pre_mild + " Write it in the JSON format below (each array has length 3. [name, description, emoji]). Don't say anything else, only the JSON, please! \n\n " + JSON.stringify(ttd_mainstream_obj);
	console.log(prompt);
	process_prompt(prompt, content_type, city, city_id);
}

function ttd_gems(city, content_type = '', country = '', city_id = ''){
	let ttd_gems_obj = {
		"g1": ["name (no cat puns here!)", "short description (max. 36 words)", "exactly one emoji that fits the place best"],
		"g2": ['...'],
		"g3": ['...'],
		"g4": ['...'],
		"g5": ['...']
	}

	let prompt = "Give me 5 'hidden gems' to visit in " + city + " - " + country + ". Some cool places that not many people, and especially not tourists, know about. " + cat_pre_mild + " Write it in the JSON format below (each array has length 3. [name, description, emoji]). Don't say anything else, only the JSON, please! \n\n " + JSON.stringify(ttd_gems_obj);
	console.log(prompt);
	process_prompt(prompt, content_type, city, city_id);
}

function mindful_meoweler(city, content_type = '', country = '', city_id = ''){
	let mindful_obj = {
		"m1": ["super-brief headline (no cat puns here!)", "description (20-30 words)", "prompt for Midjourney to create an illustration for this"],
		"...": "..."
	}
	let prompt = "What are some very specific things people should be aware of when visiting " + city + " - " + country + "? Cultural tidbits, fun facts, travel tips, anything. Doesn't have to be places to visit! Write the description as if people were cats. Instead of saying 'person', say 'cat', instead of 'legs' say 'paws', ... things like that, but keep it mild and don't force it too much. Don't overuse this 'cat' language!. Write a list of 3-5 things in this JSON format: \n\n" + JSON.stringify(mindful_obj);
	console.log(prompt);
	process_prompt(prompt, content_type, city, city_id);
}

function gen_songs(city, content_type = '', country = '', city_id = ''){
	let song_obj = {
		"s1": ["song title", "artist"],
		"s2": "...",
		"s3": "..."
	}
	let prompt = "Give me 3 songs that somehow capture the spirit of " + city + " - " + country + ". It can a popular song in that city, a typical genre, or any other criteria that would make sense. You need to be absolutely sure that this song exists! If you have any doubt at all, even a tiny bit, opt for something else. If the city is too small, suggest songs that have some broader appeal for that region/country. Write it in this JSON file (and don't write anything else! Only fill in the json: \n\n" + JSON.stringify(song_obj);
	console.log(prompt);
	process_prompt(prompt, content_type, city, city_id);
}

function gen_websites(city, content_type = '', country = '', city_id = ''){
	let website_obj = {
		"w1": ["website name", "brief description of this site", "url"],
		"w2": "...",
		"w3": "..."
	}
	let prompt = "Give me 3 websites that would be relevant for travelers visiting " + city + " - " + country + ". You need to be 100% sure that this website exists! If you have any doubt at all, opt for a different one. For the URL use the main website address, not any inner pages! The link should end with a top-level-domain without any '/something...' after that. Write it in this JSON file and don't write anything else! Only fill in the JSON: \n\n" + JSON.stringify(website_obj);
	console.log(prompt);
	process_prompt(prompt, content_type, city, city_id);
}

function gen_meowscore(city, content_type = '', country = '', city_id = ''){
	let meow_obj = {
		"cats-in-city": ["rating (make a guess, but generally the more cats in the city, the higher the rating)", "brief reason why this rating"],
		"sunny-days": ["rating (some balance where generally sunny city should receive a 10, but too much sun isn't ideal either)", "brief reason why"],
		"traffic": ["rating (the lower the traffic, the higher the rating)", "brief reason why"],
		"noisiness": ["rating (quiet city would receive a higher rating)", "brief reason why"],
		"sightseeing-and-views": ["rating (the more sightseeing opportunities and more city views, the higher the rating)", "brief reason why"],
		"parks-and-greenery": ["rating (more greenery = higher rating)", "brief reason why"],
		"safety": ["rating - the safer the city, the higher the rating", "brief reason why"]
	}
	let prompt = "How would you rate " + city + " - " + country +" on the following items? Rate it on the scale from 1 to 10 (only integers) from the point of view of a cat (1 is the worst, 10 is the best). E.g. cat would prefer a lot of sunny days, but also some occasional clouds. Just fill in the JSON, don't say anything else! If the city is too small or you don't have enough data, then make a reasonable guess based on the region or the country. Make sure the JSON is valid, don't make any basic mistakes like leaving a trailing comma after the last value \n\n" + JSON.stringify(meow_obj);
	console.log(prompt);
	process_prompt(prompt, content_type, city, city_id);
}


function process_batch(cities_batch){
	 for (let c of cities_batch){
	 	for (let city_item of c){
	 		//TODO: timeout for dealing with API rate limits
	 		//[0] is city name, [1] is the country, [2] is the city_id
	 		generate_city_content(city_item[0], city_item[1], city_item[2]);	
	 	}
	 }
	 
}



function generate_city_content(city, country = '', city_id = ''){
	gen_tagline(city, 'tagline', country, city_id)
	gen_summary(city, 'summary', country, city_id);
	gen_month_feel(city, 'month', country, city_id);
	gen_visit_duration(city, 'duration', country, city_id);
	gen_tipping(city, 'tipping', country, city_id);
	gen_internet(city, 'internet', country, city_id);
	gen_bike(city, 'bike', country, city_id);
	gen_walk(city, 'walk', country, city_id);
	gen_lgbtq(city, 'lgbtq', country, city_id);
	ttd_mainstream(city, 'ttd', country, city_id);
	ttd_gems(city, 'gem', country, city_id);
	mindful_meoweler(city, 'mindful', country, city_id);
	gen_songs(city, 'songs', country, city_id);
	gen_websites(city, 'websites', country, city_id);
	gen_meowscore(city, 'meowscore', country, city_id);
	console.log(processed_count + ': ' + city);
	processed_count++;
}


app.get('/batch/:batch_num', (req, res) => {
	
	let batch_range = req.params.batch_num;
	let batch_from = batch_range.split('-')[0];
	let batch_to = batch_range.split('-')[1];
	
	res.setHeader('Content-Type', 'text/plain');
  	res.end('Processing batch ' + batch_from + ' to ' + batch_to);

  	let batch = batch_cities(citarr, batch_from, batch_to);
	process_batch(batch);

});

app.get('/mj/:batch_num', (req, res) => {
	
	let batch_range = req.params.batch_num;
	let batch_from = batch_range.split('-')[0];
	let batch_to = batch_range.split('-')[1];

  	let batch = batch_cities(citarr, batch_from, batch_to);
	//process_batch(batch);

	let mj_prompt = ", sunny day, very vibrant colors, lots of white space, cats, stylish vector realism with surreal elements, vector, landmark view, dynamic composition --ar 19:10 --v 5.1";
	let mj_prompt2 = ", atmospheric day, very vibrant colors, lots of white space, cats, stylish vector hyperrealism with surreal elements, landmark view, dynamic composition --ar 19:10 --v 5.1"

	let prompt_array = [];
	let processed = "";
	let helpc = 0;
	let complete_prompt = "";

	let mj_pre = "{ ";
	for (let i of batch){
		for (j of i){
			let mj_city = j[0];
			let mj_country = j[1];
			if (helpc == 0) {
				mj_pre += mj_city + " - " + mj_country;
				first = 0;
			} else {
				mj_pre += ", " + mj_city + " - " + mj_country;
			}
			helpc++;
			if (helpc >= 39){
				complete_prompt = mj_pre + " }" + mj_prompt2;
				prompt_array.push(complete_prompt);
				helpc = 0;
				complete_prompt = '';
				mj_pre = '{ '
			}
		}

	}

	for (item of prompt_array){
		console.log(item + "\n\n\n");
	}

	res.setHeader('Content-Type', 'text/plain');
 	res.end('Processing batch ' + batch_from + ' to ' + batch_to + "\n\n\n" + processed);

});


app.get('/city/:city_name', (req, res) => {
	let city = req.params.city_name;
	res.setHeader('Content-Type', 'text/plain');
  	res.end('Generating content for ' + city);
  	generate_city_content(city, "Switzerland", "c1756810813");
});

app.get('/test', (req, res) => {
	res.setHeader('Content-Type', 'text/plain');
	res.end(JSON.stringify(big_mac_index));
})


app.get('/json/:populationrange', (req, res) => {

	let range = req.params.populationrange;
	let p_from = range.split('-')[0];
	let p_to = range.split('-')[1];
	let howmany = 10000;

	let city_json = [];
	let counter = 0;


		City.find({ population: { $lt: p_to, $gt: (p_from - 1) }})
		.then(function (cities) {
		  cities.forEach(function(city) {
	    	if (counter < howmany){
	      	city_json.push(city);
	      	counter++;
	      	console.log(counter);
	    	} else {
	    		console.log('p');
	    	}
	    });

	    	res.setHeader('Content-Type', 'text/plain');
			res.send(JSON.stringify(city_json));
		})
		.catch(function (err) {
		  console.log(err);
		});

})

app.get('/jsoncountries', (req, res) => {

	let howmany = 1000;

	let country_json = [];
	let counter = 0;

		Country.find({})
		.then(function (countries) {
		  countries.forEach(function(country) {
	    	if (counter < howmany){
	      	country_json.push(country);
	      	counter++;
	      	console.log(counter);
	    	} else {
	    		console.log('p');
	    	}
	    });

	    res.setHeader('Content-Type', 'text/plain');
			res.send(JSON.stringify(country_json));

		})
		.catch(function (err) {
		  console.log(err);
		});

})

app.get('/meowscore', (req, res) => {

	let p_from = 98;
	let p_to = 140;
	let howmany = 100;

	let city_json = [];
	let counter = 0;

		City.find({ meowscore: { $lt: p_to, $gt: p_from }})
		.then(function (cities) {
		  cities.forEach(function(city) {
	    	if (counter < howmany){
	      	city_json.push([city.name, city.country, city.population, city.meowscore]);
	      	counter++;
	      	console.log(counter);
	    	} else {
	    		console.log('p');
	    	}
	    });

	    res.setHeader('Content-Type', 'text/plain');
			res.send(JSON.stringify(city_json));




		})
		.catch(function (err) {
		  console.log(err);
		});

})


app.get('/autobatch/:batch_num', (req, res) => {
	
	let batch_from = req.params.batch_num;
	let current_batch = Number(batch_from);

	let b = 0;

	let batch0 = batch_cities(citarr, current_batch, (current_batch + 1));
		process_batch(batch0);
		console.log('==================================')
		console.log('==================================')
		console.log('currently processing: ' + current_batch)
		console.log('==================================')
		console.log('==================================')

		current_batch += 2;

	setInterval(() => {

	  let batch = batch_cities(citarr, current_batch, (current_batch + 1));
		process_batch(batch);
		console.log('==================================')
		console.log('==================================')
		console.log('currently processing: ' + current_batch)
		console.log('==================================')
		console.log('==================================')

		current_batch += 2;

	}, "300000");

  	


	res.setHeader('Content-Type', 'text/plain');
  	res.end('Processing batches from ' + batch_from);

});







