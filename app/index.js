const API_URL = 'http://localhost:3000';

async function consumeAPI(signal) {
	const response = await fetch(API_URL, {
		signal
	});

	const reader = response.body.pipeThrough(new TextDecoderStream()).pipeThrough(parseNDJSON());

	return reader;
}

// this function will make sure that if two chunks come from a single transmission
// converit and split in break lines
// given {}\n{}\n{}\n
// it will return {} {} {}

function parseNDJSON() {
	return new TransformStream({
		async transform(chunk, controller) {
			for (const item of chunk.split('\n')) {
				if (!item.length) continue;

				try {
					controller.enqueue(JSON.parse(item));
				} catch (error) {
					// this expection is a common problem that we wont handle for now
					// if the arrived data is not completed, it should be stored in memory until the next transmission
				}
			}
		}
	});
}

let counter = 0;
let elementCounter = 0;

function appendToHtml(element) {
	return new WritableStream({
		write({ title, description, url }) {
			const card = `
      <article>
        <div class="text">
          <h3>[${++counter}] ${title}</h3>
          <p>${description.slice(0, 100)}</p>
          <a href="${url}">Go to</a>
        </div>
      </article>
      `;

			// if (++elementCounter > 20) {
			// 	element.innerHTML = card;
			// 	elementCounter = 0;
			// 	return;
			// }

			element.innerHTML += card;
		},
		abort(reason) {
			console.log('aborted*', reason);
		}
	});
}

const [start, stop, clear, cards] = ['start', 'stop', 'clear', 'cards'].map((id) => document.getElementById(id));

let abortController = new AbortController();

start.addEventListener('click', async () => {
	try {
		const reader = await consumeAPI(abortController.signal);
		await reader.pipeTo(appendToHtml(cards), { signal: abortController.signal });
	} catch (error) {
		if (!error.message.includes('abort')) throw error;
	}
});

stop.addEventListener('click', () => {
	abortController.abort();
	console.log('aborting...');

	abortController = new AbortController();
});

clear.addEventListener('click', () => {
	cards.innerHTML = '';
	counter = 0;
	elementCounter = 0;
});
